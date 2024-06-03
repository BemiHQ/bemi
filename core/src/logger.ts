import util from 'util'

const LOG_LEVEL = process.env.LOG_LEVEL

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const log = (message: any) => {
  if (typeof message === 'string') {
    return console.log(message)
  }

  console.log(util.inspect(message, { showHidden: false, depth: null, colors: true }))
}

export const logger = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (message: any) => {
    if (LOG_LEVEL === 'DEBUG') log(message)
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (message: any) => {
    log(message)
  },
}
