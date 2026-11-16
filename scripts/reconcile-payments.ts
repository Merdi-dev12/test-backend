import { env } from '../src/config/env.js';
import { pool } from '../src/database/pool.js';
import { refreshPayment } from '../src/modules/payments/payments.service.js';
import { listUnresolvedAttemptIds } from '../src/modules/payments/payments.repository.js';

async function reconcile() {
  if (!env.PAWAPAY_BASE_URL || !env.PAWAPAY_API_TOKEN) return;
  for (const id of await listUnresolvedAttemptIds()) {
    try {
      await refreshPayment(id);
    } catch (error) {
      console.error('Réconciliation impossible pour une tentative.', { id, error });
    }
  }
}

async function main() {
  if (process.argv.includes('--once')) {
    try { await reconcile(); } finally { await pool.end(); }
    return;
  }
  let stopping = false;
  process.on('SIGTERM', () => { stopping = true; });
  process.on('SIGINT', () => { stopping = true; });
  while (!stopping) {
    try { await reconcile(); } catch (error) { console.error('Réconciliation indisponible.', error); }
    await new Promise<void>((resolve) => setTimeout(resolve, 30_000));
  }
  await pool.end();
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
