---
title: Bemi and Self-Managed Integration - Audit Trail and Data Tracking
sidebar_label: Self-Managed
hide_title: true
description: Learn how to configure your self-managed database with Bemi for real-time data tracking using Change Data Capture (CDC). Includes detailed setup instructions for connections and WAL levels.
keywords: [Bemi, Self-Managed, PostgreSQL, Change Data Capture, real-time data tracking, audit trail, WAL, logical replication]
image: 'img/social-card.png'
---

# Self-managed PostgreSQL

## WAL level

Run the following SQL command to change the WAL level from `replica` to `logical` and restart your database:

```sql
ALTER SYSTEM SET wal_level = logical;
```

If you have issues in other PostgreSQL hosting environments, please [contact us](https://bemi.io/contact-us), and we will send you detailed instructions on how to set it up.

## Connection

You can specify the same regular database credentials you use to connect to PostgreSQL from your code.
And that's it, everything should just work!

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
  FOR current_tablename IN SELECT tablename FROM pg_tables LEFT JOIN pg_class ON relname = tablename WHERE schemaname = 'public' AND relkind != 'f' AND relreplident != 'f' LOOP
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

## Read-only credentials with manually managed permissions for each table

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
