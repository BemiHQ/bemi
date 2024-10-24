---
title: Bemi Supabase JS Integration - Automate Context-Aware Audit Trails with PostgreSQL
sidebar_label: Supabase JS
hide_title: true
description: Discover how Bemi integrates with Supabase JS and PostgreSQL to automatically track database changes, providing robust audit trails for your applications. Learn how to install and use the Bemi Supabase JS package for enhanced data tracking.
image: 'img/social-card.png'
keywords: [Bemi, Supabase, PostgreSQL, database auditing, data tracking, context-aware audit, application context, audit log, audit trail, data versioning]
---

# Supabase JS

<a class="github-button" href="https://github.com/BemiHQ/bemi-supabase-js" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi-supabase-js on GitHub">BemiHQ/bemi-supabase-js</a>
<br />
<br />

[Bemi](https://bemi.io) plugs into [Supabase JS](https://github.com/supabase/supabase-js) and PostgreSQL to track database changes automatically. It unlocks robust context-aware audit trails and time travel querying inside your application.

This package is a recommended Supabase JS integration, enabling you to pass application-specific context when performing database changes. This can include context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

See this [example repo](https://github.com/BemiHQ/bemi-supabase-js-example) as an Todo app example with Supabase JS that automatically tracks and contextualizes all changes.

## Prerequisites

- Supabase JS

## Installation

1. Install the NPM package

```sh
npm install @bemi-db/supabase-js
```

2. Generate a Supabase JS migration file to add a [Database Function](https://supabase.com/docs/guides/database/functions) for passing application context with all data changes into PostgreSQL replication log

```sh
npx bemi migration new
```

3. Run the Supabase JS migration

```sh
npx supabase migration up
```

## Usage

Now you can easily specify custom application context that will be automatically passed with all data changes by calling `setContext` in your [Supabase Edge Function](https://supabase.com/docs/guides/functions):

```ts
import { setContext } from 'https://esm.sh/@bemi-db/supabase-js@0.1.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.5'

Deno.serve(async (req) => {
  const supabase = createClient(...)
  const { method, url } = req
  const endpoint = `/${url.split('/')[3]}`
  const payload = method === 'POST' ? await req.json() : {}

  // Customizable context
  await setContext(supabase, { method, endpoint, payload })

  // Your code that performs data changes
})
```


Application context:

* Is bound to the current database session within an HTTP request.
* Is used only with `INSERT`, `UPDATE`, `DELETE` SQL queries performed via Supabase JS.
* Is passed directly into PG [Write-Ahead Log](https://www.postgresql.org/docs/current/wal-intro.html) with data changes without affecting the structure of the database and SQL queries.

## Data change tracking

### Local database

To test data change tracking and the Supabase JS integration with a locally connected PostgreSQL, you need to set up your local PostgreSQL.

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

Go to Bemi.io [Dashboard UI](https://dashboard.bemi.io/log-in?ref=supabase-js) and follow the instructions to connect your hosted PostgreSQL database in a few seconds.

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

See [Destination Database](/postgresql/destination-database) for more details.

## License

Distributed under the terms of the [LGPL-3.0](https://github.com/BemiHQ/bemi-supabase-js/blob/main/LICENSE).
If you need to modify and distribute the code, please release it to contribute back to the open-source community.
