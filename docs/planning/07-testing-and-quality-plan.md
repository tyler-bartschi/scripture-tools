# Testing And Quality Plan

The app is small now, but the requested feature set will involve schema changes, derived counts, search, sorting, deletion, and AI retrieval. Testing should be added early enough that future changes are not guesswork.

## Test Layers

### Domain Unit Tests

Target:

- Reference parsing.
- Name normalization.
- Query parameter validation.
- Sort key validation.
- Filter serialization.

Examples:

- `1 Nephi 13: 15` parses correctly.
- `John 1:29` parses correctly.
- `John chapter 1 verse 29` is rejected or handled by a future forgiving parser.
- Empty name is rejected.
- Whitespace-only name is rejected.
- Normalized ` Lamb   of God ` becomes `lamb of god`.

### Repository/API Integration Tests

Target:

- MySQL-backed behavior.
- Transactions.
- Duplicate prevention.
- Count maintenance.
- Analytics counts.

Examples:

- Create occurrence inserts name and verse.
- Creating duplicate returns conflict.
- Same visible name for two divine persons creates two name rows.
- Editing occurrence to a new name updates counts.
- Deleting occurrence decrements count.
- Analytics name counts match occurrence rows.
- Filtering to John returns only John rows.

### Storage Adapter Contract Tests

Target:

- Ensure every persistence provider exposes the same product behavior.
- Protect future database switches from changing page or service behavior.

Run the same contract suite against:

- In-memory adapter on normal test runs.
- MySQL adapter when `db_test.config` is available.
- Browser SQL adapter in browser/e2e tests when implemented.
- NoSQL adapter when implemented.

Examples:

- All adapters allow same visible name for different divine persons.
- All adapters reject duplicate occurrences.
- All adapters return deterministic pagination.
- All adapters return equivalent analytics counts for the same fixture data.
- All adapters preserve reference resolution behavior.

### Frontend Component Tests

Target:

- Form validation.
- Filter state.
- Table rendering.
- Empty/loading/error states.
- Delete confirmation behavior.

### End-To-End Smoke Tests

Target:

- Real browser workflow with local dev server and test database.

Suggested MVP smoke:

1. Open `/edit`.
2. Create an occurrence.
3. Confirm it appears in the table.
4. Filter for it.
5. Edit it.
6. Delete it.
7. Confirm analytics updates.

### RAG Evaluation Tests

Target:

- Retrieval quality.
- Citation behavior.
- Known question behavior.

Use a small deterministic fixture corpus:

- A few verses in John.
- A few verses in 1 Nephi.
- Several recorded names across divine persons.

Evaluate:

- Expected sources are retrieved.
- Answers include citations.
- Insufficient data returns a refusal or limitation message.

## Suggested Tooling

Current project has TypeScript and ESLint but no test runner.

Recommended additions:

- Vitest for unit and component-level tests.
- React Testing Library for frontend components.
- A MySQL test database using `db_test.config`.
- Playwright for end-to-end smoke tests once pages become interactive.

## Test Database Strategy

`server/database/db.ts` already supports `db_test.config` and drops/recreates tables when `isTest` is true. Build on this, but move destructive reset behavior into explicit test setup so normal app startup never drops data accidentally.

Recommended:

- `npm run test:unit`
- `npm run test:api`
- `npm run test:e2e`
- `npm run db:migrate`
- `npm run db:reset:test`

## Fixtures

Use small named fixture sets:

### `basicOccurrences`

- Jesus Christ, Lamb of God, John 1:29.
- Jesus Christ, Word, John 1:1.
- Heavenly Father, Father, John 3:16.
- Holy Ghost, Comforter, John 14:26.
- Jesus Christ, Redeemer, 1 Nephi 10:5.

### `duplicateCases`

- Same name, same divine person, same verse.
- Same name, different divine person, same verse.
- Different name, same verse.

### `analyticsCases`

- Multiple names in one verse.
- Multiple verses in one book.
- Multiple books in one standard work.
- Equal counts for deterministic secondary sorting.

## Quality Gates By Milestone

### Project Hygiene

- `npm run build`
- `npm run lint`
- Unit tests for parser/normalizer.
- Storage port contract tests pass against the in-memory adapter.

### Data Model Upgrade

- Migration applies to empty database.
- Migration applies to current schema.
- API integration tests for same name across divine persons.
- MySQL adapter still passes storage contract tests.

### Edit Page

- API tests for CRUD.
- Component tests for form validation.
- Manual smoke for create/edit/delete.

### Analytics Page

- API tests for each grouping.
- Tests for combined filters.
- Tests for ascending and descending count sort.

### Ask/RAG Page

- Retrieve-only deterministic tests.
- Prompt builder tests.
- Manual source citation review.

## Manual Review Checklist

Use this checklist before considering each feature chunk complete:

- Does it keep existing data safe?
- Does it handle empty data?
- Does it handle duplicate data?
- Does it expose useful errors?
- Does it avoid silently changing the meaning of existing occurrences?
- Does it keep filters and sorting deterministic?
- Does it work for all three members of the Godhead?
- Does it distinguish standard work, book, chapter, and verse clearly?
- Does it preserve source citations for AI answers?

## Accessibility And UX Quality

Minimum expectations:

- Buttons have clear labels.
- Form errors are visible and announced through accessible text or toast regions.
- Inputs have labels.
- Keyboard users can create/edit/delete.
- Tables remain readable on small screens.
- Destructive actions require confirmation.
- Long names and references do not overflow table cells.

## Data Quality Tools

Add admin or script-level checks:

- Find duplicate-like names by normalized text.
- Find unknown book strings before canonical migration.
- Reconcile cached occurrence counts.
- Find verses with no text after scripture import.
- Find RAG documents stale against occurrence data.

## Release Discipline

For this local-only app, "release" means merging a chunk into the working project. Each chunk should include:

- Code changes.
- Migration if schema changes.
- Tests or manual verification notes.
- Updated planning docs if a decision changes.
