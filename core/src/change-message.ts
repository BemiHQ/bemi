import { RequiredEntityData } from '@mikro-orm/postgresql';

import { Change, Operation } from "./entities/Change"

export const MESSAGE_PREFIX_CONTEXT = '_bemi'
export const MESSAGE_PREFIX_HEARTBEAT = '_bemi_heartbeat'

export class ChangeMessage {
  changeAttributes: RequiredEntityData<Change>
  subject: string
  streamSequence: number
  messagePrefix?: string

  constructor(
    { changeAttributes, subject, streamSequence, messagePrefix }:
    { changeAttributes: RequiredEntityData<Change>, subject: string, streamSequence: number, messagePrefix?: string }
  ) {
    this.changeAttributes = changeAttributes
    this.subject = subject
    this.streamSequence = streamSequence
    this.messagePrefix = messagePrefix
  }

  isMessage() {
    return this.changeAttributes.operation === Operation.MESSAGE
  }

  isContextMessage() {
    return this.isMessage() && this.messagePrefix === MESSAGE_PREFIX_CONTEXT
  }

  isHeartbeatMessage() {
    return this.isMessage() && this.messagePrefix === MESSAGE_PREFIX_HEARTBEAT
  }

  context() {
    return this.changeAttributes.context as object
  }

  setContext(context: object) {
    const newChangeMessage = Object.assign(Object.create(this), this)
    newChangeMessage.changeAttributes = { ...this.changeAttributes, context }
    return newChangeMessage
  }
}
