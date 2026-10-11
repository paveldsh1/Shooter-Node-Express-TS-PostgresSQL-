
import type { GamePlayer } from "./player.js"
import type { Viewport } from "./game-session.js"
import { MiniMap } from "./mini-map.js"
import { selectEnemySprite } from "./enemy-sprites.js"

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

		// Глубина стены для каждого столбца экрана.
		const wallDistances: number[] = Array(width).fill(MAX_DISTANCE)

		for (let column = 0; column < width; column++) {
			const cameraX = (2 * column) / width - 1
			const rayOffset = Math.atan(
				cameraX * Math.tan(FIELD_OF_VIEW / 2),
			)
			const rayAngle = player.playerA + rayOffset

			const distance = this.castRay(
				player.playerX,
				player.playerY,
				rayAngle,
				map,
			)

			const correctedDistance = Math.max(
				0.1,
				distance * Math.cos(rayOffset),
			)

			wallDistances[column] = correctedDistance

			const wallHeight = Math.min(
				height,
				Math.floor(height / correctedDistance),
			)

			const wallStart = Math.max(
				0,
				Math.floor((height - wallHeight) / 2),
			)
			const wallEnd = Math.min(height, wallStart + wallHeight)
			const wallChar = this.getWallChar(correctedDistance)

			for (let y = wallStart; y < wallEnd; y++) {
				buffer[y]![column] = wallChar
			}
		}

		// Рисуем других игроков оригинальными ASCII-спрайтами.
		// Ближайшие игроки рисуются последними.
		const sortedPlayers = [...otherPlayers].sort((a, b) => {
			const distanceA = Math.hypot(
				a.playerX - player.playerX,
				a.playerY - player.playerY,
			)
			const distanceB = Math.hypot(
				b.playerX - player.playerX,
				b.playerY - player.playerY,
			)
			return distanceB - distanceA
		})

		for (const other of sortedPlayers) {
			const dx = other.playerX - player.playerX
			const dy = other.playerY - player.playerY
			const distance = Math.hypot(dx, dy)

			if (distance < 0.2 || distance > MAX_DISTANCE) {
				continue
			}

			const relativeAngle = this.normalizeAngle(
				Math.atan2(dy, dx) - player.playerA,
			)

			if (Math.abs(relativeAngle) > FIELD_OF_VIEW / 2) {
				continue
			}

			const screenX = Math.floor(
				(
					0.5 +
					Math.tan(relativeAngle) /
					(2 * Math.tan(FIELD_OF_VIEW / 2))
				) * width,
			)

			if (screenX < 0 || screenX >= width) {
				continue
			}

			// Проверяем, не закрыт ли игрок стеной.
			if (distance >= wallDistances[screenX] - 0.15) {
				continue
			}

			const sprite = selectEnemySprite(distance)
			const sourceHeight = sprite.length
			const sourceWidth = Math.max(
				...sprite.map((row) => row.length),
			)

			// Масштаб зависит от дистанции и размера экрана.
			const viewScale = Math.max(0.1, viewport.scale)
			const screenScale = Math.sqrt(
				(80 * 24) / Math.max(1, width * height),
			)
			const scale = Math.max(
				0.1,
				Math.min(
					3,
					(height / (distance * 10)) *
					screenScale *
					viewScale,
				),
			)

			const drawWidth = Math.max(
				1,
				Math.round(sourceWidth * scale),
			)
			const drawHeight = Math.max(
				1,
				Math.round(sourceHeight * scale),
			)

			const startX = Math.round(screenX - drawWidth / 2)
			const startY = Math.round(height / 2 - drawHeight / 2)

			for (let y = 0; y < drawHeight; y++) {
				const targetY = startY + y
				if (targetY < 0 || targetY >= height) {
					continue
				}

				const sourceY = Math.min(
					sourceHeight - 1,
					Math.floor(y / scale),
				)
				const sourceRow = sprite[sourceY]!

				for (let x = 0; x < drawWidth; x++) {
					const targetX = startX + x

					if (targetX < 0 || targetX >= width) {
						continue
					}

					const sourceX = Math.min(
						sourceRow.length - 1,
						Math.floor(x / scale),
					)
					const char = sourceRow[sourceX]!

					// В оригинальных спрайтах ! — прозрачность.
					if (char === "!") {
						continue
					}

					// Не рисуем персонажа поверх стены.
					if (distance >= wallDistances[targetX]! - 0.15) {
						continue
					}

					buffer[targetY]![targetX] = char
				}
			}
		}

		// Мини-карта поверх 3D-кадра.
		const mapRows = map.getRows()
		const mapHeight = Math.min(mapRows.length, height)
		const mapWidth = Math.min(mapRows[0]?.length ?? 0, width)

		for (let y = 0; y < mapHeight; y++) {
			for (let x = 0; x < mapWidth; x++) {
				buffer[y]![x] = mapRows[y]![x]!
			}
		}

		// Маркеры других игроков на мини-карте.
		for (const other of otherPlayers) {
			const x = Math.trunc(other.playerX)
			const y = Math.trunc(other.playerY)

			if (
				x >= 0 &&
				x < mapWidth &&
				y >= 0 &&
				y < mapHeight &&
				map.isWalkable(other.playerX, other.playerY)
			) {
				buffer[y]![x] = MiniMap.getDirectionMarker(other.playerA)
			}
		}

		// Текущий игрок.
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

		return distance
	}

	private normalizeAngle(angle: number): number {
		while (angle > Math.PI) angle -= Math.PI * 2
		while (angle < -Math.PI) angle += Math.PI * 2
		return angle
	}

	private getWallChar(distance: number): string {
		if (distance < 2) return "#"
		if (distance < 4) return "X"
		if (distance < 7) return "x"
		if (distance < 12) return ":"
		return "."
	}
}
