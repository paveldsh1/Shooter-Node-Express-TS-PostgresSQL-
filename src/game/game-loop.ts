
import type { WebSocket } from "ws"
import type { GameSession } from "./game-session.js"
import { AsciiRenderer } from "./ascii-renderer.js"
import { sharedMap } from "./mini-map.js"

const FRAME_INTERVAL_MS = 50

export class GameLoop {
	private readonly renderer = new AsciiRenderer();
	private readonly sessions = new Map<WebSocket, GameSession>();

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

	private timer: ReturnType<typeof setInterval> | undefined

	addPlayer(ws: WebSocket, session: GameSession): void {
		this.sessions.set(ws, session)
	}

	removePlayer(ws: WebSocket): void {
		this.sessions.delete(ws)
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
					this.getPlayers(session.player.playerId)
				)

				ws.send(frame, { binary: true })
			} catch (error) {
				console.error("Failed to render game frame:", error)
			}
		}
	}
}
