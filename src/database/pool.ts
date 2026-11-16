import { Pool } from 'pg';
import { dbConfig } from '../config/db.config.js';

export const pool = new Pool(dbConfig);
