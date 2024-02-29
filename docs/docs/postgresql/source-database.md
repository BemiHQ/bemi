# Source Database

Bemi tracks changes made in a primary PostgreSQL database (source database) by implementing a design pattern called Change Data Capture (CDC),
a process of identifying and capturing changes made to data in a database in real-time.
More specifically, Bemi workers connect and use built-in PostgreSQL replication mechanisms with Write-Ahead Log (WAL).

## Connection

Specify the following source database connection details:

* Host
* Database
* Port
* User
* Password

![dashboard](/img/new-source-db.png)

After that, you can enable selective tracking and pick which database tables you want to track.

## Permissions

You can specify the same regular database credentials you use to connect to PostgreSQL from your code.
And that's it, everything should just work!

Alternatively, you can create read-only PostgreSQL database credentials to connect to the primary instance's WAL.
Here is an example if you use AWS RDS:

```sql
/* Read-only user */
CREATE ROLE [username] WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '[password]';
/* To grant access to WAL */
GRANT rds_replication TO [username];
/* To enable selective table tracking */
GRANT SELECT ON ALL TABLES IN SCHEMA public TO [username];

/* Create "bemi" PUBLICATION to enable replication with dynamic selective tracking */
CREATE PUBLICATION bemi FOR ALL TABLES;

/* Enable REPLICA IDENTITY FULL for each table to track "before" state on each DB row change */
DO $$
DECLARE
  current_tablename TEXT;
BEGIN
  FOR current_tablename IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', current_tablename);
  END LOOP;
END;
$$;
```

These commands are safe to execute without any downtime or performance issues:

* `CREATE PUBLICATION` creates a "channel" that we'll subscribe to to track changes made in database tables.
* `REPLICA IDENTITY FULL` enhances records stored in WAL to record the previous state (“before”) in addition to the tracked by default new state (“after”), transaction ID, position, timestamp, database name, table name, etc.

## WAL Level

Bemi relies on logical replication that allows ingesting changes row-by-row, unlike physical replication that sends disk block changes.
You can check the [`wal_level`](https://www.postgresql.org/docs/current/runtime-config-wal.html#GUC-WAL-LEVEL) to make sure logical replication is enabled:

```
SHOW wal_level;
+-------------+
| wal_level   |
|-------------|
| logical     |
+-------------+
```

Note that changing the WAL level in PostgreSQL requires a restart. Changing from `replica` to `logical` won't break replication.
It will just slightly increase the WAL volume (disk space and network traffic if there are replicas).

### Self-managed PostgreSQL

Run the following SQL command to change the WAL level to `logical` and restart your database:

```sql
ALTER SYSTEM SET wal_level = logical;
```

### AWS RDS

At a high level, these are the steps necessary to update the WAL level from `replica` to `logical`

1. Create an RDS parameter group if it doesn’t exist
2. Update `rds.logical_replication` parameter from 0 to 1
3. Apply the parameter group to your RDS instance and restart it

Now let's break down these steps.

Create an RDS parameter group if it doesn’t exist by choose the group family depending on your PostgreSQL version and specifying any name and description:

![](/img/wal_level-aws-1.png)

Edit the created parameter group:

![](/img/wal_level-aws-2.png)

Find and change the `rds.logical_replication` parameter from 0 to 1:

![](/img/wal_level-aws-3.png)

Find and modify your RDS instance by using the parameter group:

![](/img/wal_level-aws-4.png)

Apply the modification by restarting your RDS instance:

![](/img/wal_level-aws-5.png)

If you have a Multi-AZ database cluster and you used a cluster parameter group, you will need to explicitly Reboot the Writer instance (it may take ~ 2 seconds if there is not a lot of activity).
The Reader endpoint will continue to be available without downtime.

![](/img/wal_level-writer-reboot.png)

See the [AWS RDS user guides](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html) to learn more about parameter groups.

### Supabase

[Supabase](https://supabase.com/) provisions PostgreSQL with the WAL level already set to `logical`. So, it is ready to be used.

### Unsupported managed PostgreSQL options

* [Render](https://render.com/). It doesn't allow enabling logical replication, see [this discussion](https://community.render.com/t/changing-postgres-wal-level-and-max-slot-wal-keep-size/4954).

If you have issues in other PostgreSQL hosting environments, please [reach out](mailto:hi@bemi.io) to us and we will send you detailed instructions on how to set it up.

## SSH Tunnel

If your PostgreSQL source database is not accessible over the internet, you can specify SSH credentials to enable an SSH tunnel via a jump host.

![dashboard](/img/new-source-db-ssh.png)

Once the source database connection settings are submitted, we'll generate a public SSH key.
Add this public SSH key to your SSH host to allow Bemi workers to connect and SSH-tunnel to the PostgreSQL database:

```sh
touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys
echo 'ssh-ed25519 AAAAC3Nz...' >> ~/.ssh/authorized_keys
```

If you need a public SSH Key before you know the SSH host address, just specify any address and later reach out to us to update it.

## Static IPs

If you restrict access to your databases by IP addresses, [contact us](mailto:hi@bemi.io). We will share our static IP addresses, which you can add to an allowlist, so we can connect to your Source PostgreSQL database.
