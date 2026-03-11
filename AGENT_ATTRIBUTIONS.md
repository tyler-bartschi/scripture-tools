# Agent Attributions

*March 6, 2026*
- Prompt: Set up App.tsx, api.ts, and db.ts to capture scripture name occurrences before schema refactor (pre-test mode).
- Changes: Built front-end submission flow, HTTP API validation/persistence logic, and basic DB pool using db.config.
- Notes: Entry reflects initial project foundation prior to today's database restructuring.

*March 7, 2026*
- Prompt: Refactor database module; move file, support auto table creation, and add test-config handling.
- Changes: Moved db.ts into server/database/, added schema creation/resets, introduced loadConfig(isTest) and test-mode drop/rebuild, plus db_test.config.
- Notes: Trigger creation now uses direct queries to avoid prepared statement limitations.

*March 10, 2026*
- Prompt: Move toast logic from App into Toaster provider and expose useToast hook.
- Changes: Added Toaster context/provider, relocated toast UI/logic, and wrapped App with the new provider while keeping the form logic intact.
- Notes: Hook now lets other components enqueue notifications without duplicating the timing or UI.

*March 10, 2026*
- Prompt: Split the form into a Record route and add navigation for record/analytics/ask paths.
- Changes: Added custom router, BrowserRouter/Routes in App.tsx, navigation buttons, placeholder analytics/ask content, and moved the form into `src/Record.tsx`.
- Notes: Root (`/`) is now redirected to Record and nav buttons highlight the active route while keeping existing styling.

*March 10, 2026*
- Prompt: Swap the custom router helper for `react-router-dom`.
- Changes: Deleted `src/router.tsx` and updated `src/App.tsx` to import `BrowserRouter`, `Routes`, and `Route` from `react-router-dom` while preserving the navbar and existing placeholders.
- Notes: The nav buttons continue to highlight the active route now that the official router drives the routing state.
