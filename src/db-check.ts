import "dotenv/config";
import { listPlayers, runDb, pool } from "./db.js";

async function main(): Promise<void> {
  try {
    await runDb();

    const players = await listPlayers();

    console.log("\nRegistered players:");
    console.table(players);
    console.log(`Total players: ${players.length}`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Database check failed:", error);
  process.exitCode = 1;
});