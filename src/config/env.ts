import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  PAWAPAY_BASE_URL: z.preprocess((value) => value || undefined, z.url().optional()),
  PAWAPAY_API_TOKEN: z.preprocess((value) => value || undefined, z.string().min(1).optional()),
  ADMIN_API_KEY: z.preprocess((value) => value || undefined, z.string().min(16).optional()),
  CORS_ORIGIN: z.preprocess((value) => value || undefined, z.url().optional()),
}).superRefine((value, context) => {
  if (Boolean(value.PAWAPAY_BASE_URL) !== Boolean(value.PAWAPAY_API_TOKEN)) {
    context.addIssue({ code: 'custom', message: 'PAWAPAY_BASE_URL et PAWAPAY_API_TOKEN doivent être définis ensemble.', path: ['PAWAPAY_API_TOKEN'] });
  }
  if (value.PAWAPAY_BASE_URL) {
    const providerUrl = new URL(value.PAWAPAY_BASE_URL);
    if (providerUrl.protocol !== 'https:' || !providerUrl.hostname.startsWith('api.sandbox.')
      || !providerUrl.hostname.endsWith('.pawapay.io') || providerUrl.username || providerUrl.password
      || providerUrl.pathname !== '/' || providerUrl.search || providerUrl.hash) {
      context.addIssue({ code: 'custom', message: 'Utiliser uniquement l’URL HTTPS de l’API pawaPay sandbox.', path: ['PAWAPAY_BASE_URL'] });
    }
  }
  if (value.NODE_ENV === 'production' && !value.ADMIN_API_KEY) {
    context.addIssue({ code: 'custom', message: 'ADMIN_API_KEY est requis en production.', path: ['ADMIN_API_KEY'] });
  }
});

export const env = schema.parse(process.env);
