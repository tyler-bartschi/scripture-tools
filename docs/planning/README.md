# Scripture Tools Planning Overview

This folder is the implementation plan for growing the current early-stage app into three core workspaces:

- Edit: create, search, list, update, and delete name occurrence submissions.
- Analytics: inspect aggregate counts across names, members of the Godhead, standard works, books, chapters, and verses.
- Ask: chat with an AI assistant backed by scripture text and the app's recorded name occurrence data.

No product code is implemented here. These documents are intended to make future implementation chunks small, testable, and orderable.

## Current State

The repository is currently a Vite, React, and TypeScript app with a Vite middleware API backed by MySQL.

Important current files:

- `src/App.tsx`: route shell for `/record`, `/analytics`, and `/ask`.
- `src/Record.tsx`: current submission form.
- `src/Toaster.tsx`: toast system for success and error messages.
- `server/api.ts`: current POST-only endpoint at `/api/name-occurrence`.
- `server/database/db.ts`: MySQL pool creation, schema creation, static seed rows, and count triggers.
- `codex_resources/database_details.md`: current database documentation.

Current tables:

- `divine_person`
- `standard_work`
- `verse`
- `name_title`
- `name_occurrence`

The existing foundation is useful, but the target product needs several changes before adding large UI surfaces:

- Names must be representable per member of the Godhead. The same visible title may need to exist for more than one divine person without mutating historical rows.
- Scripture structure needs canonical IDs for standard work, book, chapter, and verse so analytics and lookup can query reliably.
- The app needs read/update/delete APIs, not only a create endpoint.
- The ask page needs scripture text and retrieval metadata. The current schema stores references, not verse text.
- Analytics should be powered by explicit query endpoints rather than frontend-only aggregation.

## Target Product Shape

The application should keep three top-level pages:

- `/edit`: full data management for submissions.
- `/analytics`: aggregate exploration and sorting.
- `/ask`: RAG chat, scripture lookup, and source-backed answers.

The current `/record` page can either become `/edit` or remain as a simplified alias that redirects to `/edit`. The planning docs assume `/edit` becomes the primary data-management page.

## Recommended Document Order

1. [Implementation DAG](./01-implementation-dag.md)
2. [Storage Architecture And Dependencies](./09-storage-architecture-and-dependencies.md)
3. [Domain And Data Model](./02-domain-and-data-model.md)
4. [Backend And API Plan](./03-backend-and-api-plan.md)
5. [Edit Page Plan](./04-edit-page-plan.md)
6. [Analytics Page Plan](./05-analytics-page-plan.md)
7. [Ask And RAG Page Plan](./06-ask-and-rag-page-plan.md)
8. [Testing And Quality Plan](./07-testing-and-quality-plan.md)
9. [Risks And Open Questions](./08-risks-and-open-questions.md)

## Implementation Principles

- Keep each chunk shippable. Every milestone should leave the app runnable.
- Preserve the existing MySQL investment, but introduce migrations before schema changes get larger.
- Treat persistence as a replaceable adapter. Product services should depend on repository interfaces and query contracts, not on MySQL, SQL syntax, or browser storage APIs.
- Prefer backend aggregation for analytics so sorting, filtering, and pagination stay consistent.
- Keep scripture references canonical. Free-text parsing can remain in the UI, but persisted data should use normalized IDs and validated references.
- Do not put AI chat directly on top of raw tables. Build a retrieval layer with source citations, predictable prompts, and clear failure states.
- Add tests as the app grows. This project is small now, but edit/delete/analytics/RAG features will otherwise become hard to trust.

## Proposed Milestones

### Milestone 0: Project Hygiene

Goal: make future work safer.

- Replace the template README with project-specific setup notes.
- Extract shared domain constants and types from `src/Record.tsx` and `server/api.ts`.
- Add an API helper on the frontend for consistent fetch/error handling.
- Define storage ports and adapter contracts before adding more MySQL-specific routes.
- Wrap the current MySQL code in a MySQL adapter.
- Add an in-memory adapter for service tests.
- Add migration scripts or a migration runner after the adapter boundary is clear.
- Add backend test infrastructure with a test database.

### Milestone 1: Data Model Upgrade

Goal: support the target domain correctly.

- Change the name model so a name/title can be associated with multiple divine persons without overwriting another person.
- Add canonical scripture hierarchy tables, or at minimum a canonical `book` table linked to `standard_work`.
- Add scripture text storage if lookup and RAG should work offline against local data.
- Add audit fields such as `created_at` and `updated_at`.
- Add explicit indexes for search and analytics.

### Milestone 2: Edit Page MVP

Goal: manage occurrence rows end to end.

- Rename or route `/record` to `/edit`.
- Add list, search, filter, sort, pagination, create, update, and delete.
- Add optimistic or post-save refresh behavior.
- Add confirm flows for delete operations.
- Keep toasts for save/delete/error states.

### Milestone 3: Analytics MVP

Goal: answer count questions reliably.

- Add aggregate API endpoints for names, books, chapters, verses, and cross filters.
- Add sort controls for most common and least common.
- Add filter controls for member, name, standard work, book, chapter, and verse.
- Add result tables first; charts can come after the query contract is stable.

### Milestone 4: Scripture Lookup

Goal: view the actual verses behind recorded names.

- Import or connect to a scripture text source.
- Add lookup endpoints for references and occurrence-backed verse lists.
- Add UI for verse detail panels with names found in each verse.

### Milestone 5: Ask/RAG MVP

Goal: chat with source-grounded answers.

- Add embedding generation and a local retrieval store.
- Build retrieval over scripture text and recorded occurrence data.
- Add AI provider configuration.
- Add chat UI with citations and source previews.
- Add safety checks for unanswered or underspecified questions.

### Milestone 6: Polish And Scale

Goal: improve usability and maintainability.

- Add saved filter presets if repetitive study workflows emerge.
- Add import/export for occurrence data.
- Add bulk edit/bulk delete if data entry grows.
- Add richer charts and comparison views.
- Add usage logging for failed searches and unanswered chat questions.

## Key Early Decisions

These should be resolved before implementation goes far:

- Whether scripture text will be imported into MySQL, read from local files, or fetched from an external API.
- Whether the app should remain Vite middleware only or move to a dedicated backend process.
- Whether browser-local storage means the legacy Web SQL API specifically or a modern local SQL option such as SQLite compiled to WebAssembly with IndexedDB-backed persistence.
- Which AI provider and embedding model will be used.
- Whether names are case-sensitive, punctuation-sensitive, or normalized for search and uniqueness.
- How to handle a visible name/title that applies to multiple members of the Godhead.
