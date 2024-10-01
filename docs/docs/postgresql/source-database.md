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

You can find more information in the following guides on how to change the WAL level and connect depending on your hosting platform:

* **[Supabase](/hosting/supabase)**
* **[Neon](/hosting/neon)**
* **[AWS RDS](/hosting/aws)**
* **[GCP Cloud SQL](/hosting/gcp)**
* **[Render](/hosting/render)**
* **[DigitalOcean](/hosting/digitalocean)**
* **[Self-Managed](/hosting/self-managed)**

## Selective tracking

### Tracking by Tables

During the Source Database connection setup or any time after, you can configure what tables you want to track:

![](/img/tracked-tables.png)

Bemi automatically tracks changes in the default `public` schema. If you would like to enable tracking for other schemas in your Bemi organization, please [contact us](https://bemi.io/contact-us).

### Ignoring by Columns

Bemi allows to configure ignore-change columns, such as `public.tableName.updatedAt`, to ignore meaningless data changes.
This prevents the creation of a new audit trail entry (called "change") for a record in `tableName` if `updatedAt` was the only column value that was updated.

![](/img/ignored-columns.png)

In other words, `public.tableName.updatedAt` is used to determine whether an audit trail entry should be recorded or not.
Note that this column will always be recorded if there were updated values in other columns.

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

If you restrict access to your databases by IP addresses, [contact us](https://bemi.io/contact-us). We will share our static IP addresses, which you can add to an allowlist, so we can connect to your Source PostgreSQL database.

## Disconnecting

To disconnect from Bemi, you can to execute the following queries to remove the triggers that set `REPLICA IDENTITY FULL` for tracking the previous state:

```sql
DROP EVENT TRIGGER _bemi_set_replica_identity_trigger;
DROP FUNCTION _bemi_set_replica_identity_func;
DROP PROCEDURE _bemi_set_replica_identity;
```

If you used Bemi packages for the [Supported ORMs](/#supported-orms), you can execute the following queries to remove the lightweight triggers used for passing application context:

```sql
DROP EVENT TRIGGER _bemi_create_table_trigger;
DROP FUNCTION _bemi_create_table_trigger_func;
DROP PROCEDURE _bemi_create_triggers;
DROP FUNCTION _bemi_row_trigger_func CASCADE;
```

To completely disable logical replication, run the following queries:

> (!!!) If you later decide to resume Bemi, we won't be able to recover and ingest data changes after this point.

```sql
SELECT pg_drop_replication_slot('bemi');
DROP PUBLICATION bemi;
```
