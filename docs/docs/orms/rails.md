# Ruby on Rails

<a class="github-button" href="https://github.com/BemiHQ/bemi-rails" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi-rails on GitHub">BemiHQ/bemi-rails</a>
<br />
<br />

[Bemi](https://bemi.io) plugs into [Ruby on Rails](https://github.com/rails/rails) with Active Record and PostgreSQL to track database changes automatically. It unlocks robust context-aware audit trails and time travel querying inside your application.

This Ruby gem is a recommended Ruby on Rails integration, enabling you to pass application-specific context when performing database changes. This can include context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

## Prerequisites

- PostgreSQL 14+
- Ruby on Rails

## Installation

1. Install the gem by adding it to your `Gemfile`

```
gem 'bemi-rails'
```

2. Generate a Rails migration file to add lightweight [PostgreSQL triggers](https://www.postgresql.org/docs/current/plpgsql-trigger.html) for passing application context with all data changes into PostgreSQL replication log

```sh
bin/rails g bemi:migration
```

3. Run the rails migration

```sh
bin/rails db:migrate
```

## Usage

Now you can easily specify custom application context that will be automatically passed with all data changes.

```rb
class ApplicationController < ActionController::Base
  before_action :set_bemi_context

  private

  def set_bemi_context
    Bemi.set_context(
      user_id: current_user&.id,
      endpoint: "#{request.method} #{request.path}",
      method: "#{self.class}##{action_name}",
    )
  end
end
```

Application context:

* Is bound to the current Ruby thread. So it is isolated to a single HTTP request or background job.
* Is used only with `INSERT`, `UPDATE`, `DELETE` SQL queries performed via Active Record. Otherwise, it is a no-op.
* Is passed directly into PG [Write-Ahead Log](https://www.postgresql.org/docs/current/wal-intro.html) with data changes without affecting the structure of the database and SQL queries.


## Data change tracking

Connect your PostgreSQL source database on [bemi.io](https://bemi.io) to start ingesting and storing all data changes stitched together with application-specific context. The database connection details can be securely configured through the [dashboard UI](https://dashboard.bemi.io/log-in?ref=rails) in a few seconds.

![dashboard](/img/dashboard.png)

Once your destination PostgreSQL database has been fully provisioned, you'll see a "Connected" status. You can now test the connection after making database changes in your connected source database:

```
psql -h us-west-1-prod-destination-pool.ctbxbtz4ojdc.us-west-1.rds.amazonaws.com -p 5432 -U u_9adb30103a55 -d db_9adb30103a55 -c \
  'SELECT "primary_key", "table", "operation", "before", "after", "context", "committed_at" FROM changes;'
Password for user u_9adb30103a55:

 primary_key | table  | operation |                       before                    |                       after                      |                                context                                                   |      committed_at
-------------+--------+-----------+-------------------------------------------------+--------------------------------------------------+------------------------------------------------------------------------------------------+------------------------
 26          | todos  | CREATE    | {}                                              | {"id": 26, "task": "Sleep", "completed": false}  | {"user_id": 187234, "endpoint": "POST /todos", "method": "TodosController#create"}       | 2023-12-11 17:09:09+00
 27          | todos  | CREATE    | {}                                              | {"id": 27, "task": "Eat", "completed": false}    | {"user_id": 187234, "endpoint": "POST /todos", "method": "TodosController#create"}       | 2023-12-11 17:09:11+00
 28          | todos  | CREATE    | {}                                              | {"id": 28, "task": "Repeat", "completed": false} | {"user_id": 187234, "endpoint": "POST /todos", "method": "TodosController#create"}       | 2023-12-11 17:09:13+00
 26          | todos  | UPDATE    | {"id": 26, "task": "Sleep", "completed": false} | {"id": 26, "task": "Sleep", "completed": true}   | {"user_id": 187234, "endpoint": "POST /todos/26", "method": "TodosController#update"}    | 2023-12-11 17:09:15+00
 27          | todos  | DELETE    | {"id": 27, "task": "Eat", "completed": false}   | {}                                               | {"user_id": 187234, "endpoint": "DELETE /todos/27", "method": "TodosController#destroy"} | 2023-12-11 17:09:18+00
```

See [Destination Database](/postgresql/destination-database) for more details.

## Alternative gems

|                            | [Bemi](https://github.com/BemiHQ/bemi-rails)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | [PaperTrail](https://github.com/paper-trail-gem/paper_trail) | [Audited](https://github.com/collectiveidea/audited)&nbsp;&nbsp;&nbsp;&nbsp; | [Logidze](https://github.com/palkan/logidze)&nbsp;&nbsp;&nbsp;&nbsp; |
|----------------------------|------|------|------|------|
| Open source                | ✅   | ✅   | ✅   | ✅   |
| Capturing record deletions | ✅   | ✅   | ✅   | ❌   |
| Reliability and accuracy   | ✅   | ❌   | ❌   | ❌   |
| Scalability                | ✅   | ❌   | ❌   | ❌   |
| No performance impact      | ✅   | ❌   | ❌   | ❌   |
| Easy-to-use UI             | ✅   | ❌   | ❌   | ❌   |

## License

Distributed under the terms of the [LGPL-3.0](https://github.com/BemiHQ/bemi-rails/blob/main/LICENSE).
If you need to modify and distribute the code, please release it to contribute back to the open-source community.
