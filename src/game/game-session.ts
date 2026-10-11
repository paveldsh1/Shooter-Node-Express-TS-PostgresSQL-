import { GamePlayer } from "./player.js"
import { sharedMap } from "./mini-map.js"

export interface Viewport {
	columns: number
	rows: number
	scale: number
}

export type WeaponType = "pistol" | "shotgun"

export type GameAction =
	| { type: "none" }
	| { type: "shoot" }
	| { type: "select-weapon"; weapon: WeaponType }
	| { type: "toggle-bots" }

const WEAPON_COOLDOWN_MS: Record<WeaponType, number> = {
	pistol: 350,
	shotgun: 800,
}

export class GameSession {
	public readonly map = sharedMap;

	public readonly viewport: Viewport = {
		columns: 80,
		rows: 24,
		scale: 1,
	};

	public currentWeapon: WeaponType = "pistol";

	private lastShotAt = 0;

	constructor(public readonly player: GamePlayer) { }

	tryStartShot(): boolean {
		if (this.player.health <= 0) {
			return false
		}

		const now = Date.now()
		const cooldown = WEAPON_COOLDOWN_MS[this.currentWeapon]

		if (now - this.lastShotAt < cooldown) {
			return false
		}

		this.lastShotAt = now
		return true

	}

	handleMessage(message: string, elapsedSeconds = 0.05): GameAction {
		const command = message.trim()

		if (command.startsWith("RESIZE ")) {
			this.handleResize(command)
			return { type: "none" }
		}

		switch (command) {
			case "KeyW":
				this.player.moveForward(elapsedSeconds, this.map)
				return { type: "none" }

			case "KeyS":
				this.player.moveBack(elapsedSeconds, this.map)
				return { type: "none" }

			case "KeyA":
				this.player.moveLeft(elapsedSeconds)
				return { type: "none" }

			case "KeyD":
				this.player.moveRight(elapsedSeconds)
				return { type: "none" }

			case "Space":
				return { type: "shoot" }

			case "Digit1":
				this.currentWeapon = "pistol"
				return { type: "select-weapon", weapon: "pistol" }

			case "Digit2":
				this.currentWeapon = "shotgun"
				return { type: "select-weapon", weapon: "shotgun" }

			case "Digit9":
				return { type: "toggle-bots" }

			default:
				return { type: "none" }
		}

	}

	private handleResize(command: string): void {
		const parts = command.split(/\s+/)

		if (parts.length !== 4) return

		const columns = Number(parts[1])
		const rows = Number(parts[2])
		const scale = Number(parts[3])

		if (
			!Number.isInteger(columns) ||
			!Number.isInteger(rows) ||
			columns < 1 ||
			rows < 1 ||
			!Number.isFinite(scale) ||
			scale <= 0
		) {
			return
		}

		this.viewport.columns = columns
		this.viewport.rows = rows
		this.viewport.scale = scale

	}
}