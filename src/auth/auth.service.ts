
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { pool } from "../db.js";
import { randomUUID } from "node:crypto";

interface User {
  id: string;
  nickname: string;
  passwordHash: string;
}

interface AuthResult {
  user: {
    id: string;
    nickname: string;
  };
  token: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be set and contain at least 32 characters",
    );
  }

  return secret;
}

function createAuthResult(user: User): AuthResult {
  const token = jwt.sign(
    { nickname: user.nickname },
    getJwtSecret(),
    {
      subject: user.id,
      expiresIn: (process.env.JWT_EXPIRES_IN ?? "1h") as jwt.SignOptions["expiresIn"],
      issuer: "shooter-api",
      audience: "shooter-client",
      algorithm: "HS256",
    },
  );

  return {
    user: {
      id: user.id,
      nickname: user.nickname,
    },
    token,
  };
}

export async function register(
  nickname: string,
  password: string,
): Promise<AuthResult> {
  const normalizedNickname = nickname.trim();

  if (
    normalizedNickname.length < 3 ||
    normalizedNickname.length > 24
  ) {
    throw new Error("INVALID_NICKNAME");
  }

  if (password.length < 8 || password.length > 128) {
    throw new Error("INVALID_PASSWORD");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = await pool.query<{
      id: string;
      nickname: string;
      password_hash: string;
    }>(
      `INSERT INTO players (
         id,
         nickname,
         nickname_normalized,
         password_hash
       )
       VALUES ($1, $2, $3, $4)
       RETURNING id, nickname, password_hash`,
      [
        randomUUID(),
        normalizedNickname,
        normalizedNickname.toLowerCase(),
        passwordHash,
      ],
    );

    const row = result.rows[0];

    const user: User = {
      id: row.id,
      nickname: row.nickname,
      passwordHash: row.password_hash,
    };

    // Сразу выдаём JWT после успешной регистрации.
    return createAuthResult(user);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      throw new Error("NICKNAME_TAKEN");
    }

    throw error;
  }
}

export async function login(
  nickname: string,
  password: string,
): Promise<AuthResult> {
  const key = nickname.trim().toLowerCase();

  const result = await pool.query<{
    id: string;
    nickname: string;
    password_hash: string;
  }>(
    `SELECT id, nickname, password_hash
     FROM players
     WHERE nickname_normalized = $1`,
    [key],
  );

  const row = result.rows[0];

  if (
    !row ||
    !(await bcrypt.compare(password, row.password_hash))
  ) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const user: User = {
    id: row.id,
    nickname: row.nickname,
    passwordHash: row.password_hash,
  };

  return createAuthResult(user);
}
