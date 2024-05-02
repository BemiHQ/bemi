import { connect, JSONCodec } from "nats";

import { logger } from './logger'

const JSON_CODEC = JSONCodec()

export interface NatsMessage {
  subject: string,
  info: {
    streamSequence: number,
    pending: number,
  },
  data: any,
  ack: () => void,
}

export const connectJetstream = (host: string) => {
  return connect({ servers: host });
}

export const buildConsumer = async (
  { connection, stream, options }:
  { connection: any, stream: string, options: any }
) => {
  const jetstream = connection.jetstream();
  const jetstreamManager = await connection.jetstreamManager();
  let consumer;

  try {
    consumer = await jetstream.consumers.get(stream, options.durable_name);
    const { config } = await consumer.info();
    if (Object.keys(options).some(key => options[key] !== config[key])) {
      logger.info('Updating consumer...');
      await jetstreamManager.consumers.update(stream, options.durable_name, options);
    }
  } catch (e: any) {
    if (e.message !== "consumer not found") throw e;
    logger.info('Creating consumer...');
    await jetstreamManager.consumers.add(stream, options);
    consumer = await jetstream.consumers.get(stream, options.durable_name);
  }

  return consumer;
}

export const decodeData = (data: any) => {
  return JSON_CODEC.decode(data);
}

export const encodeData = (data: any) => {
  return JSON_CODEC.encode(data);
}
