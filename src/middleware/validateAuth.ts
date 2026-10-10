import type { Request, Response, NextFunction } from "express";

export interface AuthBody {
  nickname: string;
  password: string;
}

declare global {
  namespace Express {
    interface Request {
      authBody?: AuthBody;
    }
  }
}

export function validateAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const { nickname, password } = req.body ?? {};

  if (typeof nickname !== "string" || typeof password !== "string") {
    res.status(400).json({
      error: "Nickname and password are required"
    });
    return;
  }

  const normalizedNickname = nickname.trim();

  if (
    normalizedNickname.length < 3 ||
    normalizedNickname.length > 24
  ) {
    res.status(400).json({
      error: "Nickname must contain 3–24 characters"
    });
    return;
  }

  if (password.length < 8 || password.length > 128) {
    res.status(400).json({
      error: "Password must contain 8–128 characters"
    });
    return;
  }

  req.authBody = {
    nickname: normalizedNickname,
    password
  };

  next();
}