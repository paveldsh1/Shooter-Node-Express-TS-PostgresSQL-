
import "dotenv/config"
import { createServer } from "node:http"
import type { Duplex } from "node:stream"
import { app } from "./app.js"
import { WebSocket, WebSocketServer } from "ws"
import { verifyAccessToken } from "./auth/token.service.js"
import { runDb } from "./db.js"
import { GamePlayer } from "./game/player.js"
import { GameSession } from "./game/game-session.js"
import {
  loadPlayerState,
  updatePlayerState,
} from "./player-state/player-state.service.js"
import { sharedMap } from "./game/mini-map.js"
import { GameLoop } from "./game/game-loop.js"

const server = createServer(app)
const gameLoop = new GameLoop()

const wss = new WebSocketServer({
  noServer: true,
  handleProtocols(protocols) {
    return protocols.has("shooter") ? "shooter" : false
  },
})

const authenticatedPlayers = new WeakMap<
  WebSocket,
  ReturnType<typeof verifyAccessToken>
>()

function rejectUpgrade(
  socket: Duplex,
  status: number,
  message: string,
): void {
  if (socket.destroyed) return

  socket.end(
    `HTTP/1.1 ${status} ${message}\r\n` +
    "Connection: close\r\n" +
    "Content-Length: 0\r\n\r\n",
  )
}

server.on("upgrade", (request, socket, head) => {
  let url: URL

  try {
    url = new URL(request.url ?? "/", "http://localhost")
  } catch {
    rejectUpgrade(socket, 400, "Bad Request")
    return
  }

  if (url.pathname !== "/ws") {
    rejectUpgrade(socket, 404, "Not Found")
    return
  }

  const header = request.headers["sec-websocket-protocol"]
  const offeredProtocols = Array.isArray(header)
    ? header.join(",")
    : header ?? ""

  const protocols = offeredProtocols
    .split(",")
    .map((protocol) => protocol.trim())

  const tokenProtocol = protocols.find((protocol) =>
    protocol.startsWith("bearer."),
  )

  const token = tokenProtocol?.slice("bearer.".length)

  if (!protocols.includes("shooter") || !token) {
    rejectUpgrade(socket, 401, "Unauthorized")
    return
  }

  let player: ReturnType<typeof verifyAccessToken>

  try {
    player = verifyAccessToken(token)
  } catch {
    rejectUpgrade(socket, 401, "Unauthorized")
    return
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    authenticatedPlayers.set(ws, player)
    wss.emit("connection", ws, request)
  })
})

wss.on("connection", (ws) => {
  const player = authenticatedPlayers.get(ws)

  if (!player) {
    ws.close(1008, "Unauthorized")
    return
  }

  console.log(`Authenticated WebSocket player: ${player.nickname}`)

  const sessionPromise = (async () => {
    const savedState = await loadPlayerState(player.userId)

    const gamePlayer = new GamePlayer(
      player.userId,
      player.nickname,
    )

    if (
      sharedMap.isWalkable(
        savedState.playerX,
        savedState.playerY,
      )
    ) {
      gamePlayer.setState(
        savedState.playerX,
        savedState.playerY,
        savedState.playerA,
      )
    } else {
      const spawn = sharedMap.tryGetRandomSpawn()

      if (!spawn) {
        throw new Error("No available player spawn on the map")
      }

      gamePlayer.setState(
        spawn.x,
        spawn.y,
        savedState.playerA,
      )
    }

    const session = new GameSession(gamePlayer)

    gameLoop.addPlayer(ws, session)

    console.log(
      `Game session ready for ${player.nickname}:`,
      gamePlayer.getState(),
    )

    return session
  })()

  ws.on("message", async (data, isBinary) => {
    if (isBinary) return

    try {
      const session = await sessionPromise
      const message = data.toString()
      const action = session.handleMessage(message, 0.05)

      if (action.type !== "none") {
        console.log(
          `Game action from ${player.nickname}:`,
          action,
        )
      }
    } catch (error) {
      console.error(
        `Failed to handle game message from ${player.nickname}:`,
        error,
      )
    }
  })

  ws.on("error", (error) => {
    console.error("WebSocket error:", error.message)
  })

  ws.on("close", async () => {
    // Убираем игрока из цикла, чтобы ему больше не отправлялись кадры.
    gameLoop.removePlayer(ws)

    try {
      const session = await sessionPromise

      await updatePlayerState(
        player.userId,
        session.player.getState(),
      )

      console.log(
        `Saved player state for ${player.nickname}:`,
        session.player.getState(),
      )
    } catch (error) {
      console.error(
        `Failed to save player state for ${player.nickname}:`,
        error,
      )
    }

    console.log(`WebSocket disconnected: ${player.nickname}`)
  })
})

async function startApp(): Promise<void> {
  await runDb()

  const PORT = Number(process.env.PORT ?? 3000)

  server.listen(PORT, () => {
    gameLoop.start()
    console.log(`Server is running on http://localhost:${PORT}`)
  })
}

startApp().catch((error) => {
  console.error("Failed to start server:", error)
  process.exitCode = 1
})
