import "dotenv/config"
import { Pool } from "pg"

const {
	DB_HOST = "localhost",
	DB_PORT = "5432",
	DB_USER = "app",
	DB_PASSWORD,
	DB_NAME = "player_state",
} = process.env

console.log("Database configuration:", {
	host: DB_HOST,
	port: DB_PORT,
	user: DB_USER,
	database: DB_NAME,
})

if (!DB_PASSWORD) {
	throw new Error("DB_PASSWORD must be set in .env")
}

export const pool = new Pool({
	host: DB_HOST,
	port: Number(DB_PORT),
	user: DB_USER,
	password: DB_PASSWORD,
	database: DB_NAME,
	connectionTimeoutMillis: 5000,
})

pool.on("error", (error) => {
	console.error("Unexpected PostgreSQL pool error:", error)
})

export async function runDb(): Promise<void> {
	// Проверяем соединение и базу, к которой подключились.
	const connection = await pool.query<{
		database_name: string
		user_name: string
	}>(`
SELECT
current_database() AS database_name,
	current_user AS user_name
		`)

	console.log("Database connection:", connection.rows[0])

	// Создаём таблицу игроков, если её ещё нет.
	await pool.query(`
    CREATE TABLE IF NOT EXISTS players(
			id UUID PRIMARY KEY,
			nickname VARCHAR(24) NOT NULL,
			nickname_normalized VARCHAR(24) NOT NULL UNIQUE,
			password_hash TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)

	console.log("Players table is ready")

	await pool.query(`
  CREATE TABLE IF NOT EXISTS player_states (
    player_id UUID PRIMARY KEY
      REFERENCES players(id) ON DELETE CASCADE,

    player_x REAL NOT NULL,
    player_y REAL NOT NULL,
    player_a REAL NOT NULL,

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)

	console.log("Player states table is ready")
}

// Программная проверка зарегистрированных игроков.
export async function listPlayers(): Promise<
	Array<{ id: string; nickname: string; created_at: Date }>
> {
	const result = await pool.query<{
		id: string
		nickname: string
		created_at: Date
	}>(`
    SELECT id, nickname, created_at
    FROM players
    ORDER BY created_at DESC
	`)

	return result.rows
}