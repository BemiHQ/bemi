import { MikroORM, RequiredEntityData } from '@mikro-orm/postgresql'
import { Consumer, JsMsg } from 'nats'

import { logger } from './logger'
import { Change } from './entities/Change'
import { FetchedRecord } from './fetched-record'
import { FetchedRecordBuffer } from './fetched-record-buffer'
import { stitchFetchedRecords } from './stitching'

const INSERT_INTERVAL_MS = 1000 // 1 second to avoid overwhelming the database
const FETCH_EXPIRES_MS = 30_000 // 30 seconds, default

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const chunk = <T>(array: T[], size: number): T[][] =>
  [...Array(Math.ceil(array.length / size))].map((_, i) => array.slice(size * i, size + size * i))

const persistFetchedRecords = async ({
  orm,
  fetchedRecords,
  insertBatchSize,
}: {
  orm: MikroORM
  fetchedRecords: FetchedRecord[]
  insertBatchSize: number
}) => {
  logger.info(`Persisting ${fetchedRecords.length} change message(s)...`)
  const batches = chunk(fetchedRecords, insertBatchSize)

  for (const fetchedRecs of batches) {
    const changesAttributes = fetchedRecs.map(({ changeAttributes }) => changeAttributes)
    const queryBuilder = orm.em.createQueryBuilder(Change).insert(changesAttributes).onConflict().ignore()
    await queryBuilder.execute()
  }
}

const fetchNatsMessages = async ({
  consumer,
  fetchBatchSize,
  lastStreamSequence,
}: {
  consumer: Consumer
  fetchBatchSize: number
  lastStreamSequence: number | null
}) => {
  const natsMessageBySequence: { [sequence: number]: JsMsg } = {}
  let pendingMessageCount = 0

  const iterator = await consumer.fetch({ max_messages: fetchBatchSize, expires: FETCH_EXPIRES_MS })

  for await (const natsMessage of iterator) {
    const { streamSequence, pending } = natsMessage.info
    logger.debug(`Fetched stream sequence: ${streamSequence}, pending: ${pending}`)

    pendingMessageCount = pending

    // Accumulate the batch
    if (!lastStreamSequence || lastStreamSequence < streamSequence) {
      natsMessageBySequence[streamSequence] = natsMessage
    }
  }

  return { natsMessageBySequence, pendingMessageCount }
}

export const runIngestionLoop = async ({
  orm,
  consumer,
  fetchBatchSize = 100,
  insertBatchSize = 100,
  useBuffer = false,
  changeAttributesOverride = (changeAttributes: RequiredEntityData<Change>) => changeAttributes,
}: {
  orm: MikroORM
  consumer: Consumer
  fetchBatchSize?: number
  insertBatchSize?: number
  useBuffer?: boolean
  changeAttributesOverride?: (changeAttributes: RequiredEntityData<Change>) => RequiredEntityData<Change>
}) => {
  let lastStreamSequence: number | null = null
  let fetchedRecordBuffer = new FetchedRecordBuffer()

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Fetching
    logger.info('Fetching...')
    const { natsMessageBySequence, pendingMessageCount } = await fetchNatsMessages({
      consumer,
      fetchBatchSize,
      lastStreamSequence,
    })

    // Last sequence tracking
    const sequences = Object.keys(natsMessageBySequence).sort((a, b) => Number(b) - Number(a)) // reverse sort
    if (sequences.length) {
      const lastBatchSequence = Number(sequences[0])
      if (!lastStreamSequence || lastBatchSequence > lastStreamSequence) {
        lastStreamSequence = lastBatchSequence
      }
    }

    // Stitching
    const now = new Date()
    const natsMessages = Object.values(natsMessageBySequence)
    const fetchedRecords = natsMessages
      .map((m: JsMsg) => FetchedRecord.fromNatsMessage(m, { now, changeAttributesOverride }))
      .filter((r) => r) as FetchedRecord[]
    const { stitchedFetchedRecords, newFetchedRecordBuffer, ackStreamSequence } = stitchFetchedRecords({
      fetchedRecordBuffer: fetchedRecordBuffer.addFetchedRecords(fetchedRecords),
      useBuffer,
    })
    fetchedRecordBuffer = newFetchedRecordBuffer

    logger.info(
      [
        `Fetched: ${natsMessages.length}`,
        `Saving: ${stitchedFetchedRecords.length}`,
        `Pending in buffer: ${fetchedRecordBuffer.size()}`,
        `Pending in stream: ${pendingMessageCount}`,
        `Ack sequence: ${ackStreamSequence ? `#${ackStreamSequence}` : 'none'}`,
        `Last sequence: #${lastStreamSequence}`,
      ].join('. '),
    )

    // Persisting and acking
    if (stitchedFetchedRecords.length) {
      try {
        await persistFetchedRecords({ orm, fetchedRecords: stitchedFetchedRecords, insertBatchSize })
      } catch (e) {
        logger.info(`Error while saving: ${e}`)
        throw e
      }
    }
    if (ackStreamSequence) {
      logger.debug(`Acking ${ackStreamSequence}...`)
      natsMessageBySequence[ackStreamSequence]?.ack()
    }

    if (stitchedFetchedRecords.length) {
      logger.debug('Sleeping...')
      await sleep(INSERT_INTERVAL_MS)
    }
  }
}
