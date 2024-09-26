---
title: Bemi and GCP Cloud SQL Integration - Audit Trail and Data Tracking
sidebar_label: GCP Cloud SQL
hide_title: true
description: Learn how to configure your GCP Cloud SQL database with Bemi for real-time data tracking using Change Data Capture (CDC). Includes detailed setup instructions for connections and WAL levels.
keywords: [Bemi, GCP Cloud SQL, PostgreSQL, Change Data Capture, real-time data tracking, audit trail, WAL, logical replication]
image: 'img/social-card.png'
---

# GCP Cloud SQL

## WAL level

Logical replication is turned off by default. To turn it on, you have to update the [cloud flag](https://cloud.google.com/sql/docs/postgres/replication/configure-logical-replication#configure-your-postgresql-instance): `cloudsql.logical_decoding` = `on`. This will need a restart of your instance before `SHOW wal_level;` returns `logical`.

## Connection

Run the below command and then you can connect with the same credentials on the Bemi dashboard!
```sql
-- Grant replication permission to allow using replication slots
ALTER USER [user] WITH REPLICATION;
```
