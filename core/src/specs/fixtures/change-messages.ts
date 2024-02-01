import { ChangeMessage, MESSAGE_PREFIX_CONTEXT } from '../../change-message'

import { POSITIONS } from './nats-messages'

export const MOCKED_DATE = new Date(1466424490000)

export const CHANGE_ATTRIBUTES = {
  CREATE: {
    "committedAt": MOCKED_DATE,
    "createdAt": MOCKED_DATE,
    "database": "bemi_dev_source",
    "context": {},
    "operation": "CREATE",
    "position": POSITIONS.CREATE,
    "primaryKey": 2,
    "queuedAt": MOCKED_DATE,
    "schema": "public",
    "table": "todo",
    "transactionId": 768,
    "values": { "id": 2, "isCompleted": false, "task": "Test" }
  },
  CREATE_MESSAGE: {
    "createdAt": MOCKED_DATE,
    "database": "bemi_dev_source",
    "context": { "op": "c" },
    "operation": "MESSAGE",
    "position": POSITIONS.CREATE,
    "primaryKey": undefined,
    "queuedAt": MOCKED_DATE,
    "schema": "",
    "table": "",
    "transactionId": 768,
    "values": {},
  },
  UPDATE: {
    "committedAt": MOCKED_DATE,
    "createdAt": MOCKED_DATE,
    "database": "bemi_dev_source",
    "context": {},
    "operation": "UPDATE",
    "position": POSITIONS.UPDATE,
    "primaryKey": 2,
    "queuedAt": MOCKED_DATE,
    "schema": "public",
    "table": "todo",
    "transactionId": 769,
    "values": { "id": 2, "isCompleted": false, "task": "2023-11-28THH:06:22:437" },
  },
  UPDATE_MESSAGE: {
    "committedAt": MOCKED_DATE,
    "createdAt": MOCKED_DATE,
    "database": "bemi_dev_source",
    "context": { "op": "u" },
    "operation": "MESSAGE",
    "position": POSITIONS.UPDATE,
    "primaryKey": undefined,
    "queuedAt": MOCKED_DATE,
    "schema": "",
    "table": "",
    "transactionId": 769,
    "values": {},
  },
  DELETE: {
    "committedAt": MOCKED_DATE,
    "createdAt": MOCKED_DATE,
    "database": "bemi_dev_source",
    "context": {},
    "operation": "DELETE",
    "position": POSITIONS.DELETE,
    "primaryKey": 2,
    "queuedAt": MOCKED_DATE,
    "schema": "public",
    "table": "todo",
    "transactionId": 767,
    "values": {},
  },
  DELETE_MESSAGE: {
    "committedAt": MOCKED_DATE,
    "createdAt": MOCKED_DATE,
    "database": "bemi_dev_source",
    "context": { "op": "d" },
    "operation": "MESSAGE",
    "position": POSITIONS.DELETE,
    "primaryKey": undefined,
    "queuedAt": MOCKED_DATE,
    "schema": "",
    "table": "",
    "transactionId": 767,
    "values": {},
  },
  TRUNCATE: {
    "committedAt": MOCKED_DATE,
    "createdAt": MOCKED_DATE,
    "database": "bemi_dev_source",
    "context": {},
    "operation": "TRUNCATE",
    "position": POSITIONS.TRUNCATE,
    "primaryKey": undefined,
    "queuedAt": MOCKED_DATE,
    "schema": "public",
    "table": "todo",
    "transactionId": 770,
    "values": {},
  },
}

export const buildChangeMessage = (
  { changeAttributes, context, subject, streamSequence }:
  { changeAttributes: any, context?: any, subject: string, streamSequence: number }
): ChangeMessage => (
  new ChangeMessage({
    changeAttributes: context ? { ...changeAttributes, context: context } : changeAttributes,
    streamSequence,
    subject,
    messagePrefix: Object.keys(changeAttributes.context).length ? MESSAGE_PREFIX_CONTEXT : undefined,
  })
)
