---
title: Bemi vs. PaperTrail, Audited, Logidze - Advanced Rails Audit Trails
sidebar_label: Ruby on Rails
hide_title: true
description: Discover why Bemi is the preferred choice over PaperTrail, Audited, and Logidze for tracking database changes in Ruby on Rails. Learn how Bemi integrates with ActiveRecord and PostgreSQL to offer reliable, scalable audit trails with minimal performance impact.
image: 'img/rails-gems-comparison.png'
keywords: [Bemi, PaperTrail, Audited, Logidze, Rails audit trails, ActiveRecord tracking, database change logging, Rails data auditing, Rails model changes tracking]
---

# Ruby on Rails

<a class="github-button" href="https://github.com/BemiHQ/bemi-rails" data-size="large" data-show-count="true" aria-label="Star BemiHQ/bemi-rails on GitHub">BemiHQ/bemi-rails</a>
<br />
<br />

[Bemi](https://bemi.io) plugs into [Ruby on Rails](https://github.com/rails/rails) with Active Record and PostgreSQL to track database changes automatically. It unlocks robust context-aware audit trails and time travel querying inside your application.

This Ruby gem is a recommended Ruby on Rails integration, enabling you to pass application-specific context when performing database changes. This can include context such as the 'where' (API endpoint, worker, etc.), 'who' (user, cron job, etc.), and 'how' behind a change, thereby enriching the information captured by Bemi.

See this [example repo](https://github.com/BemiHQ/bemi-rails-example) as a Ruby on Rails Todo app that automatically tracks and contextualizes all changes.

## Prerequisites

- PostgreSQL 14+
- Ruby on Rails

## Installation

1. Install the gem

```rb title="Gemfile"
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

```rb title="app/controllers/application_controller.rb"
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

Application context will automatically include the original SQL query that performed data changes, which is generally useful for troubleshooting purposes.

## Data change tracking

### Local database

To test data change tracking and the Rails integration with a locally connected PostgreSQL, you need to set up your local PostgreSQL.

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

Go to Bemi.io [Dashboard UI](https://dashboard.bemi.io/log-in?ref=rails) and follow the instructions to connect your hosted PostgreSQL database in a few seconds.

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

To query historical data, configure an additional [database connection with Active Record](https://guides.rubyonrails.org/active_record_multiple_databases.html):

```yml title="config/database.yml"
production:
  primary:
    <<: *default
    # Your regular database settings go here
  bemi:
    adapter: postgresql
    encoding: unicode
    pool: <%= ENV["RAILS_MAX_THREADS"] || 5 %>
    host: <%= ENV["DESTINATION_DB_HOST"] %>
    port: <%= ENV["DESTINATION_DB_PORT"] %>
    database: <%= ENV["DESTINATION_DB_DATABASE"] %>
    username: <%= ENV["DESTINATION_DB_USERNAME"] %>
    password: <%= ENV["DESTINATION_DB_PASSWORD"] %>
    migrations_paths: db/bemi_migrate
```

Create a new model that connects to the destination database:

```rb title="app/models/bemi_record.rb"
# frozen_string_literal: true

class BemiRecord < ApplicationRecord
  self.abstract_class = true
  connects_to database: { writing: :bemi, reading: :bemi }
end
```

Create a new `BemiChange` model to access all data changes:

```rb title="app/models/bemi_change.rb"
# frozen_string_literal: true

class BemiChange < BemiRecord
  include Bemi::ChangeQueryHelpers
  self.table_name = 'changes'
end
```

Add a helper module to the tracked models or your main `ApplicationRecord` and set `bemi_change_class`:

```rb title="app/models/application_record.rb"
class ApplicationRecord < ActiveRecord::Base
  include Bemi::RecordQueryHelpers
  bemi_change_class 'BemiChange'
  # ...
end
```

### Query changes

```rb
BemiChange.take
# => #<BemiChange:0x000000012f7fab40
#  id: "fe85c5e2-489c-4172-83dd-b58f25edb412",
#  committed_at: Tue, 25 Apr 2024 22:15:50.890000000 UTC +00:00,
#  table: "todos",
#  primary_key: "27",
#  operation: "UPDATE",
#  before: {"id"=>27, "task"=>"Walk", "is_completed"=>false}>
#  after: {"id"=>27, "task"=>"Run", "is_completed"=>true},
#  context:
#   {"SQL"=> "UPDATE \"public\".\"todos\" SET \"task\" = $1, \"is_completed\" = $2 WHERE \"public\".\"todos\".\"id\" = $3",
#    "user_id"=>1,
#    "api_endpoint"=>"/todos/complete"},
#  ...
```

### Diff changed values

```rb
BemiChange.take.diff
# => { "task" => ["Walk", "Run"], "completed" => [false, true] }
```

### Query change by record

```
record = Todo.find(...)
record.bemi_changes.limit(10)
```

### Filter by values

```rb
# Query by the previous values
record.bemi_changes.before(task: 'Walk')
record.bemi_changes.before(task: 'Walk', completed: false)
record.bemi_changes.before_not(task: 'Run')

# Query by the new values
record.bemi_changes.after(task: 'Run')
record.bemi_changes.after(task: 'Run', completed: true)
record.bemi_changes.after_not(task: 'Walk')

# Query by the context values
record.bemi_changes.context(user_id: 1)
record.bemi_changes.context(user_id: 1, api_endpoint: '/tasks/complete')
record.bemi_changes.context_not(user_id: 123)

# Chain methods
record.bemi_changes.before(task: 'Walk').after(task: 'Run')
```

### Filter by operation

```rb
record.bemi_changes.created
record.bemi_changes.updated
record.bemi_changes.deleted
```

### Sort changes

```rb
record.bemi_changes.asc
record.bemi_changes.desc
```

### Build a custom query

```rb
changes = BemiChange.
  where(table: 'todos', operation: 'UPDATE').
  where('context @> ?', { user_id: 1 }.to_json).
  order(committed_at: :desc).
  limit(10)
```

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
