# Scriptures Database Documentation

## Database Name
`scriptures`

This database is designed to track **names and titles used for members of the Godhead** across the five standard works:

- Old Testament
- New Testament
- Book of Mormon
- Doctrine and Covenants
- Pearl of Great Price

The database records:

- Each **unique name/title**
- Which **divine person** the name refers to
- The **verses** where the name appears
- A **cached occurrence count** for fast lookup

The schema is normalized and uses **triggers** to automatically maintain occurrence counts.

---

# Tables

## 1. `divine_person`

### Purpose
Stores the **members of the Godhead** that a name/title can refer to.

### Columns

| Column | Type | Description |
|------|------|-------------|
| id | INT (PK, AUTO_INCREMENT) | Unique identifier for the divine person |
| name | VARCHAR(100) UNIQUE | Name of the divine person |

### Prefilled Values

| id | name |
|---|---|
| 1 | Heavenly Father |
| 2 | Jesus Christ |
| 3 | Holy Ghost |

### Relationships
Referenced by:

- `name_title.divine_person_id`

---

# 2. `standard_work`

### Purpose
Stores the **five standard works of scripture**.

### Columns

| Column | Type | Description |
|------|------|-------------|
| id | INT (PK, AUTO_INCREMENT) | Unique identifier |
| name | VARCHAR(100) UNIQUE | Name of the standard work |

### Prefilled Values

| id | name |
|---|---|
| 1 | Old Testament |
| 2 | New Testament |
| 3 | Book of Mormon |
| 4 | Doctrine and Covenants |
| 5 | Pearl of Great Price |

### Relationships

Referenced by:

- `verse.standard_work_id`

---

# 3. `verse`

### Purpose
Stores **individual verse references**.

Each verse appears **once in the table** and can be associated with multiple name occurrences.

### Columns

| Column | Type | Description |
|------|------|-------------|
| id | INT (PK, AUTO_INCREMENT) | Unique verse identifier |
| standard_work_id | INT (FK) | Which standard work the verse belongs to |
| book | VARCHAR(100) | Name of the book (e.g., Genesis, John, Alma) |
| chapter | INT | Chapter number |
| verse | INT | Verse number |

### Constraints

**Foreign Key**  
`standard_work_id` → `standard_work(id)`

**Unique Constraint**  
`UNIQUE(standard_work_id, book, chapter, verse)`

This ensures the same verse cannot be inserted twice.

### Example

| id | standard_work_id | book | chapter | verse |
|---|---|---|---|---|
| 1 | 2 | John | 1 | 29 |

---

# 4. `name_title`

### Purpose
Stores **unique names/titles used for divine persons**.

Examples:
- Lamb of God
- Redeemer
- Holy One of Israel
- Father of Spirits

This table also stores a **cached count of occurrences**.

### Columns

| Column | Type | Description |
|------|------|-------------|
| id | INT (PK, AUTO_INCREMENT) | Unique identifier for the name |
| name | VARCHAR(255) UNIQUE | The name or title |
| divine_person_id | INT (FK) | Which divine person this name refers to |
| occurrence_count | INT | Cached count of how many verses contain this name |

### Constraints

**Foreign Key**
divine_person_id → divine_person(id)

### Notes

- `occurrence_count` is **automatically maintained by triggers**
- This value should **not normally be updated manually**

---

# 5. `name_occurrence`

### Purpose
Stores each **instance where a name appears in a verse**.

Each row represents:
(name) appears in (verse)

### Columns

| Column | Type | Description |
|------|------|-------------|
| id | INT (PK, AUTO_INCREMENT) | Unique identifier |
| name_id | INT (FK) | The name/title |
| verse_id | INT (FK) | The verse where the name appears |

### Constraints

**Foreign Keys**
name_id → name_title(id)
verse_id → verse(id)

**Unique Constraint**

UNIQUE(name_id, verse_id)


This prevents duplicate recordings of the same name appearing in the same verse.

---

# Triggers

Two triggers maintain the **occurrence_count** automatically.

---

## Trigger: `increment_name_count`

### Event
Runs **after a row is inserted** into `name_occurrence`.

### Purpose
Increases the `occurrence_count` for the associated name.

### Logic
```sql
AFTER INSERT ON name_occurrence
UPDATE name_title
SET occurrence_count = occurrence_count + 1
WHERE id = NEW.name_id
```


### Effect
Whenever a new name occurrence is recorded, the cached count increases automatically.

---

# Trigger: `decrement_name_count`

### Event
Runs **after a row is deleted** from `name_occurrence`.

### Purpose
Decreases the `occurrence_count`.

### Logic
```sql
AFTER DELETE ON name_occurrence
UPDATE name_title
SET occurrence_count = occurrence_count - 1
WHERE id = OLD.name_id
```


### Effect
If an occurrence is removed, the cached count stays accurate.

---

# Data Relationships

```text
divine_person
│
│ 1
│
▼
name_title
│
│ 1
│
▼
name_occurrence
▲
│
│ many
│
verse
│
│
▼
standard_work
```


Explanation:

- One **divine person** can have many **names**
- One **name** can appear in many **verses**
- One **verse** can contain multiple **names**

---

# Common Usage Patterns

## Insert a Verse
```sql
INSERT INTO verse (standard_work_id, book, chapter, verse)
VALUES (?, ?, ?, ?);
```

---

## Insert a Name
```sql
INSERT INTO name_title (name, divine_person_id)
VALUES (?, ?);
```

---

## Record a Name Occurrence
```sql
INSERT INTO name_occurrence (name_id, verse_id)
VALUES (?, ?);
```

The trigger will automatically update:

`name_title.occurrence_count`

---

# Common Queries

## Get Occurrence Count for Names
```sql
SELECT name, occurrence_count
FROM name_title;
```

---

## Get All Verses for a Name

```sql
SELECT
  sw.name AS standard_work,
  v.book,
  v.chapter,
  v.verse
FROM name_occurrence o
JOIN verse v ON o.verse_id = v.id
JOIN standard_work sw ON v.standard_work_id = sw.id
WHERE o.name_id = ?;
```

---

## Get All Names for a Divine Person

```sql
SELECT name, occurrence_count
FROM name_title
WHERE divine_person_id = ?;
```


---

# Important Implementation Notes

1. **Verses must exist before recording occurrences**

A verse must be inserted into `verse` before adding entries to `name_occurrence`.

2. **Names must exist before occurrences**

A name must exist in `name_title` before it can be referenced.

3. **Occurrence counts are automatic**

Applications should **not manually modify `occurrence_count`**.

4. **Duplicate occurrences are prevented**

The unique constraint in `name_occurrence` ensures a name can only be recorded once per verse.

---

# Summary

This database enables tracking of:

- Divine names and titles
- Their associated divine person
- The verses where they appear
- Counts of occurrences
- Distribution across the standard works

The schema ensures:

- Data integrity
- Fast counting queries
- No duplicate references
- Automatic maintenance of occurrence counts via triggers
