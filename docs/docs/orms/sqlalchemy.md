---
title: Bemi SQLAlchemy Integration - Automate Context-Aware Audit Trails with PostgreSQL
sidebar_label: SQLAlchemy
hide_title: true
description: Discover how Bemi integrates with SQLAlchemy and PostgreSQL to automatically track database changes, providing robust audit trails for your applications. Learn how to install and use the Bemi SQLAlchemy Python package for enhanced data tracking.
image: 'img/social-card.png'
keywords: [Bemi, SQLAlchemy, PostgreSQL, database auditing, data tracking, context-aware audit, application context, audit log, audit trail, data versioning]
---

# SQLAlchemy

<a class="github-button" href="https://github.com/BemiHQ/bemi-sqlalchemy" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi-sqlalchemy on GitHub">BemiHQ/bemi-sqlalchemy</a>
<br />
<br />

[Bemi](https://bemi.io) plugs into [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy) and PostgreSQL to track database changes automatically. It unlocks robust context-aware audit trails and time travel querying inside your application.

This Python package is a recommended SQLAlchemy integration, enabling you to pass application-specific context when performing database changes. This can include context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

See this [example repo](https://github.com/BemiHQ/bemi-sqlalchemy-example) as a SQLAlchemy and FastAPI Todo app that automatically tracks and contextualized all changes.

## Prerequisites

- PostgreSQL 14+
- SQLAlchemy

## Installation

1. Install the Python package

```sh
pip install bemi-sqlalchemy
```

2. Generate an [Alembic](https://github.com/sqlalchemy/alembic) migration file to add lightweight [PostgreSQL triggers](https://www.postgresql.org/docs/current/plpgsql-trigger.html) for passing application context with all data changes into PostgreSQL replication log

```sh
alembic revision -m "Init Bemi"
```

And add the following code:

```py title="alembic/versions/a925526dcc3b_init_bemi.py"
...

def upgrade() -> None:
    Bemi.migration_upgrade()

def downgrade() -> None:
    Bemi.migration_downgrade()
```

3. Run the Alembic migration

```sh
alembic upgrade head
```

## Usage

Now you can easily specify custom application context that will be automatically passed with all data changes:

```py
from bemi import Bemi
from sqlalchemy import create_engine
engine = create_engine(DATABASE_URL)

Bemi.set_context({ "process": "MyWorker" })

with engine.connect() as connection:
    connection.execute("INSERT INTO ...")
    connection.execute("UPDATE ...")
```

Application context:

* Is bound to the current execution thread within an HTTP request.
* Is used only with `INSERT`, `UPDATE`, `DELETE` SQL queries performed via SQLAlchemy. Otherwise, it is a no-op.
* Is passed directly into PG [Write-Ahead Log](https://www.postgresql.org/docs/current/wal-intro.html) with data changes without affecting the structure of the database and SQL queries.

Application context will automatically include the original SQL query that performed data changes, which is generally useful for troubleshooting purposes.

### FastAPI

Add a middleware to your [FastAPI](https://github.com/tiangolo/fastapi) app to automatically pass application context with all tracked database changes made within an HTTP request:

```py
from bemi import BemiFastAPIMiddleware
from fastapi import FastAPI

app = FastAPI()

app.add_middleware(
    BemiFastAPIMiddleware,
    set_context=lambda request : {
        "user_id": current_user(request),
        "endpoint": request.url.path,
        "method": request.method,
    }
)
```

## Data change tracking

### Local database

To test data change tracking and the SQLAlchemy integration with a locally connected PostgreSQL, you need to set up your local PostgreSQL.

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

Go to Bemi.io [Dashboard UI](https://dashboard.bemi.io/log-in?ref=sqlalchemy) and follow the instructions to connect your hosted PostgreSQL database in a few seconds.

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

## License

Distributed under the terms of the [LGPL-3.0](https://github.com/BemiHQ/bemi-sqlalchemy/blob/main/LICENSE).
If you need to modify and distribute the code, please release it to contribute back to the open-source community.
hide_title: true
