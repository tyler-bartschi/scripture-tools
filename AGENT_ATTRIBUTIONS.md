# Agent Attributions

*March 6, 2026*
- Prompt: Set up App.tsx, api.ts, and db.ts to capture scripture name occurrences before schema refactor (pre-test mode).
- Changes: Built front-end submission flow, HTTP API validation/persistence logic, and basic DB pool using db.config.
- Notes: Entry reflects initial project foundation prior to today's database restructuring.

*March 7, 2026*
- Prompt: Refactor database module; move file, support auto table creation, and add test-config handling.
- Changes: Moved db.ts into server/database/, added schema creation/resets, introduced loadConfig(isTest) and test-mode drop/rebuild, plus db_test.config.
- Notes: Trigger creation now uses direct queries to avoid prepared statement limitations.
