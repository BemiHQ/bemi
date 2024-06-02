import { Migration } from '@mikro-orm/migrations'

export class Migration20240322174908_return_unique_index extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "changes" drop constraint "changes_position_table_schema_database_unique";')
    this.addSql(
      'alter table "changes" add constraint "changes_position_table_schema_database_operation_unique" unique ("position", "table", "schema", "database", "operation");'
    )
  }

  async down(): Promise<void> {
    this.addSql('alter table "changes" drop constraint "changes_position_table_schema_database_operation_unique";')
    this.addSql(
      'alter table "changes" add constraint "changes_position_table_schema_database_unique" unique ("position", "table", "schema", "database");'
    )
  }
}
