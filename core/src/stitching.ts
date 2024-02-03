import { logger } from './logger'
import { ChangeMessage } from './change-message'
import { ChangeMessagesBuffer } from './change-message-buffer'

export const stitchChangeMessages = (
  { changeMessagesBuffer, useBuffer = false }:
  { changeMessagesBuffer: ChangeMessagesBuffer, useBuffer: boolean }
) => {
  let stitchedChangeMessages: ChangeMessage[] = []
  let ackSequenceBySubject: { [key: string]: string | undefined } = {}
  let newChangeMessagesBuffer = new ChangeMessagesBuffer()

  changeMessagesBuffer.forEach((subject, sortedChangeMessages) => {
    let ackSequence: number | undefined = undefined

    sortedChangeMessages.forEach((changeMessage) => {
      const position = changeMessage.changeAttributes.position.toString()
      const changeMessages = changeMessagesBuffer.changeMessagesByPosition(subject, position)
      const contextMessageChangeMessage = changeMessages.find(cm => cm.isContextMessage())

      // Last message without a pair - skip it
      if (
        useBuffer &&
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
        stitchedChangeMessages = [
          ...stitchedChangeMessages,
          changeMessage.setContext(contextMessageChangeMessage.context()),
        ]
      } else {
        // Return mutation change message as is without stitching
        stitchedChangeMessages = [
          ...stitchedChangeMessages,
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

  logger.debug({ stitched: stitchedChangeMessages, buffer: newChangeMessagesBuffer.store, ackStreamSequence })

  return {
    stitchedChangeMessages,
    newChangeMessagesBuffer,
    ackStreamSequence,
  }
}
