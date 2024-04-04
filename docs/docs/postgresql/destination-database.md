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
