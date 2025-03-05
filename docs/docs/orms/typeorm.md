---
title: Bemi TypeORM Integration - Automatic Database Change Tracking for PostgreSQL
sidebar_label: TypeORM
hide_title: true
description: Discover how Bemi integrates with TypeORM and PostgreSQL to automatically track database changes. This guide covers the installation and use of Bemi with TypeORM to enable context-aware audit trails in your application.
image: 'img/social-card.png'
keywords: [Bemi, TypeORM integration, PostgreSQL change tracking, database auditing, application context, audit trails, TypeORM PostgreSQL, database change monitoring]
---

# TypeORM

<a class="github-button" href="https://github.com/BemiHQ/bemi-typeorm" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi-typeorm on GitHub">BemiHQ/bemi-typeorm</a>
<br />
<br />

[Bemi](https://bemi.io/) plugs into [TypeORM](https://github.com/typeorm/typeorm) and PostgreSQL to track database changes automatically. It unlocks robust context-aware audit trails and time travel querying inside your application.

This package is a recommended TypeORM integration, enabling you to pass application-specific context when performing database changes. This can include context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

See this [example repo](https://github.com/BemiHQ/bemi-typeorm-example) as an Todo app example with TypeORM that automatically tracks and contextualizes all changes.

## Prerequisites

- PostgreSQL 14+
- TypeORM

## Installation

1. Install the NPM package

```sh
npm install @bemi-db/typeorm
```

2. Generate a TypeORM migration file to add lightweight [PostgreSQL triggers](https://www.postgresql.org/docs/current/plpgsql-trigger.html) for passing application context with all data changes into PostgreSQL replication log

```sh
npx bemi migration:create ./path-to-migrations-dir
```

3. Run pending TypeORM migrations

```sh
npx typeorm migration:run
```

## Usage

### Express.js

Add an [Express](https://expressjs.com/) middleware to pass application context with all underlying data changes within an HTTP request:

```ts title="src/index.ts"
import { setContext } from "@bemi-db/typeorm";
import express, { Request } from "express";
import { AppDataSource } from "./data-source";

const app = express();

// This is where you set any information that should be stored as context with all data changes
app.use(
  setContext(AppDataSource, (req: Request) => ({
    endpoint: req.url,
    params: req.body,
    userId: req.user?.id,
  }))
);

AppDataSource.initialize() // initialize TypeORM connection as normal
```

Application context:

* Is bound to the current asynchronous runtime execution context, for example, an HTTP request.
* Is used only with `INSERT`, `UPDATE`, `DELETE` SQL queries performed via TypeORM. Otherwise, it is a no-op.
* Is passed directly into PG [Write-Ahead Log](https://www.postgresql.org/docs/current/wal-intro.html) with data changes without affecting the structure of the database and SQL queries.

### Inline context

It is also possible to manually set or override context by using the `bemiContext` function:

```ts title="src/my-worker.ts"
import { bemiContext } from "@bemi-db/typeorm";

const MyWorker = () => {
  bemiContext({ worker: 'MyWorker', stage: 'calculate' })
  // ...

  bemiContext({ worker: 'MyWorker', stage: 'store' })
  // ...
}
```

## Data change tracking

### Local database

To test data change tracking and the TypeORM integration with a locally connected PostgreSQL, you need to set up your local PostgreSQL.

First, make sure your database has `SHOW wal_level;` returning `logical`. Otherwise, you need to run the following SQL command:

```sql
-- Don't forget to restart your PostgreSQL server after running this command
ALTER SYSTEM SET wal_level = logical;
```

To track both the "before" and "after" states on data changes, please run the following SQL command:

```sql
ALTER TABLE [YOUR_TABLE_NAME] REPLICA IDENTITY FULL;
```

Then, run a Docker container that connects to your local PostgreSQL database and starts tracking all data changes:

```sh
docker run \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_NAME=[YOUR_DATABASE] \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  public.ecr.aws/bemi/dev:latest
```

Replace `DB_NAME` with your local database name. Note that `DB_HOST` pointing to `host.docker.internal` allows accessing `127.0.0.1` on your host machine if you run PostgreSQL outside Docker. Customize `DB_USER` and `DB_PASSWORD` with your PostgreSQL credentials if needed.

Now try making some database changes. This will add a new record in the `changes` table within the same local database after a few seconds:

```
psql postgres://postgres:postgres@127.0.0.1:5432/[YOUR_DATABASE] -c \
  'SELECT "primary_key", "table", "operation", "before", "after", "context", "committed_at" FROM changes;'

 primary_key | table | operation |                       before                       |                       after                         |                        context                                                            |      committed_at
-------------+-------+-----------+----------------------------------------------------+-----------------------------------------------------+-------------------------------------------------------------------------------------------+------------------------
 26          | todo  | CREATE    | {}                                                 | {"id": 26, "task": "Sleep", "is_completed": false}  | {"user_id": 187234, "endpoint": "/todo", "method": "POST", "SQL": "INSERT INTO ..."}      | 2023-12-11 17:09:09+00
 27          | todo  | CREATE    | {}                                                 | {"id": 27, "task": "Eat", "is_completed": false}    | {"user_id": 187234, "endpoint": "/todo", "method": "POST", "SQL": "INSERT INTO ..."}      | 2023-12-11 17:09:11+00
 28          | todo  | CREATE    | {}                                                 | {"id": 28, "task": "Repeat", "is_completed": false} | {"user_id": 187234, "endpoint": "/todo", "method": "POST", "SQL": "INSERT INTO ..."}      | 2023-12-11 17:09:13+00
 26          | todo  | UPDATE    | {"id": 26, "task": "Sleep", "is_completed": false} | {"id": 26, "task": "Sleep", "is_completed": true}   | {"user_id": 187234, "endpoint": "/todo/complete", "method": "PUT", "SQL": "UPDATE ..."}   | 2023-12-11 17:09:15+00
 27          | todo  | DELETE    | {"id": 27, "task": "Eat", "is_completed": false}   | {}                                                  | {"user_id": 187234, "endpoint": "/todo/27", "method": "DELETE", "SQL": "DELETE FROM ..."} | 2023-12-11 17:09:18+00
```

### Remote database

Go to Bemi.io [Dashboard UI](https://dashboard.bemi.io/log-in?ref=typeorm) and follow the instructions to connect your hosted PostgreSQL database in a few seconds.

![dashboard](/img/dashboard.png)

Once the project infrastructure is provisioned, it'll automatically ingest and store all data changes stitched with an application context in a separate serverless PostgreSQL database. You can test the connection by running the following command:

```
psql postgres://[USERNAME]@[HOSTNAME]:5432/[DATABASE] -c \
  'SELECT "primary_key", "table", "operation", "before", "after", "context", "committed_at" FROM changes;'

 primary_key | table | operation |                       before                       |                       after                         |                        context                                                            |      committed_at
-------------+-------+-----------+----------------------------------------------------+-----------------------------------------------------+-------------------------------------------------------------------------------------------+------------------------
 26          | todo  | CREATE    | {}                                                 | {"id": 26, "task": "Sleep", "is_completed": false}  | {"user_id": 187234, "endpoint": "/todo", "method": "POST", "SQL": "INSERT INTO ..."}      | 2023-12-11 17:09:09+00
 27          | todo  | CREATE    | {}                                                 | {"id": 27, "task": "Eat", "is_completed": false}    | {"user_id": 187234, "endpoint": "/todo", "method": "POST", "SQL": "INSERT INTO ..."}      | 2023-12-11 17:09:11+00
 28          | todo  | CREATE    | {}                                                 | {"id": 28, "task": "Repeat", "is_completed": false} | {"user_id": 187234, "endpoint": "/todo", "method": "POST", "SQL": "INSERT INTO ..."}      | 2023-12-11 17:09:13+00
 26          | todo  | UPDATE    | {"id": 26, "task": "Sleep", "is_completed": false} | {"id": 26, "task": "Sleep", "is_completed": true}   | {"user_id": 187234, "endpoint": "/todo/complete", "method": "PUT", "SQL": "UPDATE ..."}   | 2023-12-11 17:09:15+00
 27          | todo  | DELETE    | {"id": 27, "task": "Eat", "is_completed": false}   | {}                                                  | {"user_id": 187234, "endpoint": "/todo/27", "method": "DELETE", "SQL": "DELETE FROM ..."} | 2023-12-11 17:09:18+00
```

See [Destination Database](/postgresql/destination-database) for more details.

## Data change querying

Lastly, connect directly to the Bemi PostgreSQL database to easily query change data from your application.

To query the read-only historical data, add the Bemi destination database to TypeORM using [multiple data source](https://typeorm.io/multiple-data-sources#using-multiple-data-sources). Configuration setting are found directly on the [Bemi dashboard](https://dashboard.bemi.io/log-in/):

```ts title="src/data-source.ts"
import { DataSource } from "typeorm";
import { Change } from "@bemi-db/typeorm";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "admin",
  database: "db1",
  entities: [__dirname + "/entity/*{.js,.ts}"],
  synchronize: true,
});

export const BemiDataSource = new DataSource({
  type: "postgres",
  name: "bemiRead",
  host: "us-west-1-prod-destination-pool.ctbxbtz4ojdc.us-west-1.rds.amazonaws.com",
  port: 5432,
  username: "u_9adb30103a55",
  password: "password",
  database: "db_9adb30103a55",
  synchronize: false,
  logging: true,
  entities: [Change],
  migrations: [],
  ssl: { rejectUnauthorized: false },
});
```

Initialize the BemiDataSource the same place you would your main AppDataSource

```ts title="src/index.ts"
BemiDataSource.initialize()
  .then(() => {
    console.log("Connected to Bemi");
  })
  .catch((error) => {
    console.log(error);
  });
```

Querying Changes:

```ts
import { Change } from "@bemi-db/typeorm";
import { BemiDataSource } from "./index";

const changeRepository = BemiDataSource.getRepository(Change);

const [changes, changesCount] = await changeRepository.findAndCount();
console.log("All changes: ", changes);
console.log("changes count: ", changesCount);
```

## License

Distributed under the terms of the [LGPL-3.0](https://github.com/BemiHQ/bemi-typeorm/blob/main/LICENSE).
If you need to modify and distribute the code, please release it to contribute back to the open-source community.
