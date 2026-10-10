import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter } from "./routes/auth.routes.js";

export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Разрешаем серверу принимать JSON в теле запросов.
app.use(express.json());

// Маршруты регистрации и авторизации.
app.use("/players", authRouter);

// Отдаём файлы клиентской части игры из папки public.
app.use(express.static(path.resolve(__dirname, "../public")));

// Проверка работоспособности сервера.
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "shooter"
  });
});