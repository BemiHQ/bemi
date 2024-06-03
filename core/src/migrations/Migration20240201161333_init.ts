import { Migration } from '@mikro-orm/migrations'

export class Migration20240201161333_init extends Migration {
  async up(): Promise<void> {
    this.addSql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    this.addSql(
      'create table "changes" ("id" uuid not null default uuid_generate_v4(), "created_at" timestamptz(0) not null, "primary_key" varchar(255) null, "values" jsonb not null default \'{}\', "context" jsonb not null default \'{}\', "database" varchar(255) not null, "schema" varchar(255) not null, "table" varchar(255) not null, "operation" text check ("operation" in (\'CREATE\', \'UPDATE\', \'DELETE\', \'TRUNCATE\', \'MESSAGE\')) not null, "committed_at" timestamptz(0) not null, "queued_at" timestamptz(0) not null, "transaction_id" int not null, "position" bigint not null, constraint "changes_pkey" primary key ("id"));',
    )
    this.addSql('create index "changes_committed_at_index" on "changes" ("committed_at");')
    this.addSql('create index "changes_context_index" on "changes" ("context");')
    this.addSql('create index "changes_values_index" on "changes" ("values");')
    this.addSql('create index "changes_primary_key_index" on "changes" ("primary_key");')
    this.addSql(
      'alter table "changes" add constraint "changes_position_database_schema_table_values_unique" unique ("position", "database", "schema", "table", "values");',
    )
  }

  async down(): Promise<void> {
    this.addSql('drop table if exists "changes" cascade;')
  }
}
