import type { WebSocket } from "ws"
import type { GameSession } from "./game-session.js"
import { AsciiRenderer } from "./ascii-renderer.js"
import { sharedMap } from "./mini-map.js"

const FRAME_INTERVAL_MS = 50
const MAX_SHOT_DISTANCE: Record<"pistol" | "shotgun", number> = {
	pistol: 12,
	shotgun: 7,
}

const SHOT_DAMAGE: Record<"pistol" | "shotgun", number> = {
	pistol: 25,
	shotgun: 15,
}

const HIT_ANGLE: Record<"pistol" | "shotgun", number> = {
	pistol: 0.075,
	shotgun: 0.22,
}

export class GameLoop {
	private readonly renderer = new AsciiRenderer();
	private readonly sessions = new Map<WebSocket, GameSession>();
	private timer: ReturnType<typeof setInterval> | undefined

	getPlayers(exceptPlayerId?: string) {
		return Array.from(this.sessions.values())
			.map((session) => ({
				playerId: session.player.playerId,
				nickname: session.player.nickname,
				playerX: session.player.playerX,
				playerY: session.player.playerY,
				playerA: session.player.playerA,
			}))
			.filter((player) => player.playerId !== exceptPlayerId)
	}

	addPlayer(ws: WebSocket, session: GameSession): void {
		this.sessions.set(ws, session)
	}

	removePlayer(ws: WebSocket): void {
		this.sessions.delete(ws)
	}

	handleAction(session: GameSession, action: { type: string }): void {
		if (action.type !== "shoot") return
		if (!session.tryStartShot()) return

		const shooter = session.player
		const weapon = session.currentWeapon
		const maxDistance = MAX_SHOT_DISTANCE[weapon]
		const damage = SHOT_DAMAGE[weapon]
		const angleTolerance = HIT_ANGLE[weapon]

		const targets = Array.from(this.sessions.values())
			.map((targetSession) => targetSession.player)
			.filter(
				(target) =>
					target.playerId !== shooter.playerId && target.health > 0,
			)

		for (const target of targets) {
			const dx = target.playerX - shooter.playerX
			const dy = target.playerY - shooter.playerY
			const distance = Math.hypot(dx, dy)

			if (distance <= 0.2 || distance > maxDistance) continue

			const targetAngle = Math.atan2(dy, dx)
			const difference = this.normalizeAngle(targetAngle - shooter.playerA)

			// Игрок должен находиться достаточно близко к линии прицеливания.
			const targetRadiusAngle = Math.atan2(0.35, distance)
			if (Math.abs(difference) > angleTolerance + targetRadiusAngle) {
				continue
			}

			// Проверяем стену по направлению к цели.
			const wallDistance = this.castRay(
				shooter.playerX,
				shooter.playerY,
				targetAngle,
			)

			if (wallDistance < distance - 0.25) continue

			target.takeDamage(damage)

			console.log(
				`Hit: ${shooter.nickname} -> ${target.nickname}, ` +
				`weapon=${weapon}, damage=${damage}, health=${target.health}`,
			)
		}

	}

	start(): void {
		if (this.timer) return

		this.timer = setInterval(() => {
			this.renderFrame()
		}, FRAME_INTERVAL_MS)

	}

	stop(): void {
		if (!this.timer) return

		clearInterval(this.timer)
		this.timer = undefined

	}

	private renderFrame(): void {
		for (const [ws, session] of this.sessions) {
			if (ws.readyState !== 1) continue

			try {
				const frame = this.renderer.render(
					session.player,
					sharedMap,
					session.viewport,
					this.getPlayers(session.player.playerId),
				)

				ws.send(frame, { binary: true })
			} catch (error) {
				console.error("Failed to render game frame:", error)
			}
		}

	}

	private castRay(x: number, y: number, angle: number): number {
		const step = 0.05
		const dx = Math.cos(angle) * step
		const dy = Math.sin(angle) * step
		let rayX = x
		let rayY = y
		let distance = 0

		while (distance < 24) {
			rayX += dx
			rayY += dy
			distance += step

			if (!sharedMap.isWalkable(rayX, rayY)) {
				return distance
			}
		}

		return 24

	}

	private normalizeAngle(angle: number): number {
		while (angle > Math.PI) angle -= Math.PI * 2
		while (angle < -Math.PI) angle += Math.PI * 2
		return angle
	}
}