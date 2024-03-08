# Prisma

<a class="github-button" href="https://github.com/BemiHQ/bemi-prisma" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi-prisma on GitHub">BemiHQ/bemi-prisma</a>
<br />
<br />

[Bemi](https://bemi.io) plugs into [Prisma](https://github.com/prisma/prisma) and PostgreSQL to track database changes automatically. It unlocks robust context-aware audit trails and time travel querying inside your application.

This package is a recommended Prisma integration, enabling you to pass application-specific context when performing database changes. This can include context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

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

Now you can specify custom application context that will be automatically passed with all data changes by following the code examples below. Application context:

* Is bound to the current asynchronous runtime execution context, for example, an HTTP request.
* Is used only with `INSERT`, `UPDATE`, `DELETE` SQL queries performed via Prisma. Otherwise, it is a no-op.
* Is passed directly into PG [Write-Ahead Log](https://www.postgresql.org/docs/current/wal-intro.html) with data changes without affecting the structure of the database and SQL queries.

### Express.js

Add the `setContext` [Express.js](https://expressjs.com/) middleware to pass application context with all underlying data changes within made an HTTP request:

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

See this [example repo](https://github.com/BemiHQ/bemi-prisma-example) as an Todo app example with Prisma that automatically tracks all changes.

### SSL

If your database uses a self-signed SSL certificate and you want to enforce using it, you can modify your [Connection URL](https://www.prisma.io/docs/orm/overview/databases/postgresql#connection-url) to include the following arguments:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=verify-full&sslrootcert=./prod-ca-2021.crt
```

The `sslrootcert` argument can be a relative or an absolute path pointing to your self-signed SSL certificate.

## Data change tracking

Connect your PostgreSQL source database on [bemi.io](https://bemi.io) to start ingesting and storing all data changes stitched together with application-specific context. The database connection details can be securely configured through the [dashboard UI](https://dashboard.bemi.io/log-in?ref=prisma) in a few seconds.

![dashboard](/img/dashboard.png)

Once your destination PostgreSQL database has been fully provisioned, you'll see a "Connected" status. You can now test the connection after making database changes in your connected source database:

```
psql -h [HOSTNAME] -U [USERNAME] -d [DATABASE] -c 'SELECT "primary_key", "table", "operation", "before", "after", "context", "committed_at" FROM changes;'

 primary_key | table | operation |                       before                      |                       after                        |                                context                                                      |      committed_at
-------------+-------+-----------+---------------------------------------------------+----------------------------------------------------+---------------------------------------------------------------------------------------------+------------------------
 26          | todo  | CREATE    | {}                                                | {"id": 26, "task": "Sleep", "isCompleted": false}  | {"userId": 187234, "endpoint": "/todo", "params": {"task": "Sleep", "isCompleted": false}}  | 2023-12-11 17:09:09+00
 27          | todo  | CREATE    | {}                                                | {"id": 27, "task": "Eat", "isCompleted": false}    | {"userId": 187234, "endpoint": "/todo", "params": {"task": "Eat", "isCompleted": false}}    | 2023-12-11 17:09:11+00
 28          | todo  | CREATE    | {}                                                | {"id": 28, "task": "Repeat", "isCompleted": false} | {"userId": 187234, "endpoint": "/todo", "params": {"task": "Repeat", "isCompleted": false}} | 2023-12-11 17:09:13+00
 26          | todo  | UPDATE    | {"id": 26, "task": "Sleep", "isCompleted": false} | {"id": 26, "task": "Sleep", "isCompleted": true}   | {"userId": 187234, "endpoint": "/todo/complete", "params": {"id": 26}}                      | 2023-12-11 17:09:15+00
 27          | todo  | DELETE    | {"id": 27, "task": "Eat", "isCompleted": false}   | {}                                                 | {"userId": 187234, "endpoint": "/todo/27", "params": {"id": 27}}                            | 2023-12-11 17:09:18+00
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
