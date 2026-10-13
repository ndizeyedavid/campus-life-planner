<p align="center">
  <img src="assets/favicon.svg" alt="Campus Life Planner logo" width="104" />
</p>

<h1 align="center">Campus Life Planner</h1>

<p align="center">
  <em>Task management tool is built for students with accessibility and optimization in mind plus an application of all concepts we learned in the FWD course.</em>
</p>

<p align="center">
  <a href="https://ndizeyedavid.github.io/campus-life-planner"><img alt="Live demo" src="https://img.shields.io/badge/live%20demo-ndizeyedavid.github.io%2Fcampus--life--planner-2ea44f"></a>
  <img alt="Theme: Campus Life Planner" src="https://img.shields.io/badge/theme-Campus%20Life%20Planner-111111">
  <img alt="Built with HTML, CSS and JavaScript" src="https://img.shields.io/badge/stack-%20HTML%20%C2%B7%20CSS%20%C2%B7%20JS-0f172a">
</p>

<p align="center">
  <a href="#overview">Overview</a> &nbsp;&middot;&nbsp;
  <a href="#quick-start">Quick start</a> &nbsp;&middot;&nbsp;
  <a href="#feature-highlights">Features</a> &nbsp;&middot;&nbsp;
  <a href="#regex-catalog">Regex catalog</a> &nbsp;&middot;&nbsp;
  <a href="#keyboard-map">Keyboard map</a> &nbsp;&middot;&nbsp;
  <a href="#accessibility-notes">Accessibility</a> &nbsp;&middot;&nbsp;
  <a href="#testing">Testing</a> &nbsp;&middot;&nbsp;
  <a href="#contact">Contact</a>
</p>

---

## Contents

1. [Overview](#overview)
2. [Live demo, repository and demo video](#live-demo-repository-and-demo-video)
3. [Feature highlights](#feature-highlights)
4. [The six pages](#the-six-pages)
5. [Quick start](#quick-start)
6. [Project structure](#project-structure)
7. [Architecture](#architecture)
8. [Data model](#data-model)
9. [Regex catalog](#regex-catalog)
10. [Sorting, search and highlighting](#sorting-search-and-highlighting)
11. [Dashboard, stats and the weekly target](#dashboard-stats-and-the-weekly-target)
12. [Units and duration conversion](#units-and-duration-conversion)
13. [Persistence, import and export](#persistence-import-and-export)
14. [Accessibility notes](#accessibility-notes)
15. [Keyboard map](#keyboard-map)
16. [Responsive design](#responsive-design)
17. [Motion and animation](#motion-and-animation)
18. [Testing](#testing)
19. [Milestones: where each one lives](#milestones-where-each-one-lives)
20. [Stretch features](#stretch-features)
21. [Browser support and notes for reviewers](#browser-support-and-notes-for-reviewers)
22. [Acknowledgements](#acknowledgements)
23. [Academic integrity and individual work](#academic-integrity-and-individual-work)
24. [Contact](#contact)

---

## Overview

**Campus Life Planner** is a small, fast, offline-capable web app for students who need one place to keep track of assignments, study sessions, club activities and campus errands. Every record carries a **title**, a **category**, a **duration in minutes** and a **due date**, enough to answer the three questions that actually matter:

- What is due next?
- How much time have I planned this week?
- Am I over my weekly target?

This repository is the **Campus Life Planner** theme of the _Summative Assignment - Building Responsive UI_. It is a multi-page static app written in plain HTML, CSS and JavaScript. There is **no framework, no bundler and no install step**: you clone it, serve the folder, and it runs.

|                 |                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Theme**       | Campus Life Planner (tasks &amp; events, durations, tags/categories, search)                                                                 |
| **Stack**       | Vanilla HTML5, CSS3 (custom properties, Grid + Flexbox), ES5-compatible JS in IIFE modules                                                   |
| **Third-party** | [Chart.js](https://www.chartjs.org/) (7-day chart only), Font Awesome icons, Google Fonts (Inter); all via CDN, all with a graceful fallback |
| **Storage**     | `localStorage` for records and settings, IndexedDB for optional image attachments                                                            |
| **Offline**     | Optional service worker cache, switchable from Settings                                                                                      |
| **Deployment**  | GH Pages: <https://ndizeyedavid.github.io/campus-life-planner>                                                                               |

---

## Live demo, repository and demo video

| Resource                | Link                                                         |
| ----------------------- | ------------------------------------------------------------ |
| Live app (GitHub Pages) | <https://ndizeyedavid.github.io/campus-life-planner>         |
| Source repository       | <https://github.com/ndizeyedavid/campus-life-planner>        |
| Issues / feedback       | <https://github.com/ndizeyedavid/campus-life-planner/issues> |
| Demo video              | <https://youtu.be/S1uWHjhluTI?list=RDS1uWHjhluTI>            |

The demo video walks through: keyboard-only navigation, the regex edge cases (invalid pattern handling, duplicate-word back-reference, time-token lookbehind), a JSON export &rarr; edit &rarr; import round trip, and the responsive layout at phone, tablet and desktop widths.

---

## Feature highlights

**Planning**

- Six real pages, each with its own URL and a single top-level heading: Dashboard, Board, Table, Calendar, About, Settings.
- Add, edit and delete tasks from a dialog form with inline, field-level validation.
- Kanban **Board** with HTML5 drag and drop, touch drag, and a keyboard/touch-friendly **Move to** button on every card.
- **Table** view with sortable columns, live regex search and `<mark>` highlighting.
- **Calendar** month grid driven by due dates, with a flat text list of the same month underneath for screen readers.
- Optional image attachment per task (stored locally in IndexedDB, never uploaded).

**Insight**

- Six dashboard metrics: total tasks, completed, planned time, top category, overdue, due this week.
- A **last-7-days trend chart** (Chart.js) with a pure CSS/JS bar fallback when the CDN is unavailable, plus a screen-reader list of the same numbers.
- A **weekly target / cap meter** with remaining-or-overage, announced politely while under target and assertively once it is exceeded.

**Data & power features**

- Live **regular-expression search** with a safe compiler, invalid-pattern recovery, a match counter and case-insensitivity by default.
- Auto-save to `localStorage` on every change; survives reloads and restarts.
- **JSON export / import** with structural validation before anything is replaced, plus CSV export and `.ics` calendar export.
- Editable **categories** (tags), **minutes &harr; hours** display, and a **Google Calendar** hand-off per task.

**Craft**

- Mobile-first responsive layout across four breakpoints, dark/light theme with persisted choice, a five-step first-run setup, and `prefers-reduced-motion` support.
- No dead controls: every interactive element is reachable, labelled and operable by keyboard.

---

## The six pages

| Page          | File            | What it does                                                                 |
| ------------- | --------------- | ---------------------------------------------------------------------------- |
| **Dashboard** | `index.html`    | Six stat tiles, 7-day trend chart, weekly-target meter, upcoming list        |
| **Board**     | `board.html`    | To Do / In Progress / Done columns with drag and drop                        |
| **Table**     | `table.html`    | Sortable records table with regex search, highlighting and inline actions    |
| **Calendar**  | `calendar.html` | Month grid + accessible list of the same tasks, export to `.ics`             |
| **About**     | `about.html`    | Purpose, feature list, regex catalog, keyboard map, accessibility notes      |
| **Settings**  | `settings.html` | Profile, units, weekly target, theme, categories, images, data import/export |

---

## Quick start

This is a static site, so you can open `index.html` from the file system or install `Live Server` vscode extension and serve it over http so that the service worker and the seed fetch and module loading function properly.

```bash
# 1. Clone
git clone https://github.com/ndizeyedavid/campus-life-planner.git
cd campus-life-planner

# 2. Run the index.html file normally by click on it, or
./index.html
```

**Requirements:** any current browser (Chrome, Edge, Firefox, Safari) and a static file server. Nothing to install, no `npm install`, no compile step.

**First run:** a five-step setup asks for a display name, theme, planning unit, weekly target and whether to start with 14 sample tasks or an empty planner. Every step is skippable (`Skip for now` or `Esc`) and editable later in Settings &rarr; Profile. If you skip the setup and have never stored anything, the app seeds itself with the 14 sample tasks.

---

## Project structure

```
campus-life-planner/
├── index.html              # Dashboard (stats, trend chart, weekly target, upcoming)
├── board.html              # Kanban board: drag & drop + Move to button
├── table.html              # Records table: sorting, regex search, highlight
├── calendar.html           # Month grid + accessible list, .ics export
├── about.html              # Purpose, features, regex catalog, keyboard map, a11y
├── settings.html           # Profile, units, target, categories, images, data
├── seed.json               # 19 sample records with deliberate edge cases
├── manifest.webmanifest    # PWA manifest (installable, standalone)
├── sw.js                   # Service worker: offline shell cache (toggleable)
├── css/
│   └── main.css            # Design tokens, layout, components, breakpoints
├── js/
│   ├── storage.js          # localStorage / IndexedDB-free persistence, JSON+CSV+ICS I/O
│   ├── validators.js       # All regex validation rules + sanitising helpers
│   ├── search.js           # Safe regex compiler, filtering, escaping, <mark> highlight
│   ├── state.js            # Records, settings, categories, seed data, pub/sub
│   ├── ui.js               # Rendering, sorting, dashboard, modals, focus management
│   ├── images.js           # IndexedDB image blobs + metadata
│   ├── calendar.js         # Date helpers and .ics / Google Calendar URL builders
│   ├── onboarding.js       # First-run setup flow (focus trap, live announcements)
│   └── app.js              # Event wiring, global keyboard map, service worker
├── assets/
│   └── favicon.svg         # App mark used in the sidebar, boot splash and manifest
└── reports/                # Course report artefacts
```

Each script is a self-executing function that publishes one namespace object on `window.App` (`App.Storage`, `App.Validators`, `App.Search`, `App.State`, `App.UI`, `App.Images`, `App.Calendar`, `App.Onboarding`). Load order in every page is `storage &rarr; images &rarr; validators &rarr; search &rarr; onboarding &rarr; calendar &rarr; state &rarr; ui &rarr; app`.

---

## Architecture

| Module             | Responsibility                                                                                              | Depends on                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `js/storage.js`    | Read/write `localStorage`, settings &amp; theme keys, import validation, JSON/CSV export, file reading      | &mdash;                                    |
| `js/validators.js` | Every regex rule, field tests, `sanitizeText`, `escapeRegExp`                                               | &mdash;                                    |
| `js/search.js`     | `compileRegex` (try/catch safe), filtering, match counting, HTML escaping, `<mark>` highlighting            | &mdash;                                    |
| `js/state.js`      | Single source of truth: records, settings, categories, seed data, add/update/delete/patch, subscribe/notify | storage, validators                        |
| `js/ui.js`         | All DOM rendering from dashboard, board, table, calendar, settings, dialogs, live regions all to focus trap | state, search, validators, storage, images |
| `js/app.js`        | Event wiring per page, global shortcuts, boot splash, theme, service worker registration                    | everything else                            |
| `js/images.js`     | IndexedDB store for task images (`put`, `getBlob`, `getMeta`, `pruneOrphans`)                               | &mdash;                                    |
| `js/calendar.js`   | Date arithmetic, ISO stamps, `.ics` serialisation, Google Calendar template URL                             | &mdash;                                    |
| `js/onboarding.js` | First-run wizard: validation, preview, focus trap, persistence of the profile                               | storage, validators                        |

**Data flow:** every mutation goes through `State` &rarr; `State` persists to `localStorage` &rarr; `State` emits to subscribers &rarr; `UI.render()` re-renders the page and pushes an announcement to the live region. Views never write to storage directly, and storage never touches the DOM.

**Error handling:** `try/catch` around every `localStorage` and `fetch` call, a `try/catch` inside the regex compiler and around `new RegExp` in the search box, a promise-catch chain on service worker registration, a top-level boot splash that reports loading failures through `role="status"`, and user-facing error messages instead of silent failures. A failed write is logged once, never swallowed silently.

---

## Data model

One record per task. Ids are generated as `tsk_0001`, `tsk_0002`, &hellip;

```json
{
  "id": "tsk_0001",
  "title": "Study for midterm exam",
  "duration": 120,
  "category": "Academics",
  "dueDate": "2026-11-04",
  "status": "in-progress",
  "priority": "high",
  "notes": "Chapters 4-7, room B12",
  "imageId": null,
  "createdAt": "2026-10-08T09:12:44.201Z",
  "updatedAt": "2026-10-12T18:03:11.774Z"
}
```

| Field                     | Type            | Rules                                                                                                                |
| ------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`                      | string          | Unique, `tsk_` + 4-digit sequence. Enforced on import; duplicates are rejected.                                      |
| `title`                   | string          | 2&ndash;80 chars, no leading/trailing space, no double spaces or tabs, no repeated word, must not end on a stop word |
| `duration`                | number          | Minutes, `0` or positive, up to 2 decimals, no leading zeros                                                         |
| `category`                | string          | Letters, single spaces and hyphens only. Editable list in Settings.                                                  |
| `dueDate`                 | string          | `YYYY-MM-DD`, and the date must really exist (no `2026-02-30`)                                                       |
| `status`                  | string          | `todo` &middot; `in-progress` &middot; `done`                                                                        |
| `priority`                | string          | `low` &middot; `medium` &middot; `high`                                                                              |
| `notes`                   | string          | Free text, optional                                                                                                  |
| `imageId`                 | string \| null  | Key into the IndexedDB image store                                                                                   |
| `createdAt` / `updatedAt` | ISO 8601 string | Set on create; `updatedAt` refreshed on every edit, move or status change                                            |

### localStorage keys

| Key                               | Contents                                       |
| --------------------------------- | ---------------------------------------------- |
| `campus-life-planner:data`        | The records array                              |
| `campus-life-planner:settings`    | `unit`, `weeklyTarget`, `categories`           |
| `campus-life-planner:theme`       | `light` or `dark`                              |
| `campus-life-planner:sidebar`     | `expanded` or `collapsed`                      |
| `campus-life-planner:seed-choice` | `seeded` or `empty`                            |
| `campus-life-planner:profile`     | Onboarding profile (name, theme, unit, target) |
| `campus-life-planner:onboarded`   | `1` once setup is finished or skipped          |

Images live in IndexedDB (`campus-life-planner-images`), not `localStorage`, so the 5&nbsp;MB string quota is never hit.

---

## Regex catalog

### Validation rules

Nine patterns guard the form. Six are structural; three are advanced (back-reference, negative lookahead, lookbehind).

|   # | Rule                                                  | Pattern                                                                                  | Why                                                                                                                 |
| --: | ----------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
|   1 | Title shape                                           | `/^\S(?:.*\S)?$/`                                                                        | Forbids a leading or trailing space, allows everything else                                                         |
|   2 | Messy whitespace                                      | `/\s{2,}\|[\t\n\r\f\v]/`                                                                 | Catches double spaces, tabs, newlines and form feeds inside a title                                                 |
|   3 | **Duplicate word** &mdash; _back-reference_           | `/\b(\w+)\s+\1\b/i`                                                                      | `\1` repeats the captured word, so `Study study` and `the the` are rejected                                         |
|   4 | **Dangling preposition** &mdash; _negative lookahead_ | `/^(?!.*\b(?:for\|to\|with\|and\|or\|the\|a\|an\|of\|in\|on\|at\|by\|is)\s*$)[\s\S]+$/i` | Rejects a title that stops on a preposition, e.g. `Prepare notes for`                                               |
|   5 | **Time token** &mdash; _lookbehind + lookahead_       | `/(?<!\d)\d{2}:\d{2}(?!\d)/`                                                             | Finds `16:00` without matching inside `116:003`; a `\b\d{2}:\d{2}\b` fallback is used on engines without lookbehind |
|   6 | Duration (minutes)                                    | `/^(0\|[1-9]\d*)(\.\d{1,2})?$/`                                                          | Zero or positive, at most two decimals, no leading zeros, no negatives                                              |
|   7 | Due date                                              | `/^\d{4}-(0[1-9]\|1[0-2])-(0[1-9]\|[12]\d\|3[01])$/`                                     | `YYYY-MM-DD` with a real month and day range (a second check rejects `2026-02-30`)                                  |
|   8 | Category / tag                                        | `/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/`                                                        | Letters, single spaces and hyphens only                                                                             |
|   9 | Display name (setup)                                  | `/^[^\p{C}]{1,24}$/u`                                                                    | 1&ndash;24 characters, no control or format characters                                                              |
|  10 | Weekly target                                         | `/^(0\|[1-9]\d*)$/`                                                                      | Whole, non-negative minutes with no leading zeros                                                                   |

Support helpers: `sanitizeText` collapses whitespace and trims; `escapeRegExp` (`/[.*+?^${}()\|[\]\\]/g`) escapes user text before it is embedded in a generated pattern; `isRealDate` verifies the parsed calendar date.

### Search recipes

The search box accepts any JavaScript regular expression. It is **case-insensitive by default** — press the **Match case** button beside the input to switch to case-sensitive, or load `table.html?ci=1&q=…` to start case-sensitive. Patterns are compiled inside `try/catch`, so a broken pattern shows an inline error and never breaks the page.

| Goal                              | Pattern                    | What it does with the sample data                                      |
| --------------------------------- | -------------------------- | ---------------------------------------------------------------------- |
| Beverage / errands                | `coffee\|tea`              | `Buy coffee with friends`                                              |
| Any time token in a title or note | `\d{2}:\d{2}`              | `Club meeting at 16:00`, `catch up at 16:00`                           |
| Time token, strictly bounded      | `(?<!\d)\d{2}:\d{2}(?!\d)` | Same, but never inside a longer digit run                              |
| Duplicate words (quality check)   | `\b(\w+)\s+\1\b`           | Flags the note `duplicate-word edge case: movie movie`                 |
| Tasks starting with a tag         | `^@`                       | Matches `@lab`, `@group` &hellip; at the start of a title              |
| Long sessions only                | `^(120\|180\|240)$`        | 2, 3 and 4 hour blocks in the duration column                          |
| Exact category                    | `^Academics$`              | Whole-field category match                                             |
| Anything due this month           | `^2026-1[12]-`             | December 2026 due dates                                                |
| Overdue-looking notes             | `overdue\|due`             | Matches the word in notes and titles                                   |
| Quoted strings inside titles      | `"[^"]*"`                  | `Group "project" sync, room 3`                                         |
| Invalid-pattern demo              | `[a-`                      | Shows `Invalid regular expression \| …` and keeps the last valid table |

---

## Sorting, search and highlighting

- **Sortable columns:** Title, Category, Duration, Due date, Status. Clicking a header (or tabbing to it and pressing <kbd>Enter</kbd>/<kbd>Space</kbd>) sorts ascending, then descending. Numeric columns compare numerically; text columns use `localeCompare` with `{ numeric: true, sensitivity: "base" }`, so `Task 2` sorts before `Task 10`.
- **`aria-sort`** is written onto the active `<th>` as `ascending` / `descending` and removed from the others, and each sort is announced politely ("Sorted by duration, ascending.").
- **Search runs on every keystroke** across title, category, due date, status, priority, notes and duration.
- **Highlighting** wraps matches in `<mark>` after HTML-escaping both the matched text and the surrounding text, so a pattern like `<img` renders as text and can never inject markup. Empty matches (`""`) advance `lastIndex` instead of looping forever.
- **Status line** reports `12 of 14 records · 7 matches`, or an inline `Invalid regular expression …` message with `aria-invalid="true"` on the input and an assertive announcement.
- **Match case** is a toggle button beside the search box. It is a real `aria-pressed` switch, so its state is announced and the button turns accent-coloured when case-sensitive search is on. Search is case-**insensitive** by default.
- The pattern and case flag are mirrored into the URL (`?q=…&ci=1`), so the Quick find box in the sidebar can deep-link into a filtered table and the state survives a reload or a shared link.

---

## Dashboard, stats and the weekly target

| Metric        | Definition                                                                          |
| ------------- | ----------------------------------------------------------------------------------- |
| Total tasks   | Number of records                                                                   |
| Completed     | `status === "done"`, shown as a count and a percentage                              |
| Planned time  | Sum of every `duration`, rendered in the chosen unit                                |
| Top category  | Category with the most records (ties broken alphabetically)                         |
| Overdue       | Not done and `dueDate` earlier than today                                           |
| Due this week | `dueDate` between today and today + 7 days                                          |
| Last 7 days   | Bar chart of tasks **created** per day, with a text summary list for screen readers |

The **weekly target** sums the duration of tasks created since the start of the current week and compares it with `weeklyTarget`:

- under target &rarr; a progress bar plus _"N min left to plan"_, announced with `role="status"` / `aria-live="polite"`;
- over target &rarr; the bar switches to the over-target style and the message becomes _"Over target by N min"_, announced with `aria-live="assertive"` so it interrupts;
- target `0` &rarr; the card explains that no target is set and links to Settings;
- identical consecutive messages are not re-announced, so screen readers are not flooded on every render.

---

## Units and duration conversion

Settings &rarr; Units switches every duration in the app between **minutes** and **hours** (`1 h = 60 min`, rounded to one decimal place). Stored durations always stay in minutes, so switching units never changes the underlying data, the totals or the weekly-target maths. The choice is saved and applied immediately across all six pages.

---

## Persistence, import and export

**Automatic saving.** Every add, edit, delete, status move, category change and settings change writes straight to `localStorage` and re-renders. Closing the tab mid-edit loses nothing.

**JSON export.** _Export JSON_ (sidebar or Settings &rarr; Your data) downloads `campus-life-planner-YYYYMMDD.json` containing `{ records: [...], settings: { unit, weeklyTarget, categories } }`, so a backup restores both data and preferences.

**JSON import.** Importing accepts either a bare array of records or `{ records, settings }`. Before anything is replaced, every record is checked:

| Check                                                            | Rejected example                    |
| ---------------------------------------------------------------- | ----------------------------------- |
| Object shape                                                     | `42`, `"task"`, `[1,2,3]`           |
| Required fields present                                          | a record without `updatedAt`        |
| `id` is a non-empty **string**                                   | `{ "id": 7 }`                       |
| `id` is **unique**                                               | two records with `"id": "tsk_0001"` |
| `title` is a non-empty string                                    | `"title": "   "`                    |
| `duration` is a finite number &ge; 0                             | `"duration": "abc"`, `-5`           |
| `dueDate` matches `YYYY-MM-DD`                                   | `"2026-13-40"`                      |
| `status` is one of the three known values                        | `"status": "archived"`              |
| `settings` is an object, `settings.categories` is a string array | `"settings": []`                    |

Validation collects **all** errors, shows the first ten in the toast/alert, and leaves existing data untouched if anything fails. Only after a clean pass are records normalised (whitespace collapsed, unknown enum values defaulted, missing timestamps filled) and committed in one atomic write. Image ids that no longer exist on the device are reported and pruned rather than imported as broken references.

**CSV export.** RFC 4180 style: fields containing `"`, `,`, CR or LF are wrapped in quotes and inner quotes are doubled. The seed data includes `Group "project" sync, room 3` specifically to prove it.

**Calendar export.** `.ics` download (with an _Include completed tasks_ option that exports finished tasks as cancelled events) or copy-to-clipboard, plus a per-task button that opens Google Calendar's editor pre-filled.

---

## Accessibility notes

Structure and landmarks

- Every page: a `Skip to main content` link as the first focusable element, one `<h1>`, ordered headings below it, and `header` / `nav` / `main` / `section` / `footer` landmarks.
- `main` has `tabindex="-1"` so the skip link moves real focus, not just the scroll position.
- Navigation is plain links, so it works before JavaScript runs, and the current page is marked with `aria-current="page"`.

Forms and errors

- Every input has a bound `<label for>`; hints and errors are wired with `aria-describedby`.
- Invalid fields get `aria-invalid="true"`, an inline message with `role="alert"`, and focus moves to the first bad field on submit. Messages are written in plain language ("Duration must be 0 or a positive number with up to 2 decimals (no leading zeros).") rather than dumping a regex at the user.
- The required marker is `aria-hidden` and the requirement is carried by `required` / `aria-required`.

Live regions

- `#liveStatus` (`role="status"`, `aria-live="polite"`) reports saves, moves, sorts, search results and target updates.
- `#liveAlert` (`role="alert"`, `aria-live="assertive"`) is reserved for invalid regular expressions, failed imports and exceeding the weekly target.
- Messages are de-duplicated so a region is not re-announced on every render.

Dialogs and focus

- The task dialog uses `role="dialog" aria-modal="true"`, the delete confirmation uses `role="alertdialog"` with an `aria-describedby` warning.
- Focus is trapped inside an open dialog, restored to the trigger on close, and `Esc` closes the topmost layer.
- Delete is always confirmed; the confirmation names the record being removed.

Non-visual equivalents

- The 7-day chart is a `<canvas>`, so the same values are published as a real `<ul>` in a live region.
- Sortable headers expose `aria-sort`; the scrollable table is a focusable `role="region"` with a caption.
- Priority dots and due-date colours always have a text equivalent (`High priority`, `Overdue`) &mdash; colour is never the only signal.
- Icon-only buttons (edit, delete, add to calendar, menu, theme) all carry `sr-only` text or an `aria-label`.

Motion, colour and zoom

- All transitions are short and purposeful, and every animation is disabled under `prefers-reduced-motion: reduce` (including the boot splash, which is removed immediately).
- One accent colour (`#fc4f24`) on a neutral scale, with body text at 15&ndash;16&nbsp;px and &ge; 4.5:1 contrast in both themes; the dark theme is a full token swap, not a filter.
- The layout reflows rather than zooming, so 200% browser zoom and text-only zoom stay usable.

---

## Keyboard map

| Key                                                 | Action                                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd>    | Move through every interactive element in DOM order                                        |
| <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>K</kbd>       | Jump to Quick find from anywhere, including while typing in a field                        |
| <kbd>/</kbd>                                        | Same shortcut, when not typing                                                             |
| <kbd>N</kbd>                                        | Open the new-task dialog (ignored while typing in a field)                                 |
| <kbd>Enter</kbd>                                    | Submit the task form; activate a sort button or a board action                             |
| <kbd>Space</kbd>                                    | Activate a focused button or link                                                          |
| <kbd>Esc</kbd>                                      | Close the confirmation, then the task dialog, then the mobile drawer; skip first-run setup |
| <kbd>Enter</kbd> in first-run setup                 | Go to the next step                                                                        |
| <kbd>Tab</kbd> inside a dialog                      | Focus cycles inside the dialog until it is dismissed                                       |
| <kbd>Enter</kbd> on a board card's <em>Move to</em> | Advance the task to the next column (To Do &rarr; In Progress &rarr; Done &rarr; To Do)    |

Nothing is drag-only: every board action that a mouse can perform with a drag also has a button, and the result is announced in a live region. The sidebar hint automatically reads <kbd>Ctrl K</kbd> or <kbd>&#8984;K</kbd> depending on the platform.

---

## Responsive design

Mobile-first: the base stylesheet targets a ~360&nbsp;px phone, and layout is added as space appears. No framework, no grid library &mdash; CSS Grid for the card and stat layouts, Flexbox for the shell, board and toolbars.

| Breakpoint                          | What changes                                                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Base (mobile, &lt; 640&nbsp;px)** | Single column. Sidebar is an off-canvas drawer with a backdrop; stats stack; board columns scroll vertically; settings cards stack; table scrolls horizontally inside a labelled region      |
| **&ge; 640&nbsp;px**                | Stat grid becomes 2 columns, form fields pair up, larger page padding, taller calendar cells                                                                                                 |
| **&ge; 768&nbsp;px** (tablet)       | Sidebar becomes a sticky column, drawer button and backdrop are removed, board columns lay out in a horizontal scroll-snap row, dashboard row goes side by side, stat grid becomes 3 columns |
| **&ge; 1024&nbsp;px** (desktop)     | Wider sidebar (320&nbsp;px), 2-column settings grid, board columns share the width equally, larger headings and stat values                                                                  |
| **Collapsed sidebar**               | A toggle turns the sidebar into a 76&nbsp;px icon rail; labels are clipped, not removed, so their accessible names survive. The choice is remembered.                                        |

The table is wrapped in a focusable `role="region"` with `aria-labelledby`, so a keyboard user can scroll it even though it overflows on a phone.

---

## Motion and animation

- Boot splash: a thin accent bar slides while state loads, with a `role="status"` line that reports real progress, then fades out in 280&nbsp;ms.
- Dialogs scale and fade in; the backdrop fades; toasts slide up and auto-dismiss.
- Board cards lift on hover/drag, drop targets highlight, and the trend chart animates its bars in.
- Focus rings are visible on every focusable element and are never removed without a replacement.
- Under `prefers-reduced-motion: reduce` all of the above are switched off.

---

## Testing

To test, open `index.html` in the browser and it runs the whole project without the need of installing or configuring anything

## Milestones: where each one lives

| Milestone                                   | Weight | Delivered in                                                                                                                                                     |
| ------------------------------------------- | -----: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1** Spec &amp; data model                |    10% | `js/state.js` (schema, id generation, seed data), `about.html` (spec, feature list, a11y plan)                                                                   |
| **M2** Semantic HTML &amp; mobile-first CSS |    10% | All six `.html` pages (landmarks, heading order), `css/main.css` (tokens, mobile-first layout, breakpoints)                                                      |
| **M3** Forms &amp; regex validation         |    15% | `js/validators.js` (10 rules incl. back-reference, lookahead and lookbehind), inline error UI in `js/ui.js`, console assertions listed under [Testing](#testing) |
| **M4** Render, sort &amp; regex search      |    20% | `js/search.js` (safe compiler, escaping, `<mark>` highlight), `js/ui.js` (`renderTable`, `sortRecords`, `updateSearch`), `table.html`                            |
| **M5** Stats &amp; cap/target               |    15% | `renderDashboard`, `renderTrend`, `renderCap` in `js/ui.js`, polite/assertive live regions in `index.html`                                                       |
| **M6** Persistence, import/export, settings |    15% | `js/storage.js` (keys, validation, JSON/CSV/ICS), `js/state.js` (settings &amp; categories), `settings.html`                                                     |
| **M7** Polish &amp; a11y audit              |    15% | Focus trap &amp; restore, skip link, `aria-sort`, reduced-motion support, dark theme, PWA manifest, this README, demo video                                      |

The commit history follows the same order, with conventional prefixes (`ft:`, `fix:`, `ch:`, `stretch:`).

---

## Stretch features

| Feature                                                             | Status        |
| ------------------------------------------------------------------- | ------------- |
| Offline-first service worker cache                                  | Done          |
| Installable PWA (manifest + icon + standalone display)              | Done          |
| Light/dark theme, persisted, no flash on load                       | Done          |
| CSV export with proper escaping                                     | Done          |
| Theme picker during first-run setup with live preview               | Done          |
| Image attachments stored in IndexedDB                               | Done          |
| Calendar month view with `.ics` export and Google Calendar hand-off | Done          |
| Keyboard-operable board (no drag-only actions)                      | Done          |
| jQuery scraping page                                                | Not attempted |

---

## Browser support and notes for reviewers

- Targets current Chrome, Edge, Firefox and Safari. The lookbehind pattern is feature-detected at load time and falls back to `\b\d{2}:\d{2}\b` on engines that lack it.
- Chart.js and Font Awesome come from a CDN. If the CDN is unreachable, the dashboard renders a pure CSS/JS bar chart instead and the rest of the app is unaffected.
- Data lives in your browser only. Clearing site data deletes it. Export a JSON backup first if you care. Nothing is uploaded anywhere.
- Two notes about the repository layout, in case you diff against the original brief: the folders are `css/` and `js/` (not `styles/` and `scripts/`), and `seed.json` sits in the repo root.

---

## Acknowledgements

- [Chart.js](https://www.chartjs.org/) for the 7-day chart (MIT).
- [Font Awesome Free](https://fontawesome.com/) for icons (CC BY 4.0 / SIL OFL 1.1 / MIT).
- [Google Fonts | Inter](https://fonts.google.com/specimen/Inter) for typography (SIL OFL 1.1).

---

## Academic integrity and individual work

This repository is **individual work**. My GitHub account is the only contributor, and there are no other accounts in the contribution history. All UI, logic, validation, styling and documentation were written by me.

AI tooling was used for documentation wording and for generating seed data only, in line with the assignment's policy; no application logic was generated by it.

---

## Contact

|                |                                                             |
| -------------- | ----------------------------------------------------------- |
| **Author**     | David Ndizeye                                               |
| **GitHub**     | [@ndizeyedavid](https://github.com/ndizeyedavid)            |
| **Email**      | [d.ndiyeze@alustudent.com](mailto:d.ndiyeze@alustudent.com) |
| **Repository** | <https://github.com/ndizeyedavid/campus-life-planner>       |
| **Live app**   | <https://ndizeyedavid.github.io/campus-life-planner>        |

---

<p align="center">
  <sub>Campus Life Planner &copy; <span id="year">2026</span> David Ndizeye</sub>
</p>
