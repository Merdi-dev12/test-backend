import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './database/pool.js';

const server = app.listen(env.PORT, () => {
  console.log(`API listening on port ${env.PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  });
}
