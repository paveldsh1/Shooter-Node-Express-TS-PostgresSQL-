
import { sharedMap } from "./mini-map.js"

const BOT_SPEED = 1.2
const BOT_TURN_SPEED = 2.5
const BOT_MAX_HEALTH = 100
const TWO_PI = Math.PI * 2

export class GameBot {
	public health = BOT_MAX_HEALTH;

	public playerX: number
	public playerY: number
	public playerA: number

	private targetX: number
	private targetY: number
	private directionTimer = 0;

	constructor(public readonly playerId: string, public readonly nickname: string) {
		const spawn = sharedMap.tryGetRandomSpawn()

		this.playerX = spawn?.x ?? 1.5
		this.playerY = spawn?.y ?? 1.5
		this.playerA = Math.random() * TWO_PI

		this.targetX = this.playerX
		this.targetY = this.playerY

		this.chooseTarget()
	}

	get isAlive(): boolean {
		return this.health > 0
	}

	takeDamage(amount: number): void {
		if (!this.isAlive || !Number.isFinite(amount) || amount <= 0) {
			return
		}

		this.health = Math.max(0, this.health - amount)
	}

	update(elapsedSeconds: number): void {
		if (!this.isAlive) return

		this.directionTimer -= elapsedSeconds

		const dx = this.targetX - this.playerX
		const dy = this.targetY - this.playerY
		const distance = Math.hypot(dx, dy)

		if (distance < 0.15 || this.directionTimer <= 0) {
			this.chooseTarget()
			return
		}

		const targetAngle = Math.atan2(dy, dx)
		let angleDifference =
			((targetAngle - this.playerA + Math.PI) % TWO_PI + TWO_PI) %
			TWO_PI -
			Math.PI

		const maxTurn = BOT_TURN_SPEED * elapsedSeconds
		angleDifference = Math.max(-maxTurn, Math.min(maxTurn, angleDifference))
		this.playerA = this.normalizeAngle(this.playerA + angleDifference)

		const step = Math.min(BOT_SPEED * elapsedSeconds, distance)
		const nextX = this.playerX + Math.cos(this.playerA) * step
		const nextY = this.playerY + Math.sin(this.playerA) * step

		if (sharedMap.isWalkable(nextX, nextY)) {
			this.playerX = nextX
			this.playerY = nextY
		} else {
			this.chooseTarget()
		}
	}

	respawn(): void {
		this.health = BOT_MAX_HEALTH

		const spawn = sharedMap.tryGetRandomSpawn()

		if (spawn) {
			this.playerX = spawn.x
			this.playerY = spawn.y
		}

		this.playerA = Math.random() * TWO_PI
		this.chooseTarget()
	}

	private chooseTarget(): void {
		const spawn = sharedMap.tryGetRandomSpawn([
			{ x: this.playerX, y: this.playerY },
		])

		if (spawn) {
			this.targetX = spawn.x
			this.targetY = spawn.y
		} else {
			this.targetX = this.playerX
			this.targetY = this.playerY
		}

		this.directionTimer = 1 + Math.random() * 3
	}

	private normalizeAngle(angle: number): number {
		return ((angle % TWO_PI) + TWO_PI) % TWO_PI
	}
}
