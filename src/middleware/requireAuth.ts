import type { Request, Response, NextFunction } from "express"
import { verifyAccessToken } from "../auth/token.service.js"

declare global {
	namespace Express {
		interface Request {
			player?: {
				userId: string
				nickname: string
			}
		}
	}
}

export function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
): void {
	const authorization = req.headers.authorization

	if (!authorization?.startsWith("Bearer ")) {
		res.status(401).json({
			error: "UNAUTHORIZED",
			message: "Bearer token is required",
		})
		return
	}

	const token = authorization.slice("Bearer ".length).trim()

	if (!token) {
		res.status(401).json({
			error: "UNAUTHORIZED",
			message: "Bearer token is required",
		})
		return
	}

	try {
		req.player = verifyAccessToken(token)
		next()
	} catch {
		res.status(401).json({
			error: "INVALID_TOKEN",
			message: "Access token is invalid or expired",
		})
	}
}