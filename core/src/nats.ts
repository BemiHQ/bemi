import { connect, ConsumerConfig, JSONCodec, NatsConnection } from "nats";

import { logger } from './logger'

const JSON_CODEC = JSONCodec()

export const connectJetstream = (host: string) => {
  return connect({ servers: host });
}

export const buildConsumer = async (
  { connection, stream, options }:
  { connection: NatsConnection, stream: string, options: Partial<ConsumerConfig> }
) => {
  const jetstream = connection.jetstream();
  const jetstreamManager = await connection.jetstreamManager();
  let consumer;

  try {
    consumer = await jetstream.consumers.get(stream, options.durable_name);
    const { config } = await consumer.info();
    const hasDifferentValue = Object
      .keys(options)
      .some(key => {
          const keyAsOptionsKeyType = key as keyof typeof options;
          return options[keyAsOptionsKeyType] !== config[keyAsOptionsKeyType]
      });
    if (hasDifferentValue && options.durable_name) {
      logger.info('Updating consumer...');
      await jetstreamManager.consumers.update(stream, options.durable_name, options);
    }
  } catch (e) {
    if (e instanceof Error && e.message !== "consumer not found") throw e;
    logger.info('Creating consumer...');
    await jetstreamManager.consumers.add(stream, options);
    consumer = await jetstream.consumers.get(stream, options.durable_name);
  }

  return consumer;
}

export const decodeData = (data: Uint8Array) => {
  return JSON_CODEC.decode(data);
}

export const encodeData = (data: Uint8Array) => {
  return JSON_CODEC.encode(data);
}
