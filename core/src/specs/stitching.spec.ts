import { stitchChangeMessages } from '../stitching';
import { ChangeMessage, MESSAGE_PREFIX_CONTEXT, MESSAGE_PREFIX_HEARTBEAT } from '../change-message';
import { ChangeMessagesBuffer } from '../change-message-buffer';

import { POSITIONS } from './fixtures/nats-messages';
import { MOCKED_DATE, CHANGE_ATTRIBUTES } from './fixtures/change-messages';

const findChangeMessage = (changeMessages: ChangeMessage[], streamSequence: number) => (
  changeMessages.find((changeMessage) => changeMessage.streamSequence === streamSequence) as ChangeMessage
)

describe('stitchChangeMessages', () => {
  beforeAll(() => {
    jest.spyOn(global, 'Date').mockImplementation(() => MOCKED_DATE)
  })

  describe('when messages in the same batch', () => {
    test('stitches context if it is first, ignores a heartbeat message', () => {
      const subject = 'bemi-subject'
      const changeMessages = [
        new ChangeMessage({ subject, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new ChangeMessage({ subject, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
        new ChangeMessage({ subject, streamSequence: 3, changeAttributes: CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE, messagePrefix: MESSAGE_PREFIX_HEARTBEAT }),
      ]

      const result = stitchChangeMessages({
        changeMessagesBuffer: new ChangeMessagesBuffer().addChangeMessages(changeMessages),
        useBuffer: true,
      })

      expect(result).toStrictEqual({
        stitchedChangeMessages: [
          findChangeMessage(changeMessages, 2).setContext(findChangeMessage(changeMessages, 1).context()),
        ],
        ackStreamSequence: 2,
        newChangeMessagesBuffer: ChangeMessagesBuffer.fromStore({}),
      })
    })

    test('stitches context if it is second and pauses on the one before last position', () => {
      const subject = 'bemi-subject'
      const changeMessages = [
        new ChangeMessage({ subject, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
        new ChangeMessage({ subject, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new ChangeMessage({ subject, streamSequence: 3, changeAttributes: CHANGE_ATTRIBUTES.UPDATE }),
        new ChangeMessage({ subject, streamSequence: 4, changeAttributes: CHANGE_ATTRIBUTES.DELETE }),
      ]

      const result = stitchChangeMessages({
        changeMessagesBuffer: new ChangeMessagesBuffer().addChangeMessages(changeMessages),
        useBuffer: true,
      })

      expect(result).toStrictEqual({
        stitchedChangeMessages: [
          findChangeMessage(changeMessages, 1).setContext(findChangeMessage(changeMessages, 2).context()),
          findChangeMessage(changeMessages, 3),
        ],
        ackStreamSequence: 3,
        newChangeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.DELETE]: [
              findChangeMessage(changeMessages, 4),
            ],
          }
        }),
      })
    })
  })

  describe('when messages in separate batches', () => {
    test('stitches context for messages within the same shard after processing all batches', () => {
      const subject = 'bemi-subject'
      const changeMessages1 = [
        new ChangeMessage({ subject, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
        new ChangeMessage({ subject, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new ChangeMessage({ subject, streamSequence: 3, changeAttributes: CHANGE_ATTRIBUTES.UPDATE }),
      ]

      const result1 = stitchChangeMessages({
        changeMessagesBuffer: new ChangeMessagesBuffer().addChangeMessages(changeMessages1),
        useBuffer: true,
      })
      expect(result1).toStrictEqual({
        stitchedChangeMessages: [
          findChangeMessage(changeMessages1, 1).setContext(findChangeMessage(changeMessages1, 2).context()),
        ],
        ackStreamSequence: 1,
        newChangeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.UPDATE]: [
              findChangeMessage(changeMessages1, 3),
            ],
          },
        }),
      })

      const changeMessages2 = [
        new ChangeMessage({ subject, streamSequence: 4, changeAttributes: CHANGE_ATTRIBUTES.UPDATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new ChangeMessage({ subject, streamSequence: 5, changeAttributes: CHANGE_ATTRIBUTES.DELETE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
      ]

      const result2 = stitchChangeMessages({
        changeMessagesBuffer: result1.newChangeMessagesBuffer.addChangeMessages(changeMessages2),
        useBuffer: true,
      })
      expect(result2).toStrictEqual({
        stitchedChangeMessages: [
          findChangeMessage(changeMessages1, 3).setContext(findChangeMessage(changeMessages2, 4).context()),
        ],
        ackStreamSequence: 3,
        newChangeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.DELETE]: [
              findChangeMessage(changeMessages2, 5),
            ],
          },
        }),
      })
    })

    test('leaves only one before last pending record without context after processing all batches', () => {
      const subject = 'bemi-subject'
      const changeMessages1 = [
        new ChangeMessage({ subject, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
      ]

      const result1 = stitchChangeMessages({
        changeMessagesBuffer: new ChangeMessagesBuffer().addChangeMessages(changeMessages1),
        useBuffer: true,
      })
      expect(result1).toStrictEqual({
        stitchedChangeMessages: [],
        ackStreamSequence: undefined,
        newChangeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.CREATE]: [
              findChangeMessage(changeMessages1, 1),
            ],
          },
        }),
      })

      const changeMessages2 = [
        new ChangeMessage({ subject, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.CREATE_MESSAGE, messagePrefix: MESSAGE_PREFIX_CONTEXT }),
        new ChangeMessage({ subject, streamSequence: 3, changeAttributes: CHANGE_ATTRIBUTES.UPDATE }),
        new ChangeMessage({ subject, streamSequence: 4, changeAttributes: CHANGE_ATTRIBUTES.DELETE }),
      ]

      const result2 = stitchChangeMessages({
        changeMessagesBuffer: result1.newChangeMessagesBuffer.addChangeMessages(changeMessages2),
        useBuffer: true,
      })
      expect(result2).toStrictEqual({
        stitchedChangeMessages: [
          findChangeMessage(changeMessages1, 1).setContext(findChangeMessage(changeMessages2, 2).context()),
          findChangeMessage(changeMessages2, 3),
        ],
        ackStreamSequence: 3,
        newChangeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.DELETE]: [findChangeMessage(changeMessages2, 4)],
          },
        }),
      })
    })

    test('saves pending change messages after receiving a heartbeat with a greater position', () => {
      const subject = 'bemi-subject'
      const changeMessages1 = [
        new ChangeMessage({ subject, streamSequence: 1, changeAttributes: CHANGE_ATTRIBUTES.CREATE }),
      ]

      const result1 = stitchChangeMessages({
        changeMessagesBuffer: new ChangeMessagesBuffer().addChangeMessages(changeMessages1),
        useBuffer: true,
      })
      expect(result1).toStrictEqual({
        stitchedChangeMessages: [],
        ackStreamSequence: undefined,
        newChangeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.CREATE]: [
              findChangeMessage(changeMessages1, 1),
            ],
          },
        }),
      })

      const changeMessages2 = [
        new ChangeMessage({ subject, streamSequence: 2, changeAttributes: CHANGE_ATTRIBUTES.HEARTBEAT_MESSAGE, messagePrefix: MESSAGE_PREFIX_HEARTBEAT }),
      ]

      const result2 = stitchChangeMessages({
        changeMessagesBuffer: result1.newChangeMessagesBuffer.addChangeMessages(changeMessages2),
        useBuffer: true,
      })
      expect(result2).toStrictEqual({
        stitchedChangeMessages: [
          findChangeMessage(changeMessages1, 1),
        ],
        ackStreamSequence: 1,
        newChangeMessagesBuffer: ChangeMessagesBuffer.fromStore({}),
      })
    })
  })
})
