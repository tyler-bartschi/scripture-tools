# Edit Page Plan

The edit page is the operational center for managing name occurrence data. It should replace the current single-purpose record form with a complete data management surface.

## Goals

- Add submissions to the database for each member of the Godhead and each name/title.
- Search by name/title, member of the Godhead, standard work, scripture book, chapter, verse, and combined reference.
- List all entries with pagination.
- Edit entries.
- Delete entries.
- Keep feedback visible through toasts.
- Make duplicates and validation errors easy to recover from.

## Route Strategy

Recommended:

- Add `/edit` as the primary page.
- Redirect `/record` to `/edit`, or keep `/record` as a simple create-only alias if useful.
- Update nav labels to `Edit`, `Analytics`, and `Ask`.

## Page Layout

Use a work-focused layout rather than a hero-style landing page.

Suggested structure:

- Top toolbar: page title, primary add button, optional import/export later.
- Filter/search band: text search, member select, standard work select, book select, chapter input, verse input.
- Results table: current occurrence rows.
- Side panel or modal: create/edit form.
- Delete confirmation dialog.
- Toasts: success/error states.

## Core UI Components

### `EditPage`

Responsibilities:

- Own current filters, sort, pagination, selected row, and modal state.
- Fetch reference data on load.
- Fetch occurrence list when filters/sort/page change.
- Coordinate create/update/delete mutations.

### `OccurrenceFilters`

Fields:

- Search text.
- Divine person select.
- Standard work select.
- Scripture book combobox.
- Chapter input.
- Verse input.
- Sort select.
- Clear filters button.

Behavior:

- Debounce text search.
- Disable book select until a standard work is selected, unless all books are loaded.
- Keep filter state in the URL query string once the API is stable.

### `OccurrenceTable`

Columns:

- Name/title.
- Member of the Godhead.
- Standard work.
- Book.
- Chapter.
- Verse.
- Reference.
- Created/updated date.
- Actions.

Actions:

- Edit.
- Delete.
- View verse text, once lookup exists.

### `OccurrenceForm`

Fields:

- Member of the Godhead.
- Standard work.
- Name/title.
- Verse reference text.
- Optional notes.

Later improvement:

- Split reference into book combobox, chapter input, and verse input for reliability while keeping a quick-entry reference box.

Validation:

- Member required.
- Standard work required.
- Name/title required.
- Reference required and parseable.
- Chapter and verse positive integers.
- Book must resolve to a canonical book once canonical books exist.

### `DeleteOccurrenceDialog`

Show:

- Name/title.
- Member of the Godhead.
- Reference.
- Clear confirm/cancel actions.

Behavior:

- Delete only after confirmation.
- Refresh current list after successful delete.
- Keep the user on the same page if possible.

## User Flows

### Create

1. User opens edit page.
2. User clicks add or uses visible create form.
3. User selects member, standard work, enters name/title, and enters reference.
4. Frontend validates basic shape.
5. API resolves canonical reference and persists occurrence.
6. UI shows success toast.
7. List refreshes.
8. Form resets only after success.

### Search And Filter

1. User enters search text or selects filters.
2. UI updates URL query state.
3. API request includes filters.
4. Results table updates.
5. Empty state shows that no entries match the filters.

### Edit

1. User selects edit on a row.
2. Form opens with current values.
3. User changes name, member, or reference.
4. API validates and updates inside a transaction.
5. UI shows success toast and refreshes row/list.

### Delete

1. User selects delete on a row.
2. Confirmation dialog shows row details.
3. User confirms.
4. API deletes occurrence.
5. UI shows success toast and removes row from list.

## Backend Requirements

Required endpoints:

- `GET /api/reference/divine-persons`
- `GET /api/reference/standard-works`
- `GET /api/reference/books`
- `GET /api/occurrences`
- `POST /api/occurrences`
- `GET /api/occurrences/:id`
- `PUT /api/occurrences/:id`
- `DELETE /api/occurrences/:id`

## Frontend State Model

Suggested TypeScript types:

```ts
type OccurrenceRow = {
  id: number
  nameTitleId: number
  name: string
  divinePersonId: number
  divinePerson: string
  standardWorkId: number
  standardWork: string
  bookId: number
  book: string
  chapter: number
  verse: number
  reference: string
  createdAt: string
  updatedAt: string
}

type OccurrenceFilters = {
  q: string
  divinePersonId: number | null
  standardWorkId: number | null
  bookId: number | null
  chapter: number | null
  verse: number | null
  sort: string
  page: number
  pageSize: number
}
```

## Implementation Chunks

### Chunk 1: Route And Skeleton

- Add `/edit` route.
- Update nav label.
- Add placeholder edit layout with toolbar, filter area, table area, and form area.

Acceptance:

- App still builds.
- `/edit` route is reachable.
- `/record` behavior is intentionally preserved or redirected.

### Chunk 2: Occurrence List API

- Add backend list endpoint.
- Add repository query with filters and pagination.
- Return display-ready rows.

Acceptance:

- API can list existing submissions.
- Page size and total count work.
- Empty database returns empty array, not an error.

### Chunk 3: Read-Only Edit Page

- Fetch and display occurrences.
- Add filter controls.
- Add sort controls.
- Add pagination.

Acceptance:

- User can search/filter/sort existing rows.
- Loading, error, and empty states are visible.

### Chunk 4: Create Form

- Move existing record form behavior into edit page.
- Use new create endpoint.
- Keep current toast behavior.

Acceptance:

- User can create an occurrence from `/edit`.
- Duplicate errors are shown.
- Form clears only on success.

### Chunk 5: Update Flow

- Add edit action.
- Open form populated with row values.
- Add update endpoint.
- Refresh list after save.

Acceptance:

- User can change name, member, or reference.
- Duplicate update target returns `409`.
- Counts remain correct.

### Chunk 6: Delete Flow

- Add delete action.
- Add confirmation dialog.
- Add delete endpoint.
- Refresh list after delete.

Acceptance:

- User can delete an entry.
- Cancel leaves data unchanged.
- Counts remain correct.

### Chunk 7: Polish

- Persist filters in URL.
- Add keyboard-friendly form behavior.
- Add better book autocomplete.
- Add optional import/export hooks.

Acceptance:

- Reloading page preserves current search.
- Form and table are usable on mobile.
- Long names do not break layout.

## Edge Cases

- Same name/title used for multiple divine persons.
- Same name/title same verse submitted twice.
- Same verse with multiple different names.
- Same verse with same visible name but different divine person.
- Book spelling variants.
- Empty database.
- Very long names.
- Non-numeric chapter or verse.
- Deleting an occurrence that is already gone.
- Editing an occurrence to a duplicate target.

## Initial Acceptance Test Script

Manual script for the first complete edit page:

1. Start with an empty test database.
2. Create `Lamb of God`, Jesus Christ, New Testament, `John 1:29`.
3. Confirm it appears in the list.
4. Search for `Lamb`.
5. Filter to New Testament.
6. Edit the name to `the Lamb of God`.
7. Confirm list updates.
8. Try to create the same occurrence again and confirm duplicate error.
9. Delete the row.
10. Confirm empty state appears.

