import { MikroORM } from '@mikro-orm/core';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql'

import { logger } from '../core/logger'
import { Message } from '../core/nats'
import { Change } from "../core/entities/Change"
import { ChangeMessage } from '../core/change-message'
import { ChangeMessagesBuffer } from '../core/change-message-buffer'
import { stitchChangeMessages } from '../core/stitching'

const INSERT_BATCH_LIMIT = 1000

const chunk = <T>(array: T[], size: number): T[][] => (
  [...Array(Math.ceil(array.length / size))].map((_, i) =>
    array.slice(size * i, size + size * i)
  )
)

const persistChangeMessages = async (orm: MikroORM<PostgreSqlDriver>, changeMessages: ChangeMessage[]) => {
  logger.info(`Persisting ${changeMessages.length} change message(s)...`)
  chunk(changeMessages, INSERT_BATCH_LIMIT).forEach((changeMsgs) => {
    const changesAttributes = changeMsgs.map(({ changeAttributes }) => changeAttributes)
    const queryBuilder = orm.em.createQueryBuilder(Change).insert(changesAttributes).onConflict().ignore();
    queryBuilder.execute()
  })
}

export const ingestMessages = async (
  { orm, messages, changeMessagesBuffer }:
  { orm: MikroORM<PostgreSqlDriver>, messages: Message[], changeMessagesBuffer: ChangeMessagesBuffer }
) => {
  const now = new Date()
  const initialChangeMessages = messages.map((message: Message) => ChangeMessage.fromMessage(message, now)).filter(Boolean) as ChangeMessage[]

  const stitchedResults = stitchChangeMessages({ changeMessages: initialChangeMessages, changeMessagesBuffer })
  const { changeMessages, ackStreamSequence, changeMessagesBuffer: newChangeMessagesBuffer } = stitchedResults
  logger.debug(stitchedResults)

  if (changeMessages.length) {
    await persistChangeMessages(orm, changeMessages)
    await orm.em.flush()
  }

  return {
    ackStreamSequence,
    changeMessagesBuffer: newChangeMessagesBuffer,
  }
}
