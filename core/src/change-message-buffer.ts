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
    const { subject, changeAttributes } = changeMessage
    const position = changeAttributes.position.toString()
    const existingChangeMessages = this.store[subject]?.[position]

    if (existingChangeMessages) {
      this.store = {
        ...this.store,
        [subject]: { ...this.store[subject], [position]: [...existingChangeMessages, changeMessage] },
      }
      return this
    }

    this.store = {
      ...this.store,
      [subject]: { ...(this.store[subject] || []), [position]: [changeMessage] },
    }
    return this
  }

  addChangeMessages(changeMessages: ChangeMessage[]) {
    changeMessages.forEach((changeMessage: ChangeMessage) => {
      this.addChangeMessage(changeMessage)
    })

    return this
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
