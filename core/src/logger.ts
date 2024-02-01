import util from 'util'

const LOG_LEVEL = process.env.LOG_LEVEL

const log = (message: any) => {
  if (typeof message === 'string') {
    return console.log(message)
  }

  console.log(util.inspect(message, { showHidden: false, depth: null, colors: true }))
}

export const logger = {
  debug: (message: any) => {
    if (LOG_LEVEL === 'DEBUG') log(message)
  },
  info: (message: any) => {
    log(message)
  },
}
