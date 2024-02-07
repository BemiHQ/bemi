# TypeORM

<a class="github-button" href="https://github.com/BemiHQ/bemi-typeorm" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi-typeorm on GitHub">BemiHQ/bemi-typeorm</a>
<br />
<br />

[Bemi](https://bemi.io/) plugs into [TypeORM](https://github.com/typeorm/typeorm) and PostgreSQL to track database changes automatically. It unlocks robust context-aware audit trails and time travel querying inside your application.

This package is an optional TypeORM integration, enabling you to pass application-specific context when performing database changes. This can include context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

See [this repo](https://github.com/BemiHQ/bemi-typeorm-example) as an Todo app example with TypeORM that automatically tracks all changes.

## Prerequisites

- PostgreSQL
- TypeORM
- Express (Fastify support coming soon)

## Installation

1. Install the NPM package

```sh
npm install @bemi-db/typeorm
```

2. Generate a TypeORM compatible migration file to add lightweight [PostgreSQL triggers](https://www.postgresql.org/docs/current/plpgsql-trigger.html) for inserting application metadata into replication logs.

```sh
npx bemi migration:create ./path-to-migrations-dir
```

3. Run pending TypeORM migrations

```sh
npx typeorm migration:run
```

## Usage

Add an [Express](https://expressjs.com/) middleware. Here is an example of how to pass application context with all underlying data changes within an HTTP request:

```ts
import { setContext } from "@bemi-db/typeorm";
import express, { Request } from "express";
import { AppDataSource } from "./data-source";

const app = express();

// This is where you set any information that should be stored as context with all data changes
app.use(
  setContext(AppDataSource, (req: Request) => ({
    apiEndpoint: req.url,
    params: req.body,
    userId: req.user?.id,
  }))
);

AppDataSource.initialize() // initialize TypeORM connection as normal
```

## Data change tracking

Connect your PostgreSQL source database on [bemi.io](https://bemi.io) to start ingesting and storing all data changes stitched together with application-specific context.
The database connection details can be securely configured through the [dashboard UI](https://dashboard.bemi.io/log-in?ref=typeorm) in a few seconds.

![dashboard](/img/dashboard.png)

Once your destination PostgreSQL database has been fully provisioned, you'll see a "Connected" status. You can now test the connection after making database changes in your connected source database:

```
psql -h us-west-1-prod-destination-pool.ctbxbtz4ojdc.us-west-1.rds.amazonaws.com -p 5432 -U u_9adb30103a55 -d db_9adb30103a55 -c \
  'SELECT "primary_key", "table", "operation", "values", "context", "committed_at" FROM changes;'
Password for user u_9adb30103a55:

 primary_key | table | operation |                       values                       |                                context                                                         |      committed_at
-------------+-------+-----------+----------------------------------------------------+------------------------------------------------------------------------------------------------+------------------------
 26          | todo  | CREATE    | {"id": 26, "task": "Sleep", "isCompleted": false}  | {"userId": 187234, "apiEndpoint": "/todo", "params": {"task": "Sleep", "isCompleted": false}}  | 2023-12-11 17:09:09+00
 27          | todo  | CREATE    | {"id": 27, "task": "Eat", "isCompleted": false}    | {"userId": 187234, "apiEndpoint": "/todo", "params": {"task": "Eat", "isCompleted": false}}    | 2023-12-11 17:09:11+00
 28          | todo  | CREATE    | {"id": 28, "task": "Repeat", "isCompleted": false} | {"userId": 187234, "apiEndpoint": "/todo", "params": {"task": "Repeat", "isCompleted": false}} | 2023-12-11 17:09:13+00
 26          | todo  | UPDATE    | {"id": 26, "task": "Sleep", "isCompleted": true}   | {"userId": 187234, "apiEndpoint": "/todo/complete", "params": {"id": 26}}                      | 2023-12-11 17:09:15+00
 27          | todo  | DELETE    | {}                                                 | {"userId": 187234, "apiEndpoint": "/todo/27", "params": {"id": 27}}                            | 2023-12-11 17:09:18+00
```

## Data change querying

Lastly, connect directly to the Bemi PostgreSQL database to easily query change data from your application.

To query the read-only historical data, add the Bemi destination database to TypeORM using [multiple data source](https://typeorm.io/multiple-data-sources#using-multiple-data-sources). Configuration setting are found directly on the [Bemi dashboard](https://dashboard.bemi.io/log-in/):

```ts
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

```ts
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
