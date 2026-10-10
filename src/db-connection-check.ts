import "dotenv/config";
import { Client } from "pg";

const client = new Client({
  host: "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 5432),
  user: process.env.DB_USER ?? "app",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? "player_state",
});

async function main(): Promise<void> {
  try {
    await client.connect();

    const result = await client.query(`
      SELECT
        current_user AS user_name,
        current_database() AS database_name,
        inet_server_addr() AS server_address,
        inet_server_port() AS server_port
    `);

    console.log("Connection successful:", result.rows[0]);
  } catch (error) {
    console.error("Connection failed:", error);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();