import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, "../migrations");

if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL in .env");
    process.exit(1);
}

async function runFile(client, filePath) {
    const sql = fs.readFileSync(filePath, "utf8").trim();
    if (!sql) return;
    console.log(`\n--- running migration: ${path.basename(filePath)} ---`);
    try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("COMMIT");
        console.log(`applied ${path.basename(filePath)}`);
    } catch (err) {
        await client.query("ROLLBACK").catch(() => { });
        console.error(`failed ${path.basename(filePath)}:`, err.message || err);
        throw err;
    }
}

(async function () {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const files = fs.readdirSync(MIGRATIONS_DIR)
            .filter(f => f.endsWith(".sql"))
            .sort();

        if (!files.length) {
            console.log("No migrations found in", MIGRATIONS_DIR);
            return;
        }

        for (const f of files) {
            const full = path.join(MIGRATIONS_DIR, f);
            await runFile(client, full);
        }

        console.log("\nAll migrations applied successfully.");
    } catch (err) {
        console.error("\nMigration run aborted.", err);
        process.exitCode = 1;
    } finally {
        await client.end().catch(() => { });
    }
})();
