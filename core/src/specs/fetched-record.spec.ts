import { FetchedRecord, MESSAGE_PREFIX_CONTEXT } from '../fetched-record';

import { MESSAGE_DATA, buildNatsMessage } from './fixtures/nats-messages';
import { MOCKED_DATE, CHANGE_ATTRIBUTES } from './fixtures/fetched-records';

describe('fromNatsMessage', () => {
  beforeAll(() => {
    jest.spyOn(global, 'Date').mockImplementation(() => MOCKED_DATE)
  })

  test('parses "CREATE" natsMessages', () => {
    const subject = 'bemi-subject'
    const natsMessages = [
      buildNatsMessage({ subject, streamSequence: 1, data: MESSAGE_DATA.CREATE }),
      buildNatsMessage({ subject, streamSequence: 2, data: MESSAGE_DATA.CREATE_MESSAGE }),
    ]

    const result = natsMessages.map((m) => FetchedRecord.fromNatsMessage(m))

    expect(result).toStrictEqual([
      new FetchedRecord({
        subject,
        streamSequence: 1,
        changeAttributes: CHANGE_ATTRIBUTES.CREATE,
      }),
      new FetchedRecord({
        subject,
        streamSequence: 2,
        changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE,
        messagePrefix: MESSAGE_PREFIX_CONTEXT,
      }),
    ])
  })

  test('parses "UPDATE" natsMessages', () => {
    const subject = 'bemi-subject'
    const natsMessages = [
      buildNatsMessage({ subject, streamSequence: 1, data: MESSAGE_DATA.UPDATE }),
      buildNatsMessage({ subject, streamSequence: 2, data: MESSAGE_DATA.UPDATE_MESSAGE }),
    ]

    const result = natsMessages.map((m) => FetchedRecord.fromNatsMessage(m))

    expect(result).toStrictEqual([
      new FetchedRecord({
        subject,
        streamSequence: 1,
        changeAttributes: CHANGE_ATTRIBUTES.UPDATE,
      }),
      new FetchedRecord({
        subject,
        streamSequence: 2,
        changeAttributes: CHANGE_ATTRIBUTES.UPDATE_MESSAGE,
        messagePrefix: MESSAGE_PREFIX_CONTEXT,
      }),
    ])
  })

  test('parses "DELETE" natsMessages', () => {
    const subject = 'bemi-subject'
    const natsMessages = [
      buildNatsMessage({ subject, streamSequence: 1, data: MESSAGE_DATA.DELETE }),
      buildNatsMessage({ subject, streamSequence: 2, data: MESSAGE_DATA.DELETE_MESSAGE }),
    ]

    const result = natsMessages.map((m) => FetchedRecord.fromNatsMessage(m))

    expect(result).toStrictEqual([
      new FetchedRecord({
        subject,
        streamSequence: 1,
        changeAttributes: CHANGE_ATTRIBUTES.DELETE,
      }),
      new FetchedRecord({
        subject,
        streamSequence: 2,
        changeAttributes: CHANGE_ATTRIBUTES.DELETE_MESSAGE,
        messagePrefix: MESSAGE_PREFIX_CONTEXT,
      }),
    ])
  })

  test('normalizes the values with unavailable placeholder', () => {
    const subject = 'bemi-subject'
    const natsMessages = [
      buildNatsMessage({
        subject,
        streamSequence: 1,
        data: { ...MESSAGE_DATA.UPDATE, before: { id: 2, names: ['Alice', 'Bob'] }, after: { id: 2, names: ['__bemi_unavailable_value'] } },
      }),
    ]

    const result = natsMessages.map((m) => FetchedRecord.fromNatsMessage(m))

    expect(result).toStrictEqual([
      new FetchedRecord({
        subject,
        streamSequence: 1,
        changeAttributes: { ...CHANGE_ATTRIBUTES.UPDATE, before: { id: 2, names: ['Alice', 'Bob'] }, after: { id: 2, names: ['Alice', 'Bob'] } },
      }),
    ])
  })

  test('ignores non-Bemi messages', () => {
    const natsMessage = buildNatsMessage({
      subject: 'bemi-subject',
      streamSequence: 1,
      data: MESSAGE_DATA.NON_BEMI_MESSAGE,
    })

    const result = FetchedRecord.fromNatsMessage(natsMessage)

    expect(result).toStrictEqual(null)
  })
})
