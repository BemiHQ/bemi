---
title: Bemi MikroORM Integration - Automatic Database Change Tracking for PostgreSQL
sidebar_label: MikroORM
hide_title: true
description: Discover how Bemi integrates with MikroORM and PostgreSQL to automatically track database changes. This guide covers the installation and use of Bemi with MikroORM to enable context-aware audit trails in your application.
image: 'img/social-card.png'
keywords: [Bemi, MikroORM integration, PostgreSQL change tracking, database auditing, application context, audit trails, MikroORM PostgreSQL, database change monitoring]
---

# MikroORM

<a class="github-button" href="https://github.com/BemiHQ/bemi-mikro-orm" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi-mikro-orm on GitHub">BemiHQ/bemi-mikro-orm</a>
<br />
<br />

[Bemi](https://bemi.io/) plugs into [MikroORM](https://github.com/mikro-orm/mikro-orm) and PostgreSQL to track database changes automatically. It unlocks robust context-aware audit trails and time travel querying inside your application.

This package is a recommended MikroORM integration, enabling you to pass application-specific context when performing database changes. This can include context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

See this [example repo](https://github.com/BemiHQ/bemi-mikro-orm-example) as an Todo app example with MikroORM that automatically tracks and contextualizes all changes.

## Prerequisites

- PostgreSQL 14+
- MikroORM

## Installation

1. Install the NPM package

```sh
npm install @bemi-db/mikro-orm
```

2. Generate a MikroORM migration file to add lightweight [PostgreSQL triggers](https://www.postgresql.org/docs/current/plpgsql-trigger.html) for passing application context with all data changes into PostgreSQL replication log

```sh
npx bemi migration:create --path src/migrations
```

3. Run pending MikroORM migrations

```sh
npx mikro-orm-esm migration:up
```

## Usage

Add an [Express](https://expressjs.com/) middleware to pass application context with all underlying data changes within an HTTP request:

```ts title="src/index.ts"
import { setContext } from "@bemi-db/mikro-orm";
import express, { Request } from "express";

const app = express();

// This is where you set any information that should be stored as context with all data changes
app.use(
  setContext((req: Request) => ({
    endpoint: req.url,
    params: req.body,
    userId: req.user?.id,
  }))
);
```

Application context:

* Is bound to the current asynchronous runtime execution context, for example, an HTTP request.
* Is used only with `INSERT`, `UPDATE`, `DELETE` SQL queries performed via MikroORM. Otherwise, it is a no-op.
* Is passed directly into PG [Write-Ahead Log](https://www.postgresql.org/docs/current/wal-intro.html) with data changes without affecting the structure of the database and SQL queries.

## Database connection

Connect your PostgreSQL source database on [bemi.io](https://bemi.io) to start ingesting and storing all data changes stitched together with application-specific context.
The database connection details can be securely configured through the [dashboard UI](https://dashboard.bemi.io/log-in?ref=mikro-orm) in a few seconds.

![dashboard](/img/dashboard.png)

Once your destination PostgreSQL database has been fully provisioned, you'll see a "Connected" status. You can now test the connection after making database changes in your connected source database:

```
psql postgres://[USERNAME]:[PASSWORD]@[HOSTNAME]:5432/[DATABASE] -c 'SELECT "primary_key", "table", "operation", "before", "after", "context", "committed_at" FROM changes;'

 primary_key | table | operation |                       before                      |                       after                        |                                context                                                      |      committed_at
-------------+-------+-----------+---------------------------------------------------+----------------------------------------------------+---------------------------------------------------------------------------------------------+------------------------
 26          | todo  | CREATE    | {}                                                | {"id": 26, "task": "Sleep", "isCompleted": false}  | {"userId": 187234, "endpoint": "/todo", "params": {"task": "Sleep", "isCompleted": false}}  | 2023-12-11 17:09:09+00
 27          | todo  | CREATE    | {}                                                | {"id": 27, "task": "Eat", "isCompleted": false}    | {"userId": 187234, "endpoint": "/todo", "params": {"task": "Eat", "isCompleted": false}}    | 2023-12-11 17:09:11+00
 28          | todo  | CREATE    | {}                                                | {"id": 28, "task": "Repeat", "isCompleted": false} | {"userId": 187234, "endpoint": "/todo", "params": {"task": "Repeat", "isCompleted": false}} | 2023-12-11 17:09:13+00
 26          | todo  | UPDATE    | {"id": 26, "task": "Sleep", "isCompleted": false} | {"id": 26, "task": "Sleep", "isCompleted": true}   | {"userId": 187234, "endpoint": "/todo/complete", "params": {"id": 26}}                      | 2023-12-11 17:09:15+00
 27          | todo  | DELETE    | {"id": 27, "task": "Eat", "isCompleted": false}   | {}                                                 | {"userId": 187234, "endpoint": "/todo/27", "params": {"id": 27}}                            | 2023-12-11 17:09:18+00
```

See [Destination Database](/postgresql/destination-database) for more details.

## License

Distributed under the terms of the [LGPL-3.0](https://github.com/BemiHQ/bemi-mikro-orm/blob/main/LICENSE).
If you need to modify and distribute the code, please release it to contribute back to the open-source community.
