import { Migration } from '@mikro-orm/migrations';

export class Migration20240322173541_index_operation_and_unique extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "changes" drop constraint "changes_position_operation_table_schema_database_unique";');
    this.addSql('create index "changes_operation_index" on "changes" ("operation");');
    this.addSql('alter table "changes" add constraint "changes_position_table_schema_database_unique" unique ("position", "table", "schema", "database");');
  }

  async down(): Promise<void> {
    this.addSql('drop index "changes_operation_index";');
    this.addSql('alter table "changes" drop constraint "changes_position_table_schema_database_unique";');
    this.addSql('alter table "changes" add constraint "changes_position_operation_table_schema_database_unique" unique ("position", "operation", "table", "schema", "database");');
  }

}
