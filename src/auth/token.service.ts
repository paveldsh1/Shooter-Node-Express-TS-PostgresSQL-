import jwt from "jsonwebtoken";
import "dotenv/config";

export interface AuthenticatedPlayer {
  userId: string;
  nickname: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be set and contain at least 32 characters"
    );
  }

  return secret;
}

export function verifyAccessToken(token: string): AuthenticatedPlayer {
  const payload = jwt.verify(token, getJwtSecret(), {
    issuer: "shooter-api",
    audience: "shooter-client",
    algorithms: ["HS256"],
  });

  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.nickname !== "string"
  ) {
    throw new Error("Invalid token payload");
  }

  return {
    userId: payload.sub,
    nickname: payload.nickname,
  };
}