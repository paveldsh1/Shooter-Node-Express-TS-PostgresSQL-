
export interface WalkableMap {
	isWalkable(x: number, y: number): boolean
}

export interface PlayerPosition {
	playerX: number
	playerY: number
	playerA: number
}

const PLAYER_SPEED = 5.0
const ROTATION_SPEED = 0.28
const TWO_PI = Math.PI * 2

export class GamePlayer {
	public playerX = 3.5;
	public playerY = 3.5;
	public playerA = 4.71;

	constructor(
		public readonly playerId: string,
		public readonly nickname: string,
	) { }

	moveForward(elapsedSeconds: number, map: WalkableMap): void {
		this.move(elapsedSeconds, map, 1)
	}

	moveBack(elapsedSeconds: number, map: WalkableMap): void {
		this.move(elapsedSeconds, map, -1)
	}

	moveLeft(elapsedSeconds: number): void {
		this.rotate(-1, elapsedSeconds)
	}

	moveRight(elapsedSeconds: number): void {
		this.rotate(1, elapsedSeconds)
	}

	setState(x: number, y: number, angle: number): void {
		if (![x, y, angle].every(Number.isFinite)) {
			throw new Error("Player position must contain finite numbers")
		}

		this.playerX = x
		this.playerY = y
		this.playerA = this.normalizeAngle(angle)
	}

	getState(): PlayerPosition {
		return {
			playerX: this.playerX,
			playerY: this.playerY,
			playerA: this.playerA,
		}
	}

	private move(
		elapsedSeconds: number,
		map: WalkableMap,
		direction: 1 | -1,
	): void {
		const step = PLAYER_SPEED * elapsedSeconds * direction

		const nextX = this.playerX + Math.cos(this.playerA) * step
		const nextY = this.playerY + Math.sin(this.playerA) * step

		if (map.isWalkable(nextX, nextY)) {
			this.playerX = nextX
			this.playerY = nextY
		}
	}

	private rotate(direction: 1 | -1, elapsedSeconds: number): void {
		this.playerA = this.normalizeAngle(
			this.playerA + direction * PLAYER_SPEED * ROTATION_SPEED * elapsedSeconds,
		)
	}

	private normalizeAngle(angle: number): number {
		return ((angle % TWO_PI) + TWO_PI) % TWO_PI
	}
}
