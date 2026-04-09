# CLAUDE.md — Portfolio Vue Frontend

A Vue 3 productivity + portfolio web app combining task management, habit tracking, statistics, and a personal portfolio showcase.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vue 3 + Vue Router 4 + Vuex 4 |
| UI Library | Vuetify 3 (Material Design) |
| HTTP | Axios (with auth interceptors) |
| Icons | FontAwesome 6 |
| Drag-and-drop | vuedraggable |
| Build | Webpack 5 via Vue CLI 5 |
| Other | js-cookie, lodash, vue-color |

---

## Project Structure

```
src/
  views/           # Page-level components
  components/      # Feature-grouped reusable components
    CalendarComponents/
    ListItems/
    HabitComponents/
    LearnComponents/   (Pomodoro, PiP)
    StatsComponents/
    AboutMeComponents/
    SettingsComponents/
    SidebarComponents/
    GeneralComponents/
  router/
    index.js           # Router setup + auth guard
    dashboardRoutes.js # / and /about-me
    accountRoutes.js   # /login and /settings
    generalRoutes.js   # /Streaks, /Stats, /projects/:slug
  store.js         # Vuex store (user, token, isAuthenticated)
  api.js           # API helper functions
  axios.js         # Axios instance with JWT interceptor
  date.js          # Date utility helpers
  main.js          # App entry point
```

---

## Routing

| Path | View | Auth Required |
|------|------|:---:|
| `/` | Dashboard | No |
| `/login` | Login | No |
| `/about-me` | AboutMe | No |
| `/Streaks` | Habits | No |
| `/Stats` | Stats | No |
| `/settings` | Settings | No |
| `/projects/:slug` | ProjectDetail | No |
| `/study` | Study (home) | No |
| `/study/folder/:id` | Study (folder drill-down) | No |
| `/study/session` | StudySession | No |

Auth guard is in `router/index.js` `beforeEach`. Routes with `meta.requiresAuth: true` redirect to `/login`.

---

## State Management

**`src/store.js`**

```
state: { user, isAuthenticated, token }
```

- `SET_USER` / `LOGOUT` / `SET_TOKEN` — mutations
- `checkAuth()` — hits `/auth/check-auth` to validate token
- `handleGoogleLogin()` — extracts JWT from URL params after OAuth redirect
- `logout()` — calls `/auth/logout`, clears state + localStorage

Token is persisted in `localStorage('token')` and injected by axios interceptor on every request.

---

## Backend / API

**Base URL:**
- Production: `https://portfolio-backend-pi-liart.vercel.app`
- Local: `http://localhost:3000`
- All calls go through `/api` prefix

**`src/api.js` key functions:**
- `createList(listData)` — POST `/lists/`
- `getList(identifier)` — POST `/lists/` (filter by `parent_page` + `date`)
- `getStreaks()` — POST `/streaks/`
- `updateStreak()` — POST `/streaks/`
- `axiosGet(url, params)` / `axiosPost(url, action, data)` — generic wrappers

List payload shape: `{ parent_page, date, lists: [{ title, visible, color, items: [...] }] }`

Item fields: `textString, scheduledDate, scheduledTime, scheduledStartTime, scheduledEndTime, taskTimeEstimate, recurringTask, recurringFrequency, dueDateCheckbox, dueDate, complete`

---

## Authentication Flow

1. User hits `/login` → clicks "Sign in with Google"
2. Redirects to `{baseURL}/auth/google` (Google OAuth)
3. Backend redirects back with `?token=...` in URL
4. `handleGoogleLogin()` action stores token → localStorage + Vuex
5. Axios interceptor adds `authorization: <token>` to all requests

---

## Theming

CSS custom properties on `:root`: `--primaryColor`, `--secondaryColor`, `--accentColor`.  
Persisted in `localStorage('siteColors')` as JSON. Applied on app mount.  
Edited via the Settings page with `vue-color` color pickers.

---

## Local Storage Keys

| Key | Contents |
|-----|---------|
| `token` | JWT string |
| `siteColors` | `{ primaryColor, secondaryColor, accentColor }` |
| `lifecalendar-birth-date` | Birth date for Stats page |
| `pomodoro_state` | Timer state (duration, mode, timestamps) |
| `dashboard-list-object:YYYY-MM-DD` | Cached task list per day |
| `study-data` | `{ folders, sets }` — all flashcard data |

---

## Pages

### Dashboard (`/`)

**File:** `src/views/Dashboard.vue`

The primary productivity page. Shows a 24-hour daily calendar alongside a task list for the selected date.

**Key components:**
- `DailyCalendar.vue` — 24-hour timeline with draggable events, current-time indicator (red line), pixel-based time slot rendering
- `ListElement.vue` — Task list with checkboxes, inline editing, drag-and-drop reordering
- `Pomodoro.vue` — Work/break timer (50min work / 10min break default), circular SVG progress ring, supports PiP
- `DateInput.vue` — Date picker to navigate between days

**Data flow:** On mount, calls `getList({ parent_page: 'dashboard', date: today })`. Data saved back to backend on mutations. Cached in localStorage per date.

**Mobile:** `activeMobileView` toggle switches between calendar and list (not shown simultaneously on mobile).

---

### Login (`/login`)

**File:** `src/views/Login.vue` + `src/components/Login.vue`

Simple Google OAuth entry point. Redirects to the backend Google OAuth URL. On return, `handleGoogleLogin()` parses the token from the URL and stores it.

No form — just a "Sign in with Google" button.

---

### Habits (`/Streaks`)

**File:** `src/views/Habits.vue`

Daily and weekly habit tracker with streak counting.

**Key components:**
- `Habit.vue` — Single habit card showing name, streak count, goal progress, and completion toggle
- `HabitModal.vue` — Create/edit/delete modal for a habit (name, frequency, goal)
- `AddButton.vue` — Floating button to open create modal
- `DaysOfTheWeek.vue` — Day selector for weekly habits

**Data flow:** Loads from `getStreaks()` on mount. Updates sent via `updateStreak()`.

---

### Stats (`/Stats`)

**File:** `src/views/Stats.vue`

Life calendar visualization: a 91-row × 52-column grid where each cell = one week of a ~91-year lifespan. Weeks lived are filled in; remaining weeks are empty.

**Key components:**
- `LifeCalendar.vue` — Renders the grid, calculates weeks elapsed since birth date
- `DateInput.vue` — Set birth date (persisted in localStorage)

The visual gives a memento-mori perspective on time.

---

### Settings (`/settings`)

**File:** `src/views/Settings.vue`

Theme color customization page.

**Key components:**
- `ColorPicker.vue` — Wraps `vue-color` for primary, secondary, and accent color selection
- `Button.vue` — Save/apply

Changes update CSS variables on `:root` immediately and are persisted to `localStorage('siteColors')`.

---

### About Me (`/about-me`)

**File:** `src/views/AboutMe.vue`

Personal portfolio showcase page.

**Key components:**
- `FullPage.vue` — Full-viewport-height scroll container with section navigation
- `ProfilePicture.vue` — Hero image/intro
- `SideScrolling.vue` — Horizontally scrollable skills section
- `Projects.vue` — Featured project cards/carousel
- `Experience.vue` — Work experience timeline
- `ConnectWithMe.vue` — Social/contact links

Static content — no API calls. All data is hardcoded in components.

---

### Study (`/study`, `/study/folder/:id`)

**Files:** `src/views/Study.vue`, `src/router/studyRoutes.js`

Home page for the ANKI-style flashcard system. Shows folders and sets in a responsive grid. When a `folderId` prop is present (route `/study/folder/:id`), drills into that folder's sets.

**Key components:**
- `FolderCard.vue` — Clickable folder tile with color bar and context-menu (edit/delete)
- `SetCard.vue` — Clickable set tile showing card count, due badge, new badge; context-menu (edit/delete)
- `FolderModal.vue` — Create/edit folder (name + color)
- `SetModal.vue` — Create/edit set; three tabs: **Cards** (front/back pairs), **Options** (newPerDay, order, folder), **Import/Export** (bulk text with custom delimiters)

**Data flow:**
- Persists to `localStorage('study-data')` as `{ folders, sets }`
- On mount calls `checkAuth`; if authenticated, falls back to localStorage until backend is ready
- Default demo data (Spanish vocab, Data Structures) shown when localStorage is empty
- "ANKI All" button counts all due cards across the visible scope; launches a session with only due cards (`buildSession(sets, 'due')`)
- Clicking a set starts a full study session — due + new cards up to `newPerDay` (`buildSession([set], 'study')`)
- Before navigating to `/study/session`, populates `src/studySession.js` singleton with `cards` array and an `onRate` callback that writes updated ANKI state back to the sets and re-persists

**ANKI algorithm:** `src/anki.js` — SM-2 (easeFactor, interval, repetitions, nextReview). Ratings: 0=Again, 1=Hard, 2=Good, 3=Easy.

---

### Study Session (`/study/session`)

**File:** `src/views/StudySession.vue`

Active flashcard review session.

**Key components:**
- `FlashcardDisplay.vue` — 3-D CSS flip card; click front to reveal back, emits `flip` once per card

**Flow:**
1. Reads cards from `studySession.js` singleton; redirects to `/study` if empty
2. Shows one card at a time with a progress bar
3. After flip: four rating buttons appear (Again / Hard / Good / Easy), each color-coded
4. On rating: calls `session.onRate` to persist ANKI state, advances to next card
5. When all cards done: summary screen with per-rating counts and "Back to Study" button

---

### Project Detail (`/projects/:slug`)

**File:** `src/views/ProjectDetail.vue`

Detailed view for a specific portfolio project (e.g., GPU K-Means clustering). Content is hardcoded per slug in the component. No API calls.

---

## Notable Utilities

**`src/date.js`:**
- `getTodayDate()` → `YYYY-MM-DD`
- `incrementDate(str)` / `decrementDate(str)` → shift by 1 day
- `normalizeDate(datetimeStr)` → MySQL DATETIME → `YYYY-MM-DD`

**Pomodoro PiP:**  
Uses `DocumentPictureInPicture` browser API to float the timer in its own window. State synced via `BroadcastChannel` across tabs.

**Sidebar:**  
`src/components/SidebarComponents/SideBar.vue` — Collapsible nav. Width toggles: `0` / `11.25rem` (desktop), `16rem` (mobile). Controlled by `isMobile` + toggle state.

**`src/anki.js`:**
- `RATINGS` — `[{ value, label, color }]` for Again/Hard/Good/Easy
- `initAnki()` — default SM-2 state for a new card
- `reviewCard(ankiState, rating)` → updated state with new `easeFactor`, `interval`, `repetitions`, `nextReview`
- `isDue(card)` / `isNew(card)` — card state predicates
- `getDueCount(cards)` — count of due cards in an array
- `buildSession(sets, mode)` — returns shuffled flat card array; `mode='due'` (ANKI All) or `mode='study'` (due + new up to `newPerDay`)

**`src/studySession.js`:**  
Singleton that bridges `Study.vue` → `StudySession.vue`. `Study.vue` sets `session.cards`, `session.title`, and `session.onRate` before navigating; `StudySession.vue` reads and calls them.

**`src/components/UI.md`:**  
Quick-reference for every reusable component — props, emits, and usage snippets.
