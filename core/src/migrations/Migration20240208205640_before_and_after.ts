import { Migration } from '@mikro-orm/migrations'

export class Migration20240208205640_before_and_after extends Migration {
  async up(): Promise<void> {
    // before - new column
    this.addSql('alter table "changes" add column "before" jsonb not null default \'{}\';')
    this.addSql('create index "changes_before_index" on "changes" using GIN ("before" jsonb_path_ops);')

    // after - rename
    this.addSql('drop index "changes_values_index";')
    this.addSql('alter table "changes" rename column "values" to "after";')
    this.addSql('create index "changes_after_index" on "changes" using GIN ("after" jsonb_path_ops);')

    // context - new index
    this.addSql('drop index "changes_context_index";')
    this.addSql('create index "changes_context_index" on "changes" using GIN ("context" jsonb_path_ops);')

    // unique constraint
    this.addSql('alter table "changes" drop constraint "changes_position_database_schema_table_values_unique";')
    this.addSql(
      'alter table "changes" add constraint "changes_position_operation_table_schema_database_unique" unique ("position", "operation", "table", "schema", "database");',
    )
  }

  async down(): Promise<void> {
    // before - drop column
    this.addSql('alter table "changes" drop column "before";')

    // after - rename
    this.addSql('drop index "changes_after_index";')
    this.addSql('alter table "changes" rename column "after" to "values";')
    this.addSql('create index "changes_values_index" on "changes" ("values");')

    // context - new index
    this.addSql('drop index "changes_context_index";')
    this.addSql('create index "changes_context_index" on "changes" ("context");')

    // unique constraint
    this.addSql('alter table "changes" drop constraint "changes_position_operation_table_schema_database_unique";')
    this.addSql(
      'alter table "changes" add constraint "changes_position_database_schema_table_values_unique" unique ("position", "database", "schema", "table", "values");',
    )
  }
}
