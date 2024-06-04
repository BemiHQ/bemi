import { Migration } from '@mikro-orm/migrations'

export class Migration20240401141659_transaction_id_to_bigint extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "changes" alter column "transaction_id" type bigint using ("transaction_id"::bigint);')
  }

  async down(): Promise<void> {
    this.addSql('alter table "changes" alter column "transaction_id" type int using ("transaction_id"::int);')
  }
}
