# Changelog

## 2024-04

* Dashboard
  * Implement custom views and data clusters (opt in beta)
  * Show data usage across all environments in a new chart
  * Improve the UX for updating [Tracked Tables](https://docs.bemi.io/postgresql/source-database#tracking-by-tables) by warning about unsaved changes
  * Allow viewing full table & primary key values and copy them on click
  * Add an easy-to-copy PSQL command example
* Platform
  * Allow setting rules for [ignoring changes](https://docs.bemi.io/postgresql/source-database#ignoring-by-columns)
  * Add [connection pooling](https://docs.bemi.io/postgresql/destination-database#connection-pooling) to destination databases
  * Implement monitoring and alerting for customers' usage volumes
* Security
  * Implement [IP-based access control](https://docs.bemi.io/destination-database#ip-based-access-control) to destination databases
  * Always ask to specify a database password when editing a [Source Database connection](https://docs.bemi.io/source-database#connection)
  * Use internal network connection and DNS for all inter-service communication within VPC
* [Bemi Core](https://github.com/BemiHQ/bemi)
  * Improve PostgreSQL indexes
  * Use microsecond precision for timestamps
* [Bemi Prisma](https://github.com/BemiHQ/bemi-prisma)
  * Automatically include an original SQL query in the application context
  * Add support for Next.js actions
* [Bemi Rails](https://github.com/BemiHQ/bemi-rails)
  * Automatically include an original SQL query in the application context
  * Allow filtering out changes by a record, values, and operations
  * Add new helper methods for diffing and sorting changes
  * Filter out sensitive logs
* Integrations
  * [Render](https://docs.bemi.io/postgresql/source-database#render): create a dedicated integration runbook with their support
  * [Neon](https://docs.bemi.io/postgresql/source-database#neon): describe how to integrate by using their new Logical Replication beta feature
  * [Supabase](https://docs.bemi.io/postgresql/source-database#supabase): improve IPv6 error handling
  * [AWS DMS](https://aws.amazon.com/dms/): make ingestion worker compatible with DMS' logical replication decoding
