import fs from 'fs'
import { MikroORM } from '@mikro-orm/postgresql'

import mikroOrmConfig from '../mikro-orm.config'

const main = (async () => {
  const orm = await MikroORM.init(mikroOrmConfig)
  await orm.em.getConnection().execute(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = 'bemi_slot') THEN
        PERFORM pg_drop_replication_slot('bemi_slot');
      END IF;
    END $$;
  `)
  await orm.close()

  try {
    fs.unlinkSync('./debezium-server/offsets.dat')
  } catch (e: any) {
    if (e.code !== 'ENOENT') {
      throw e
    }
  }
})()
