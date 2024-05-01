---
title: Bemi Source Database Configuration Guide - Real-Time Data Tracking with CDC
sidebar_label: Source Database
hide_title: true
description: Learn how to configure your PostgreSQL source database with Bemi for real-time data tracking using Change Data Capture (CDC). Includes detailed setup instructions for WAL levels, connections, and hosting platforms like AWS, GCP, Supabase, and Render.
keywords: [PostgreSQL, Change Data Capture, Bemi, real-time data tracking, database replication, WAL, logical replication]
image: 'img/social-card.png'
---

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

If your current WAL level is set to `replica`, you need to update it to `logical` and restart your PostgreSQL instance.
Updating this value won't break replication, it will just slightly increase the WAL volume (disk space and network traffic if there are replicas).

## PostgreSQL Hosting Platforms

### Supabase

#### Connection {#supabase-connection}

To connect a [Supabase](https://supabase.com/) database, you need to go to your Supabase project settings and:

1. Purchase a [dedicated IPv4](https://supabase.com/docs/guides/platform/ipv4-address) for $4/mo to resolve to the IPv4 address instead of the default IPv6
2. Untoggle "Use connection pooling" and use these connection details on Bemi to connect to the replication log

![](/img/perm-supabase.png)

Supabase recently [deprecated free IPv4](https://github.com/orgs/supabase/discussions/17817).
So you might see some IPv4 removal warnings on their dashboard, even after purchasing the IPv4 add-on, which should work fine.

*Note that you can't create new credentials with `REPLICATION` permissions in Supabase, see [this discussion](https://github.com/orgs/supabase/discussions/9314).*

#### WAL level {#supabase-wal-level}

Supabase provisions PostgreSQL with the WAL level already set to `logical`. So, it is ready to be used.

### Render

#### Connection {#render-connection}

To connect a [Render](https://render.com/) database, specify your database credentials that can be found on the Render dashboard:

* Please use the full `Host` name that ends with `.render.com` from the External Database URL section

![](/img/perm-render.png)

*Note that you can't create new credentials with `REPLICATION` permissions in Render.*

#### WAL level {#render-wal-level}

Please submit a Render support request, and they'll run a special runbook to set up Bemi:

> In a few words, what can we help you with?

```
Configure database for Bemi
```

> Describe the issue in more detail.

```
- Set "wal_level" to "logical"
- Add "REPLICATION" permission to the database user
- Create "bemi" publication
```

### Neon

#### Connection {#neon-connection}

To connect a [Neon](https://neon.tech/) database, specify your database credentials that can be found on the project's dashboard:

* Please use the `Host` name without enabled "Pooled connection"

![](/img/perm-neon.png)

And that's it, everything should just work!

#### Read-only credentials {#neon-read-only}

Alternatively, you can manually create read-only PostgreSQL database credentials to connect to the primary instance's WAL.
At a high level, you need to run these commands that are safe to execute without any downtime or performance issues:

* `CREATE ROLE` creates a new read-only user for Bemi to read database changes.
* `CREATE PUBLICATION` creates a "channel" that we'll subscribe to and track changes in real-time.
* `REPLICA IDENTITY FULL` enhances records stored in WAL to record the previous state (“before”) in addition to the tracked by default new state (“after”).

```sql
-- Create read-only user with REPLICATION permission
CREATE ROLE [username] WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE REPLICATION PASSWORD '[password]';
-- Grant SELECT access to tables for selective tracking
GRANT SELECT ON ALL TABLES IN SCHEMA public TO [username];
-- Grant SELECT access to new tables created in the future for selective tracking
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO [username];

-- Create "bemi" PUBLICATION to enable logical replication
CREATE PUBLICATION bemi FOR ALL TABLES;

-- Create a procedure to set REPLICA IDENTITY FULL for tables to track the "before" state on DB row changes
CREATE OR REPLACE PROCEDURE _bemi_set_replica_identity() AS $$ DECLARE current_tablename TEXT;
BEGIN
  FOR current_tablename IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', current_tablename);
  END LOOP;
END $$ LANGUAGE plpgsql;
-- Call the created procedure
CALL _bemi_set_replica_identity();
```

#### WAL level {#neon-wal-level}

If you have access to [Neon](https://neon.tech/)'s [Logical Replication Beta program](https://neon.tech/docs/guides/logical-replication-postgres),
you can set WAL level to `logical` by enabling the feature in your Project settings.

If the Enrollment is paused for you, just send a support request email:

```
To: support@neon.tech
Subject: Enable logical replication

I need to integrate with Bemi.io, which requires logical replication.
Can you please enable it for my [YOUR-DATABASE-HOST.neon.tech] database?
```

### AWS RDS

#### Connection {#aws-connection}

You can specify the same regular database credentials you use to connect to PostgreSQL from your code.
And that's it, everything should just work!

#### Read-only credentials {#aws-read-only}

Alternatively, you can manually create read-only PostgreSQL database credentials to connect to the primary instance's WAL.
At a high level, you need to run these commands that are safe to execute without any downtime or performance issues:

* `CREATE ROLE` creates a new read-only user for Bemi to read database changes.
* `CREATE PUBLICATION` creates a "channel" that we'll subscribe to and track changes in real-time.
* `REPLICA IDENTITY FULL` enhances records stored in WAL to record the previous state (“before”) in addition to the tracked by default new state (“after”).

```sql
-- Create read-only user
CREATE ROLE [username] WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '[password]';
-- Grant RDS replication permission
GRANT rds_replication TO [username];
-- Grant SELECT access to existing tables for selective tracking
GRANT SELECT ON ALL TABLES IN SCHEMA public TO [username];
-- Grant SELECT access to new tables created in the future for selective tracking
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO [username];

-- Create "bemi" PUBLICATION to enable logical replication
CREATE PUBLICATION bemi FOR ALL TABLES;

-- Create a procedure to set REPLICA IDENTITY FULL for tables to track the "before" state on DB row changes
CREATE OR REPLACE PROCEDURE _bemi_set_replica_identity() AS $$ DECLARE current_tablename TEXT;
BEGIN
  FOR current_tablename IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', current_tablename);
  END LOOP;
END $$ LANGUAGE plpgsql;
-- Call the created procedure
CALL _bemi_set_replica_identity();
-- Create a trigger function that calls the created procedure
CREATE OR REPLACE FUNCTION _bemi_set_replica_identity_func() RETURNS event_trigger AS $$
BEGIN CALL _bemi_set_replica_identity(); END $$ LANGUAGE plpgsql;
-- Create a trigger to set REPLICA IDENTITY FULL for all new created tables
CREATE EVENT TRIGGER _bemi_set_replica_identity_trigger ON ddl_command_end WHEN TAG IN ('CREATE TABLE')
EXECUTE FUNCTION _bemi_set_replica_identity_func();
```

#### Read-only credentials with manually managed permissions for each table {#aws-read-only-manually-managed}

Run the following queries if you want to isolate read access only to logical replication for certain tables and manage permissions manually
instead of relying on our robust built-in selective tracking manageable through our UI.

```sql
-- Create read-only user
CREATE ROLE [username] WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '[password]';
-- Grant replication permission to allow using replication slots
GRANT rds_replication TO [username];

-- Create "bemi" PUBLICATION to enable logical replication for selected tables
CREATE PUBLICATION bemi FOR TABLE [table1], [table2];

-- Set REPLICA IDENTITY FULL for tables to track the "before" state on DB row changes
ALTER TABLE [table1] REPLICA IDENTITY FULL;
ALTER TABLE [table2] REPLICA IDENTITY FULL;
```

To enable data change tracking for a new table:

```sql
ALTER PUBLICATION bemi ADD TABLE [table3];
ALTER TABLE [table3] REPLICA IDENTITY FULL;
```

To stop data change tracking for a table:

```sql
ALTER PUBLICATION bemi DROP TABLE [table3];
ALTER TABLE [table3] REPLICA IDENTITY DEFAULT;
```

#### WAL level {#aws-wal-level}

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

### Self-managed PostgreSQL

#### Connection {#self-managed-connection}

You can specify the same regular database credentials you use to connect to PostgreSQL from your code.
And that's it, everything should just work!

#### Read-only credentials {#self-managed-read-only}

Alternatively, you can manually create read-only PostgreSQL database credentials to connect to the primary instance's WAL.
At a high level, you need to run these commands that are safe to execute without any downtime or performance issues:

* `CREATE ROLE` creates a new read-only user for Bemi to read database changes.
* `CREATE PUBLICATION` creates a "channel" that we'll subscribe to and track changes in real-time.
* `REPLICA IDENTITY FULL` enhances records stored in WAL to record the previous state (“before”) in addition to the tracked by default new state (“after”).

```sql
-- Create read-only user with REPLICATION permission
CREATE ROLE [username] WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE REPLICATION PASSWORD '[password]';
-- Grant SELECT access to tables for selective tracking
GRANT SELECT ON ALL TABLES IN SCHEMA public TO [username];
-- Grant SELECT access to new tables created in the future for selective tracking
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO [username];

-- Create "bemi" PUBLICATION to enable logical replication
CREATE PUBLICATION bemi FOR ALL TABLES;

-- Create a procedure to set REPLICA IDENTITY FULL for tables to track the "before" state on DB row changes
CREATE OR REPLACE PROCEDURE _bemi_set_replica_identity() AS $$ DECLARE current_tablename TEXT;
BEGIN
  FOR current_tablename IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', current_tablename);
  END LOOP;
END $$ LANGUAGE plpgsql;
-- Call the created procedure
CALL _bemi_set_replica_identity();
-- Create a trigger function that calls the created procedure
CREATE OR REPLACE FUNCTION _bemi_set_replica_identity_func() RETURNS event_trigger AS $$
BEGIN CALL _bemi_set_replica_identity(); END $$ LANGUAGE plpgsql;
-- Create a trigger to set REPLICA IDENTITY FULL for all new created tables
CREATE EVENT TRIGGER _bemi_set_replica_identity_trigger ON ddl_command_end WHEN TAG IN ('CREATE TABLE')
EXECUTE FUNCTION _bemi_set_replica_identity_func();
```

#### Read-only credentials with manually managed permissions for each table {#self-managed-read-only-manually-managed}

Run the following queries if you want to isolate read access only to logical replication for certain tables and manage permissions manually
instead of relying on our robust built-in selective tracking manageable through our UI.

```sql
-- Create read-only user with REPLICATION permission
CREATE ROLE [username] WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE REPLICATION PASSWORD '[password]';

-- Create "bemi" PUBLICATION to enable logical replication for selected tables
CREATE PUBLICATION bemi FOR TABLE [table1], [table2];

-- Set REPLICA IDENTITY FULL for tables to track the "before" state on DB row changes
ALTER TABLE [table1] REPLICA IDENTITY FULL;
ALTER TABLE [table2] REPLICA IDENTITY FULL;
```

To enable data change tracking for a new table:

```sql
ALTER PUBLICATION bemi ADD TABLE [table3];
ALTER TABLE [table3] REPLICA IDENTITY FULL;
```

To stop data change tracking for a table:

```sql
ALTER PUBLICATION bemi DROP TABLE [table3];
ALTER TABLE [table3] REPLICA IDENTITY DEFAULT;
```

#### WAL level {#self-managed-wal-level}

Run the following SQL command to change the WAL level from `replica` to `logical` and restart your database:

```sql
ALTER SYSTEM SET wal_level = logical;
```

If you have issues in other PostgreSQL hosting environments, please [reach out](mailto:hi@bemi.io) to us and we will send you detailed instructions on how to set it up.

## Selective tracking

### Tracking by Tables

During the Source Database connection setup or any time after, you can configure what tables you want to track:

![](/img/tracked-tables.png)

### Ignoring by Columns

Bemi allows to configure ignore-change columns, such as `myTable.updatedAt`. This prevents the creation of a new audit trail entry (called "change") for a record in `myTable` if `updatedAt` was the only value that was updated.

In other words, `myTable.updatedAt` is used to determine whether an audit trail entry should be recorded or not. But this column will always be persisted if there were other columns that were updated.

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

## Bemi Static IPs

If you restrict access to your databases by IP addresses, [contact us](mailto:hi@bemi.io). We will share our static IP addresses, which you can add to an allowlist, so we can connect to your Source PostgreSQL database.
