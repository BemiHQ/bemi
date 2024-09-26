---
title: Bemi and Neon Integration - Audit Trail and Data Tracking
sidebar_label: Neon
hide_title: true
description: Learn how to configure your Neon database with Bemi for real-time data tracking using Change Data Capture (CDC). Includes detailed setup instructions for connections and WAL levels.
keywords: [Bemi, Neon, PostgreSQL, Change Data Capture, real-time data tracking, audit trail, WAL, logical replication]
image: 'img/social-card.png'
---

# Neon

## WAL level

To enable logical replication in [Neon](https://neon.tech/):

1. Select your project in the Neon Console.
2. On the Neon **Dashboard**, select **Settings**.
3. Select **Beta**.
4. Click **Enable** to enable logical replication. This will set the Postgres `wal_level` setting to `logical`.

## Connection

To connect a [Neon](https://neon.tech/docs/guides/bemi) Postgres database, specify your database credentials, which can be found on your Neon project's dashboard:

**Note:** Please use the `Host` name without enabling the "Pooled connection" option.

![](/img/perm-neon.png)

And that's it, everything should just work!

For a detailed setup guide, see [Create an automatic audit trail with Bemi and Neon](https://neon.tech/docs/guides/bemi), in the _Neon documentation_.

## Read-only credentials

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
  FOR current_tablename IN SELECT tablename FROM pg_tables LEFT JOIN pg_class ON relname = tablename WHERE schemaname = 'public' AND relreplident != 'f' LOOP
    EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', current_tablename);
  END LOOP;
END $$ LANGUAGE plpgsql;
-- Call the created procedure
CALL _bemi_set_replica_identity();
```
