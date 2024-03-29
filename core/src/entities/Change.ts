import { Entity, Property, Index, Unique, Enum, JsonType } from '@mikro-orm/core';

import { BaseEntity } from './BaseEntity';

export enum Operation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  TRUNCATE = 'TRUNCATE',
  MESSAGE = 'MESSAGE',
}

@Entity({ tableName: 'changes' })

@Index({ properties: ['primaryKey'] })
@Index({ properties: ['committedAt'] })
@Index({ properties: ['context'], type: 'GIN' })
@Index({ properties: ['before'], type: 'GIN' })
@Index({ properties: ['after'], type: 'GIN' })
@Unique({ properties: ['position', 'operation', 'table', 'schema', 'database'] })

export class Change extends BaseEntity {
  @Property({ nullable: true })
  primaryKey: string | undefined;

  @Property({ type: JsonType, default: '{}' })
  before: object;

  @Property({ type: JsonType, default: '{}' })
  after: object;

  @Property({ type: JsonType, default: '{}' })
  context: object;

  @Property()
  database: string;

  @Property()
  schema: string;

  @Property()
  table: string;

  @Enum(() => Operation)
  operation: Operation;

  @Property()
  committedAt: Date;

  @Property()
  queuedAt: Date;

  @Property({ type: 'integer' })
  transactionId: number;

  @Property({ type: 'bigint' })
  position: number;

  constructor(
    { primaryKey, before, after, context, database, schema, table, operation, committedAt, queuedAt, transactionId, position }:
    { primaryKey?: string, before: object, after: object, context: object, database: string, schema: string, table: string, operation: Operation, committedAt: Date, queuedAt: Date, transactionId: number, position: number }
  ) {
    super();
    this.primaryKey = primaryKey;
    this.before = before;
    this.after = after;
    this.context = context;
    this.database = database;
    this.schema = schema;
    this.table = table;
    this.operation = operation;
    this.committedAt = committedAt;
    this.queuedAt = queuedAt;
    this.transactionId = transactionId;
    this.position = position;
  }
}
