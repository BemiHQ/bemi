import { Operation } from '../../entities/Change'

import { POSITIONS } from './nats-messages'

export const MOCKED_DATE = new Date(1466424490000)

export const CHANGE_ATTRIBUTES = {
  CREATE: {
    committedAt: MOCKED_DATE,
    createdAt: MOCKED_DATE,
    database: 'bemi_dev_source',
    context: {},
    operation: Operation.CREATE,
    position: POSITIONS.CREATE,
    primaryKey: '2',
    queuedAt: MOCKED_DATE,
    schema: 'public',
    table: 'todo',
    transactionId: 768,
    before: {},
    after: { id: 2, isCompleted: false, task: 'Test' }
  },
  CREATE_MESSAGE: {
    committedAt: MOCKED_DATE,
    createdAt: MOCKED_DATE,
    database: 'bemi_dev_source',
    context: { op: 'c' },
    operation: Operation.MESSAGE,
    position: POSITIONS.CREATE,
    primaryKey: undefined,
    queuedAt: MOCKED_DATE,
    schema: '',
    table: '',
    transactionId: 768,
    before: {},
    after: {}
  },
  UPDATE: {
    committedAt: MOCKED_DATE,
    createdAt: MOCKED_DATE,
    database: 'bemi_dev_source',
    context: {},
    operation: Operation.UPDATE,
    position: POSITIONS.UPDATE,
    primaryKey: '2',
    queuedAt: MOCKED_DATE,
    schema: 'public',
    table: 'todo',
    transactionId: 769,
    before: { id: 2, isCompleted: false, task: 'Test' },
    after: { id: 2, isCompleted: true, task: 'Test' }
  },
  UPDATE_MESSAGE: {
    committedAt: MOCKED_DATE,
    createdAt: MOCKED_DATE,
    database: 'bemi_dev_source',
    context: { op: 'u' },
    operation: Operation.MESSAGE,
    position: POSITIONS.UPDATE,
    primaryKey: undefined,
    queuedAt: MOCKED_DATE,
    schema: '',
    table: '',
    transactionId: 769,
    before: {},
    after: {}
  },
  DELETE: {
    committedAt: MOCKED_DATE,
    createdAt: MOCKED_DATE,
    database: 'bemi_dev_source',
    context: {},
    operation: Operation.DELETE,
    position: POSITIONS.DELETE,
    primaryKey: '2',
    queuedAt: MOCKED_DATE,
    schema: 'public',
    table: 'todo',
    transactionId: 767,
    before: { id: 2, isCompleted: true, task: 'Test' },
    after: {}
  },
  DELETE_MESSAGE: {
    committedAt: MOCKED_DATE,
    createdAt: MOCKED_DATE,
    database: 'bemi_dev_source',
    context: { op: 'd' },
    operation: Operation.MESSAGE,
    position: POSITIONS.DELETE,
    primaryKey: undefined,
    queuedAt: MOCKED_DATE,
    schema: '',
    table: '',
    transactionId: 767,
    before: {},
    after: {}
  },
  HEARTBEAT_MESSAGE: {
    committedAt: MOCKED_DATE,
    createdAt: MOCKED_DATE,
    database: 'bemi_dev_source',
    context: {},
    operation: Operation.MESSAGE,
    position: POSITIONS.HEARTBEAT_MESSAGE,
    primaryKey: undefined,
    queuedAt: MOCKED_DATE,
    schema: '',
    table: '',
    transactionId: 769,
    before: {},
    after: {}
  },
  TRUNCATE: {
    committedAt: MOCKED_DATE,
    createdAt: MOCKED_DATE,
    database: 'bemi_dev_source',
    context: {},
    operation: Operation.TRUNCATE,
    position: POSITIONS.TRUNCATE,
    primaryKey: undefined,
    queuedAt: MOCKED_DATE,
    schema: 'public',
    table: 'todo',
    transactionId: 771,
    before: {},
    after: {}
  }
}
