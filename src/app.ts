
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

app.use(
  express.static(path.resolve(__dirname, "../public"))
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "shooter" });
});
