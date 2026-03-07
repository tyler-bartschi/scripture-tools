import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql, { type Pool, type PoolConnection } from 'mysql2/promise'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(__dirname, '../..')
const DEFAULT_CONFIG_PATH = resolve(ROOT_DIR, 'db.config')
const TEST_CONFIG_PATH = resolve(ROOT_DIR, 'db_test.config')
const DEFAULT_DATABASE = 'scriptures'

export type DbConfig = {
  host?: string
  port?: number
  user?: string
  password?: string
  database?: string
}

export function loadConfig(isTest = false): DbConfig {
  const path = isTest ? TEST_CONFIG_PATH : DEFAULT_CONFIG_PATH
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

const TABLE_CREATION_SQL = [
  `CREATE TABLE IF NOT EXISTS divine_person (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS standard_work (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS verse (
    id INT AUTO_INCREMENT PRIMARY KEY,
    standard_work_id INT NOT NULL,
    book VARCHAR(100) NOT NULL,
    chapter INT NOT NULL,
    verse INT NOT NULL,
    UNIQUE KEY unique_verse (standard_work_id, book, chapter, verse),
    FOREIGN KEY (standard_work_id) REFERENCES standard_work(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS name_title (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    divine_person_id INT NOT NULL,
    occurrence_count INT NOT NULL DEFAULT 0,
    FOREIGN KEY (divine_person_id) REFERENCES divine_person(id)
      ON UPDATE CASCADE
      ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS name_occurrence (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_id INT NOT NULL,
    verse_id INT NOT NULL,
    UNIQUE KEY unique_occurrence (name_id, verse_id),
    FOREIGN KEY (name_id) REFERENCES name_title(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE,
    FOREIGN KEY (verse_id) REFERENCES verse(id)
      ON UPDATE CASCADE
      ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
]

const DIVINE_PERSON_SEED = [
  { id: 1, name: 'Heavenly Father' },
  { id: 2, name: 'Jesus Christ' },
  { id: 3, name: 'Holy Ghost' },
]

const STANDARD_WORK_SEED = [
  { id: 1, name: 'Old Testament' },
  { id: 2, name: 'New Testament' },
  { id: 3, name: 'Book of Mormon' },
  { id: 4, name: 'Doctrine and Covenants' },
  { id: 5, name: 'Pearl of Great Price' },
]

const DATA_TABLES = [
  'name_occurrence',
  'name_title',
  'verse',
  'standard_work',
  'divine_person',
]

async function dropAllDataTables(connection: PoolConnection) {
  await connection.execute('SET FOREIGN_KEY_CHECKS = 0')
  try {
    for (const table of DATA_TABLES) {
      await connection.execute(`DROP TABLE IF EXISTS \`${table}\``)
    }
  } finally {
    await connection.execute('SET FOREIGN_KEY_CHECKS = 1')
  }
}

async function ensureTablesExist(connection: PoolConnection) {
  for (const statement of TABLE_CREATION_SQL) {
    await connection.execute(statement)
  }
}

async function seedStaticRows(connection: PoolConnection) {
  for (const entry of DIVINE_PERSON_SEED) {
    await connection.execute(
      'INSERT INTO divine_person (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [entry.id, entry.name],
    )
  }
  for (const entry of STANDARD_WORK_SEED) {
    await connection.execute(
      'INSERT INTO standard_work (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [entry.id, entry.name],
    )
  }
}

async function ensureTriggers(connection: PoolConnection) {
  await connection.query('DROP TRIGGER IF EXISTS increment_name_count')
  await connection.query('DROP TRIGGER IF EXISTS decrement_name_count')
  await connection.query(`
    CREATE TRIGGER increment_name_count
    AFTER INSERT ON name_occurrence
    FOR EACH ROW
    BEGIN
      UPDATE name_title SET occurrence_count = occurrence_count + 1 WHERE id = NEW.name_id;
    END
  `)
  await connection.query(`
    CREATE TRIGGER decrement_name_count
    AFTER DELETE ON name_occurrence
    FOR EACH ROW
    BEGIN
      UPDATE name_title SET occurrence_count = occurrence_count - 1 WHERE id = OLD.name_id;
    END
  `)
}

async function prepareSchema(connection: PoolConnection, isTest: boolean) {
  if (isTest) {
    await dropAllDataTables(connection)
  }
  await ensureTablesExist(connection)
  await seedStaticRows(connection)
  await ensureTriggers(connection)
}

export async function createDatabasePool(isTest = false): Promise<Pool> {
  const dbConfig = loadConfig(isTest)
  const database = dbConfig.database ?? DEFAULT_DATABASE
  const pool = mysql.createPool({
    host: dbConfig.host ?? 'localhost',
    port: dbConfig.port ?? 3306,
    user: dbConfig.user ?? 'root',
    password: dbConfig.password ?? '',
    database,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    decimalNumbers: true,
  })
  const connection = await pool.getConnection()
  try {
    await prepareSchema(connection, isTest)
  } finally {
    connection.release()
  }
  return pool
}

const pool = await createDatabasePool()

export { pool }
