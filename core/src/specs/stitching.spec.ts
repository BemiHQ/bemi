process.env.LOG_LEVEL = 'INFO'

import { stitchFetchedRecords } from '../stitching';
import { FetchedRecord, MESSAGE_PREFIX_CONTEXT, MESSAGE_PREFIX_HEARTBEAT } from '../fetched-record';
import { FetchedRecordBuffer } from '../fetched-record-buffer';

import { POSITIONS } from './fixtures/nats-messages';
import { MOCKED_DATE, CHANGE_ATTRIBUTES } from './fixtures/fetched-records';

const findFetchedRecord = (fetchedRecords: FetchedRecord[], streamSequence: number) => (
  fetchedRecords.find((fetchedMessage) => fetchedMessage.streamSequence === streamSequence) as FetchedRecord
)

describe('stitchFetchedRecords', () => {
  beforeAll(() => {
    jest.spyOn(global, 'Date').mockImplementation(() => MOCKED_DATE)
  })

  describe('when messages in the same batch', () => {
    test('stitches context if it is first, ignores a heartbeat message', () => {
      const subject = 'bemi-subject'
      const fetchedRecords = [
        new FetchedRecord({ subject, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new FetchedRecord({ subject, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
        new FetchedRecord({ subject, streamSequence: 3, changeAttributes: CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE, messagePrefix: MESSAGE_PREFIX_HEARTBEAT }),
      ]

      const result = stitchFetchedRecords({
        fetchedRecordBuffer: new FetchedRecordBuffer().addFetchedRecords(fetchedRecords),
        useBuffer: true,
      })

      expect(result).toStrictEqual({
        stitchedFetchedRecords: [
          findFetchedRecord(fetchedRecords, 2).setContext(findFetchedRecord(fetchedRecords, 1).context()),
        ],
        ackStreamSequence: 3,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({}),
      })
    })

    test('stitches context if it is second and pauses on the one before last position', () => {
      const subject = 'bemi-subject'
      const fetchedRecords = [
        new FetchedRecord({ subject, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
        new FetchedRecord({ subject, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new FetchedRecord({ subject, streamSequence: 3, changeAttributes: CHANGE_ATTRIBUTES.UPDATE }),
        new FetchedRecord({ subject, streamSequence: 4, changeAttributes: CHANGE_ATTRIBUTES.DELETE }),
      ]

      const result = stitchFetchedRecords({
        fetchedRecordBuffer: new FetchedRecordBuffer().addFetchedRecords(fetchedRecords),
        useBuffer: true,
      })

      expect(result).toStrictEqual({
        stitchedFetchedRecords: [
          findFetchedRecord(fetchedRecords, 1).setContext(findFetchedRecord(fetchedRecords, 2).context()),
          findFetchedRecord(fetchedRecords, 3),
        ],
        ackStreamSequence: 3,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({
          [subject]: {
            [POSITIONS.DELETE]: [
              findFetchedRecord(fetchedRecords, 4),
            ],
          }
        }),
      })
    })

    test('acks the last heartbeat message if the buffer is empty', () => {
      const subject = 'bemi-subject'
      const fetchedRecords = [
        new FetchedRecord({ subject, streamSequence: 1, changeAttributes: { ...CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE, position: 1 }, messagePrefix: MESSAGE_PREFIX_HEARTBEAT }),
        new FetchedRecord({ subject, streamSequence: 3, changeAttributes: { ...CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE, position: 3 }, messagePrefix: MESSAGE_PREFIX_HEARTBEAT }),
        new FetchedRecord({ subject, streamSequence: 2, changeAttributes: { ...CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE, position: 2 }, messagePrefix: MESSAGE_PREFIX_HEARTBEAT }),
      ]

      const result = stitchFetchedRecords({
        fetchedRecordBuffer: new FetchedRecordBuffer().addFetchedRecords(fetchedRecords),
        useBuffer: true,
      })

      expect(result).toStrictEqual({
        stitchedFetchedRecords: [],
        ackStreamSequence: 3,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({}),
      })
    })
  })

  describe('when messages from separate subjects', () => {
    test('stitches context across multiple subjects with a heartbeat message and pending context', () => {
      const subject1 = 'bemi-subject-1'
      const subject2 = 'bemi-subject-2'
      const updateMessagePosition = CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE.position + 1
      const fetchedRecords = [
        new FetchedRecord({ subject: subject1, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new FetchedRecord({ subject: subject1, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
        new FetchedRecord({ subject: subject2, streamSequence: 3, changeAttributes: CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE, messagePrefix: MESSAGE_PREFIX_HEARTBEAT }),
        new FetchedRecord({ subject: subject2, streamSequence: 4, changeAttributes: { ...CHANGE_ATTRIBUTES.UPDATE_MESSAGE, position: updateMessagePosition }, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
      ]

      const result = stitchFetchedRecords({
        fetchedRecordBuffer: new FetchedRecordBuffer().addFetchedRecords(fetchedRecords),
        useBuffer: true,
      })

      expect(result).toStrictEqual({
        stitchedFetchedRecords: [
          findFetchedRecord(fetchedRecords, 2).setContext(findFetchedRecord(fetchedRecords, 1).context()),
        ],
        ackStreamSequence: 3,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({
          [subject2]: {
            [updateMessagePosition]: [
              findFetchedRecord(fetchedRecords, 4),
            ],
          },
        }),
      })
    })

    test('stitches context across multiple subjects with a heartbeat message and pending change', () => {
      const subject1 = 'bemi-subject-1'
      const subject2 = 'bemi-subject-2'
      const updatePosition = CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE.position + 1
      const fetchedRecords = [
        new FetchedRecord({ subject: subject1, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new FetchedRecord({ subject: subject1, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
        new FetchedRecord({ subject: subject2, streamSequence: 3, changeAttributes: CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE, messagePrefix: MESSAGE_PREFIX_HEARTBEAT }),
        new FetchedRecord({ subject: subject2, streamSequence: 4, changeAttributes: { ...CHANGE_ATTRIBUTES.UPDATE, position: updatePosition }}),
      ]

      const result = stitchFetchedRecords({
        fetchedRecordBuffer: new FetchedRecordBuffer().addFetchedRecords(fetchedRecords),
        useBuffer: true,
      })

      expect(result).toStrictEqual({
        stitchedFetchedRecords: [
          findFetchedRecord(fetchedRecords, 2).setContext(findFetchedRecord(fetchedRecords, 1).context()),
        ],
        ackStreamSequence: 3,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({
          [subject2]: {
            [updatePosition]: [
              findFetchedRecord(fetchedRecords, 4),
            ],
          },
        }),
      })
    })

    test('stitches context across multiple subjects with a single heartbeat message in one of them', () => {
      const subject1 = 'bemi-subject-1'
      const subject2 = 'bemi-subject-2'
      const fetchedRecords = [
        new FetchedRecord({ subject: subject1, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new FetchedRecord({ subject: subject1, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
        new FetchedRecord({ subject: subject2, streamSequence: 3, changeAttributes: CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE, messagePrefix: MESSAGE_PREFIX_HEARTBEAT }),
      ]

      const result = stitchFetchedRecords({
        fetchedRecordBuffer: new FetchedRecordBuffer().addFetchedRecords(fetchedRecords),
        useBuffer: true,
      })

      expect(result).toStrictEqual({
        stitchedFetchedRecords: [
          findFetchedRecord(fetchedRecords, 2).setContext(findFetchedRecord(fetchedRecords, 1).context()),
        ],
        ackStreamSequence: 3,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({}),
      })
    })
  })

  describe('when messages in separate batches', () => {
    test('stitches context for messages within the same shard after processing all batches', () => {
      const subject = 'bemi-subject'
      const fetchedRecords1 = [
        new FetchedRecord({ subject, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
        new FetchedRecord({ subject, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new FetchedRecord({ subject, streamSequence: 3, changeAttributes: CHANGE_ATTRIBUTES.UPDATE }),
      ]

      const result1 = stitchFetchedRecords({
        fetchedRecordBuffer: new FetchedRecordBuffer().addFetchedRecords(fetchedRecords1),
        useBuffer: true,
      })
      expect(result1).toStrictEqual({
        stitchedFetchedRecords: [
          findFetchedRecord(fetchedRecords1, 1).setContext(findFetchedRecord(fetchedRecords1, 2).context()),
        ],
        ackStreamSequence: 1,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({
          [subject]: {
            [POSITIONS.UPDATE]: [
              findFetchedRecord(fetchedRecords1, 3),
            ],
          },
        }),
      })

      const fetchedRecords2 = [
        new FetchedRecord({ subject, streamSequence: 4, changeAttributes: CHANGE_ATTRIBUTES.UPDATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new FetchedRecord({ subject, streamSequence: 5, changeAttributes: CHANGE_ATTRIBUTES.DELETE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
      ]

      const result2 = stitchFetchedRecords({
        fetchedRecordBuffer: result1.newFetchedRecordBuffer.addFetchedRecords(fetchedRecords2),
        useBuffer: true,
      })
      expect(result2).toStrictEqual({
        stitchedFetchedRecords: [
          findFetchedRecord(fetchedRecords1, 3).setContext(findFetchedRecord(fetchedRecords2, 4).context()),
        ],
        ackStreamSequence: 3,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({
          [subject]: {
            [POSITIONS.DELETE]: [
              findFetchedRecord(fetchedRecords2, 5),
            ],
          },
        }),
      })
    })

    test('leaves only one before last pending record without context after processing all batches', () => {
      const subject = 'bemi-subject'
      const fetchedRecords1 = [
        new FetchedRecord({ subject, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
      ]

      const result1 = stitchFetchedRecords({
        fetchedRecordBuffer: new FetchedRecordBuffer().addFetchedRecords(fetchedRecords1),
        useBuffer: true,
      })
      expect(result1).toStrictEqual({
        stitchedFetchedRecords: [],
        ackStreamSequence: undefined,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({
          [subject]: {
            [POSITIONS.CREATE]: [
              findFetchedRecord(fetchedRecords1, 1),
            ],
          },
        }),
      })

      const fetchedRecords2 = [
        new FetchedRecord({ subject, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new FetchedRecord({ subject, streamSequence: 3, changeAttributes: CHANGE_ATTRIBUTES.UPDATE }),
        new FetchedRecord({ subject, streamSequence: 4, changeAttributes: CHANGE_ATTRIBUTES.DELETE }),
      ]

      const result2 = stitchFetchedRecords({
        fetchedRecordBuffer: result1.newFetchedRecordBuffer.addFetchedRecords(fetchedRecords2),
        useBuffer: true,
      })
      expect(result2).toStrictEqual({
        stitchedFetchedRecords: [
          findFetchedRecord(fetchedRecords1, 1).setContext(findFetchedRecord(fetchedRecords2, 2).context()),
          findFetchedRecord(fetchedRecords2, 3),
        ],
        ackStreamSequence: 3,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({
          [subject]: {
            [POSITIONS.DELETE]: [findFetchedRecord(fetchedRecords2, 4)],
          },
        }),
      })
    })

    test('saves pending change messages after receiving a heartbeat message with a greater position', () => {
      const subject = 'bemi-subject'
      const fetchedRecords1 = [
        new FetchedRecord({ subject, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
      ]

      const result1 = stitchFetchedRecords({
        fetchedRecordBuffer: new FetchedRecordBuffer().addFetchedRecords(fetchedRecords1),
        useBuffer: true,
      })
      expect(result1).toStrictEqual({
        stitchedFetchedRecords: [],
        ackStreamSequence: undefined,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({
          [subject]: {
            [POSITIONS.CREATE]: [
              findFetchedRecord(fetchedRecords1, 1),
            ],
          },
        }),
      })

      const fetchedRecords2 = [
        new FetchedRecord({ subject, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE, messagePrefix: MESSAGE_PREFIX_HEARTBEAT }),
      ]

      const result2 = stitchFetchedRecords({
        fetchedRecordBuffer: result1.newFetchedRecordBuffer.addFetchedRecords(fetchedRecords2),
        useBuffer: true,
      })
      expect(result2).toStrictEqual({
        stitchedFetchedRecords: [
          findFetchedRecord(fetchedRecords1, 1),
        ],
        ackStreamSequence: 2,
        newFetchedRecordBuffer: FetchedRecordBuffer.fromStore({}),
      })
    })
  })
})
