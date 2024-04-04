import { Migration } from '@mikro-orm/migrations';

export class Migration20240322153919_index_table extends Migration {

  async up(): Promise<void> {
    this.addSql('CREATE INDEX IF NOT EXISTS "changes_table_index" ON "changes" ("table");');
  }

  async down(): Promise<void> {
    this.addSql('drop index "changes_table_index";');
  }

}
