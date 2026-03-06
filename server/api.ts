import type { Connect } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import type { PoolConnection } from 'mysql2/promise'
import { pool } from './db'

const API_PATH = '/api/name-occurrence'

const divinePersonIds: Record<string, number> = {
  'Heavenly Father': 1,
  'Jesus Christ': 2,
  'Holy Ghost': 3,
}

const standardWorkIds: Record<string, number> = {
  'Old Testament': 1,
  'New Testament': 2,
  'Book of Mormon': 3,
  'Doctrine and Covenants': 4,
  'Pearl of Great Price': 5,
}

type SubmissionPayload = {
  member?: string
  standardWork?: string
  title?: string
  book?: string
  chapter?: number | string
  verse?: number | string
}

class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function sendJson(res: ServerResponse, status: number, payload: Record<string, unknown>) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
  })
  res.end(JSON.stringify(payload))
}

function readJsonBody(req: IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    let raw = ''
    req.setEncoding('utf-8')
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) {
        reject(new ApiError(413, 'Payload too large'))
      }
    })
    req.on('error', reject)
    req.on('end', () => {
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new ApiError(400, 'Unable to parse request body as JSON'))
      }
    })
  })
}

function getNumber(value: number | string | undefined) {
  if (value === undefined || value === null) {
    return null
  }
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }
  return parsed
}

async function ensureVerse(
  connection: PoolConnection,
  standardWorkId: number,
  book: string,
  chapter: number,
  verse: number,
) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT id FROM verse WHERE standard_work_id = ? AND book = ? AND chapter = ? AND verse = ?',
    [standardWorkId, book, chapter, verse],
  )
  if (rows.length) {
    return rows[0].id as number
  }
  const [result] = await connection.execute<ResultSetHeader>(
    'INSERT INTO verse (standard_work_id, book, chapter, verse) VALUES (?, ?, ?, ?)',
    [standardWorkId, book, chapter, verse],
  )
  return result.insertId
}

async function ensureName(
  connection: PoolConnection,
  title: string,
  divinePersonId: number,
) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT id, divine_person_id FROM name_title WHERE name = ?',
    [title],
  )
  if (rows.length) {
    const existing = rows[0]
    if (existing.divine_person_id !== divinePersonId) {
      await connection.execute(
        'UPDATE name_title SET divine_person_id = ? WHERE id = ?',
        [divinePersonId, existing.id],
      )
    }
    return existing.id as number
  }
  const [result] = await connection.execute<ResultSetHeader>(
    'INSERT INTO name_title (name, divine_person_id, occurrence_count) VALUES (?, ?, 0)',
    [title, divinePersonId],
  )
  return result.insertId
}

async function persistOccurrence(payload: {
  memberId: number
  workId: number
  title: string
  book: string
  chapter: number
  verse: number
}) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const verseId = await ensureVerse(
      connection,
      payload.workId,
      payload.book,
      payload.chapter,
      payload.verse,
    )
    const nameId = await ensureName(connection, payload.title, payload.memberId)
    const [existing] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM name_occurrence WHERE name_id = ? AND verse_id = ?',
      [nameId, verseId],
    )
    if (existing.length) {
      throw new ApiError(409, 'An occurrence for that name and verse already exists.')
    }
    await connection.execute(
      'INSERT INTO name_occurrence (name_id, verse_id) VALUES (?, ?)',
      [nameId, verseId],
    )
    await connection.commit()
    return 'Name occurrence saved to the scriptures database.'
  } catch (error) {
    await connection.rollback().catch(() => {})
    throw error
  } finally {
    connection.release()
  }
}

export function registerApiRoutes(middleware: Connect.Server) {
  middleware.use(API_PATH, async (req, res, next) => {
    if (req.method !== 'POST') {
      next()
      return
    }
    try {
      const parsed = await readJsonBody(req)
      if (!parsed || typeof parsed !== 'object') {
        throw new ApiError(400, 'Request body must be an object.')
      }
      const body = parsed as SubmissionPayload
      const memberId = divinePersonIds[body.member ?? '']
      if (!memberId) {
        throw new ApiError(400, 'Please select a member of the Godhead.')
      }
      const workId = standardWorkIds[body.standardWork ?? '']
      if (!workId) {
        throw new ApiError(400, 'Please select a standard work.')
      }
      const title = (body.title ?? '').trim()
      if (!title) {
        throw new ApiError(400, 'A name/title is required.')
      }
      const book = (body.book ?? '').trim()
      if (!book) {
        throw new ApiError(400, 'A book name is required.')
      }
      const chapter = getNumber(body.chapter)
      const verse = getNumber(body.verse)
      if (chapter === null || verse === null || chapter < 1 || verse < 1) {
        throw new ApiError(400, 'Chapter and verse must be positive numbers.')
      }
      const message = await persistOccurrence({
        memberId,
        workId,
        title,
        book,
        chapter,
        verse,
      })
      sendJson(res, 200, { message })
    } catch (error) {
      if (error instanceof ApiError) {
        sendJson(res, error.status, { error: error.message })
        return
      }
      console.error('Unexpected API error', error)
      sendJson(res, 500, { error: 'Unable to save the submission.' })
    }
  })
}
