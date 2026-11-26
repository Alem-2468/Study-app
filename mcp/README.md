# Study app MCP server

Lets Claude (Claude Code / Claude desktop) read and write the study app's live database.

**Tools:** get_study_rules, get_overview, list_materials, read_material, search_materials,
get_schedule, save_material, create_course, create_exam, update_exam, create_assignment,
complete_assignment, add_study_session. There are no delete tools; delete things in the app.

## Setup
1. `cd mcp && npm install`
2. Put the Turso database values in `~/.study-app-mcp/db.env` (outside this repo, never commit it):
   ```
   TursoURL=libsql://...
   turso_token=...
   ```
   Get them from https://app.turso.tech → the database → Connect (create a token).
   Vercel marks these as sensitive, so `vercel env pull` can't fetch them.
3. Register: `claude mcp add --scope user study-app -- node D:/study-planner/mcp/server.mjs`

Override the env file path with `STUDY_APP_DB_ENV`.
