---
title: Bemi and GCP Cloud SQL Integration - Audit Trail and Data Tracking
sidebar_label: GCP Cloud SQL
hide_title: true
description: Learn how to configure your GCP Cloud SQL database with Bemi for real-time data tracking using Change Data Capture (CDC). Includes detailed setup instructions for connections and WAL levels.
keywords: [Bemi, GCP Cloud SQL, PostgreSQL, Change Data Capture, real-time data tracking, audit trail, WAL, logical replication]
image: 'img/social-card.png'
---

# Google Cloud Platform Cloud SQL

## WAL level

Logical replication is turned off by default. To turn it on, you have to update the [cloud flag](https://cloud.google.com/sql/docs/postgres/replication/configure-logical-replication#configure-your-postgresql-instance): `cloudsql.logical_decoding` = `on`. This will need a restart of your instance before `SHOW wal_level;` returns `logical`.

## Connection

Run the below command and then you can connect with the same credentials on the Bemi dashboard!
```sql
-- Grant replication permission to allow using replication slots
ALTER USER [user] WITH REPLICATION;
```

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
-- Create a trigger function that calls the created procedure
CREATE OR REPLACE FUNCTION _bemi_set_replica_identity_func() RETURNS event_trigger AS $$
BEGIN CALL _bemi_set_replica_identity(); END $$ LANGUAGE plpgsql;
-- Create a trigger to set REPLICA IDENTITY FULL for all new created tables
CREATE EVENT TRIGGER _bemi_set_replica_identity_trigger ON ddl_command_end WHEN TAG IN ('CREATE TABLE')
EXECUTE FUNCTION _bemi_set_replica_identity_func();
```
