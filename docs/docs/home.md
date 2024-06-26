---
slug: /
---

# Bemi Docs

[Bemi](https://bemi.io) is an open-source solution that plugs into PostgreSQL and ORMs to track database changes automatically.
It unlocks robust context-aware audit trails and time travel querying inside your application.

Designed with simplicity and non-invasiveness in mind, Bemi doesn't require any alterations to your existing database structure.
It operates in the background, empowering you with data change tracking features.

## Demo

<iframe width="560" height="315" src="https://www.loom.com/embed/ae21a4e3356c414b817f482d30ac1246?sid=f774982c-2b22-42c8-80fd-a41c5612e713" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen style={{aspectRatio: '16 / 9', width: '100%', height: '100%'}}></iframe>

## Highlights

- Automatic and secure database change tracking with application-specific context in a structured form
- 100% reliability in capturing data changes, even if executed through direct SQL outside the application
- High performance without affecting code runtime execution and database workload
- Easy-to-use without changing table structures and rewriting the code
- Time travel querying and ability to easily group and filter changes
- Scalability with an automatically provisioned cloud infrastructure
- Full ownership of your data

## Use cases

There's a wide range of use cases that Bemi is built for! The tech was initially built as a compliance engineering system for fintech that supported $15B worth of assets under management, but has since been extracted into a general-purpose utility. Some use cases include:

- **Audit Trails:** Use logs for compliance purposes or surface them to customer support and external customers.
- **Change Reversion:** Revert changes made by a user or rollback all data changes within an API request.
- **Time Travel:** Retrieve historical data without implementing event sourcing.
- **Troubleshooting:** Identify the root cause of application issues.
- **Distributed Tracing:** Track changes across distributed systems.
- **Testing:** Rollback or roll-forward to different application test states.
- **Analyzing Trends:** Gain insights into historical trends and changes for informed decision-making.

## How does it work?

Bemi integrates on two levels:

* **Database level** (required)

This allows tracking all database changes with 100% accuracy by reusing built-in database replication mechanisms with PostgreSQL Write-Ahead Log. This design pattern is called Change Data Capture, a process of identifying and capturing changes made to data in a database in real-time.

* **Application level** (recommended)

This allows automatically enhancing low-level database changes with application-specific context by using our open-source libraries built for popular ORMs. For example, see all recent changes made by a user, revert all data changes made within an API request, see all processes that made changes by a record, etc.

## Supported ORMs

#### Node.js

* **[Prisma](/orms/prisma)**
* **[Supabase JS](/orms/supabase-js)**
* **[TypeORM](/orms/typeorm)**

#### Ruby

* **[Ruby on Rails](/orms/rails)**

#### Python

* **[SQLAlchemy](/orms/sqlalchemy)**

## Architecture overview

Bemi is designed to be lightweight and secure. It takes a practical approach to achieving the benefits of [event sourcing](https://martinfowler.com/eaaDev/EventSourcing.html) without requiring rearchitecting existing code, switching to highly specialized databases, or using unnecessary git-like abstractions on top of databases. We want your system to work the way it already does with your existing database to allow keeping things as simple as possible.

Bemi plugs into both the database and application levels, ensuring 100% reliability and a comprehensive understanding of every change.

On the database level, Bemi securely connects to PostgreSQL's [Write-Ahead Log](https://www.postgresql.org/docs/current/wal-intro.html)'s and implements [Change Data Capture](https://en.wikipedia.org/wiki/Change_data_capture). This allows tracking even the changes that get triggered via direct SQL.

On the application level, Bemi packages automatically pass application context to the replication logs to enhance the low-level database changes. For example, information about a user who made a change, an API endpoint where the change was triggered, a worker name that automatically triggered database changes, etc.

Bemi workers then stitch the low-level data with the application context and store this information in a structured easily queryable format, as depicted below:

![bemi-architechture](/img/architecture.png)

The cloud solution includes worker ingesters, queues for fault tolerance, and an automatically scalable cloud-hosted PostgreSQL. Bemi currently doesn't support a self hosted option, but [contact us](mailto:hi@bemi.io) if this is required.
