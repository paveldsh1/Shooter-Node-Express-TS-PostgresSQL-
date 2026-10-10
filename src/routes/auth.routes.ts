
import { Router } from "express";
import { login, register } from "../auth/auth.service.js";
import { validateAuth } from "../middleware/validateAuth.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

// Регистрация нового игрока
authRouter.post("/register", validateAuth, async (req, res) => {
  const { nickname, password } = req.authBody!;

  try {
    const result = await register(nickname, password);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "NICKNAME_TAKEN") {
      res.status(409).json({
        error: "NICKNAME_TAKEN",
        message: "Nickname is already taken",
      });
      return;
    }

    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Вход существующего игрока
authRouter.post("/login", validateAuth, async (req, res) => {
  const { nickname, password } = req.authBody!;

  try {
    const result = await login(nickname, password);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid nickname or password",
      });
      return;
    }

    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Информация о текущем игроке
authRouter.get("/me", requireAuth, (req, res) => {
  const player = req.player;

  if (!player) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  res.json({
    id: player.userId,
    nickname: player.nickname,
  });
});
