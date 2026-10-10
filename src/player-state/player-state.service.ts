
import {
  getPlayerState,
  savePlayerState,
} from "./player-state.repository.js";

import type { PlayerState } from "./player-state.repository.js";

export interface SavePlayerStateInput {
  playerX: number;
  playerY: number;
  playerA: number;
}

const DEFAULT_PLAYER_STATE = {
  playerX: 3.5,
  playerY: 3.5,
  playerA: 4.71,
};

function validateState(input: SavePlayerStateInput): void {
  if (
    !Number.isFinite(input.playerX) ||
    !Number.isFinite(input.playerY) ||
    !Number.isFinite(input.playerA)
  ) {
    throw new Error("INVALID_PLAYER_STATE");
  }

  // Не допускаем некорректных или чрезмерно больших значений.
  if (
    Math.abs(input.playerX) > 1_000_000 ||
    Math.abs(input.playerY) > 1_000_000 ||
    Math.abs(input.playerA) > 1_000_000
  ) {
    throw new Error("INVALID_PLAYER_STATE");
  }
}

/**
 * Возвращает сохранённое состояние или начальную позицию.
 * Начальная позиция пока соответствует значениям из исходной игры.
 */
export async function loadPlayerState(
  playerId: string,
): Promise<PlayerState | (typeof DEFAULT_PLAYER_STATE & {
  playerId: string;
  updatedAt: null;
})> {
  const savedState = await getPlayerState(playerId);

  if (savedState) {
    return savedState;
  }

  return {
    playerId,
    ...DEFAULT_PLAYER_STATE,
    updatedAt: null,
  };
}

/**
 * Проверяет и сохраняет состояние игрока.
 */
export async function updatePlayerState(
  playerId: string,
  input: SavePlayerStateInput,
): Promise<PlayerState> {
  validateState(input);

  return savePlayerState({
    playerId,
    playerX: input.playerX,
    playerY: input.playerY,
    playerA: input.playerA,
  });
}
