import { ChangeMessage } from './change-message'

export class ChangeMessagesBuffer {
  store: { [subject: string]: { [position: string]: ChangeMessage[] } }

  constructor() {
    this.store = {}
  }

  static fromStore(store: { [subject: string]: { [position: string]: ChangeMessage[] } }) {
    const buffer = new ChangeMessagesBuffer()
    buffer.store = store
    return buffer
  }

  addChangeMessage(changeMessage: ChangeMessage) {
    const newBuffer = Object.assign(Object.create(this), this)
    const { subject, changeAttributes } = changeMessage
    const position = changeAttributes.position.toString()
    const existingChangeMessages = this.store[subject]?.[position]

    if (existingChangeMessages) {
      newBuffer.store = {
        ...this.store,
        [subject]: { ...this.store[subject], [position]: [...existingChangeMessages, changeMessage] },
      }
      return newBuffer
    }

    newBuffer.store = {
      ...this.store,
      [subject]: { ...(this.store[subject] || []), [position]: [changeMessage] },
    }
    return newBuffer
  }

  addChangeMessages(changeMessages: ChangeMessage[]) {
    let newBuffer = this

    changeMessages.forEach((changeMessage: ChangeMessage) => {
      newBuffer = newBuffer.addChangeMessage(changeMessage)
    })

    return newBuffer
  }

  forEach(callback: (subject: string, changeMessages: ChangeMessage[]) => void) {
    Object.keys(this.store).forEach((subject) => {
      const changeMessages = Object.values(this.store[subject]).flat()
      const sortedChangeMessages = changeMessages.sort((a, b) => (
        parseInt(a.changeAttributes.position.toString(), 10) - parseInt(b.changeAttributes.position.toString(), 10)
      ))

      callback(subject, sortedChangeMessages)
    })
  }

  changeMessagesByPosition(subject: string, position: string) {
    return this.store[subject]?.[position] || []
  }
}
