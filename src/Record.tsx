import { useState } from 'react'
import type { SyntheticEvent } from 'react'
import { useToast } from './Toaster'

const members = ['Heavenly Father', 'Jesus Christ', 'Holy Ghost']
const standardWorks = [
  'Old Testament',
  'New Testament',
  'Book of Mormon',
  'Doctrine and Covenants',
  'Pearl of Great Price',
]

const versePattern = /^(.+?)\s+(\d+)\s*:\s*(\d+)\s*$/

const DEFAULT_WORK = 'Book of Mormon'

type ParsedVerse = {
  book: string
  chapter: number
  verse: number
}

function parseVerse(input: string): ParsedVerse | null {
  const trimmed = input.trim()
  const match = versePattern.exec(trimmed)
  if (!match) {
    return null
  }
  const [_, book, chapterRaw, verseRaw] = match
  return {
    book: book.trim(),
    chapter: Number(chapterRaw),
    verse: Number(verseRaw),
  }
}

export function Record() {
  const [member, setMember] = useState(members[0])
  const [standardWork, setStandardWork] = useState(DEFAULT_WORK)
  const [title, setTitle] = useState('')
  const [verseInput, setVerseInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { pushToast } = useToast()

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      pushToast('error', 'Please enter the name or title.')
      return
    }
    const parsed = parseVerse(verseInput)
    if (!parsed) {
      pushToast('error', 'Verse must look like “Book Chapter: Verse”.')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/name-occurrence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member,
          standardWork,
          title: trimmedTitle,
          book: parsed.book,
          chapter: parsed.chapter,
          verse: parsed.verse,
        }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok) {
        pushToast('error', body?.error ?? 'Unable to save the entry.')
        return
      }
      pushToast('success', body?.message ?? 'Saved successfully.')
      setTitle('')
      setVerseInput('')
      setStandardWork(DEFAULT_WORK)
    } catch (error) {
      console.error('Submission error', error)
      pushToast('error', 'Unable to reach the database. Try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="hero">
        <p className="eyebrow">Scripture Tools</p>
        <h1>Record divine names and titles</h1>
        <p className="lede">
          Capture every instance where a member of the Godhead is named across the standard
          works. The form writes directly to the scriptures database and keeps the counts
          synchronized for future reference.
        </p>
      </div>

      <section className="form-panel">
        <div className="form-header">
          <div>
            <p className="eyebrow">Submit a name occurrence</p>
            <h2>Who, where, and which verse?</h2>
          </div>
          <p className="hint">
            Standard work defaults to the Book of Mormon. Use <em>book chapter: verse</em> for the
            verse field (e.g., <span>3 Nephi 27: 14</span>).
          </p>
        </div>
        <form className="entry-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Name of the divine person</span>
            <select value={member} onChange={(event) => setMember(event.target.value)}>
              {members.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Standard work</span>
            <select value={standardWork} onChange={(event) => setStandardWork(event.target.value)}>
              {standardWorks.map((work) => (
                <option key={work} value={work}>
                  {work}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Name or title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter name or title"
              autoComplete="off"
            />
          </label>

          <label className="field">
            <span>Verse reference</span>
            <input
              value={verseInput}
              onChange={(event) => setVerseInput(event.target.value)}
              placeholder="1 Nephi 13: 15"
              autoComplete="off"
            />
          </label>

          <button className="submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Submit to scriptures'}
          </button>
        </form>
      </section>

      <p className="single-note">
        Only one submission per name and verse is needed—duplicates will be ignored so the scripture
        counts remain accurate.
      </p>
    </>
  )
}
