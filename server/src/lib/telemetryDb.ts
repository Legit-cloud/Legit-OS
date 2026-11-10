import { Pool } from 'pg';
import { env } from './env.js';

export const telemetryDb = new Pool({
  connectionString: env.telemetryDbUrl ? env.telemetryDbUrl.split('?')[0] : undefined,
  ssl: true,
});

telemetryDb.on('error', (err) => {
  console.error('Unexpected error on idle telemetry DB client', err);
});
