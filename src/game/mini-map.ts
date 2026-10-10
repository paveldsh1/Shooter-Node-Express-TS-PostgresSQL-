
import type { WalkableMap } from "./player.js";

const HEIGHT = 10;
const WIDTH = 20;

const MIN_WALL_CHANCE = 0.10;
const MAX_WALL_CHANCE = 0.35;
const MIN_OPEN_RATIO = 0.40;
const MAX_ATTEMPTS = 10;

export class MiniMap implements WalkableMap {
  private map: string[][] = [];

  constructor() {
    this.initMap();
  }

  private initMap(): void {
    const interiorCells = (HEIGHT - 2) * (WIDTH - 2);
    const minOpenCells = Math.ceil(interiorCells * MIN_OPEN_RATIO);

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const wallChance =
        MIN_WALL_CHANCE +
        Math.random() * (MAX_WALL_CHANCE - MIN_WALL_CHANCE);

      const openCells = this.buildMapWithRandomWalls(wallChance);

      if (openCells < minOpenCells) {
        continue;
      }

      const start = this.getAnyOpenCell();

      if (
        start !== null &&
        this.isFullyConnected(start.x, start.y, openCells)
      ) {
        return;
      }
    }

    this.buildMapWithRandomWalls(0);
  }

  private buildMapWithRandomWalls(wallChance: number): number {
    const interiorCells = (HEIGHT - 2) * (WIDTH - 2);
    let openCells = interiorCells;
    const targetWalls = Math.round(interiorCells * wallChance);

    this.map = Array.from({ length: HEIGHT }, (_, y) =>
      Array.from({ length: WIDTH }, (_, x) =>
        y === 0 ||
        y === HEIGHT - 1 ||
        x === 0 ||
        x === WIDTH - 1
          ? "#"
          : " ",
      ),
    );

    let placedWalls = 0;
    let safety = 0;

    while (
      placedWalls < targetWalls &&
      safety < interiorCells * 10
    ) {
      const blockW = randomInt(1, 4);
      const blockH = randomInt(1, 3);
      const startX = randomInt(1, WIDTH - 2 - blockW);
      const startY = randomInt(1, HEIGHT - 2 - blockH);

      for (
        let y = startY;
        y < startY + blockH && placedWalls < targetWalls;
        y++
      ) {
        for (
          let x = startX;
          x < startX + blockW && placedWalls < targetWalls;
          x++
        ) {
          if (this.map[y]![x] === " ") {
            this.map[y]![x] = "#";
            placedWalls++;
            openCells--;
          }
        }
      }

      safety++;
    }

    return openCells;
  }

  private getAnyOpenCell(): { x: number; y: number } | null {
    for (let y = 1; y < this.map.length - 1; y++) {
      for (let x = 1; x < this.map[y]!.length - 1; x++) {
        if (!this.isWallCell(this.map[y]![x]!)) {
          return { x, y };
        }
      }
    }

    return null;
  }

  private isFullyConnected(
    startX: number,
    startY: number,
    openCells: number,
  ): boolean {
    if (openCells <= 1) return true;
    if (this.isWallCell(this.map[startY]![startX]!)) return false;

    const visited = Array.from(
      { length: this.map.length },
      () => Array<boolean>(WIDTH).fill(false),
    );

    const queue: Array<{ x: number; y: number }> = [
      { x: startX, y: startY },
    ];

    visited[startY]![startX] = true;
    let visitedCount = 1;
    let head = 0;

    while (head < queue.length) {
      const current = queue[head++]!;

      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];

      for (const next of neighbors) {
        if (
          next.y < 0 ||
          next.y >= this.map.length ||
          next.x < 0 ||
          next.x >= WIDTH
        ) {
          continue;
        }

        if (visited[next.y]![next.x]) continue;
        if (this.isWallCell(this.map[next.y]![next.x]!)) continue;

        visited[next.y]![next.x] = true;
        visitedCount++;
        queue.push(next);
      }
    }

    return visitedCount === openCells;
  }

  static getDirectionMarker(angle: number): string {
    const twoPi = 2 * Math.PI;
    const normalized = ((angle % twoPi) + twoPi) % twoPi;

    if (
      normalized >= Math.PI / 4 &&
      normalized < (3 * Math.PI) / 4
    ) {
      return "v";
    }

    if (
      normalized >= (3 * Math.PI) / 4 &&
      normalized < (5 * Math.PI) / 4
    ) {
      return "<";
    }

    if (
      normalized >= (5 * Math.PI) / 4 &&
      normalized < (7 * Math.PI) / 4
    ) {
      return "^";
    }

    return ">";
  }

  tryGetRandomSpawn(
    occupied: ReadonlyArray<{ x: number; y: number }> = [],
  ): { x: number; y: number } | null {
    const candidates: Array<{ x: number; y: number }> = [];

    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y]!.length; x++) {
        if (this.isWallCell(this.map[y]![x]!)) continue;

        const isOccupied = occupied.some(
          (position) =>
            Math.floor(position.x) === x &&
            Math.floor(position.y) === y,
        );

        if (!isOccupied) {
          candidates.push({ x: x + 0.5, y: y + 0.5 });
        }
      }
    }

    if (candidates.length === 0) return null;

    return candidates[randomInt(0, candidates.length - 1)]!;
  }

  isWalkable(x: number, y: number): boolean {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return false;
    }

    const testX = Math.trunc(x);
    const testY = Math.trunc(y);

    if (testY < 0 || testY >= this.map.length) return false;
    if (testX < 0 || testX >= this.map[testY]!.length) return false;

    return !this.isWallCell(this.map[testY]![testX]!);
  }

  getRows(): string[] {
    return this.map.map((row) => row.join(""));
  }

  private isWallCell(cell: string): boolean {
    return cell === "#";
  }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const sharedMap = new MiniMap();