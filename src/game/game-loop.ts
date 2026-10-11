
import type { WebSocket } from "ws"
import type { GameSession } from "./game-session.js"
import { AsciiRenderer } from "./ascii-renderer.js"
import { sharedMap } from "./mini-map.js"
import { GameBot } from "./bot.js"

const FRAME_INTERVAL_MS = 50
const BOT_COUNT = 5
const BOT_RESPAWN_DELAY_MS = 3000

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

	private readonly respawnTimers =
		new Map<string, ReturnType<typeof setTimeout>>();
	private readonly respawnDelayMs = 3000;

	private readonly bots: GameBot[] = Array.from(
		{ length: BOT_COUNT },
		(_, index) => new GameBot(`bot-${index + 1}`, `Bot ${index + 1}`),
	);

	private readonly botRespawnTimers =
		new Map<string, ReturnType<typeof setTimeout>>();

	private get botsEnabled(): boolean {
		return Array.from(this.sessions.values()).some(
			(session) => session.botsEnabled,
		)
	}

	getPlayers(exceptPlayerId?: string) {
		return Array.from(this.sessions.values())
			.filter((session) => session.player.health > 0)
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
		const session = this.sessions.get(ws)

		if (session) {
			const playerId = session.player.playerId
			const anotherConnectionExists = Array.from(this.sessions.entries()).some(
				([otherWs, otherSession]) =>
					otherWs !== ws && otherSession.player.playerId === playerId,
			)

			if (!anotherConnectionExists) {
				const timer = this.respawnTimers.get(playerId)

				if (timer) {
					clearTimeout(timer)
					this.respawnTimers.delete(playerId)
				}
			}
		}

		this.sessions.delete(ws)
	}

	handleAction(session: GameSession, action: { type: string }): void {
		if (action.type !== "shoot") return
		if (!session.tryStartShot()) return

		const shooter = session.player

		// Мёртвый игрок не может стрелять.
		if (shooter.health <= 0) return

		const weapon = session.currentWeapon
		const maxDistance = MAX_SHOT_DISTANCE[weapon]
		const damage = SHOT_DAMAGE[weapon]
		const angleTolerance = HIT_ANGLE[weapon]

		const playerTargets = Array.from(this.sessions.values())
			.map((targetSession) => targetSession.player)
			.filter(
				(target) =>
					target.playerId !== shooter.playerId && target.health > 0,
			)

		const botTargets = this.botsEnabled
			? this.bots.filter((bot) => bot.isAlive)
			: []

		const targets = [...playerTargets, ...botTargets]

		for (const target of targets) {
			const dx = target.playerX - shooter.playerX
			const dy = target.playerY - shooter.playerY
			const distance = Math.hypot(dx, dy)

			if (distance <= 0.2 || distance > maxDistance) continue

			const targetAngle = Math.atan2(dy, dx)
			const difference = this.normalizeAngle(targetAngle - shooter.playerA)
			const targetRadiusAngle = Math.atan2(0.35, distance)

			if (
				Math.abs(difference) >
				angleTolerance + targetRadiusAngle
			) {
				continue
			}

			// Стена не должна пропускать выстрел.
			const wallDistance = this.castRay(
				shooter.playerX,
				shooter.playerY,
				targetAngle,
			)

			if (wallDistance < distance - 0.25) continue
			if (target.health <= 0) continue

			target.takeDamage(damage)

			console.log(
				`Hit: ${shooter.nickname} -> ${target.nickname}, ` +
				`weapon=${weapon}, damage=${damage}, health=${target.health}`,
			)

			if (target.health <= 0) {
				if (target instanceof GameBot) {
					this.scheduleBotRespawn(target)
				} else {
					const deadSession = Array.from(this.sessions.values()).find(
						(current) => current.player.playerId === target.playerId,
					)

					if (deadSession) {
						this.scheduleRespawn(deadSession)
					}
				}

				// Один выстрел поражает только одну цель.
				break
			}
		}
	}

	start(): void {
		if (this.timer) return

		this.timer = setInterval(() => {
			this.updateBots()
			this.renderFrame()
		}, FRAME_INTERVAL_MS)
	}

	stop(): void {
		if (!this.timer) return

		clearInterval(this.timer)
		this.timer = undefined

		for (const timer of this.botRespawnTimers.values()) {
			clearTimeout(timer)
		}
		this.botRespawnTimers.clear()
	}

	private updateBots(): void {
		if (!this.botsEnabled) return

		const elapsedSeconds = FRAME_INTERVAL_MS / 1000

		for (const bot of this.bots) {
			if (bot.isAlive) {
				bot.update(elapsedSeconds)
			}
		}
	}

	private renderFrame(): void {
		const visibleBots = this.botsEnabled
			? this.bots
				.filter((bot) => bot.isAlive)
				.map((bot) => ({
					playerId: bot.playerId,
					nickname: bot.nickname,
					playerX: bot.playerX,
					playerY: bot.playerY,
					playerA: bot.playerA,
				}))
			: []

		for (const [ws, session] of this.sessions) {
			if (ws.readyState !== 1) continue

			try {
				const otherPlayers = [
					...this.getPlayers(session.player.playerId),
					...visibleBots,
				]

				const frame = this.renderer.render(
					session.player,
					sharedMap,
					session.viewport,
					otherPlayers,
					{
						weapon: session.currentWeapon,
						shooting: session.isShooting,
						miniMapVisible: session.miniMapVisible,
						helpVisible: session.helpVisible,
					},
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

	private scheduleBotRespawn(bot: GameBot): void {
		if (this.botRespawnTimers.has(bot.playerId)) return

		console.log(`Bot died: ${bot.nickname}. Respawn scheduled.`)

		const timer = setTimeout(() => {
			this.botRespawnTimers.delete(bot.playerId)

			const occupied = [
				...Array.from(this.sessions.values())
					.filter((session) => session.player.health > 0)
					.map((session) => ({
						x: session.player.playerX,
						y: session.player.playerY,
					})),
				...this.bots
					.filter((other) => other !== bot && other.isAlive)
					.map((other) => ({
						x: other.playerX,
						y: other.playerY,
					})),
			]

			const spawn = sharedMap.tryGetRandomSpawn(occupied)

			if (!spawn) {
				console.error(`No spawn available for ${bot.nickname}`)
				return
			}

			bot.respawn()
			bot.playerX = spawn.x
			bot.playerY = spawn.y

			console.log(
				`Bot respawned: ${bot.nickname}, ` +
				`x=${spawn.x.toFixed(1)}, y=${spawn.y.toFixed(1)}, ` +
				`health=${bot.health}`,
			)
		}, BOT_RESPAWN_DELAY_MS)

		this.botRespawnTimers.set(bot.playerId, timer)
	}

	private scheduleRespawn(session: GameSession): void {
		const player = session.player

		if (player.health > 0) return
		if (this.respawnTimers.has(player.playerId)) return

		console.log(`Respawn scheduled: ${player.nickname}`)

		const timer = setTimeout(() => {
			this.respawnTimers.delete(player.playerId)

			// Игрок мог отключиться за время ожидания.
			const stillConnected = Array.from(this.sessions.values()).some(
				(current) => current.player.playerId === player.playerId,
			)

			if (!stillConnected) return

			const occupied = Array.from(this.sessions.values())
				.filter((current) => current.player.playerId !== player.playerId)
				.filter((current) => current.player.health > 0)
				.map((current) => ({
					x: current.player.playerX,
					y: current.player.playerY,
				}))

			const spawn = sharedMap.tryGetRandomSpawn(occupied)

			if (!spawn) {
				console.error(`No spawn available for ${player.nickname}`)
				return
			}

			const angle = Math.random() * Math.PI * 2
			player.respawn(spawn.x, spawn.y, angle)

			console.log(
				`Player respawned: ${player.nickname}, ` +
				`x=${spawn.x.toFixed(1)}, y=${spawn.y.toFixed(1)}, ` +
				`health=${player.health}`,
			)
		}, this.respawnDelayMs)

		this.respawnTimers.set(player.playerId, timer)
	}
}
