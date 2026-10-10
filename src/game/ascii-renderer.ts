
import type { GamePlayer } from "./player.js"
import type { Viewport } from "./game-session.js"
import type { MiniMap } from "./mini-map.js"

const FIELD_OF_VIEW = Math.PI / 3
const MAX_DISTANCE = 24

export class AsciiRenderer {
	render(
		player: GamePlayer,
		map: MiniMap,
		viewport: Viewport,
	): string {
		const width = Math.max(20, Math.min(viewport.columns, 240))
		const height = Math.max(10, Math.min(viewport.rows, 100))

		const buffer: string[][] = Array.from(
			{ length: height },
			(_, y) =>
				Array.from({ length: width }, () =>
					y < height / 2 ? " " : ".",
				),
		)

		for (let column = 0; column < width; column++) {
			const cameraX = (2 * column) / width - 1
			const rayAngle =
				player.playerA +
				Math.atan(cameraX * Math.tan(FIELD_OF_VIEW / 2))

			const distance = this.castRay(
				player.playerX,
				player.playerY,
				rayAngle,
				map,
			)

			const wallHeight = Math.min(
				height,
				Math.floor(height / Math.max(distance, 0.1)),
			)

			const wallStart = Math.max(
				0,
				Math.floor((height - wallHeight) / 2),
			)

			const wallEnd = Math.min(
				height,
				wallStart + wallHeight,
			)

			const wallChar = this.getWallChar(distance)

			for (let y = wallStart; y < wallEnd; y++) {
				buffer[y]![column] = wallChar
			}
		}

		return buffer.map((line) => line.join("")).join("\n")
	}

	private castRay(
		x: number,
		y: number,
		angle: number,
		map: MiniMap,
	): number {
		const step = 0.02
		const dx = Math.cos(angle) * step
		const dy = Math.sin(angle) * step

		let rayX = x
		let rayY = y
		let distance = 0

		while (distance < MAX_DISTANCE) {
			rayX += dx
			rayY += dy
			distance += step

			if (!map.isWalkable(rayX, rayY)) {
				break
			}
		}

		// Коррекция fish-eye: расстояние проецируется на направление взгляда.
		return Math.max(
			0.1,
			distance * Math.cos(angle),
		)
	}

	private getWallChar(distance: number): string {
		if (distance < 2) return "#"
		if (distance < 4) return "X"
		if (distance < 7) return "x"
		if (distance < 12) return ":"
		return "."
	}
}
