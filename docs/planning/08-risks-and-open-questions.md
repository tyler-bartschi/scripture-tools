# Risks And Open Questions

This document collects the issues most likely to affect implementation quality, correctness, or future maintainability.

## Highest Priority Risks

### Name Uniqueness Currently Has The Wrong Shape

Risk:

- The current `name_title.name` uniqueness can overwrite which divine person a name belongs to.

Impact:

- Analytics and ask answers could attribute old occurrences to the wrong member of the Godhead.

Mitigation:

- Change uniqueness to `(divine_person_id, normalized_name)` before building edit and analytics features.

### Book Names Are Free Text

Risk:

- Analytics by book will fragment if book names are typed inconsistently.

Impact:

- `John`, `The Gospel of John`, and `Jn` could become separate buckets.

Mitigation:

- Add canonical `scripture_book` and optional aliases.
- Resolve references on the backend.

### Ask Page Requires Verse Text

Risk:

- The current database cannot support lookup of actual scripture text.

Impact:

- RAG would be shallow and could only answer from references and user-entered names.

Mitigation:

- Select and import a local scripture text source before starting RAG.

### Cached Counts Can Drift

Risk:

- Insert/delete triggers maintain counts, but update flows can bypass correct count changes if not designed carefully.

Impact:

- Analytics and name lists may show wrong counts.

Mitigation:

- Use transaction patterns that preserve trigger behavior.
- Add a reconciliation script.
- Prefer query-time counts until cached count is proven necessary.

### Vite Middleware May Become Crowded

Risk:

- Keeping all backend behavior inside one Vite middleware file will become hard to maintain.

Impact:

- Edit, analytics, lookup, and ask APIs will be harder to test and reason about.

Mitigation:

- Split routes, services, and repositories early.
- Keep Vite as the host, but not as the architecture.

### Database-Specific Logic May Spread

Risk:

- MySQL-specific SQL, IDs, joins, and transaction assumptions can leak into services and UI code.

Impact:

- Switching to browser-local SQL or NoSQL would require a rewrite instead of an adapter change.

Mitigation:

- Define storage ports before new feature work.
- Keep SQL inside adapter files.
- Use string IDs at the domain/API boundary.
- Add adapter contract tests that every provider must pass.

## Open Product Questions

### Should `/record` Become `/edit`?

Recommendation:

- Yes. The requested feature is a full edit page. Keep `/record` as a redirect or compatibility alias only if it is useful.

### Should Names Be Case-Sensitive?

Recommendation:

- No for uniqueness and search. Preserve display case but compare normalized lowercase text.

### Should Punctuation Affect Name Uniqueness?

Recommendation:

- At first, yes. `Son of God` and `Son, of God` should not be silently merged until there is a deliberate cleanup workflow.

### Should A Verse Be Created If It Is Not In Canonical Scripture Data?

Options:

- Allow creation with a warning.
- Reject unknown references.
- Allow drafts that need review.

Recommendation:

- Once canonical verse inventory exists, reject unknown references and show suggestions. Before that, allow creation but make book resolution canonical.

### Should Deleting The Last Occurrence Delete The Name?

Recommendation:

- No, not automatically. Keep the name row unless a cleanup tool removes unused names. This avoids unexpected loss of user-entered naming history.

### Should The App Support Notes?

Recommendation:

- Add `notes` to `name_occurrence` only if the user wants interpretive or study comments. It is low-cost, but it can complicate RAG if notes are treated as evidence.

### Should AI Use User Notes As Sources?

Recommendation:

- Not for MVP. Keep scripture text and recorded occurrence metadata separate from interpretive notes unless clearly labeled.

### Should The Ask Page Use Conversation Memory?

Recommendation:

- Use short conversation context only. Retrieval should be based on the latest question plus active filters, not an unbounded chat transcript.

## Technical Decisions To Make Before Implementation

1. Migration tool:
   - Handwritten SQL runner.
   - Lightweight Node script.
   - External migration package.

2. Scripture text source:
   - MySQL import.
   - Local JSON files.
   - External API.

3. AI provider:
   - Which chat model.
   - Which embedding model.
   - Where credentials live.

4. Vector store:
   - File-backed local index.
   - SQLite/vector extension.
   - MySQL vector support.
   - Dedicated local vector database.

5. Test runner:
   - Vitest is the likely default for this Vite project.

6. API shape:
   - Whether to keep compatibility with `POST /api/name-occurrence`.
   - Whether all new APIs use `/api/occurrences`.

## Data Import Questions

Scripture lookup and RAG need answers to:

- Which scripture editions are acceptable?
- Is the text licensed for local storage?
- How are books named and ordered?
- Are section-style references like Doctrine and Covenants handled as books, chapters, or sections?
- How are Pearl of Great Price books and chapters represented?
- Are chapter headings included or excluded?
- Should footnotes, cross references, or study helps be imported?

## Analytics Ambiguities

Clarify language in UI:

- "Book of scripture" should mean standard work.
- "Book" should mean a book within a standard work, such as John or 1 Nephi.
- "Names per verse" should specify whether it means occurrence count or unique name count.
- "Most common" should default to occurrence count descending.
- "Least common" should have deterministic secondary sorting.

## RAG Risks

### Hallucinated References

Mitigation:

- Require source IDs in model context.
- Render citations only from retrieved source objects.
- Reject or flag answers that cite unknown references.

### Over-Retrieval

Mitigation:

- Limit source count.
- Use filters aggressively.
- Prefer verse-level chunks for exact questions.

### Under-Retrieval

Mitigation:

- Add query rewriting for name variants.
- Include occurrence metadata documents.
- Add aliases for scripture books and names.

### Stale Index

Mitigation:

- Store content hashes.
- Show last indexed time.
- Add manual reindex command.
- Eventually trigger incremental updates after occurrence mutations.

## Review Notes

The most important implementation order is:

1. Fix data model semantics.
2. Add CRUD APIs.
3. Build edit page.
4. Add analytics queries.
5. Add scripture text lookup.
6. Add RAG.

Building the ask page before scripture lookup or building analytics before canonical references would produce features that look complete but are hard to trust.
