# Prisma

<a class="github-button" href="https://github.com/BemiHQ/bemi-prisma" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi-prisma on GitHub">BemiHQ/bemi-prisma</a>
<br />
<br />

[Bemi](https://bemi.io) plugs into [Prisma](https://github.com/prisma/prisma) and PostgreSQL to track database changes automatically. It unlocks robust context-aware audit trails and time travel querying inside your application.

This package is an optional Prisma integration, enabling you to pass application-specific context when performing database changes. This can include context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

See [this repo](https://github.com/BemiHQ/bemi-prisma-example) as an Todo app example with Prisma that automatically tracks all changes.

## Prerequisites

- PostgreSQL
- Prisma
- Express (Fastify support coming soon)

## Installation

1. Install the NPM package

```sh
npm install @bemi-db/prisma
```

2. Generate a Prisma migration file to add lightweight [PostgreSQL triggers](https://www.postgresql.org/docs/current/plpgsql-trigger.html) for inserting application context into replication logs.

```sh
npx bemi migration:create
```

3. Run the Prisma migration

```sh
npx prisma migrate dev
```

## Usage

Enable the new [Prisma driver adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers) to use a native [PostgreSQL client](https://github.com/brianc/node-postgres) for Node.js by adding the following in your `schema.prisma`:

```
generator client {
  previewFeatures = ["driverAdapters"]
  ...
}
```

Enable PostgreSQL adapter for your Prisma client by using `withPgAdapter`:

```js
import { withPgAdapter } from "@bemi-db/prisma";
import { PrismaClient } from '@prisma/client';

const prisma = withPgAdapter(new PrismaClient());
```

Add an [Express](https://expressjs.com/) middleware to pass application context with all underlying data changes within an HTTP request:

```ts
import { setContext } from "@bemi-db/prisma";
import express, { Request } from "express";
import { prisma } from "./prisma";

const app = express();

app.use(
  setContext(prisma, (req: Request) => ({
    // Customizable context
    apiEndpoint: req.url,
    params: req.body,
    userId: req.user?.id,
  }))
);
```

## Data change tracking

Connect your PostgreSQL source database on [bemi.io](https://bemi.io) to start ingesting and storing all data changes stitched together with application-specific context. The database connection details can be securely configured through the [dashboard UI](https://dashboard.bemi.io/log-in?ref=prisma) in a few seconds.

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

Lastly, connect to the Bemi PostgreSQL destination database to easily query change data from your application.

To query the read-only historical data, add a new Prisma schema in `prisma/bemi.prisma`

```
datasource db {
  provider = "postgresql"
  url      =  "postgresql://u_9adb30103a55:password@us-west-1-prod-destination-pool.ctbxbtz4ojdc.us-west-1.rds.amazonaws.com:5432/db_9adb30103a55"
}

generator client {
  provider = "prisma-client-js"
  output   = "./generated/bemi"
}

model Change {
  id          String   @id
  primaryKey  String   @map("primary_key")
  values      Json
  metadata    Json
  database    String
  schema      String
  table       String
  operation   String
  committedAt DateTime @map("committed_at")
  @@map("changes")
}
```

Generate Prisma client:

```sh
npx prisma generate --schema prisma/bemi.prisma
```

Query changes from the destination database:

```tsx
import { PrismaClient } from '../prisma/generated/bemi'

const bemiPrisma = new PrismaClient()
await bemiPrisma.change.findMany()
```

## License

Distributed under the terms of the [LGPL-3.0](https://github.com/BemiHQ/bemi-prisma/blob/main/LICENSE).
If you need to modify and distribute the code, please release it to contribute back to the open-source community.
