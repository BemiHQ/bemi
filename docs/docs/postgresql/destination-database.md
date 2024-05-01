---
title: Bemi Destination Database Overview - Autoscaled and optimized Cloud PostgreSQL Audit Trails
sidebar_label: Destination Database
hide_title: true
description: Explore the features of Bemi's cloud-hosted PostgreSQL destination database, including autoscaling, failover, backups, and query capabilities. Bemi simplifies data retention, version upgrades, and offers enhanced performance and security.
image: 'img/social-card.png'
keywords: [Bemi, destination database, PostgreSQL, autoscaling, high availability, query changes, cloud data audit trails]
---

# Destination Database

Bemi automatically provisions a cloud-hosted PostgreSQL destination database to store all changes made in a source database.
You have full control over this database which comes with additional features:

* Autoscaling, managed table partitioning and index optimization to improve performance
* Automatic failover, read-replica, and backups for high availability and fault tolerance
* Automatic data retention: 15 days, 30 days, or unlimited
* Automatic PostgreSQL version upgrades
* Standard cloud support
* Control plane and monitoring through Bemi Dashboard (coming soon)

## Data Structure

Changes performed by creating, updating, or deleting each row are stored in a table called `changes` and have the following structure:

| Column           | Type             | Description                                                  |
| ---------------- | ---------------- | ------------------------------------------------------------ |
| `id`             | `uuid`           | A unique identifier of the change record                     |
| `database`       | `varchar(255)`   | Database name where the changed record was stored            |
| `schema`         | `varchar(255)`   | Schema name where the changed record was stored              |
| `table`          | `varchar(255)`   | Table name where the changed record was stored               |
| `primary_key`    | `varchar(255)`   | A unique identifier of the changed record (optional)         |
| `operation`      | `text`           | Enum that can be either `CREATE`, `UPDATE`, or `DELETE`      |
| `before`         | `jsonb`          | Record's values before the change                            |
| `after`          | `jsonb`          | Record's values after the change                             |
| `context`        | `jsonb`          | App context passed by using our recommended [ORM packages](/#supported-orms) |
| `committed_at`   | `timestamptz(0)` | When the record was changed                                  |
| `queued_at`      | `timestamptz(0)` | When the changed record was ingested from WAL                |
| `created_at`     | `timestamptz(0)` | When the change record was stored in the database            |
| `transaction_id` | `bigint`         | PostgreSQL transaction ID                                    |
| `position`       | `bigint`         | PostgreSQL WAL position                                      |

## Querying Changes

You can query changes by using our [ORM packages](/#supported-orms) or by directly connecting and executing SQL queries.
For example, if you need to find when and how a user record with ID `b7267340-5011-40f4-ab9a-902b68fc5b25` had its email updated to `new@example.com` in the last 3 months:

```sql
SELECT *
FROM "changes"
WHERE
  "database" = 'postgres' AND "schema" = 'public' AND "table" = 'users' AND
  "primary_key" = 'b7267340-5011-40f4-ab9a-902b68fc5b25' AND "operation" = 'UPDATE' AND
  "after" @> '{"email": "new@example.com"}' AND NOT ("before" @> '{"email": "new@example.com"}') AND
  "committed_at" BETWEEN (NOW() - INTERVAL '3 months') AND NOW()
LIMIT 1;`
```

The JSONB columns are indexed with [GIN Index](https://www.postgresql.org/docs/current/indexes-types.html#INDEXES-TYPES-GIN) with `jsonb_path_ops` operator class that is perfomance-optimized for operators like:

* `jsonb @> '{"key": value}'`  to check if a key/value pair matches JSONB
* `jsonb @? '$.key'` to check if a key exists in JSONB

## Connection pooling

PostgreSQL databases have a fixed maximum number of connections. Once that limit is hit, additional clients can’t connect.
The reason is that PostgreSQL has to fork a separate process to handle each client's connection concurrently, which is very resource-intensive.

Modern frameworks and database drivers use a connection pool on an application level to reduce the number of consumed database connections.
They maintain a "pool" of open connections that can be passed from one session to another session as needed.

However, if you run multiple instances of your application, then the number of direct database connections will still keep growing.
That is why a destination database comes with an automatically provisioned highly scalable connection pooler that can handle hundreds of connections.

## IP-Based Access Control

It is possible to restrict access to a provisioned database by IP addresses in [CIDR notation](https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing).
This feature allows you to limit access to the database to specific IP addresses, such as those associated with your applications' servers,
VPN network, office or home network, etc.

By default, a database has a single `0.0.0.0/0` CIDR notation and is accessible from any IP address.

## TLS/SSL certificates

A destination database uses TLS/SSL certificates for both encryption in transit and authentication on the server and client sides.
The database comes with a certification authority (CA) and uses it for both client and server certificates, which are managed and renewed automatically.
