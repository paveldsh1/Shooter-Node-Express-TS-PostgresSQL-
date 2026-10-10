
import { pool } from "../db.js";

export interface PlayerState {
  playerId: string;
  playerX: number;
  playerY: number;
  playerA: number;
  updatedAt: Date;
}

interface PlayerStateRow {
  player_id: string;
  player_x: number;
  player_y: number;
  player_a: number;
  updated_at: Date;
}

function mapRow(row: PlayerStateRow): PlayerState {
  return {
    playerId: row.player_id,
    playerX: row.player_x,
    playerY: row.player_y,
    playerA: row.player_a,
    updatedAt: row.updated_at,
  };
}

/**
 * Загружает сохранённое состояние игрока.
 * Если сохранения нет, возвращает null.
 */
export async function getPlayerState(
  playerId: string,
): Promise<PlayerState | null> {
  const result = await pool.query<PlayerStateRow>(
    `
      SELECT player_id, player_x, player_y, player_a, updated_at
      FROM player_states
      WHERE player_id = $1
    `,
    [playerId],
  );

  const row = result.rows[0];

  return row ? mapRow(row) : null;
}

/**
 * Создаёт или обновляет сохранённое состояние игрока.
 */
export async function savePlayerState(
  state: Pick<PlayerState, "playerId" | "playerX" | "playerY" | "playerA">,
): Promise<PlayerState> {
  const result = await pool.query<PlayerStateRow>(
    `
      INSERT INTO player_states (
        player_id,
        player_x,
        player_y,
        player_a,
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (player_id)
      DO UPDATE SET
        player_x = EXCLUDED.player_x,
        player_y = EXCLUDED.player_y,
        player_a = EXCLUDED.player_a,
        updated_at = NOW()
      RETURNING player_id, player_x, player_y, player_a, updated_at
    `,
    [state.playerId, state.playerX, state.playerY, state.playerA],
  );

  return mapRow(result.rows[0]);
}
