
import { randomUUID } from "node:crypto"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import 'dotenv/config'

interface User {
	id: string
	nickname: string
	passwordHash: string
}

interface AuthResult {
	user: {
		id: string
		nickname: string
	}
	token: string
}

const usersByNickname = new Map<string, User>()

function getJwtSecret(): string {
	const secret = process.env.JWT_SECRET

	if (!secret || secret.length < 32) {
		throw new Error(
			"JWT_SECRET must be set and contain at least 32 characters"
		)
	}

	return secret
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
			algorithm: "HS256"
		}
	)

	return {
		user: {
			id: user.id,
			nickname: user.nickname
		},
		token
	}
}

export async function register(
	nickname: string,
	password: string
): Promise<AuthResult> {
	const normalizedNickname = nickname.trim()

	if (normalizedNickname.length < 3 || normalizedNickname.length > 24) {
		throw new Error("Nickname must contain 3–24 characters")
	}

	if (password.length < 8 || password.length > 128) {
		throw new Error("Password must contain 8–128 characters")
	}

	const key = normalizedNickname.toLowerCase()

	if (usersByNickname.has(key)) {
		throw new Error("NICKNAME_TAKEN")
	}

	const passwordHash = await bcrypt.hash(password, 12)

	// Повторно проверяем после хеширования, чтобы избежать
	// дублирования ника при одновременных запросах.
	if (usersByNickname.has(key)) {
		throw new Error("NICKNAME_TAKEN")
	}

	const user: User = {
		id: randomUUID(),
		nickname: normalizedNickname,
		passwordHash
	}

	usersByNickname.set(key, user)

	return createAuthResult(user)
}

export async function login(
	nickname: string,
	password: string
): Promise<AuthResult> {
	const key = nickname.trim().toLowerCase()
	const user = usersByNickname.get(key)

	if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
		throw new Error("INVALID_CREDENTIALS")
	}

	return createAuthResult(user)
}
