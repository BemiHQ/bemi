import { FetchedRecord } from './fetched-record'

export class FetchedRecordBuffer {
  store: { [subject: string]: { [transactionId: string]: FetchedRecord[] } }

  constructor() {
    this.store = {}
  }

  addFetchedRecord(fetchedRecord: FetchedRecord) {
    const newBuffer: FetchedRecordBuffer = Object.assign(Object.create(this), this)
    const { subject, changeAttributes } = fetchedRecord
    const transactionId = changeAttributes.transactionId.toString()
    const existingFetchedRecords = this.store[subject]?.[transactionId]

    if (existingFetchedRecords) {
      newBuffer.store = {
        ...this.store,
        [subject]: { ...this.store[subject], [transactionId]: [...existingFetchedRecords, fetchedRecord] },
      }
      return newBuffer
    }

    newBuffer.store = {
      ...this.store,
      [subject]: { ...(this.store[subject] || []), [transactionId]: [fetchedRecord] },
    }
    return newBuffer
  }

  addFetchedRecords(fetchedRecords: FetchedRecord[]) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let newBuffer: FetchedRecordBuffer = this

    fetchedRecords.forEach((fetchedRecord: FetchedRecord) => {
      newBuffer = newBuffer.addFetchedRecord(fetchedRecord)
    })

    return newBuffer
  }

  forEach(callback: (subject: string, fetchedRecords: FetchedRecord[]) => void) {
    Object.keys(this.store).forEach((subject) => {
      const fetchedRecords = Object.values(this.store[subject]).flat()

      // Sort by transactionId, then by streamSequence
      const sortedFetchedRecords = fetchedRecords.sort((a, b) => {
        if (a.changeAttributes.transactionId !== b.changeAttributes.transactionId) {
          return a.changeAttributes.transactionId - b.changeAttributes.transactionId
        }
        return a.streamSequence - b.streamSequence
      })

      callback(subject, sortedFetchedRecords)
    })
  }

  fetchedRecordsByTransactionId(subject: string, transactionId: string) {
    return this.store[subject]?.[transactionId] || []
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
