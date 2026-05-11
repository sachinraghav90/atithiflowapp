import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const poolConfig = {
    host: 'aws-1-ap-southeast-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.corpmawsmunlxfdigtpo',
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 10000, // Close idle connections faster to avoid "dead" connections
    connectionTimeoutMillis: 30000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000 // Send heartbeats every 10 seconds
};

const pool = new Pool(poolConfig);

pool.on("error", (error) => {
    // Suppress noisy ECONNRESET logs if they are handled by the pool's retry logic
    if (error.code === 'ECONNRESET') {
        console.warn("Postgres connection reset, pool will reconnect...");
    } else {
        console.error("Postgres pool error:", error.message);
    }
});

export function getDb() {
    return pool;
}
