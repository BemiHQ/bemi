import { AckPolicy, DeliverPolicy } from 'nats';
import { MikroORM } from '@mikro-orm/postgresql';

import { connectJetstream, buildConsumer } from '../../core/src/nats'
import { runIngestionLoop } from '../../core/src/ingestion'

import mikroOrmConfig from "../mikro-orm.config"

const main = (async () => {
  const jetstreamConnection = await connectJetstream('nats://localhost:4222');

  const consumer = await buildConsumer({
    connection: jetstreamConnection,
    options: {
      durable_name: 'bemi-worker-local',
      filter_subject: 'bemi',
      ack_policy: AckPolicy.All,
      deliver_policy: DeliverPolicy.All,
    },
  });

  const orm = await MikroORM.init(mikroOrmConfig)
  await orm.getMigrator().up();

  await runIngestionLoop({ orm, consumer })
})()
