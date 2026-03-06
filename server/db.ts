import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = resolve(__dirname, '../db.config')

type DbConfig = {
  host?: string
  port?: number
  user?: string
  password?: string
  database?: string
}

function loadConfig(path: string): DbConfig {
  const raw = readFileSync(path, 'utf-8')
  return raw.split(/\r?\n/).reduce<DbConfig>((acc, line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      return acc
    }
    const [key, ...rest] = trimmed.split('=')
    const value = rest.join('=').trim()
    if (!key) {
      return acc
    }
    if (key === 'db.host') {
      acc.host = value
    } else if (key === 'db.port') {
      const parsed = Number(value)
      if (!Number.isNaN(parsed)) {
        acc.port = parsed
      }
    } else if (key === 'db.user') {
      acc.user = value
    } else if (key === 'db.password') {
      acc.password = value
    } else if (key === 'db.name') {
      acc.database = value
    }
    return acc
  }, {})
}

const dbConfig = loadConfig(CONFIG_PATH)

const pool = mysql.createPool({
  host: dbConfig.host ?? 'localhost',
  port: dbConfig.port ?? 3306,
  user: dbConfig.user ?? 'root',
  password: dbConfig.password ?? '',
  database: dbConfig.database ?? 'scriptures',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  decimalNumbers: true,
})

export { pool }
