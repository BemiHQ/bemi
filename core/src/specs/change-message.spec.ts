import { ChangeMessage, MESSAGE_PREFIX_CONTEXT } from '../change-message';

import { MESSAGE_DATA, buildMessage } from './fixtures/nats-messages';
import { MOCKED_DATE, CHANGE_ATTRIBUTES } from './fixtures/change-messages';

describe('fromMessage', () => {
  beforeAll(() => {
    jest.spyOn(global, 'Date').mockImplementation(() => MOCKED_DATE)
  })

  test('parses "CREATE" messages', () => {
    const subject = 'bemi-subject'
    const messages = [
      buildMessage({ subject, streamSequence: 1, data: MESSAGE_DATA.CREATE }),
      buildMessage({ subject, streamSequence: 2, data: MESSAGE_DATA.CREATE_MESSAGE }),
    ]

    const result = messages.map((message) => ChangeMessage.fromMessage(message)) as ChangeMessage[]

    expect(result).toStrictEqual([
      new ChangeMessage({
        subject,
        streamSequence: 1,
        changeAttributes: CHANGE_ATTRIBUTES.CREATE,
      }),
      new ChangeMessage({
        subject,
        streamSequence: 2,
        changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE,
        messagePrefix: MESSAGE_PREFIX_CONTEXT,
      }),
    ])
  })

  test('parses "UPDATE" messages', () => {
    const subject = 'bemi-subject'
    const messages = [
      buildMessage({ subject, streamSequence: 1, data: MESSAGE_DATA.UPDATE }),
      buildMessage({ subject, streamSequence: 2, data: MESSAGE_DATA.UPDATE_MESSAGE }),
    ]

    const result = messages.map((message) => ChangeMessage.fromMessage(message)) as ChangeMessage[]

    expect(result).toStrictEqual([
      new ChangeMessage({
        subject,
        streamSequence: 1,
        changeAttributes: CHANGE_ATTRIBUTES.UPDATE,
      }),
      new ChangeMessage({
        subject,
        streamSequence: 2,
        changeAttributes: CHANGE_ATTRIBUTES.UPDATE_MESSAGE,
        messagePrefix: MESSAGE_PREFIX_CONTEXT,
      }),
    ])
  })

  test('parses "DELETE" messages', () => {
    const subject = 'bemi-subject'
    const messages = [
      buildMessage({ subject, streamSequence: 1, data: MESSAGE_DATA.DELETE }),
      buildMessage({ subject, streamSequence: 2, data: MESSAGE_DATA.DELETE_MESSAGE }),
    ]

    const result = messages.map((message) => ChangeMessage.fromMessage(message)) as ChangeMessage[]

    expect(result).toStrictEqual([
      new ChangeMessage({
        subject,
        streamSequence: 1,
        changeAttributes: CHANGE_ATTRIBUTES.DELETE,
      }),
      new ChangeMessage({
        subject,
        streamSequence: 2,
        changeAttributes: CHANGE_ATTRIBUTES.DELETE_MESSAGE,
        messagePrefix: MESSAGE_PREFIX_CONTEXT,
      }),
    ])
  })
})
