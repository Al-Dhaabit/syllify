# Syllify

Syllify is a student-built course schedule planner for RIT Dubai, developed by Khaled Miari. It lets students enter course codes or instructor names, compare schedule combinations, adjust preferences, save schedules in their browser, and export them as images or Google Calendar events.

This repository is shared for technical review by Mr. Khalil and the IT team before wider student promotion. Sharing the code does not imply university approval. Syllify is an independent student project, not an official RIT system, and does not register students for classes.

## Current scope

- Schedule planning for Fall 2025, Spring 2026, Fall 2026, and Spring 2027.
- Spring 2027 is the default semester; an existing browser session can restore a previously selected semester.
- Course codes can be entered together, such as `CSEC472 CSEC380 ENGL212 MATH241 NSSA370`.
- A specific section can be requested with a suffix, such as `CSEC472.601`.
- Schedule preferences, history, favorites, comparison, image export, and Google Calendar export are available.
- The separate course/topic search interface is temporarily disabled. Its implementation and static data remain in the repository.

Always verify the result against SIS, the university's published schedule, and academic advising before registration.

## Run locally

You need Node.js and npm. The current development environment uses Node.js **22.17.1** and npm **10.9.2**; this is not a tested compatibility range.

```bash
git clone https://github.com/Al-Dhaabit/syllify.git
cd syllify
npm ci
npm start
```

Open [http://localhost:3000](http://localhost:3000). Course data requires an internet connection. The core planner does not require environment variables, a database, university credentials, or a backend service.

The project uses React 19 and Create React App (`react-scripts` 5). The package name is still `coursenet` for historical reasons.

## Build and tests

```bash
# Run the existing tests once
npm test -- --watchAll=false --runInBand

# Create a production build
npm run build
```

The production output is written to `build/` and can be served by a static web host. The build command disables source maps.

Existing tests cover basic app rendering, selected scheduling regressions, and pink-theme image export. They are not a comprehensive correctness or security audit.

For a reproducible review, record the commit being inspected:

```bash
git rev-parse HEAD
```

Please include that commit, the semester, course codes, selected sections, and preferences when reporting a problem.

## Course data and external services

The app downloads published Google Sheets as CSV and parses them in the browser. Spreadsheet IDs, semester tab IDs, and parsing logic are defined in `src/App.js`.

| Academic year | Source | Semester tabs |
| --- | --- | --- |
| 2025–26 | [Published schedule spreadsheet](https://docs.google.com/spreadsheets/d/1UUjSCTgCK7yZLvlrwwoZ2341K9aCwiYMiR7Qs8fegRA/edit) | Fall: `672481223`; Spring: `1605186669` |
| 2026–27 | [Published schedule spreadsheet](https://docs.google.com/spreadsheets/d/1bI-jXiF48S7j6YuvvNYRcpzh9e2MlZE-cICxu3ONZGg/edit) | Fall: `672481223`; Spring: `1605186669` |

The app reads these sheets; it does not modify them. Availability and accuracy depend on the published data and its format. Rows with missing or unconfirmed meeting times are excluded from scheduling and reported to the user.

Other external requests include Google Fonts, Google Calendar/Identity scripts, and a Giphy image used in an easter egg. The interface also contains links to terms, contact details, and optional support information. Hosting and third-party services may maintain their own request logs.

## Browser storage and Google Calendar

Schedule generation runs in the browser. This repository does not implement a user account system or an application backend for storing student schedules.

- `localStorage` stores selected courses, semester, preferences, generated results, history, favorites, and acknowledgement/reminder flags. Legacy search storage also remains in the code.
- An unload handler attempts to clear active planning/results state. History, favorites, and other persistent flags remain until removed by the app or browser. Unload handling is not guaranteed by browsers.
- A service worker caches matching JavaScript, CSS, fonts, and legacy course-search data when requested. It no longer prefetches the disabled search data. Cached assets can affect which version is displayed during review; clear site data/service workers if necessary.
- PNG export is generated in the browser.
- Google API and Identity scripts load when a schedule view mounts. Calendar export requests Google authorization and sends event details to the user's primary Google Calendar. Its requested scope is `https://www.googleapis.com/auth/calendar.events`.

The Google OAuth client ID is configured in `src/utils/googleCalendar.js`. For an independent deployment, configure a Google Cloud OAuth web client and its authorized JavaScript origins, then update that setting. The client ID is a browser-visible identifier; no client secret is required by the implemented browser flow. Calendar export may be unavailable on origins that have not been authorized.

## Known scheduling issue under investigation

**Some courses with required lecture, lab, and recitation components can produce incomplete schedules. This is not fixed in the current code.**

A reported Fall 2026 example uses `ENGL211 PHYS212 CMPR271 MATH221 EEEE281`. For EEEE281, the current section-number heuristic can pair the wrong lecture with a lab/recitation group, and leftover lab/recitation groups can be offered without the required lecture. The scheduler also does not currently check conflicts between meeting rows inside a course bundle.

A temporary, unpublished prototype tested explicit lecture-to-lab relationships for that Fall 2026 example. It removed incomplete EEEE281 options and internal overlaps in that dataset. The relationships still need confirmation against registration rules before a general fix is implemented. The prototype is not part of this repository, and its results do not establish correctness for other courses or semesters.

Review should include multi-component courses, split meeting rows sharing a Class #, specific-section requests, unconfirmed times, and partial schedules. A displayed schedule is a planning aid, not proof that all registration requirements are satisfied.

## Code guide

| File | Purpose |
| --- | --- |
| `src/App.js` | App shell, sheet loading/parsing, consent notice, and disabled search interface |
| `src/components/ScheduleInterface.js` | Course selection, semester controls, preferences, history, and favorites |
| `src/utils/scheduler.js` | Section grouping, course bundles, conflicts, schedule generation, and ranking |
| `src/components/ScheduleView.js` | Timetable display, image export, and Calendar export flow |
| `src/utils/googleCalendar.js` | Google scripts, OAuth setup, and Calendar event creation |
| `public/sw.js` | Browser asset caching |
| `src/utils/scheduler_*.test.js` | Existing scheduler regression cases |
| `src/components/ScheduleView.test.js` | Export theme regression test |

## Contact

Khaled Miari — [km2495@rit.edu](mailto:km2495@rit.edu)

For review findings, include reproduction steps and expected versus actual behavior. Please avoid putting credentials, access tokens, or private student information in public issues.
