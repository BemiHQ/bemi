import { logger } from './logger'
import { ChangeMessage } from './change-message'
import { ChangeMessagesBuffer } from './change-message-buffer'

export const stitchChangeMessages = (
  { changeMessages, changeMessagesBuffer: initialChangeMessagesBuffer }:
  { changeMessages: ChangeMessage[], changeMessagesBuffer: ChangeMessagesBuffer }
) => {
  const mergedChangeMessagesBuffer = initialChangeMessagesBuffer.addChangeMessages(changeMessages)
  let stitchedChangeMsgs: ChangeMessage[] = []
  let ackSequenceBySubject: { [key: string]: string | undefined } = {}
  let newChangeMessagesBuffer = new ChangeMessagesBuffer()

  mergedChangeMessagesBuffer.forEach((subject, sortedChangeMessages) => {
    let ackSequence: number | undefined = undefined

    sortedChangeMessages.forEach((changeMessage) => {
      const position = changeMessage.changeAttributes.position.toString()
      const changeMessages = mergedChangeMessagesBuffer.changeMessagesByPosition(subject, position)
      const contextMessageChangeMessage = changeMessages.find(cm => cm.isContextMessage())

      // Last message without a pair - skip it
      if (
        changeMessage === sortedChangeMessages[sortedChangeMessages.length - 1] &&
        changeMessages.length === 1
      ) {
        // Add it to the pending list if it's not a heartbeat message change message
        if (changeMessage.isHeartbeatMessage()) {
          logger.debug(`Ignoring heartbeat message`)
        } else {
          newChangeMessagesBuffer = newChangeMessagesBuffer.addChangeMessage(changeMessage)
        }
        return
      }

      // Message change message (non-mutation) - skip it
      if (changeMessage.isMessage()) {
        return
      }

      //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      // Update ack sequence number
      if (!ackSequence || ackSequence < changeMessage.streamSequence) {
        ackSequence = changeMessage.streamSequence
      }

      if (contextMessageChangeMessage) {
        // Stitch with context message change message if it exists
        stitchedChangeMsgs = [
          ...stitchedChangeMsgs,
          changeMessage.setContext(contextMessageChangeMessage.context()),
        ]
      } else {
        // Return mutation change message as is without stitching
        stitchedChangeMsgs = [
          ...stitchedChangeMsgs,
          changeMessage,
        ]
      }
    })

    if (ackSequence) {
      ackSequenceBySubject = {
        ...ackSequenceBySubject,
        [subject]: ackSequence,
      }
    }
  })

  const ackStreamSequence = Object.values(ackSequenceBySubject).filter(Boolean).reduce((min, streamSequence) => (
    !min || streamSequence! < min ? streamSequence : min
  ), undefined) as undefined | number

  return {
    changeMessages: stitchedChangeMsgs,
    changeMessagesBuffer: newChangeMessagesBuffer,
    ackStreamSequence,
  }
}
