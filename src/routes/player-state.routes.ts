
import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  loadPlayerState,
  updatePlayerState,
} from "../player-state/player-state.service.js";

export const playerStateRouter = Router();

// Загрузить состояние текущего игрока
playerStateRouter.get("/me/state", requireAuth, async (req, res) => {
  const player = req.player;

  if (!player) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  try {
    const state = await loadPlayerState(player.userId);
    res.status(200).json({ state });
  } catch (error) {
    console.error("Load player state error:", error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
});

// Сохранить состояние текущего игрока
playerStateRouter.put("/me/state", requireAuth, async (req, res) => {
  const player = req.player;

  if (!player) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  const { playerX, playerY, playerA } = req.body ?? {};

  if (
    typeof playerX !== "number" ||
    typeof playerY !== "number" ||
    typeof playerA !== "number"
  ) {
    res.status(400).json({
      error: "INVALID_PLAYER_STATE",
      message: "playerX, playerY and playerA must be numbers",
    });
    return;
  }

  try {
    const state = await updatePlayerState(player.userId, {
      playerX,
      playerY,
      playerA,
    });

    res.status(200).json({ state });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PLAYER_STATE") {
      res.status(400).json({ error: "INVALID_PLAYER_STATE" });
      return;
    }

    console.error("Save player state error:", error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
});
