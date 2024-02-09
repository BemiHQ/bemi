import { RequiredEntityData } from '@mikro-orm/core';

import { Change, Operation } from "./entities/Change"
import { Message, decodeData } from './nats'

export const MESSAGE_PREFIX_CONTEXT = '_bemi'
export const MESSAGE_PREFIX_HEARTBEAT = '_bemi_heartbeat'

const parseDebeziumData = (debeziumChange: any, now: Date) => {
  const {
    op,
    before,
    after,
    ts_ms: queueAtMs,
    message,
    source: { db: database, schema, table, txId: transactionId, lsn: position, ts_ms: committedAtMs },
  } = debeziumChange

  let operation
  if (op === 'c') operation = Operation.CREATE
  else if (op === 'u') operation = Operation.UPDATE
  else if (op === 'd') operation = Operation.DELETE
  else if (op === 't') operation = Operation.TRUNCATE
  else if (op === 'm') operation = Operation.MESSAGE
  else throw new Error(`Unknown operation: ${op}`)

  const context = message?.prefix === MESSAGE_PREFIX_CONTEXT ?
    JSON.parse(Buffer.from(message?.content, 'base64').toString('utf-8')) :
    {}

  return {
    primaryKey: (operation === Operation.DELETE ? before : after)?.id?.toString(),
    before: before || {},
    after: after || {},
    context,
    database,
    schema,
    table,
    operation,
    committedAt: new Date(committedAtMs),
    queuedAt: new Date(queueAtMs),
    transactionId,
    position: parseInt(position, 10),
    createdAt: now,
  }
}

export class ChangeMessage {
  changeAttributes: RequiredEntityData<Change>
  subject: string
  streamSequence: number
  messagePrefix?: string

  constructor(
    { changeAttributes, subject, streamSequence, messagePrefix }:
    { changeAttributes: RequiredEntityData<Change>, subject: string, streamSequence: number, messagePrefix?: string }
  ) {
    this.changeAttributes = changeAttributes
    this.subject = subject
    this.streamSequence = streamSequence
    this.messagePrefix = messagePrefix
  }

  static fromMessage(message: Message, now = new Date()) {
    const debeziumData = decodeData(message.data) as any

    return new ChangeMessage({
      changeAttributes: parseDebeziumData(debeziumData, now),
      subject: message.subject,
      streamSequence: message.info.streamSequence,
      messagePrefix: debeziumData.message?.prefix,
    })
  }

  isMessage() {
    return this.changeAttributes.operation === Operation.MESSAGE
  }

  isContextMessage() {
    return this.isMessage() && this.messagePrefix === MESSAGE_PREFIX_CONTEXT
  }

  isHeartbeatMessage() {
    return this.isMessage() && this.messagePrefix === MESSAGE_PREFIX_HEARTBEAT
  }

  context() {
    return this.changeAttributes.context as object
  }

  setContext(context: object) {
    const newChangeMessage = Object.assign(Object.create(this), this)
    newChangeMessage.changeAttributes = { ...this.changeAttributes, context }
    return newChangeMessage
  }
}
