
import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";

const app = express();
const server = createServer(app);

const port = Number(process.env.PORT ?? 3000);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "shooter",
  });
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log("WebSocket client connected");

  socket.send(
    JSON.stringify({
      type: "connected",
    }),
  );

  socket.on("message", (data) => {
    console.log("Received:", data.toString());
  });

  socket.on("close", () => {
    console.log("WebSocket client disconnected");
  });
});

server.listen(port, () => {
  console.log(`Shooter server running at http://localhost:${port}`);
});
