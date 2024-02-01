import { connect, JSONCodec } from "nats";

const JSON_CODEC = JSONCodec()

export interface Message {
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
  { connection: any, stream: string, options: object }
) => {
  const jetstream = connection.jetstream();
  const jetstreamManager = await connection.jetstreamManager();

  const consumerInfo = await jetstreamManager.consumers.add(stream, options);
  return jetstream.consumers.get(stream, consumerInfo.name);
}

export const decodeData = (data: any) => {
  return JSON_CODEC.decode(data);
}

export const encodeData = (data: any) => {
  return JSON_CODEC.encode(data);
}
