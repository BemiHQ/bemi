---
title: Bemi Django Integration - Automate Context-Aware Audit Trails with PostgreSQL
sidebar_label: Django
hide_title: true
description: Discover how Bemi integrates with Django and PostgreSQL to automatically track database changes, providing robust audit trails for your applications. Learn how to install and use the Bemi Django Python package for enhanced data tracking.
image: 'img/social-card.png'
keywords: [Bemi, Django, PostgreSQL, database auditing, data tracking, context-aware audit, application context, audit log, audit trail, data versioning]
---

# Django

<a class="github-button" href="https://github.com/BemiHQ/bemi-django" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi-django on GitHub">BemiHQ/bemi-django</a>
<br />
<br />

[Bemi](https://bemi.io) plugs into [Django](https://github.com/django/django) and PostgreSQL to track database changes automatically. It unlocks robust context-aware audit trails and time travel querying inside your application.

This Python package is a recommended Django integration, enabling you to pass application-specific context when performing database changes. This can include context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

See this [example repo](https://github.com/BemiHQ/bemi-django-example) as a Django Todo app that automatically tracks and contextualized all changes.

## Prerequisites

- PostgreSQL 14+
- Django

## Installation

1. Install the Python package

```sh
pip install bemi-django
```

2. Run the migration add lightweight [PostgreSQL triggers](https://www.postgresql.org/docs/current/plpgsql-trigger.html) for passing application context with all data changes into PostgreSQL replication log

```sh
python manage.py migrate bemi
```

## Usage

Add the Bemi middleware to your Django project app and add the path to a custom `get_bemi_context` function to automatically pass application context with all tracked database changes made within an HTTP request:

```py
# settings.py

INSTALLED_APPS = [
    # Your other apps
    'bemi',
]

MIDDLEWARE = [
    # Your other middlewares
    'bemi.BemiMiddleware',
]

BEMI_CONTEXT_FUNCTION = 'your_project.utils.get_bemi_context'
```

Now you can easily specify custom application context:

```py
# utils.py

def get_bemi_context(request):
    # Return any custom context dict
    return {
      'user_id': request.user.id,
      'method': request.method,
      'path': request.path,
    }
```

Application context:

* Is bound to the current execution thread within an HTTP request.
* Is used only with `INSERT`, `UPDATE`, `DELETE` SQL queries performed via Django. Otherwise, it is a no-op.
* Is passed directly into PG [Write-Ahead Log](https://www.postgresql.org/docs/current/wal-intro.html) with data changes without affecting the structure of the database and SQL queries.

Application context will automatically include the original SQL query that performed data changes, which is generally useful for troubleshooting purposes.

## Database connection

Connect your PostgreSQL source database on [bemi.io](https://bemi.io) to start ingesting and storing all data changes stitched together with application-specific context. The database connection details can be securely configured through the [dashboard UI](https://dashboard.bemi.io/log-in?ref=django) in a few seconds.

![dashboard](/img/dashboard.png)

Once your destination PostgreSQL database has been fully provisioned, you'll see a "Connected" status. You can now test the connection after making database changes in your connected source database:

```
psql postgres://[USERNAME]:[PASSWORD]@[HOSTNAME]:5432/[DATABASE] -c 'SELECT "primary_key", "table", "operation", "before", "after", "context", "committed_at" FROM changes;'

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

Distributed under the terms of the [LGPL-3.0](https://github.com/BemiHQ/bemi-django/blob/main/LICENSE).
If you need to modify and distribute the code, please release it to contribute back to the open-source community.
hide_title: true
