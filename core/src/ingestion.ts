import { MikroORM } from '@mikro-orm/core';
import type { PostgreSqlDriver } from '@mikro-orm/postgresql'

import { logger } from './logger'
import { Message } from './nats'
import { Change } from "./entities/Change"
import { ChangeMessage } from './change-message'
import { ChangeMessagesBuffer } from './change-message-buffer'
import { stitchChangeMessages } from './stitching'

const sleep = (seconds: number) => (
  new Promise(resolve => setTimeout(resolve, seconds * 1000))
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

  const iterator = await consumer.fetch({ max_messages: fetchBatchSize });

  for await (const message of iterator) {
    const { streamSequence, pending } = message.info;
    logger.debug(`Stream sequence: ${streamSequence}`)

    // Accumulate the batch
    if (!lastStreamSequence || lastStreamSequence < streamSequence) {
      messageBySequence[streamSequence] = message
    }

    // Exhausted the batch
    if (pending === 0) {
      const sequences = Object.keys(messageBySequence).sort((a, b) => Number(b) - Number(a)) // reverse sort
      const lastBatchSequence = sequences.length ? Number(sequences[0]) : null
      if (lastBatchSequence && (!lastStreamSequence || lastBatchSequence > lastStreamSequence)) {
        lastStreamSequence = lastBatchSequence;
      }
      break;
    }
  }

  return { messageBySequence, lastStreamSequence }
}

export const runIngestionLoop = async (
  {
    orm,
    consumer,
    fetchBatchSize = 100,
    insertBatchSize = 100,
    refetchEmptyAfterSeconds = 10,
    useBuffer = false,
  }: {
    orm: MikroORM<PostgreSqlDriver>,
    consumer: any,
    fetchBatchSize?: number,
    refetchEmptyAfterSeconds?: number,
    insertBatchSize?: number,
    useBuffer?: boolean,
  }
) => {
  let lastStreamSequence: number | null = null
  let changeMessagesBuffer = new ChangeMessagesBuffer()

  while (true) {
    // Fetching
    logger.info('Fetching...')
    const { messageBySequence, lastStreamSequence: newLastStreamSequence } = await fetchMessages({ consumer, fetchBatchSize, lastStreamSequence })
    const messages = Object.values(messageBySequence)
    lastStreamSequence = newLastStreamSequence

    // Stitching
    const now = new Date()
    const changeMessages = messages.map((message: Message) => ChangeMessage.fromMessage(message, now))

    const { stitchedChangeMessages, newChangeMessagesBuffer, ackStreamSequence } = stitchChangeMessages({
      changeMessagesBuffer: changeMessagesBuffer.addChangeMessages(changeMessages),
      useBuffer,
    })
    changeMessagesBuffer = newChangeMessagesBuffer

    logger.info([
      `Fetched: ${messages.length}`,
      `Saving: ${stitchedChangeMessages.length}`,
      `Pending: ${changeMessagesBuffer.size()}`,
      `Ack sequence: #${ackStreamSequence}`,
      `Last sequence: #${lastStreamSequence}`,
    ].join('. '))

    // Persisting and acking
    if (stitchedChangeMessages.length) {
      await persistChangeMessages({ orm, changeMessages: stitchedChangeMessages, insertBatchSize })
      await orm.em.flush()
    }
    if (ackStreamSequence) {
      logger.info(`Acking ${ackStreamSequence}...`)
      messageBySequence[ackStreamSequence]?.ack()
    }

    // Waiting for the next loop
    logger.debug(`Sleeping for ${refetchEmptyAfterSeconds} seconds...`)
    await sleep(refetchEmptyAfterSeconds)
  }
}
