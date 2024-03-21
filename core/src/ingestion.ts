import { MikroORM } from '@mikro-orm/core';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql'

import { logger } from './logger'
import { Message } from './nats'
import { Change } from "./entities/Change"
import { ChangeMessage } from './change-message'
import { ChangeMessagesBuffer } from './change-message-buffer'
import { stitchChangeMessages } from './stitching'

const INSERT_INTERVAL_MS = 1000 // 1 second to avoid overwhelming the database

const sleep = (ms: number) => (
  new Promise(resolve => setTimeout(resolve, ms))
)

const chunk = <T>(array: T[], size: number): T[][] => (
  [...Array(Math.ceil(array.length / size))].map((_, i) =>
    array.slice(size * i, size + size * i)
  )
)

const persistChangeMessages = async (
  { orm, changeMessages, insertBatchSize }:
  { orm: MikroORM<PostgreSqlDriver>, changeMessages: ChangeMessage[], insertBatchSize: number }
) => {
  logger.info(`Persisting ${changeMessages.length} change message(s)...`)
  chunk(changeMessages, insertBatchSize).forEach((changeMsgs) => {
    const changesAttributes = changeMsgs.map(({ changeAttributes }) => changeAttributes)
    const queryBuilder = orm.em.createQueryBuilder(Change).insert(changesAttributes).onConflict().ignore();
    queryBuilder.execute()
  })
}

const fetchMessages = async (
  { consumer, fetchBatchSize, lastStreamSequence }:
  { consumer: any, fetchBatchSize: number, lastStreamSequence: number | null }
) => {
  const messageBySequence: { [sequence: number]: Message } = {}
  let pendingMessageCount = 0

  const iterator = await consumer.fetch({ max_messages: fetchBatchSize });

  for await (const message of iterator) {
    const { streamSequence, pending } = message.info;
    logger.debug(`Stream sequence: ${streamSequence}, pending: ${pending}`)

    pendingMessageCount = pending

    // Accumulate the batch
    if (!lastStreamSequence || lastStreamSequence < streamSequence) {
      messageBySequence[streamSequence] = message
    }

    // Exhausted the batch
    if (pendingMessageCount === 0) break;
  }

  return { messageBySequence, pendingMessageCount }
}

export const runIngestionLoop = async (
  {
    orm,
    consumer,
    fetchBatchSize = 100,
    insertBatchSize = 100,
    useBuffer = false,
  }: {
    orm: MikroORM<PostgreSqlDriver>,
    consumer: any,
    fetchBatchSize?: number,
    insertBatchSize?: number,
    useBuffer?: boolean,
  }
) => {
  let lastStreamSequence: number | null = null
  let changeMessagesBuffer = new ChangeMessagesBuffer()

  while (true) {
    // Fetching
    logger.info('Fetching...')
    const fetchedMessages = await fetchMessages({ consumer, fetchBatchSize, lastStreamSequence })
    const { messageBySequence, pendingMessageCount } = fetchedMessages

    // Last sequence tracking
    const sequences = Object.keys(messageBySequence).sort((a, b) => Number(b) - Number(a)) // reverse sort
    if (sequences.length) {
      const lastBatchSequence = Number(sequences[0])
      if (!lastStreamSequence || lastBatchSequence > lastStreamSequence) {
        lastStreamSequence = lastBatchSequence;
      }
    }

    // Stitching
    const now = new Date()
    const messages = Object.values(messageBySequence)
    const changeMessages = messages.map((message: Message) => ChangeMessage.fromMessage(message, now))
    const { stitchedChangeMessages, newChangeMessagesBuffer, ackStreamSequence } = stitchChangeMessages({
      changeMessagesBuffer: changeMessagesBuffer.addChangeMessages(changeMessages),
      useBuffer,
    })
    changeMessagesBuffer = newChangeMessagesBuffer

    logger.info([
      `Fetched: ${messages.length}`,
      `Saving: ${stitchedChangeMessages.length}`,
      `Pending in buffer: ${changeMessagesBuffer.size()}`,
      `Pending in stream: ${pendingMessageCount}`,
      `Ack sequence: ${ackStreamSequence ? `#${ackStreamSequence}` : 'none'}`,
      `Last sequence: #${lastStreamSequence}`,
    ].join('. '))

    // Persisting and acking
    if (stitchedChangeMessages.length) {
      await persistChangeMessages({ orm, changeMessages: stitchedChangeMessages, insertBatchSize })
      await orm.em.flush()
    }
    if (ackStreamSequence) {
      logger.debug(`Acking ${ackStreamSequence}...`)
      messageBySequence[ackStreamSequence]?.ack()
    }

    if (stitchedChangeMessages.length) {
      logger.debug('Sleeping...')
      await sleep(INSERT_INTERVAL_MS)
    }
  }
}
