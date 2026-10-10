import "dotenv/config";
import { createServer } from "node:http";
import type { Duplex } from "node:stream";
import { app } from "./app.js";
import { WebSocket, WebSocketServer } from "ws";
import { verifyAccessToken } from "./auth/token.service.js";

const PORT = Number(process.env.PORT ?? 3000);

const server = createServer(app);

const wss = new WebSocketServer({
  noServer: true,
  handleProtocols(protocols) {
    return protocols.has("shooter") ? "shooter" : false;
  },
});

const authenticatedPlayers = new WeakMap<
  WebSocket,
  ReturnType<typeof verifyAccessToken>
>();

function rejectUpgrade(
  socket: Duplex,
  status: number,
  message: string
): void {
  if (socket.destroyed) return;

  socket.end(
    `HTTP/1.1 ${status} ${message}\r\n` +
      "Connection: close\r\n" +
      "Content-Length: 0\r\n\r\n"
  );
}

server.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (url.pathname !== "/ws") {
    rejectUpgrade(socket, 404, "Not Found");
    return;
  }

  const header = request.headers["sec-websocket-protocol"];
  const offeredProtocols = Array.isArray(header)
    ? header.join(",")
    : header ?? "";

  const protocols = offeredProtocols
    .split(",")
    .map((protocol) => protocol.trim());

  const tokenProtocol = protocols.find((protocol) =>
    protocol.startsWith("bearer.")
  );

  const token = tokenProtocol?.slice("bearer.".length);

  if (!protocols.includes("shooter") || !token) {
    rejectUpgrade(socket, 401, "Unauthorized");
    return;
  }

  let player: ReturnType<typeof verifyAccessToken>;

  try {
    player = verifyAccessToken(token);
  } catch {
    rejectUpgrade(socket, 401, "Unauthorized");
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    authenticatedPlayers.set(ws, player);
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws) => {
  const player = authenticatedPlayers.get(ws);

  if (!player) {
    ws.close(1008, "Unauthorized");
    return;
  }

  console.log(`Authenticated WebSocket player: ${player.nickname}`);

  ws.on("message", (data, isBinary) => {
    if (isBinary) return;

    // Игровые команды подключим на следующем этапе.
    console.log(`Received message from ${player.nickname}: ${data.toString()}`);
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error.message);
  });

  ws.on("close", () => {
    console.log(`WebSocket disconnected: ${player.nickname}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});