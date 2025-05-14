---
title: Bemi Prisma Integration - Automate Context-Aware Audit Trails with PostgreSQL
sidebar_label: Prisma
hide_title: true
description: Discover how Bemi integrates with Prisma and PostgreSQL to automatically track database changes, providing robust audit trails for your applications. Learn how to install and use the Bemi Prisma package for enhanced data tracking.
image: 'img/bemi-prisma.png'
keywords: [Bemi, Prisma, PostgreSQL, database auditing, data tracking, context-aware audit, application context, database actions, database prisma activity]
---

# Prisma

<a class="github-button" href="https://github.com/BemiHQ/bemi-prisma" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi-prisma on GitHub">BemiHQ/bemi-prisma</a>
<br />
<br />

[Bemi](https://bemi.io) plugs into [Prisma](https://github.com/prisma/prisma) and PostgreSQL to track database changes automatically. It unlocks robust context-aware audit trails and time travel querying inside your application.

This package is a recommended Prisma integration, enabling you to pass application-specific context when performing database changes. This can include context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

See this [example repo](https://github.com/BemiHQ/bemi-prisma-example) as an Todo app example with Prisma that automatically tracks and contextualizes all changes.

## Prerequisites

- PostgreSQL 14+
- Prisma

## Installation

1. Install the NPM package

```sh
npm install @bemi-db/prisma
```

2. Generate a Prisma migration file to add lightweight [PostgreSQL triggers](https://www.postgresql.org/docs/current/plpgsql-trigger.html) for passing application context with all data changes into PostgreSQL replication log

```sh
npx bemi migration:create
```

3. Run the Prisma migration

```sh
npx prisma migrate dev
```

## Usage

Enable the new [Prisma driver adapters](https://www.prisma.io/docs/orm/overview/databases/database-drivers) to use a native [PostgreSQL client](https://github.com/brianc/node-postgres) for Node.js by adding the following:

```prisma title="prisma/schema.prisma"
generator client {
  previewFeatures = ["driverAdapters"]
  ...
}
```

Enable PostgreSQL adapter for your Prisma client by using `withPgAdapter`:

```ts title="src/prisma.ts"
import { withPgAdapter } from "@bemi-db/prisma";
import { PrismaClient } from '@prisma/client';

const prisma = withPgAdapter(new PrismaClient());
```

Now you can specify custom application context that will be automatically passed with all data changes by following the code examples below.

Application context:

* Is bound to the current asynchronous runtime execution context, for example, an HTTP request.
* Is used only with `INSERT`, `UPDATE`, `DELETE` SQL queries performed via Prisma. Otherwise, it is a no-op.
* Is passed directly into PG [Write-Ahead Log](https://www.postgresql.org/docs/current/wal-intro.html) with data changes without affecting the structure of the database and SQL queries.

Application context will automatically include the original SQL query that performed data changes, which is generally useful for troubleshooting purposes.

If you want to enable context passing only for specific models, you can specify an `includeModels` list:

```ts title="src/prisma.ts"
import { withPgAdapter } from "@bemi-db/prisma";
import { PrismaClient } from '@prisma/client';

const prisma = withPgAdapter(
  new PrismaClient(),
  { includeModels: ['User', 'Comment'] },
);
```

### Express.js

Add the `setContext` [Express.js](https://expressjs.com/) middleware to pass application context with all underlying data changes made within an HTTP request:

```ts title="src/index.ts"
import { setContext } from "@bemi-db/prisma";
import express, { Request } from "express";

const app = express();

app.use(
  // Customizable context
  setContext((req: Request) => ({
    userId: req.user?.id,
    endpoint: req.url,
    params: req.body,
  }))
);
```

### Apollo Server

If you use [Apollo Server](https://www.apollographql.com/docs/apollo-server), it's possible use the `BemiApolloServerPlugin` to pass application context with all underlying data changes made within a GraphQL request:

```ts title="src/apollo-server.ts"
import { BemiApolloServerPlugin } from "@bemi-db/prisma";
import { ApolloServer } from "@apollo/server";

new ApolloServer({
  plugins: [
    // Customizable context
    BemiApolloServerPlugin(({ request, contextValue }: any) => ({
      userId: contextValue.userId,
      operationName: request.operationName,
      variables: request.variables,
      endpoint: request.http.headers.get('origin'),
    })),
  ],
});
```

### Next.js

With [Next.js](https://github.com/vercel/next.js) API Routes, it is possible to use the `bemiContext` function to set application context in a handler function:

```ts title="pages/api/endpoint.ts"
import { bemiContext } from "@bemi-db/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Customizable context
  bemiContext({ url: req.url, userToken: req.cookies['user-token'] });

  // ...
}
```

Alternatively, you can use our Express.js-compatible `setContext` middleware with [next-connect](https://github.com/hoangvvo/next-connect):

```ts title="pages/api/endpoint.ts"
import { setContext } from "@bemi-db/prisma";
import { createRouter, expressWrapper } from "next-connect";
import type { NextApiRequest, NextApiResponse } from "next";

const router = createRouter<NextApiRequest, NextApiResponse>();

router.use(
  // Customizable context
  setContext((req) => ({ url: req.url, userToken: req.cookies['user-token'] }))
).get((req, res) => {
  // ...
})

export default router.handler({
  onError: (err, req, res) => { res.status(500).end(err.message) },
});
```

Note that Next.js middlewares are not supported because they cannot be executed with the Node.js Runtime, see [this discussion](https://github.com/vercel/next.js/discussions/34179).

### T3 Stack

With the [T3 Stack](https://create.t3.gg/), you can use the `bemiContext` function to set application context in a tRPC `createContext` function:

```ts title="src/app/api/trpc/[trpc]/route.ts"
import { bemiContext } from "@bemi-db/prisma";

const createContext = async (req: NextRequest) => {
  // Customizable context
  bemiContext({ url: req.url, userToken: req.cookies['user-token'] });

  return createTRPCContext({
    headers: req.headers,
  });
}
```

Once it's done, make sure to update your tRPC procedures to perform database changes in the same async context.

For example, instead of returning a Promise for a Prisma query directly:

```ts title="src/server/api/routers/post.ts"
create: publicProcedure
  .input(z.object({ name: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    // The Prisma query will be executed in a separate async context, losing the Bemi context
    return ctx.db.post.create({ data: { name: input.name }});
  }),
```

Execute the Prisma query within the mutation function and then return the Promise with the manually constructed result:

```ts title="src/server/api/routers/post.ts"
create: publicProcedure
  .input(z.object({ name: z.string().min(1) }))
  .mutation(async ({ ctx, input }) => {
    // Await for the Prisma query, while it has access to the Bemi context
    const post = await ctx.db.post.create({ data: { name: input.name } });
    // Use the Prisma return-value
    return { id: post.id };
  }),
```

### Inline context

It is also possible to manually set or override context by using the `bemiContext` function:

```ts title="src/my-worker.ts"
import { bemiContext } from "@bemi-db/prisma";

const MyWorker = () => {
  bemiContext({ worker: 'MyWorker', stage: 'calculate' })
  // ...

  bemiContext({ worker: 'MyWorker', stage: 'store' })
  // ...
}
```

### SSL

If your database uses a self-signed SSL certificate and you want to enforce using it, you can modify your [Connection URL](https://www.prisma.io/docs/orm/overview/databases/postgresql#connection-url) to include the following arguments:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=verify-full&sslrootcert=./prod-ca-2021.crt
```

The `sslrootcert` argument can be a relative or an absolute path pointing to your self-signed SSL certificate.

## Data change tracking

### Local database

To test data change tracking and the Prisma integration with a locally connected PostgreSQL, you need to set up your local PostgreSQL.

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

Go to Bemi.io [Dashboard UI](https://dashboard.bemi.io/log-in?ref=prisma) and follow the instructions to connect your hosted PostgreSQL database in a few seconds.

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

Lastly, connect to the Bemi PostgreSQL destination database to easily query change data from your application.

To query the read-only historical data, add a new Prisma schema

```prisma title="prisma/bemi.prisma"
datasource db {
  provider = "postgresql"
  url      = "postgresql://[USERNAME]:[PASSWORD]@[DESTINATION_HOST]:5432/[DESTINATION_DATABASE]"
}

generator client {
  provider = "prisma-client-js"
  output   = "./generated/bemi"
}

model Change {
  id          String   @id
  primaryKey  String   @map("primary_key")
  before      Json
  after       Json
  context     Json
  database    String
  schema      String
  table       String
  operation   String
  committedAt DateTime @map("committed_at")
  createdAt   DateTime @map("created_at")

  @@map("changes")
}
```

Generate Prisma client:

```sh
npx prisma generate --schema prisma/bemi.prisma
```

Initialize a new Prisma client connected to the destination database:

```tsx title="src/bemiPrisma.ts"
import { PrismaClient } from '../prisma/generated/bemi'

const bemiPrisma = new PrismaClient()
```

Query changes from the destination database:

```tsx
const changes = await bemiPrisma.change.findMany({
  where: { table: "todo", context: { path: ['userId'], equals: 1 } },
  orderBy: { committedAt: "desc" },
  take: 1,
});
```

Or by using a raw SQL query:

```tsx

const changes = await bemiPrisma.$queryRaw`
  SELECT * FROM "changes"
  WHERE "table" = 'todo' AND "context" @> '{"userId": 1}'
  ORDER BY "committed_at" DESC
  LIMIT 1
`;
```

## License

Distributed under the terms of the [LGPL-3.0](https://github.com/BemiHQ/bemi-prisma/blob/main/LICENSE).
If you need to modify and distribute the code, please release it to contribute back to the open-source community.
