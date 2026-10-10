
import { pool, runDb } from "./db.js";

async function main(): Promise<void> {
  try {
    await runDb();

    const result = await pool.query<{
      column_name: string;
      data_type: string;
    }>(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'player_states'
      ORDER BY ordinal_position
    `);

    console.table(result.rows);

    if (result.rows.length === 0) {
      throw new Error("Table player_states was not found");
    }

    console.log("Player states table verified");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error("Player state check failed:", error);
  process.exitCode = 1;
});
