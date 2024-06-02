import { FetchedRecord } from './fetched-record'

export class FetchedRecordBuffer {
  store: { [subject: string]: { [position: string]: FetchedRecord[] } }

  constructor() {
    this.store = {}
  }

  static fromStore(store: { [subject: string]: { [position: string]: FetchedRecord[] } }) {
    const buffer = new FetchedRecordBuffer()
    buffer.store = store
    return buffer
  }

  addFetchedRecord(fetchedRecord: FetchedRecord) {
    const newBuffer = Object.assign(Object.create(this), this)
    const { subject, changeAttributes } = fetchedRecord
    const position = changeAttributes.position.toString()
    const existingFetchedRecords = this.store[subject]?.[position]

    if (existingFetchedRecords) {
      newBuffer.store = {
        ...this.store,
        [subject]: { ...this.store[subject], [position]: [...existingFetchedRecords, fetchedRecord] }
      }
      return newBuffer
    }

    newBuffer.store = {
      ...this.store,
      [subject]: { ...(this.store[subject] || []), [position]: [fetchedRecord] }
    }
    return newBuffer
  }

  addFetchedRecords(fetchedRecords: FetchedRecord[]) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let newBuffer = this

    fetchedRecords.forEach((fetchedRecord: FetchedRecord) => {
      newBuffer = newBuffer.addFetchedRecord(fetchedRecord)
    })

    return newBuffer
  }

  forEach(callback: (subject: string, fetchedRecords: FetchedRecord[]) => void) {
    Object.keys(this.store).forEach((subject) => {
      const fetchedRecords = Object.values(this.store[subject]).flat()
      const sortedFetchedRecords = fetchedRecords.sort(
        (a, b) =>
          parseInt(a.changeAttributes.position.toString(), 10) - parseInt(b.changeAttributes.position.toString(), 10)
      )

      callback(subject, sortedFetchedRecords)
    })
  }

  fetchedRecordsByPosition(subject: string, position: string) {
    return this.store[subject]?.[position] || []
  }

  sizeBySubject(subject: string) {
    return Object.values(this.store[subject] || {}).flat().length
  }

  size() {
    return Object.values(this.store)
      .map((fetchedRecsByPos) => Object.values(fetchedRecsByPos).flat().length)
      .reduce((acc, l) => acc + l, 0)
  }
}
