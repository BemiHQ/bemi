import { logger } from './logger'
import { FetchedRecord } from './fetched-record'
import { FetchedRecordBuffer } from './fetched-record-buffer'

export const stitchFetchedRecords = ({
  fetchedRecordBuffer,
  useBuffer = false
}: {
  fetchedRecordBuffer: FetchedRecordBuffer
  useBuffer: boolean
}) => {
  let stitchedFetchedRecords: FetchedRecord[] = []
  let maxSequence: number | undefined = undefined
  let maxSequenceBySubject: { [key: string]: number } = {}
  let newFetchedRecordBuffer = new FetchedRecordBuffer()

  fetchedRecordBuffer.forEach((subject, sortedFetchedRecords) => {
    if (
      sortedFetchedRecords.length &&
      (!maxSequence || sortedFetchedRecords[sortedFetchedRecords.length - 1].streamSequence > maxSequence)
    ) {
      maxSequence = sortedFetchedRecords[sortedFetchedRecords.length - 1].streamSequence
    }

    let maxSubjectSequence: number | undefined = undefined

    sortedFetchedRecords.forEach((fetchedRecord) => {
      const position = fetchedRecord.changeAttributes.position.toString()
      const samePositionFetchedRecords = fetchedRecordBuffer.fetchedRecordsByPosition(subject, position)
      const contextFetchedRecord = samePositionFetchedRecords.find((r) => r.isContextMessage())

      // If it's a heartbeat message/change, use its sequence number
      if (fetchedRecord.isHeartbeatMessage()) {
        logger.debug(`Ignoring heartbeat message`)
        if (!maxSubjectSequence || maxSubjectSequence < fetchedRecord.streamSequence) {
          maxSubjectSequence = fetchedRecord.streamSequence
          maxSequenceBySubject = { ...maxSequenceBySubject, [subject]: maxSubjectSequence }
        }
        return
      }

      // Last message without a pair - add it to the buffer
      if (
        useBuffer &&
        samePositionFetchedRecords.length === 1 && // No-pair change or context
        fetchedRecord === sortedFetchedRecords[sortedFetchedRecords.length - 1] // Last message
      ) {
        newFetchedRecordBuffer = newFetchedRecordBuffer.addFetchedRecord(fetchedRecord)
        return
      }

      // Context message (non-mutation) - skip it, it'll be used later
      if (fetchedRecord.isContextMessage()) {
        return
      }

      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      // Update ack sequence number
      if (!maxSubjectSequence || maxSubjectSequence < fetchedRecord.streamSequence) {
        maxSubjectSequence = fetchedRecord.streamSequence
        maxSequenceBySubject = { ...maxSequenceBySubject, [subject]: maxSubjectSequence }
      }

      if (contextFetchedRecord) {
        // Stitch with context message change message if it exists
        stitchedFetchedRecords = [...stitchedFetchedRecords, fetchedRecord.setContext(contextFetchedRecord.context())]
      } else {
        // Return mutation change message as is without stitching
        stitchedFetchedRecords = [...stitchedFetchedRecords, fetchedRecord]
      }
    })
  })

  let ackStreamSequence
  if (newFetchedRecordBuffer.size()) {
    let subjectWithMaxSequence: string | undefined = undefined
    Object.keys(maxSequenceBySubject).forEach((subject) => {
      // Set an initial subject
      if (!subjectWithMaxSequence) {
        subjectWithMaxSequence = subject
        return
      }
      // If the previous subject has a lower sequence number and it doesn't have any messages in the buffer, use the new subject
      if (
        maxSequenceBySubject[subject] > maxSequenceBySubject[subjectWithMaxSequence] &&
        newFetchedRecordBuffer.sizeBySubject(subjectWithMaxSequence) === 0
      ) {
        subjectWithMaxSequence = subject
      }
    })
    ackStreamSequence = maxSequenceBySubject[subjectWithMaxSequence!]
  } else {
    ackStreamSequence = maxSequence
  }

  logger.debug({
    stitched: stitchedFetchedRecords,
    buffer: newFetchedRecordBuffer.store,
    ackStreamSequence
  })

  return {
    stitchedFetchedRecords,
    newFetchedRecordBuffer,
    ackStreamSequence
  }
}
