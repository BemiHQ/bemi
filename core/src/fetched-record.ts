import { RequiredEntityData } from '@mikro-orm/postgresql'
import { JsMsg } from 'nats'

import { Change, Operation } from './entities/Change'
import { decodeData } from './nats'

export const MESSAGE_PREFIX_CONTEXT = '_bemi'
export const MESSAGE_PREFIX_HEARTBEAT = '_bemi_heartbeat'
const UNAVAILABLE_VALUE_PLACEHOLDER = '__bemi_unavailable_value'

const parseDebeziumData = (debeziumChange: any, now: Date): RequiredEntityData<Change> => {
  const {
    op,
    before: beforeRaw,
    after: afterRaw,
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

  const before = beforeRaw || {}
  const after = afterRaw || {}
  const primaryKey = (operation === Operation.DELETE ? before : after).id?.toString()
  // Normalize by copying the value from the other side if it's unavailable
  Object.keys(beforeRaw || {}).forEach((key) => {
    if (Array.isArray(before[key]) && before[key].includes(UNAVAILABLE_VALUE_PLACEHOLDER)) {
      before[key] = after[key]
    } else if (Array.isArray(after[key]) && after[key].includes(UNAVAILABLE_VALUE_PLACEHOLDER)) {
      after[key] = before[key]
    } else if (before[key] === UNAVAILABLE_VALUE_PLACEHOLDER || after[key] === UNAVAILABLE_VALUE_PLACEHOLDER) {
      throw new Error(`Before or after values are unavailable for: ${table}#${primaryKey} (${key})`)
    }
  })

  const context =
    message?.prefix === MESSAGE_PREFIX_CONTEXT
      ? JSON.parse(Buffer.from(message?.content, 'base64').toString('utf-8')) || {} // Fallback to '{}' from 'null' if it's passed explicitly as a context
      : {}

  return {
    primaryKey,
    before,
    after,
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

export class FetchedRecord {
  changeAttributes: RequiredEntityData<Change>
  subject: string
  streamSequence: number
  messagePrefix?: string

  constructor({
    changeAttributes,
    subject,
    streamSequence,
    messagePrefix,
  }: {
    changeAttributes: RequiredEntityData<Change>
    subject: string
    streamSequence: number
    messagePrefix?: string
  }) {
    this.changeAttributes = changeAttributes
    this.subject = subject
    this.streamSequence = streamSequence
    this.messagePrefix = messagePrefix
  }

  static fromNatsMessage(
    natsMessage: JsMsg,
    {
      now = new Date(),
      changeAttributesOverride = (changeAttributes: RequiredEntityData<Change>) => changeAttributes,
    } = {},
  ) {
    const debeziumData = decodeData(natsMessage.data) as any

    const messagePrefix = debeziumData.message?.prefix
    if (messagePrefix && messagePrefix !== MESSAGE_PREFIX_CONTEXT && messagePrefix !== MESSAGE_PREFIX_HEARTBEAT) {
      // Ignore non-Bemi message prefixes
      return null
    }

    const changeAttributes = changeAttributesOverride(parseDebeziumData(debeziumData, now))

    return new FetchedRecord({
      changeAttributes,
      subject: natsMessage.subject,
      streamSequence: natsMessage.info.streamSequence,
      messagePrefix,
    })
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
    const newFetchedRecord = Object.assign(Object.create(this), this)
    newFetchedRecord.changeAttributes = { ...this.changeAttributes, context }
    return newFetchedRecord
  }

  private isMessage() {
    return this.changeAttributes.operation === Operation.MESSAGE
  }
}
