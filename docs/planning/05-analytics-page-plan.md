# Analytics Page Plan

The analytics page should answer questions about how names are distributed across divine persons and scripture locations. It should be query-driven, not a collection of hardcoded charts.

## Goals

- Display all unique names found.
- Sort names by most common and least common.
- Show how many names appear per standard work.
- Show how many names appear per scripture book within a standard work, such as 1 Nephi within the Book of Mormon.
- Show how many names appear per chapter.
- Show how many names appear per verse.
- Sort books, chapters, and verses by most common or least common.
- Query by combinations of name, divine person, standard work, book, chapter, and verse.
- Drill from aggregate rows into the entries that produced the count.

## Count Definitions

Define these clearly before building the UI.

### Occurrence Count

Number of rows in `name_occurrence`.

Use for:

- Most common names.
- Names per standard work.
- Names per book.
- Names per chapter.
- Names per verse.

### Unique Name Count

Number of distinct `name_title.id` values.

Use for:

- "How many unique names are found in John?"
- "How many unique names are found for Jesus Christ in the Book of Mormon?"

### Verse Count

Number of distinct `verse.id` values.

Use for:

- "How many verses have recorded names?"
- Coverage metrics later.

The page should label counts explicitly so users know whether they are seeing occurrences, unique names, or verses.

## Page Layout

Suggested sections:

- Filter bar.
- Summary strip.
- Main tabs.
- Results table.
- Drilldown drawer.

### Filter Bar

Controls:

- Search names.
- Member of the Godhead.
- Standard work.
- Scripture book.
- Chapter.
- Verse.
- Metric selector: occurrences, unique names, verses.
- Sort selector: most common, least common, scripture order, alphabetical.

### Summary Strip

Cards:

- Total occurrences.
- Unique names.
- Verses with names.
- Most common name.
- Most represented standard work or book.

### Main Tabs

Tabs:

- Names.
- Standard Works.
- Books.
- Chapters.
- Verses.

Each tab uses the same active filters but groups the data differently.

## Query Examples

### All Unique Names, Most Common First

Filters:

- none

Group:

- name

Sort:

- count descending

Expected result:

- Name/title.
- Member of the Godhead.
- Occurrence count.
- Unique verse count.

### All Unique Names, Least Common First

Same as above with count ascending.

### Names Per Book Of Scripture

If "book of scripture" means standard work:

- Group by `standard_work`.

If "book within a standard work" means a scripture book:

- Group by `scripture_book`.

The UI should use "Standard Work" and "Book" to remove ambiguity.

### Names Per Book Within The Book Of Mormon

Filters:

- `standardWorkId = Book of Mormon`

Group:

- scripture book

Sort:

- occurrence count descending or ascending.

### Names Per Verse In John

Filters:

- `standardWorkId = New Testament`
- `bookId = John`

Group:

- verse

Sort:

- occurrence count descending.

Result:

- John 1:1, count.
- John 1:14, count.
- John 1:29, count.
- etc., limited to verses currently represented in the database unless full scripture inventory is imported.

## Backend Aggregation Endpoints

### Summary

`GET /api/analytics/summary`

Returns:

- total occurrences.
- unique name count.
- divine person counts.
- standard work counts.
- represented verse count.

### Names

`GET /api/analytics/names`

Query:

- filters.
- sort.
- pagination.

Rows:

- nameTitleId.
- name.
- divinePerson.
- occurrenceCount.
- uniqueVerseCount.
- firstReference.
- lastReference.

### Locations

`GET /api/analytics/locations?groupBy=standardWork|book|chapter|verse`

Rows depend on grouping:

- standard work row.
- book row.
- chapter row.
- verse row.

### Drilldown

`GET /api/analytics/drilldown`

Purpose:

- Given a group row, return the underlying occurrence rows.
- Reuse the occurrence list query shape if possible.

## SQL Patterns

### Name Counts

```sql
SELECT
  nt.id AS name_title_id,
  nt.name,
  dp.name AS divine_person,
  COUNT(no.id) AS occurrence_count,
  COUNT(DISTINCT no.verse_id) AS unique_verse_count
FROM name_occurrence no
JOIN name_title nt ON nt.id = no.name_title_id
JOIN divine_person dp ON dp.id = nt.divine_person_id
JOIN verse v ON v.id = no.verse_id
JOIN scripture_book b ON b.id = v.scripture_book_id
JOIN standard_work sw ON sw.id = b.standard_work_id
WHERE 1 = 1
GROUP BY nt.id, nt.name, dp.name
ORDER BY occurrence_count DESC, nt.name ASC
LIMIT ? OFFSET ?;
```

### Verse Counts In One Book

```sql
SELECT
  v.id AS verse_id,
  sw.name AS standard_work,
  b.name AS book,
  v.chapter,
  v.verse,
  COUNT(no.id) AS occurrence_count,
  COUNT(DISTINCT nt.id) AS unique_name_count
FROM name_occurrence no
JOIN name_title nt ON nt.id = no.name_title_id
JOIN verse v ON v.id = no.verse_id
JOIN scripture_book b ON b.id = v.scripture_book_id
JOIN standard_work sw ON sw.id = b.standard_work_id
WHERE b.id = ?
GROUP BY v.id, sw.name, b.name, v.chapter, v.verse
ORDER BY occurrence_count DESC, v.chapter ASC, v.verse ASC;
```

## Frontend Components

### `AnalyticsPage`

Responsibilities:

- Own filters.
- Own active tab.
- Fetch summary and active tab data.
- Coordinate drilldown drawer.

### `AnalyticsFilters`

Can share options and filter types with edit page.

### `AnalyticsSummary`

Shows top-level counts. Keep it compact and data-focused.

### `AnalyticsTable`

Reusable table component that takes columns based on active tab.

### `AnalyticsDrilldown`

Displays the occurrence rows behind an aggregate result.

## Implementation Chunks

### Chunk 1: Metrics Contract

- Define count types and filter types.
- Document expected API response shapes.
- Add test fixtures.

Acceptance:

- Everyone can tell whether a count means occurrences or unique names.

### Chunk 2: Summary Endpoint

- Add `/api/analytics/summary`.
- Support global filters.

Acceptance:

- Summary counts match fixture data.

### Chunk 3: Names Endpoint And Tab

- Add `/api/analytics/names`.
- Build Names tab.
- Add most/least sort.

Acceptance:

- All unique names appear.
- Sorting works both directions.

### Chunk 4: Location Endpoint And Tabs

- Add location grouping endpoint.
- Build Standard Works, Books, Chapters, and Verses tabs.

Acceptance:

- User can view counts at each hierarchy level.
- Scripture-order sorting and count sorting both work.

### Chunk 5: Combined Query Filters

- Add multi-filter support.
- Persist filters in URL.

Acceptance:

- User can filter to John and sort verses from most names per verse to least.
- User can filter by member and name simultaneously.

### Chunk 6: Drilldown

- Add drawer or linked table of matching occurrence rows.
- Reuse edit page occurrence row display.

Acceptance:

- Clicking an aggregate row shows the entries behind it.

### Chunk 7: Charts

Only add after the tables are stable.

Good first charts:

- Bar chart of top names.
- Bar chart of books by occurrence count.
- Stacked bar by divine person.

## Empty And Partial Data States

The app is early and may have little data. The analytics page should handle:

- No occurrences yet.
- Filters with no results.
- A standard work with no represented books.
- A book with only one represented verse.
- Names with equal counts.

## Performance Notes

The data volume will likely be small at first, but design queries correctly:

- Paginate name and verse tables.
- Index filter columns.
- Use backend aggregation.
- Avoid fetching all rows into the browser to count them.
- Cache reference lists because they change rarely.

## Acceptance Criteria For Analytics MVP

- User can see all unique names sorted by most common.
- User can flip to least common.
- User can see occurrence counts by standard work.
- User can see occurrence counts by scripture book inside a selected standard work.
- User can see occurrence counts by verse.
- User can filter to New Testament + John and sort verses by count descending.
- User can open a drilldown list for any aggregate row.

