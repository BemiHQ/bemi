import { AckPolicy, DeliverPolicy } from 'nats'
import { MikroORM } from '@mikro-orm/postgresql'
import http from 'http'

import { connectJetstream, buildConsumer } from '../../core/src/nats'
import { runIngestionLoop } from '../../core/src/ingestion'

import mikroOrmConfig from '../mikro-orm.config'

import 'dotenv/config'

function healthCheck() {
  const server = http.createServer()

  server.on('request', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('OK')
  })

  server.listen(process.env.PORT)
  server.on('error', (err) => {
    console.error(err)
    process.exit(1)
  })
}

async function main() {
  const jetstreamConnection = await connectJetstream('nats://localhost:4222')

  const consumer = await buildConsumer({
    connection: jetstreamConnection,
    stream: 'DebeziumStream',
    options: {
      durable_name: 'bemi-worker-local',
      filter_subject: 'bemi',
      ack_policy: AckPolicy.All,
      deliver_policy: DeliverPolicy.All,
    },
  })

  const orm = await MikroORM.init(mikroOrmConfig)
  await orm.getMigrator().up()

  await runIngestionLoop({ orm, consumer })
}

healthCheck()
main().catch((err) => {
  console.error(err)
  process.exit(1)
})
