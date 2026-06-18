# Backend And API Plan

The current backend is implemented as Vite middleware in `server/api.ts`. That is acceptable for a local-only app, but the API should be split before adding edit, analytics, lookup, and ask features.

The backend should also be refactored around storage ports and adapters. Route handlers and services should not know whether data comes from MySQL, a browser-local SQL database, or a NoSQL database.

## Recommended Backend Structure

Suggested file structure:

```text
server/
  api/
    routes.ts
    errors.ts
    http.ts
    occurrenceRoutes.ts
    analyticsRoutes.ts
    lookupRoutes.ts
    askRoutes.ts
  database/
    db.ts
    migrations/
    migrate.ts
    seeds.ts
  storage/
    index.ts
    ports.ts
    capabilities.ts
    memory/
      memoryStorage.ts
    mysql/
      mysqlStorage.ts
      mysqlOccurrenceRepository.ts
      mysqlAnalyticsRepository.ts
    browser-sql/
      browserSqlStorage.ts
    nosql/
      noSqlStorage.ts
  domain/
    constants.ts
    normalize.ts
    references.ts
  repositories/
    occurrenceRepository.ts
    analyticsRepository.ts
    scriptureRepository.ts
    ragRepository.ts
  services/
    occurrenceService.ts
    analyticsService.ts
    scriptureLookupService.ts
    ragService.ts
```

Keep the Vite middleware registration in `vite.config.ts`, but make it register a composed API router rather than keeping all logic in one file.

## Dependency Direction

Use this dependency direction:

```text
React pages -> frontend API client -> HTTP routes -> services -> storage ports -> storage adapters
```

Rules:

- `mysql2` should only be imported inside MySQL adapter files.
- SQL strings should only live inside SQL adapter files.
- Route handlers should validate HTTP shape, then call services.
- Services should enforce domain rules and call storage ports.
- Tests should be able to run services against an in-memory adapter.
- Future Web SQL/browser SQL or NoSQL adapters should satisfy the same ports.

## Storage Ports

Define interfaces around product capabilities rather than tables:

```ts
type StorageProvider = {
  occurrences: OccurrenceStore
  references: ReferenceStore
  analytics: AnalyticsStore
  scripture: ScriptureStore
  rag: RagStore
  transactions: TransactionRunner
  capabilities: StorageCapabilities
}
```

Example occurrence port:

```ts
type OccurrenceStore = {
  create(input: CreateOccurrenceInput): Promise<OccurrenceRow>
  list(query: OccurrenceListQuery): Promise<PaginatedResult<OccurrenceRow>>
  getById(id: string): Promise<OccurrenceRow | null>
  update(id: string, input: UpdateOccurrenceInput): Promise<OccurrenceRow>
  delete(id: string): Promise<void>
}
```

Example analytics port:

```ts
type AnalyticsStore = {
  getSummary(filters: AnalyticsFilters): Promise<AnalyticsSummary>
  groupNames(query: AnalyticsQuery): Promise<PaginatedResult<NameAggregateRow>>
  groupLocations(query: LocationAnalyticsQuery): Promise<PaginatedResult<LocationAggregateRow>>
  drilldown(query: AnalyticsDrilldownQuery): Promise<PaginatedResult<OccurrenceRow>>
}
```

Example RAG port:

```ts
type RagStore = {
  upsertDocuments(documents: RagDocumentInput[]): Promise<void>
  markVerseStale(verseId: string): Promise<void>
  markDeleted(documentIds: string[]): Promise<void>
  retrieve(query: RetrievalQuery): Promise<RetrievedDocument[]>
  getIndexStatus(): Promise<RagIndexStatus>
}
```

These ports can be backed by SQL joins, NoSQL aggregation pipelines, precomputed views, or in-memory test data.

## API Conventions

Use stable JSON envelopes:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

For errors:

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Verse must be a positive number.",
    "details": {}
  }
}
```

Use these HTTP status codes:

- `200`: successful read/update/delete.
- `201`: successful create.
- `400`: invalid input.
- `404`: missing row or reference.
- `409`: duplicate occurrence or edit conflict.
- `413`: payload too large.
- `500`: unexpected backend failure.

## Occurrence API

### Create Occurrence

`POST /api/occurrences`

Request:

```json
{
  "divinePersonId": 2,
  "standardWorkId": 2,
  "book": "John",
  "chapter": 1,
  "verse": 29,
  "name": "Lamb of God",
  "notes": null
}
```

Response:

```json
{
  "data": {
    "id": 123,
    "name": "Lamb of God",
    "divinePerson": "Jesus Christ",
    "reference": "John 1:29"
  },
  "meta": {},
  "error": null
}
```

Implementation notes:

- Resolve or create name/title for `(divinePersonId, normalizedName)`.
- Resolve or create verse depending on whether canonical inventory exists.
- Insert occurrence inside a transaction.
- Return `409` for duplicate occurrence.

### List Occurrences

`GET /api/occurrences`

Query parameters:

- `q`: search across name and reference label.
- `name`: exact or partial name filter.
- `divinePersonId`
- `standardWorkId`
- `bookId`
- `chapter`
- `verse`
- `sort`: `reference_asc`, `reference_desc`, `name_asc`, `name_desc`, `created_desc`, `created_asc`.
- `page`
- `pageSize`

Response:

```json
{
  "data": [
    {
      "id": 123,
      "nameTitleId": 44,
      "name": "Lamb of God",
      "divinePersonId": 2,
      "divinePerson": "Jesus Christ",
      "standardWorkId": 2,
      "standardWork": "New Testament",
      "bookId": 64,
      "book": "John",
      "chapter": 1,
      "verse": 29,
      "reference": "John 1:29",
      "createdAt": "2026-05-09T00:00:00.000Z",
      "updatedAt": "2026-05-09T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 1
  },
  "error": null
}
```

### Get Occurrence

`GET /api/occurrences/:id`

Use this for edit modals or direct links.

### Update Occurrence

`PUT /api/occurrences/:id`

Editable fields:

- divine person
- name/title
- standard work/book/chapter/verse
- notes, if added

Implementation notes:

- Use a transaction.
- Resolve target name and target verse.
- Update occurrence to point to the new IDs.
- Return `409` if the update would duplicate another occurrence.
- Ensure cached counts remain correct. If triggers only respond to insert/delete, either update counts manually or delete/reinsert the occurrence.

### Delete Occurrence

`DELETE /api/occurrences/:id`

Implementation notes:

- Use transaction if audit logging is added.
- Deleting occurrence should update cached name counts if triggers are retained.
- Do not delete verse rows by default.

## Reference API

These endpoints support forms, filters, and validation.

### List Divine Persons

`GET /api/reference/divine-persons`

### List Standard Works

`GET /api/reference/standard-works`

### List Books

`GET /api/reference/books?standardWorkId=3&q=nephi`

### Resolve Reference

`POST /api/reference/resolve`

Request:

```json
{
  "standardWorkId": 3,
  "book": "1 Nephi",
  "chapter": 13,
  "verse": 15
}
```

Response should return canonical IDs and suggestions on failure.

### Lookup Verse Text

`GET /api/scripture/verses/:verseId`

or:

`GET /api/scripture/lookup?standardWorkId=3&book=1%20Nephi&chapter=13&verse=15`

## Analytics API

The analytics API should support the same filter object across endpoints.

Common filters:

- `divinePersonId`
- `nameTitleId`
- `name`
- `standardWorkId`
- `bookId`
- `chapter`
- `verse`
- `fromCreatedAt`
- `toCreatedAt`

Common sorting:

- `count_desc`
- `count_asc`
- `name_asc`
- `reference_asc`
- `scripture_order_asc`

### Name Summary

`GET /api/analytics/names`

Returns unique names with counts.

### Location Summary

`GET /api/analytics/locations?groupBy=standardWork|book|chapter|verse`

Returns counts per selected hierarchy level.

### Matrix Summary

`GET /api/analytics/matrix?rows=book&columns=divinePerson`

Useful later for comparisons.

### Drilldown

`GET /api/analytics/drilldown`

Returns occurrence rows matching an aggregate row. This keeps analytics and edit page connected.

## Ask API

### Chat

`POST /api/ask/chat`

Request:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Where does John use names for Jesus Christ?"
    }
  ],
  "filters": {
    "standardWorkId": 2,
    "bookId": 64
  }
}
```

Response:

```json
{
  "data": {
    "answer": "Based on the local scripture data...",
    "sources": [
      {
        "reference": "John 1:29",
        "verseId": 1001,
        "excerpt": "..."
      }
    ]
  },
  "meta": {
    "retrievalCount": 5
  },
  "error": null
}
```

### Retrieve Only

`POST /api/ask/retrieve`

Useful for debugging RAG without invoking the language model.

## Query Implementation Notes

### Occurrence List Query

The list query should join:

- `name_occurrence`
- `name_title`
- `divine_person`
- `verse`
- `scripture_book`
- `standard_work`

It should return display-ready labels so the frontend does not need to reconstruct references from partial data.

### Analytics Count Query

Counts should generally be:

```sql
COUNT(DISTINCT name_occurrence.id)
```

Use `COUNT(DISTINCT name_title.id)` only for "unique names found" style metrics.

### Sorting Scripture References

Do not sort books alphabetically when the user expects scripture order. Use:

- `standard_work.sort_order`
- `scripture_book.sort_order`
- `verse.chapter`
- `verse.verse`

## Validation

Centralize validation in services, not route handlers.

Validate:

- IDs are positive integers.
- names are non-empty and below max length.
- chapter/verse are positive integers.
- page size has an upper bound.
- sort keys are allowlisted.
- filters are compatible with each other.

## Compatibility With Current Endpoint

The existing `POST /api/name-occurrence` can be handled in one of three ways:

1. Keep it as a compatibility alias that calls the new create service.
2. Return `308` redirect to `/api/occurrences`.
3. Remove it only when the frontend has migrated.

Recommended: keep it as an alias during the first edit-page implementation to reduce risk.

## Backend Testing Targets

- Reference parser and normalizer.
- Occurrence create duplicate detection.
- Same name for different divine persons.
- Occurrence update that changes name.
- Occurrence update that changes verse.
- Delete count behavior.
- Analytics filters and sort order.
- Lookup missing verse text behavior.
- RAG retrieve endpoint with deterministic fixtures.
