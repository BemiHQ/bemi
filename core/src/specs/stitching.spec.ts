import { stitchChangeMessages } from '../stitching';
import { ChangeMessage } from '../change-message';
import { ChangeMessagesBuffer } from '../change-message-buffer';

import { POSITIONS, MESSAGE_DATA, buildMessage } from './fixtures/nats-messages';
import { MOCKED_DATE, CHANGE_ATTRIBUTES, buildChangeMessage } from './fixtures/change-messages';

describe('stitchChangeMessages', () => {
  beforeAll(() => {
    jest.spyOn(global, 'Date').mockImplementation(() => MOCKED_DATE)
  })

  describe('when messages in the same batch', () => {
    test('stitches context if it is first, ignores a heartbeat message', () => {
      const subject = 'bemi-subject'

      const changeMessagesBuffer = new ChangeMessagesBuffer()
      const changeMessages = [
        buildMessage({ subject, streamSequence: 1, data: MESSAGE_DATA.CREATE_MESSAGE }),
        buildMessage({ subject, streamSequence: 2, data: MESSAGE_DATA.CREATE }),
        buildMessage({ subject, streamSequence: 3, data: MESSAGE_DATA.HEARTBEAT_MESSAGE }),
      ].map((message) => ChangeMessage.fromMessage(message)) as ChangeMessage[]

      const result = stitchChangeMessages({ changeMessages, changeMessagesBuffer })

      expect(result).toStrictEqual({
        changeMessages: [
          buildChangeMessage({
            subject,
            streamSequence: 2,
            changeAttributes: CHANGE_ATTRIBUTES.CREATE,
            context: CHANGE_ATTRIBUTES.CREATE_MESSAGE.context,
          }),
        ],
        ackStreamSequence: 2,
        changeMessagesBuffer: ChangeMessagesBuffer.fromStore({}),
      })
    })

    test('stitches context if it is second and pauses on the one before last position', () => {
      const subject = 'bemi-subject'

      const changeMessagesBuffer = new ChangeMessagesBuffer()
      const changeMessages = [
        buildMessage({ subject, streamSequence: 1, data: MESSAGE_DATA.CREATE }),
        buildMessage({ subject, streamSequence: 2, data: MESSAGE_DATA.CREATE_MESSAGE }),
        buildMessage({ subject, streamSequence: 3, data: MESSAGE_DATA.UPDATE }),
        buildMessage({ subject, streamSequence: 4, data: MESSAGE_DATA.DELETE }),
      ].map((message) => ChangeMessage.fromMessage(message)) as ChangeMessage[]

      const result = stitchChangeMessages({ changeMessages, changeMessagesBuffer })

      expect(result).toStrictEqual({
        changeMessages: [
          buildChangeMessage({
            subject,
            streamSequence: 1,
            changeAttributes: CHANGE_ATTRIBUTES.CREATE,
            context: CHANGE_ATTRIBUTES.CREATE_MESSAGE.context,
          }),
          buildChangeMessage({
            subject,
            streamSequence: 3,
            changeAttributes: CHANGE_ATTRIBUTES.UPDATE,
          }),
        ],
        ackStreamSequence: 3,
        changeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.DELETE]: [
              buildChangeMessage({
                subject,
                streamSequence: 4,
                changeAttributes: CHANGE_ATTRIBUTES.DELETE,
              }),
            ],
          }
        }),
      })
    })
  })

  describe('when messages in separate batches', () => {
    test('stitches context for messages within the same shard after processing all batches', () => {
      const subject = 'bemi-subject'

      const changeMessagesBuffer = new ChangeMessagesBuffer()
      const changeMessages1 = [
        buildMessage({ subject, streamSequence: 1, data: MESSAGE_DATA.CREATE }),
        buildMessage({ subject, streamSequence: 2, data: MESSAGE_DATA.CREATE_MESSAGE }),
        buildMessage({ subject, streamSequence: 3, data: MESSAGE_DATA.UPDATE }),
      ].map((message) => ChangeMessage.fromMessage(message)) as ChangeMessage[]

      const result1 = stitchChangeMessages({ changeMessages: changeMessages1, changeMessagesBuffer })
      expect(result1).toStrictEqual({
        changeMessages: [
          buildChangeMessage({
            subject,
            streamSequence: 1,
            changeAttributes: CHANGE_ATTRIBUTES.CREATE,
            context: CHANGE_ATTRIBUTES.CREATE_MESSAGE.context,
          }),
        ],
        ackStreamSequence: 1,
        changeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.UPDATE]: [
              buildChangeMessage({
                subject,
                streamSequence: 3,
                changeAttributes: CHANGE_ATTRIBUTES.UPDATE,
              }),
            ],
          },
        }),
      })

      const changeMessages2 = [
        buildMessage({ subject, streamSequence: 3, data: MESSAGE_DATA.UPDATE_MESSAGE }),
        buildMessage({ subject, streamSequence: 4, data: MESSAGE_DATA.DELETE_MESSAGE }),
      ].map((message) => ChangeMessage.fromMessage(message)) as ChangeMessage[]

      const result2 = stitchChangeMessages({ changeMessages: changeMessages2, changeMessagesBuffer: result1.changeMessagesBuffer })

      expect(result2).toStrictEqual({
        changeMessages: [
          buildChangeMessage({
            subject,
            streamSequence: 3,
            changeAttributes: CHANGE_ATTRIBUTES.UPDATE,
            context: CHANGE_ATTRIBUTES.UPDATE_MESSAGE.context,
          }),
        ],
        ackStreamSequence: 3,
        changeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.DELETE]: [
              buildChangeMessage({
                subject,
                streamSequence: 4,
                changeAttributes: CHANGE_ATTRIBUTES.DELETE_MESSAGE,
              }),
            ],
          },
        }),
      })
    })

    test('leaves only one before last pending record without context after processing all batches', () => {
      const subject = 'bemi-subject'

      const changeMessages1 = [
        buildMessage({ subject, streamSequence: 1, data: MESSAGE_DATA.CREATE }),
      ].map((message) => ChangeMessage.fromMessage(message)) as ChangeMessage[]

      const result1 = stitchChangeMessages({ changeMessages: changeMessages1, changeMessagesBuffer: new ChangeMessagesBuffer() })
      expect(result1).toStrictEqual({
        changeMessages: [],
        ackStreamSequence: undefined,
        changeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.CREATE.toString()]: [
              buildChangeMessage({
                subject,
                streamSequence: 1,
                changeAttributes: CHANGE_ATTRIBUTES.CREATE,
              }),
            ],
          },
        }),
      })

      const changeMessages2 = [
        buildMessage({ subject, streamSequence: 2, data: MESSAGE_DATA.CREATE_MESSAGE }),
        buildMessage({ subject, streamSequence: 3, data: MESSAGE_DATA.UPDATE }),
        buildMessage({ subject, streamSequence: 4, data: MESSAGE_DATA.DELETE }),
      ].map((message) => ChangeMessage.fromMessage(message)) as ChangeMessage[]

      const result2 = stitchChangeMessages({ changeMessages: changeMessages2, changeMessagesBuffer: result1.changeMessagesBuffer })

      expect(result2).toStrictEqual({
        changeMessages: [
          buildChangeMessage({
            subject,
            streamSequence: 1,
            changeAttributes: CHANGE_ATTRIBUTES.CREATE,
            context: CHANGE_ATTRIBUTES.CREATE_MESSAGE.context,
          }),
          buildChangeMessage({
            subject,
            streamSequence: 3,
            changeAttributes: CHANGE_ATTRIBUTES.UPDATE,
          }),
        ],
        ackStreamSequence: 3,
        changeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.DELETE]: [
              buildChangeMessage({
                subject,
                streamSequence: 4,
                changeAttributes: CHANGE_ATTRIBUTES.DELETE,
              }),
            ],
          },
        }),
      })
    })

    test('saves pending change messages after receiving a heartbeat with a greater position', () => {
      const subject = 'bemi-subject'

      const changeMessages1 = [
        buildMessage({ subject, streamSequence: 1, data: MESSAGE_DATA.CREATE }),
      ].map((message) => ChangeMessage.fromMessage(message)) as ChangeMessage[]

      const result1 = stitchChangeMessages({ changeMessages: changeMessages1, changeMessagesBuffer: new ChangeMessagesBuffer() })
      expect(result1).toStrictEqual({
        changeMessages: [],
        ackStreamSequence: undefined,
        changeMessagesBuffer: ChangeMessagesBuffer.fromStore({
          [subject]: {
            [POSITIONS.CREATE.toString()]: [
              buildChangeMessage({
                subject,
                streamSequence: 1,
                changeAttributes: CHANGE_ATTRIBUTES.CREATE,
              }),
            ],
          },
        }),
      })

      const changeMessages2 = [
        buildMessage({ subject, streamSequence: 2, data: MESSAGE_DATA.HEARTBEAT_MESSAGE }),
      ].map((message) => ChangeMessage.fromMessage(message)) as ChangeMessage[]

      const result2 = stitchChangeMessages({ changeMessages: changeMessages2, changeMessagesBuffer: result1.changeMessagesBuffer })

      expect(result2).toStrictEqual({
        changeMessages: [
          buildChangeMessage({
            subject,
            streamSequence: 1,
            changeAttributes: CHANGE_ATTRIBUTES.CREATE,
          }),
        ],
        ackStreamSequence: 1,
        changeMessagesBuffer: ChangeMessagesBuffer.fromStore({}),
      })
    })
  })
})
