import { Migration } from '@mikro-orm/migrations'

export class Migration20240409135627_timestamps_with_microsecond extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "changes" alter column "created_at" type timestamptz using ("created_at"::timestamptz);')
    this.addSql(
      'alter table "changes" alter column "committed_at" type timestamptz using ("committed_at"::timestamptz);'
    )
    this.addSql('alter table "changes" alter column "queued_at" type timestamptz using ("queued_at"::timestamptz);')
  }

  async down(): Promise<void> {
    this.addSql(
      'alter table "changes" alter column "created_at" type timestamptz(0) using ("created_at"::timestamptz(0));'
    )
    this.addSql(
      'alter table "changes" alter column "committed_at" type timestamptz(0) using ("committed_at"::timestamptz(0));'
    )
    this.addSql(
      'alter table "changes" alter column "queued_at" type timestamptz(0) using ("queued_at"::timestamptz(0));'
    )
  }
}
