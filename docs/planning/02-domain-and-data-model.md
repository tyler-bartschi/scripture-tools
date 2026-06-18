# Domain And Data Model Plan

The current schema is a strong starting point, but it should be revised before building analytics and RAG. The biggest issue is that `name_title.name` is globally unique, while the product goal allows submissions for each member of the Godhead for each name. A visible title may need to be associated with multiple divine persons.

## Domain Vocabulary

Use these terms consistently in code, UI, and API responses:

- Divine person: Heavenly Father, Jesus Christ, or Holy Ghost.
- Standard work: Old Testament, New Testament, Book of Mormon, Doctrine and Covenants, Pearl of Great Price.
- Scripture book: Genesis, John, 1 Nephi, Alma, Moses, Abraham, etc.
- Reference: standard work + scripture book + chapter + verse.
- Name/title: the visible name or title being recorded, such as Redeemer or Lamb of God.
- Occurrence: one name/title for one divine person appearing in one verse.
- Submission: the user action that creates or edits an occurrence.

## Current Schema Strengths

- Normalized static tables for `divine_person` and `standard_work`.
- `verse` prevents duplicate references.
- `name_occurrence` prevents duplicate name/verse pairs.
- Database triggers maintain `occurrence_count`.

## Current Schema Gaps

### Same Name Across Multiple Divine Persons

Current behavior:

- `name_title.name` is unique.
- `server/api.ts` updates `name_title.divine_person_id` when the same name is submitted for a different divine person.

Risk:

- Historical occurrences can silently change meaning. If the title "Lord" is first saved for Jesus Christ and later saved for Heavenly Father, the existing row can be reassigned.

Recommended change:

- Use uniqueness on `(normalized_name, divine_person_id)` rather than only `name`.
- Keep the display `name` as entered.
- Add a normalized search key for case-insensitive matching.

### Canonical Scripture Hierarchy

Current behavior:

- `verse.book` is a string.
- `standard_work_id`, `book`, `chapter`, and `verse` uniquely identify a verse.

Risk:

- Typos and spelling variants fragment analytics. For example, `1 Nephi`, `I Nephi`, and `First Nephi` would be separate books.

Recommended change:

- Add a `scripture_book` table linked to `standard_work`.
- Make `verse.book_id` reference `scripture_book.id`.
- Keep an alias table if you want forgiving user input.

### Verse Text

Current behavior:

- The app stores references, not scripture text.

Risk:

- Lookup and RAG cannot show actual verses without another source.

Recommended change:

- Add `scripture_verse_text` or add text columns to `verse`.
- Store text source metadata and import version.
- Decide whether text belongs in MySQL or local indexed files.

### Occurrence Count

Current behavior:

- `name_title.occurrence_count` is maintained by triggers.

Risk:

- Counts become less direct if `name_title` changes shape.
- Updates that move an occurrence from one name to another must decrement/increment correctly.

Recommended change:

- Either keep triggers and make updates delete/reinsert occurrence rows inside a transaction, or replace cached counts with query-time counts until data volume proves otherwise.
- If cached counts stay, add a count reconciliation script.

## Proposed Schema

This is a planning target for the MySQL adapter, not the product's only possible persistence shape. The application should define storage-neutral domain records first, then map those records to SQL tables, browser-local SQL tables, or NoSQL documents through adapters.

```sql
CREATE TABLE divine_person (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT NOT NULL
);

CREATE TABLE standard_work (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INT NOT NULL
);

CREATE TABLE scripture_book (
  id INT AUTO_INCREMENT PRIMARY KEY,
  standard_work_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  normalized_name VARCHAR(100) NOT NULL,
  sort_order INT NOT NULL,
  UNIQUE KEY unique_book_name (standard_work_id, normalized_name),
  FOREIGN KEY (standard_work_id) REFERENCES standard_work(id)
);

CREATE TABLE scripture_book_alias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scripture_book_id INT NOT NULL,
  alias VARCHAR(100) NOT NULL,
  normalized_alias VARCHAR(100) NOT NULL UNIQUE,
  FOREIGN KEY (scripture_book_id) REFERENCES scripture_book(id)
);

CREATE TABLE verse (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scripture_book_id INT NOT NULL,
  chapter INT NOT NULL,
  verse INT NOT NULL,
  text MEDIUMTEXT NULL,
  text_source VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_verse (scripture_book_id, chapter, verse),
  FOREIGN KEY (scripture_book_id) REFERENCES scripture_book(id)
);

CREATE TABLE name_title (
  id INT AUTO_INCREMENT PRIMARY KEY,
  divine_person_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  normalized_name VARCHAR(255) NOT NULL,
  occurrence_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_name_for_person (divine_person_id, normalized_name),
  KEY idx_name_search (normalized_name),
  FOREIGN KEY (divine_person_id) REFERENCES divine_person(id)
);

CREATE TABLE name_occurrence (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name_title_id INT NOT NULL,
  verse_id INT NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_occurrence (name_title_id, verse_id),
  KEY idx_occurrence_verse (verse_id),
  FOREIGN KEY (name_title_id) REFERENCES name_title(id) ON DELETE CASCADE,
  FOREIGN KEY (verse_id) REFERENCES verse(id) ON DELETE CASCADE
);
```

## Optional Tables

### Submission Audit

Add this if edits/deletes should be recoverable.

```sql
CREATE TABLE occurrence_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  occurrence_id INT NULL,
  action VARCHAR(50) NOT NULL,
  before_json JSON NULL,
  after_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

## Storage-Neutral Domain Records

These are the records services and UI code should think in. They should not expose table names, SQL join details, or NoSQL document nesting.

```ts
type DivinePerson = {
  id: string
  name: string
  sortOrder: number
}

type StandardWork = {
  id: string
  name: string
  sortOrder: number
}

type ScriptureBook = {
  id: string
  standardWorkId: string
  name: string
  normalizedName: string
  sortOrder: number
}

type ScriptureVerse = {
  id: string
  standardWorkId: string
  bookId: string
  chapter: number
  verse: number
  reference: string
  text?: string
}

type NameTitle = {
  id: string
  divinePersonId: string
  name: string
  normalizedName: string
  occurrenceCount?: number
}

type NameOccurrence = {
  id: string
  nameTitleId: string
  verseId: string
  notes?: string
  createdAt: string
  updatedAt: string
}
```

Use string IDs in domain types even if MySQL stores integers. This keeps the app compatible with NoSQL document IDs, UUIDs, browser storage keys, and SQL integer IDs.

## Adapter Mapping Expectations

MySQL adapter:

- Normalized relational tables.
- SQL joins for list and analytics queries.
- SQL transactions for create/update/delete.
- Versioned SQL migrations.

Browser SQL adapter:

- Similar table structure if using a local SQL engine.
- Browser-side persistence may require IndexedDB-backed storage.
- Query features may be more limited and should be hidden behind the same repository interfaces.

NoSQL adapter:

- Likely stores documents for names, verses, and occurrences.
- May denormalize display labels to avoid joins.
- Must still enforce duplicate occurrence rules through unique keys, transactions, conditional writes, or explicit conflict checks.
- Aggregates may be precomputed or generated through map/reduce-style queries depending on the database.

The domain service contract should stay the same across all three.

### RAG Documents

Add this if embeddings are stored in MySQL or a sidecar vector store needs document metadata.

```sql
CREATE TABLE rag_document (
  id INT AUTO_INCREMENT PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL,
  source_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  reference_label VARCHAR(255) NULL,
  content MEDIUMTEXT NOT NULL,
  content_hash CHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Embedding vectors may live in:

- A local vector database.
- A MySQL-compatible vector extension if available.
- Files on disk with a lightweight nearest-neighbor index, acceptable while the app remains local-only.

## Normalization Rules

Recommended normalization for search and uniqueness:

- Trim leading/trailing whitespace.
- Collapse internal whitespace to a single space.
- Lowercase for normalized fields.
- Preserve punctuation in display text.
- Consider removing punctuation only for a separate loose-search field, not for uniqueness at first.

Examples:

- Display: `Lamb of God`
- Normalized: `lamb of god`
- Loose search, optional: `lamb of god`

## Reference Parsing And Validation

The current UI accepts text like `1 Nephi 13: 15`. Keep this input because it is efficient, but move validation toward canonical references.

Recommended flow:

1. Frontend parses the raw string into `book`, `chapter`, and `verse`.
2. Frontend sends the raw parsed pieces to the API.
3. API normalizes the book string and resolves it against `scripture_book` and `scripture_book_alias`.
4. API rejects unknown book names with suggestions.
5. API validates chapter and verse if verse inventory is available.
6. API stores only canonical IDs.

## Search Indexes

Start with simple MySQL indexes:

- `name_title(normalized_name)`
- `name_title(divine_person_id, normalized_name)`
- `scripture_book(standard_work_id, normalized_name)`
- `verse(scripture_book_id, chapter, verse)`
- `name_occurrence(verse_id)`
- `name_occurrence(name_title_id)`

If fuzzy search becomes important, add:

- MySQL full-text index on names and verse text.
- A dedicated search table with normalized tokens.
- Client-side highlighting based on returned match metadata.

## Migration Strategy

Migration steps from the current schema:

1. Create `scripture_book` with canonical rows for all books.
2. Backfill `scripture_book` entries from existing `verse.book` values if canonical source is not ready.
3. Add `scripture_book_id` to `verse`.
4. Resolve existing `verse.book` values into `scripture_book_id`.
5. Add `normalized_name` to `name_title`.
6. Change uniqueness from `name` to `(divine_person_id, normalized_name)`.
7. Rename `name_occurrence.name_id` to `name_title_id` if desired for clarity.
8. Add timestamps.
9. Add indexes.
10. Drop old columns only after the app no longer reads them.

If existing data is minimal, the migration can be simpler, but it is still worth creating a migration runner before changing schema shape.

## Data Integrity Rules

- An occurrence must always have exactly one name/title and one verse.
- A name/title belongs to exactly one divine person.
- A visible name can exist for multiple divine persons as separate `name_title` rows.
- A verse belongs to exactly one scripture book.
- A scripture book belongs to exactly one standard work.
- A duplicate occurrence is same divine person, same normalized name, and same canonical verse.
- Deleting an occurrence should not automatically delete its verse.
- Deleting the last occurrence for a name/title should either keep the name row for analytics history or remove it only through explicit cleanup.

## Analytics Implications

The analytics page should count rows in `name_occurrence`. It should not count `name_title.occurrence_count` except for name-level summaries where cached counts are intentionally trusted.

Common grouping keys:

- Name count: `name_title.id`
- Divine person count: `divine_person.id`
- Standard work count: `standard_work.id`
- Scripture book count: `scripture_book.id`
- Chapter count: `scripture_book.id + chapter`
- Verse count: `verse.id`

## RAG Implications

RAG should retrieve source chunks from scripture text and occurrence metadata. A good first document strategy is:

- One document per verse, containing reference label and verse text.
- One metadata record per occurrence attached to the verse document.
- Optional expanded documents per chapter for broader context.

For example, a verse document can include metadata:

```json
{
  "reference": "John 1:29",
  "standardWork": "New Testament",
  "book": "John",
  "chapter": 1,
  "verse": 29,
  "names": [
    {
      "name": "Lamb of God",
      "divinePerson": "Jesus Christ"
    }
  ]
}
```

## Minimum Viable Schema For The Next Feature

If the next implementation target is only the edit page, the minimum changes are:

- Add `id`, timestamps, and listable fields to API responses.
- Change `name_title` uniqueness so same name can exist for multiple divine persons.
- Add indexes for list/search filters.
- Add CRUD endpoints.

Canonical books and scripture text can follow, but analytics and ask will be cleaner if they are handled early.
