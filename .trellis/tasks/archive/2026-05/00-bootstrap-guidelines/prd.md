# Bootstrap Task: Fill Project Development Guidelines

**You (the AI) are running this task. The developer does not read this file.**

The developer just ran `trellis init` on this project for the first time.
`.trellis/` now exists with empty spec scaffolding, and this bootstrap task
exists under `.trellis/tasks/`. When they want to work on it, they should start
this task from a session that provides Trellis session identity.

**Your job**: help them populate `.trellis/spec/` with the team's real
coding conventions. Every future AI session — this project's
`trellis-implement` and `trellis-check` sub-agents — auto-loads spec files
listed in per-task jsonl manifests. Empty spec = sub-agents write generic
code. Real spec = sub-agents match the team's actual patterns.

Don't dump instructions. Open with a short greeting, figure out if the repo
has any existing convention docs (CLAUDE.md, .cursorrules, etc.), and drive
the rest conversationally.

---

## Status (update the checkboxes as you complete each item)

- [x] Fill backend guidelines
- [x] Fill frontend guidelines
- [x] Add code examples

## Current Repository Understanding

This bootstrap task is being reused to document the real development workflow
for `JioooBasement`.

Confirmed facts from repository inspection:

- The project is a single-repo personal static site, not a web application with
  a live backend server.
- `run_build.py` is the build entry point and delegates to `site_builder.build()`.
- `site_builder.py` is the Python static site generator. It reads HTML content
  from `content/sector-*`, parses `blog-*` metadata with BeautifulSoup, renders
  article pages through `templates/article.template`, and assembles the homepage
  through `templates/index.template`, `templates/partials/*`, and
  `data/homepage.json`.
- `output/` is generated build output and is ignored by Git.
- The deployed site is built in GitHub Actions by installing Python
  dependencies and running `python run_build.py`, then publishing `output/` to
  the `gh-pages` branch.
- Local verification should use the repository virtualenv:
  `./venv/bin/python run_build.py`. The system Python on this machine currently
  lacks `bs4`.
- There is no database, ORM, API server, React app, TypeScript setup, package
  manager manifest, lint config, or test suite in the current repository.
- Frontend behavior is implemented as plain JavaScript in `static/js/homepage.js`.
  It controls depth indicator layout, scroll restoration, section positioning,
  side labels, drag-scroll behavior, and the snow canvas effect.
- Styling is plain CSS under `static/css/`, with shared variables and layout
  rules in `main.css`, homepage-specific additions in `homepage.css`, and article
  typography in `article.css`.
- Content articles are complete HTML documents containing `meta name="blog-*"`
  fields; section-level custom content lives in optional
  `content/sector-*/section.html` files.

Initial scope for this task:

- Replace generic Trellis backend/frontend placeholders with conventions that
  match this repository's static-site generator and plain frontend.
- Mark non-applicable areas explicitly, especially database, API error handling,
  React components, hooks, TypeScript, and global state management.
- Document direct HTML article authoring as the continuing content workflow;
  Markdown/frontmatter migration is not part of the current direction.
- Include concrete file references and examples from the current repository.
- Keep the documentation practical for future AI sessions that add content,
  adjust homepage layout, or change the build pipeline.
- Page design work must not be pre-classified as either "preserve the current
  design" or "bold redesign". Each page-adjustment task should first follow the
  user's current intent; small incremental edits and large redesigns are both
  valid when requested.
- Architecture modularization should primarily address: centralizing all
  configurable site data, supporting multi-part builds, and controlling site
  configuration from a single file.
- Future configuration architecture should introduce a new top-level control
  file, such as `data/site.json` or `site.config.json`, instead of continuing to
  overload `data/homepage.json`.
- "Multi-part builds" means modularizing the current `site_builder.py` build
  logic into clearer build responsibilities, not introducing a broad plugin
  system or independent deploy targets by default.
- After page-adjustment or build-system changes, browser verification is
  required in addition to running the static site build.

Open product/workflow decisions:

- Future changes should optimize for three primary workflows: adjusting pages,
  writing articles, and modularizing the data/code architecture.
- Project-specific Trellis specs should be written in Chinese while preserving
  necessary English technical terms.
- Trellis / Codex project workflow files should be committed to GitHub after
  bootstrap so work process can stay synchronized across machines.

---

## Spec files to populate


### Backend guidelines

| File | What to document |
|------|------------------|
| `.trellis/spec/backend/directory-structure.md` | Where different file types go (routes, services, utils) |
| `.trellis/spec/backend/database-guidelines.md` | ORM, migrations, query patterns, naming conventions |
| `.trellis/spec/backend/error-handling.md` | How errors are caught, logged, and returned |
| `.trellis/spec/backend/logging-guidelines.md` | Log levels, format, what to log |
| `.trellis/spec/backend/quality-guidelines.md` | Code review standards, testing requirements |


### Frontend guidelines

| File | What to document |
|------|------------------|
| `.trellis/spec/frontend/directory-structure.md` | Component/page/hook organization |
| `.trellis/spec/frontend/component-guidelines.md` | Component patterns, props conventions |
| `.trellis/spec/frontend/hook-guidelines.md` | Custom hook naming, patterns |
| `.trellis/spec/frontend/state-management.md` | State library, patterns, what goes where |
| `.trellis/spec/frontend/type-safety.md` | TypeScript conventions, type organization |
| `.trellis/spec/frontend/quality-guidelines.md` | Linting, testing, accessibility |


### Thinking guides (already populated)

`.trellis/spec/guides/` contains general thinking guides pre-filled with
best practices. Customize only if something clearly doesn't fit this project.

---

## How to fill the spec

### Step 1: Import from existing convention files first (preferred)

Search the repo for existing convention docs. If any exist, read them and
extract the relevant rules into the matching `.trellis/spec/` files —
usually much faster than documenting from scratch.

| File / Directory | Tool |
|------|------|
| `CLAUDE.md` / `CLAUDE.local.md` | Claude Code |
| `AGENTS.md` | Codex / Claude Code / agent-compatible tools |
| `.cursorrules` | Cursor |
| `.cursor/rules/*.mdc` | Cursor (rules directory) |
| `.windsurfrules` | Windsurf |
| `.clinerules` | Cline |
| `.roomodes` | Roo Code |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `.vscode/settings.json` → `github.copilot.chat.codeGeneration.instructions` | VS Code Copilot |
| `CONVENTIONS.md` / `.aider.conf.yml` | aider |
| `CONTRIBUTING.md` | General project conventions |
| `.editorconfig` | Editor formatting rules |

### Step 2: Analyze the codebase for anything not covered by existing docs

Scan real code to discover patterns. Before writing each spec file:
- Find 2-3 real examples of each pattern in the codebase.
- Reference real file paths (not hypothetical ones).
- Document anti-patterns the team clearly avoids.

### Step 3: Document reality, not ideals

**Critical**: write what the code *actually does*, not what it should do.
Sub-agents match the spec, so aspirational patterns that don't exist in the
codebase will cause sub-agents to write code that looks out of place.

If the team has known tech debt, document the current state — improvement
is a separate conversation, not a bootstrap concern.

---

## Quick explainer of the runtime (share when they ask "why do we need spec at all")

- Every AI coding task spawns two sub-agents: `trellis-implement` (writes
  code) and `trellis-check` (verifies quality).
- Each task has `implement.jsonl` / `check.jsonl` manifests listing which
  spec files to load.
- The platform hook auto-injects those spec files + the task's `prd.md`
  into every sub-agent prompt, so the sub-agent codes/reviews per team
  conventions without anyone pasting them manually.
- Source of truth: `.trellis/spec/`. That's why filling it well now pays
  off forever.

---

## Completion

When the developer confirms the checklist items above are done with real
examples (not placeholders), guide them to run:

```bash
python3 ./.trellis/scripts/task.py finish
python3 ./.trellis/scripts/task.py archive 00-bootstrap-guidelines
```

After archive, every new developer who joins this project will get a
`00-join-<slug>` onboarding task instead of this bootstrap task.

---

## Suggested opening line

"Welcome to Trellis! Your init just set me up to help you fill the project
spec — a one-time setup so every future AI session follows the team's
conventions instead of writing generic code. Before we start, do you have
any existing convention docs (CLAUDE.md, .cursorrules, CONTRIBUTING.md,
etc.) I can pull from, or should I scan the codebase from scratch?"
