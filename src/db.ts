import "dotenv/config"
import { Pool } from "pg"

const {
	DB_HOST = "localhost",
	DB_PORT = "5432",
	DB_USER = "postgres",
	DB_PASSWORD,
	DB_NAME = "shooter",
} = process.env

if (!DB_PASSWORD) {
	throw new Error("DB_PASSWORD must be set in .env")
}

const connectionConfig = {
	host: DB_HOST,
	port: Number(DB_PORT),
	user: DB_USER,
	password: DB_PASSWORD,
	connectionTimeoutMillis: 5000,
}

const adminPool = new Pool({
	...connectionConfig,
	database: "postgres",
})

export const pool = new Pool({
	...connectionConfig,
	database: DB_NAME,
})

export async function runDb(): Promise<void> {
	try {
		// Проверяем и при необходимости создаём базу данных.
		const result = await adminPool.query(
			"SELECT 1 FROM pg_database WHERE datname = $1",
			[DB_NAME]
		)

		if (result.rowCount === 0) {
			await adminPool.query(
				`CREATE DATABASE "${DB_NAME.replace(/"/g, '""')}"`
			)
			console.log(`Database "${DB_NAME}" created`)
		} else {
			console.log(`Database "${DB_NAME}" already exists`)
		}
	} finally {
		await adminPool.end()
	}

	try {
		// Создаём таблицу игроков, если её ещё нет.
		await pool.query(`
      CREATE TABLE IF NOT EXISTS players (
        id UUID PRIMARY KEY,
        nickname VARCHAR(24) NOT NULL,
        nickname_normalized VARCHAR(24) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `)

		console.log("PostgreSQL connected; players table is ready")
	} catch (error) {
		await pool.end()
		throw error
	}
}

pool.on("error", (error) => {
	console.error("Unexpected PostgreSQL pool error:", error)
})