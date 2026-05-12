import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString =
  process.env.NODE_ENV === "production"
    ? process.env.DIRECT_URL
    : process.env.DATABASE_URL;

const poolConfig = {
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: parseInt(process.env.DB_MAX_CONNECTIONS || "20"),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "10000"),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || "30000"),
  keepAlive: true,
  keepAliveInitialDelayMillis: parseInt(process.env.DB_KEEP_ALIVE_DELAY || "10000"),
};

const pool = new Pool(poolConfig);

pool.on("error", (error) => {
  if (error.code === "ECONNRESET") {
    console.warn("Postgres connection reset, pool will reconnect...");
  } else {
    console.error("Postgres pool error:", error.message);
  }
});

export function getDb() {
  return pool;
}