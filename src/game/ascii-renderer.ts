
import type { GamePlayer } from "./player.js"
import type { Viewport } from "./game-session.js"
import { MiniMap } from "./mini-map.js"

const FIELD_OF_VIEW = Math.PI / 3
const MAX_DISTANCE = 24

export class AsciiRenderer {
	render(
		player: GamePlayer,
		map: MiniMap,
		viewport: Viewport,
		otherPlayers: Array<{
			playerId: string
			nickname: string
			playerX: number
			playerY: number
			playerA: number
		}> = [],
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

		// Рендеринг 3D-вида.
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

			const wallEnd = Math.min(height, wallStart + wallHeight)
			const wallChar = this.getWallChar(distance)

			for (let y = wallStart; y < wallEnd; y++) {
				buffer[y]![column] = wallChar
			}
		}

		// Мини-карта в левом верхнем углу.
		const mapRows = map.getRows()
		const mapHeight = Math.min(mapRows.length, height)
		const mapWidth = Math.min(mapRows[0]?.length ?? 0, width)

		for (let y = 0; y < mapHeight; y++) {
			for (let x = 0; x < mapWidth; x++) {
				buffer[y]![x] = mapRows[y]![x]!
			}
		}

		// Другие игроки.
		for (const other of otherPlayers) {
			const x = Math.trunc(other.playerX)
			const y = Math.trunc(other.playerY)

			if (
				x >= 0 &&
				x < mapWidth &&
				y >= 0 &&
				y < mapHeight
			) {
				buffer[y]![x] = "P"
			}
		}

		// Текущий игрок рисуется последним, чтобы его маркер был виден.
		const playerMapX = Math.trunc(player.playerX)
		const playerMapY = Math.trunc(player.playerY)

		if (
			playerMapX >= 0 &&
			playerMapX < mapWidth &&
			playerMapY >= 0 &&
			playerMapY < mapHeight
		) {
			buffer[playerMapY]![playerMapX] =
				MiniMap.getDirectionMarker(player.playerA)
		}

		return buffer.map((row) => row.join("")).join("\n")
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

		// Коррекция искажения перспективы.
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
