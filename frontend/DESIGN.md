# Travel Manager — Design Rules Book

> **Version:** 1.0  
> **Stack:** React PWA · CSS Modules · iOS-first · lucide-react icons  
> **Purpose:** Single source of truth for all visual decisions. Every component, screen, and interaction must conform to these rules. When in doubt, default to simplicity, clarity, and native iOS conventions.

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [Design Tokens](#2-design-tokens)
   - 2.1 [Color System](#21-color-system)
   - 2.2 [Typography](#22-typography)
   - 2.3 [Spacing](#23-spacing)
   - 2.4 [Border Radius](#24-border-radius)
   - 2.5 [Shadows](#25-shadows)
   - 2.6 [Motion & Animation](#26-motion--animation)
3. [Component Rules](#3-component-rules)
   - 3.1 [Tab Bar](#31-tab-bar)
   - 3.2 [Card — Base Rules](#32-card--base-rules)
   - 3.3 [Flight Card](#33-flight-card)
   - 3.4 [Hotel Card](#34-hotel-card)
   - 3.5 [Connecting Flight Group](#35-connecting-flight-group)
   - 3.6 [Inputs & Controls](#36-inputs--controls)
4. [Screen Rules](#4-screen-rules)
   - 4.1 [Trips / Control Center](#41-trips--control-center)
   - 4.2 [Trips Detail (Day View)](#42-trips-detail-day-view)
   - 4.3 [Today](#43-today)
   - 4.4 [Upcoming](#44-upcoming)
   - 4.5 [Days by Country](#45-days-by-country)
   - 4.6 [Calendar View](#46-calendar-view)
   - 4.7 [Map](#47-map)
5. [Global Implementation Rules](#5-global-implementation-rules)

---

## 1. Core Principles

- **iOS-native feel.** Follow Apple Human Interface Guidelines wherever possible.
- **Content first.** UI chrome should recede. Data — routes, times, dates — is always the hero.
- **Consistent depth.** Use the three-level background system (Primary / Secondary / Tertiary) rigorously. Never invent a fourth level.
- **Touch-first.** Every interactive target must be at minimum 44 × 44px (Apple HIG minimum).
- **One accent.** `#007AFF` is used exclusively for actions, active states, and links. Never decorative.
- **Purposeful motion.** Animations communicate state, not decoration. Maximum 300ms duration.
- **Token-only styling.** No raw hex values or arbitrary pixel values in component CSS Modules. Always use a token variable.

---

## 2. Design Tokens

All tokens are defined as CSS custom properties in `src/styles/tokens.css` and imported once at the app root. Component CSS Modules reference tokens exclusively via `var(--token-name)`.

### 2.1 Color System

#### Backgrounds

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#1C1C1E` | Screen background, page root |
| `--bg-secondary` | `#2C2C2E` | Cards, modals, bottom sheets |
| `--bg-tertiary` | `#3A3A3C` | Inputs, inner cells, secondary cards |
| `--bg-elevated` | `#48484A` | Popovers, tooltips |

#### Accent & Semantic

| Token | Value | Usage |
|-------|-------|-------|
| `--accent-blue` | `#007AFF` | Primary actions, links, active tab, active toggle |
| `--accent-teal` | `#30B0C7` | Hotel cards **only** — never used outside hotel context |
| `--color-green` | `#30D158` | Confirmed status, success states |
| `--color-orange` | `#FF9F0A` | Upcoming status, warnings |
| `--color-red` | `#FF453A` | Destructive actions, over-limit indicators |

#### Text

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#FFFFFF` | All main content text |
| `--text-secondary` | `rgba(235, 235, 245, 0.6)` | Labels, metadata, supporting text |
| `--text-tertiary` | `rgba(235, 235, 245, 0.3)` | Placeholders, disabled states, zero values |
| `--text-link` | `#007AFF` | Tappable text, active states |

#### Structural

| Token | Value | Usage |
|-------|-------|-------|
| `--separator` | `rgba(255, 255, 255, 0.08)` | Lines and borders between sections |
| `--overlay` | `rgba(0, 0, 0, 0.5)` | Modal and sheet overlays |

---

#### Country Calendar Color Palette

Country colors used in the calendar day-cell backgrounds are assigned **dynamically at runtime**. The app must not hardcode a fixed country-to-color mapping.

**Assignment rules:**

1. Define a palette of 12 distinct muted colors as tokens (`--country-palette-1` through `--country-palette-12`).
2. At runtime, when loading a user's travel data for a given year, assign palette slots to countries in the order they are **first encountered chronologically**.
3. Store the resulting `{ countryCode: paletteIndex }` mapping in app state for the duration of the session. The same country must always render with the same color within a single session.
4. If a user has visited more than 12 countries, cycle the palette from slot 1. No country is ever left without a color.
5. The mapping is **not persisted** between sessions — it is recalculated fresh on each load.
6. The color legend in the calendar view is built from this runtime mapping, not from a static list.

**Palette tokens:**

| Token | Value | Notes |
|-------|-------|-------|
| `--country-palette-1` | `rgba(48, 176, 199, 0.30)` | Teal |
| `--country-palette-2` | `rgba(90, 140, 255, 0.30)` | Blue |
| `--country-palette-3` | `rgba(255, 149, 0, 0.25)` | Orange |
| `--country-palette-4` | `rgba(255, 69, 58, 0.25)` | Red |
| `--country-palette-5` | `rgba(191, 90, 242, 0.25)` | Purple |
| `--country-palette-6` | `rgba(100, 210, 100, 0.25)` | Green |
| `--country-palette-7` | `rgba(255, 214, 10, 0.25)` | Yellow |
| `--country-palette-8` | `rgba(255, 100, 130, 0.25)` | Pink |
| `--country-palette-9` | `rgba(50, 200, 180, 0.25)` | Mint |
| `--country-palette-10` | `rgba(180, 140, 90, 0.25)` | Tan |
| `--country-palette-11` | `rgba(130, 180, 255, 0.25)` | Sky |
| `--country-palette-12` | `rgba(200, 100, 60, 0.25)` | Terracotta |

> **Important:** These colors are intentionally muted (low alpha) so the day number remains clearly legible on top. Do not increase opacity values.

---

### 2.2 Typography

**Font stack:**
```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif;
```

> Do not import Google Fonts or any external typeface. The SF Pro system stack renders natively on iOS Safari and falls back gracefully elsewhere.

#### Type Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `--text-caption2` | `11px` | `400` | Section labels: "DEPARTURE", "HOTEL", "LAYOVER" |
| `--text-caption` | `12px` | `400` | Passenger pills, status badges, tiny metadata |
| `--text-footnote` | `13px` | `400` | Secondary metadata, airline names, PNR codes |
| `--text-subheadline` | `15px` | `400 / 600` | Body text, button labels, time values |
| `--text-body` | `17px` | `400` | General UI text, dropdown values |
| `--text-title3` | `20px` | `600` | Card titles, country names |
| `--text-title2` | `22px` | `700` | Screen section headings |
| `--text-title1` | `28px` | `700` | Airport/route codes, large titles |
| `--text-largeTitle` | `34px` | `700` | Screen page titles (e.g. "Days by Country") |

#### Special Typography Rules

- **Airport codes** (LCA, LHR, etc.): `28px`, weight `700`, `letter-spacing: -0.5px`. Always uppercase. Never apply `text-transform: uppercase` — codes are stored and rendered as uppercase strings.
- **Section labels** ("DEPARTURE", "HOTEL", "LAYOVER"): `11px`, weight `600`, `letter-spacing: 0.06em`, uppercase, color `var(--text-secondary)`.
- **Times** (19:25, 08:30): `15px`, weight `400`, color `var(--text-secondary)`.

---

### 2.3 Spacing

All spacing uses a **4px base grid**. Never use arbitrary values.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Icon internal padding, micro gaps |
| `--space-2` | `8px` | Between icon and label, tight gaps |
| `--space-3` | `12px` | Between rows inside a card |
| `--space-4` | `16px` | Standard card padding (horizontal) |
| `--space-5` | `20px` | Preferred card padding, section gaps |
| `--space-6` | `24px` | Between cards in a list |
| `--space-8` | `32px` | Screen-level section separation |
| `--space-10` | `40px` | Large vertical breathing room |

---

### 2.4 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `8px` | Inner cards inside grouped containers, month cells |
| `--radius-md` | `12px` | Inputs, dropdowns, inner flight cards in connection groups |
| `--radius-lg` | `16px` | Standard cards (FlightCard, HotelCard, ControlCenter card) |
| `--radius-xl` | `20px` | Map container |
| `--radius-pill` | `100px` | Status badges, passenger pills, year toggles, stat pills |

---

### 2.5 Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-card` | `0 2px 12px rgba(0,0,0,0.4)` | Default card elevation |
| `--shadow-elevated` | `0 8px 24px rgba(0,0,0,0.5)` | Modals, sheets, dropdowns |
| `--shadow-map` | `0 8px 32px rgba(0,0,0,0.5)` | Map container |
| `--shadow-badge` | `0 2px 8px rgba(0,0,0,0.3)` | Map route badges |

---

### 2.6 Motion & Animation

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | `120ms` | Button press scale, icon color change |
| `--duration-normal` | `200ms` | Toggle switch, pill state change, year selector |
| `--duration-slow` | `250ms` | Card expand/collapse, sheet presentation |
| `--ease-default` | `ease-out` | All transitions unless specified otherwise |

**Rules:**

- **Button/tab press:** `scale(0.92)` on `:active`, back to `scale(1.0)` on release. Duration `120ms ease-out`.
- **Card expand/collapse:** height transition `250ms ease-in-out`. Use explicit height values, not `max-height` hacks, where possible.
- **Toggle switch:** thumb position and track color both transition at `200ms ease-out` simultaneously.
- Never animate color alone without also transitioning `opacity` or `transform` — isolated color transitions feel abrupt on iOS.

---

## 3. Component Rules

### 3.1 Tab Bar

| Property | Value |
|----------|-------|
| Height | `83px` (includes iOS safe area padding) |
| Background | `rgba(28, 28, 30, 0.85)` |
| Backdrop filter | `blur(20px) saturate(180%)` |
| Border top | `1px solid rgba(255,255,255,0.08)` |
| Bottom padding | `env(safe-area-inset-bottom)` |
| Position | `fixed`, bottom `0`, full width, `z-index: 100` |
| Tab icon size | `24px` |
| Tab label size | `10px`, weight `500` |
| Active color | `#007AFF` — icon and label |
| Inactive color | `rgba(235, 235, 245, 0.4)` — icon and label |
| Active indicator | **None.** Color change only — no pill, no underline, no background. |
| Press animation | `scale(0.92)` on tap, `120ms ease-out` |
| `-webkit-tap-highlight-color` | `transparent` on all tab items |

#### Tab Mapping

| Tab | Icon (lucide-react) | Active variant |
|-----|---------------------|----------------|
| Trips | `Plane` | `PlaneLanding` |
| Days | `CalendarDays` | `CalendarDays` |
| Upcoming | `ArrowRight` | `ArrowRightCircle` |
| Today | `MapPin` | `MapPinned` |
| Map | `Map` | `Map` |
| Users | `User` | `UserCheck` |

---

### 3.2 Card — Base Rules

All cards share these properties unless a specific card type overrides them.

| Property | Value |
|----------|-------|
| Background | `var(--bg-secondary)` → `#2C2C2E` |
| Border radius | `var(--radius-lg)` → `16px` |
| Padding | `16px 20px` |
| Shadow | `var(--shadow-card)` |
| Gap in list | `8px` between consecutive cards of the same type |
| Press state | Background lightens to `#323234` on `:active` |
| Transition | `background-color 120ms ease-out` |

---

### 3.3 Flight Card

#### Layout (top to bottom)

**1 — Type row**
- LEFT: type label — `"DEPARTURE"` / `"ARRIVAL"` / `"CONNECTING FLIGHT"` — `11px`, weight `600`, uppercase, `letter-spacing: 0.06em`, `var(--text-secondary)`.
- RIGHT: airline name + flight number — `13px`, `var(--text-secondary)`.
- TOP-RIGHT corner: status badge (optional, see below).

**2 — Action row**
- LEFT: `Edit` button — ghost style, outlined, `var(--radius-pill)`, `13px`.
- RIGHT: trash icon — `rgba(235,235,245,0.3)`, `18px`, `44×44px` tap target.
- For **connecting flight cards**: hide both buttons by default. Reveal on long press via a CSS class toggle.

**3 — Route row**
- LEFT: origin airport code — `28px`, weight `700`, `letter-spacing: -0.5px`.
- CENTER: plane icon (`Plane` from lucide-react) — `#007AFF`, `16px`.
- RIGHT: destination airport code — `28px`, weight `700`, `letter-spacing: -0.5px`.

**4 — Dashed separator**
- `1px dashed rgba(255,255,255,0.1)`, full width.

**5 — Time row**
- Departure time below origin code — `15px`, `var(--text-secondary)`.
- Arrival time below destination code — `15px`, `var(--text-secondary)`.

**6 — Passengers row**
- `"Passengers:"` label — `13px`, `var(--text-secondary)`.
- One or more name pills per passenger: `background: rgba(0,122,255,0.15)`, `color: #007AFF`, `12px`, `var(--radius-pill)`, `padding: 4px 10px`, `4px` gap between pills.

#### Status Badges

Positioned absolutely, top-right corner of the card. `11px`, weight `600`, `var(--radius-pill)`, `padding: 3px 10px`.

| Status | Background | Text color |
|--------|-----------|------------|
| Upcoming | `rgba(255, 159, 10, 0.15)` | `#FF9F0A` |
| Confirmed | `rgba(48, 209, 88, 0.15)` | `#30D158` |
| Delayed | `rgba(255, 69, 58, 0.15)` | `#FF453A` |
| Past | `rgba(235, 235, 245, 0.1)` | `rgba(235,235,245,0.4)` |

---

### 3.4 Hotel Card

Hotel cards use all base card rules with the following overrides:

| Property | Value |
|----------|-------|
| Background | `rgba(48,176,199,0.08)` layered over `var(--bg-secondary)` |
| Left border | `3px solid #30B0C7` |
| Type label | `"HOTEL"` in `#30B0C7` (teal), not `var(--text-secondary)` |
| Hotel name | `17px`, weight `700`, `var(--text-primary)` |
| Check-in/out row | Bed icon (`16px`, `#30B0C7`) + dates (`15px`, `var(--text-primary)`) + night count (`13px`, `var(--text-secondary)`) |
| Guests/payment | `13px`, `var(--text-secondary)`. Format: `"2 guests • Pay at hotel"` |
| Action row | `"Copy ID"` ghost button LEFT, trash icon RIGHT. Same spec as flight card action row. |

> **Rule:** Teal (`#30B0C7`) is used exclusively for hotel UI. Never use it in any other context.

---

### 3.5 Connecting Flight Group

When a trip day contains a departure with one or more connecting flights, all related cards must be wrapped in a **single group container**. The group renders as one cohesive visual unit.

#### Group Container

| Property | Value |
|----------|-------|
| Background | `#2C2C2E` |
| Border radius | `16px` |
| Padding | `4px` |
| Inner card gap | `2px` |
| Shadow | `var(--shadow-card)` |
| Top-right badge | `"1 stop"` or `"2 stops"` — `rgba(255,149,0,0.15)` bg, `#FF9F0A` text, `11px`, `var(--radius-pill)`, `padding: 3px 10px` |

#### Inner Flight Cards (inside a group)

| Property | Value |
|----------|-------|
| Background | `var(--bg-tertiary)` → `#3A3A3C` |
| Border radius | `var(--radius-md)` → `12px` |
| Connecting card left border | `2px solid rgba(0,122,255,0.4)` |
| Connecting card action buttons | Hidden by default, revealed on long press only |

#### Layover Strip

Sits between departure and connecting flight cards. No card background — it is an inline connector element.

| Property | Value |
|----------|-------|
| Height | `48px` |
| Background | None (transparent) |
| Padding | `0 20px` |
| Left vertical line | `1px dashed rgba(255,255,255,0.12)`, aligned to center of plane icons above/below |
| Content | Clock icon (`16px`, `var(--text-secondary)`) + duration (`13px`, bold, `var(--text-primary)`) + airport name (`13px`, `var(--text-secondary)`) |
| Example | `⏱ 1h 10m  Franz Josef Strauss (MUC)` |
| Status badge (right) | `"On time"` in green pill or `"Delayed"` in orange pill — only shown when live data is available |

#### Collapsed State

Used as the default on the Upcoming screen. Expanded by default on Today and Trips detail.

| State | Display |
|-------|---------|
| Collapsed | Single row: origin code → final destination code with dotted connecting line. `"1 stop · 4h 15m total"` in `13px var(--text-secondary)` below. |
| Expanded | Full departure + layover strip + connecting card(s). |
| Transition | `250ms ease-in-out` height transition on expand/collapse. |

---

### 3.6 Inputs & Controls

#### Dropdown / Select

| Property | Value |
|----------|-------|
| Background | `var(--bg-tertiary)` → `#3A3A3C` |
| Border radius | `var(--radius-md)` → `12px` |
| Height | `48px` |
| Padding | `0 16px` |
| Text | `17px`, `var(--text-primary)` |
| Chevron icon | `ChevronUpDown` (lucide), `18px`, `var(--text-tertiary)`, right-aligned |
| Border | None |
| Focus ring | `2px solid #007AFF`, `offset: 2px` |

#### iOS Toggle Switch

> Do not use a standard HTML checkbox. Build as a custom `div` with a click handler.

| Property | Value |
|----------|-------|
| Track size | `51px × 31px` |
| Thumb size | `27px × 27px` |
| Border radius | `var(--radius-pill)` on both track and thumb |
| On state | Track: `#007AFF`. Thumb: `white`. Thumb `translateX: 20px`. |
| Off state | Track: `rgba(235,235,245,0.2)`. Thumb: `white`. Thumb `translateX: 2px`. |
| Transition | `200ms ease-out` on all properties simultaneously |

#### Year Toggle Pills

| Property | Value |
|----------|-------|
| Container | `flex row`, `gap: 8px` |
| Pill size | `min-width: 64px`, `height: 36px`, `padding: 0 16px` |
| Border radius | `var(--radius-pill)` |
| Active state | `background: #007AFF`, `color: white`, weight `600` |
| Inactive state | `background: #3A3A3C`, `color: rgba(235,235,245,0.6)` |
| Transition | `background-color 200ms ease-out` |

#### Buttons

| Type | Background | Text | Height | Radius | Usage |
|------|-----------|------|--------|--------|-------|
| Primary | `#007AFF` | `white`, `15px`, weight `600` | `50px` | `var(--radius-md)` | Add Flight, Add Hotel |
| Secondary | `var(--bg-secondary)` | `#007AFF`, `15px`, weight `400` | `52px` | `var(--radius-lg)` | Show all trips statistics |
| Ghost | `transparent` | `white`, `13px` | `32px` | `var(--radius-pill)` | Edit on cards |
| Text-only | `transparent` | `#007AFF`, `15px` | `auto` | none | Calendar view, List view toggles |
| Destructive icon | `transparent` | `rgba(255,69,58,0.8)`, `18px` icon | `32px` | `var(--radius-pill)` | Trash/delete on cards |

---

## 4. Screen Rules

### 4.1 Trips / Control Center

#### App Header

| Element | Spec |
|---------|------|
| App name `"Travel Manager"` | `22px`, bold, `var(--text-primary)` |
| Role badge `"Admin"` | `background: rgba(0,122,255,0.15)`, `color: #007AFF`, `12px`, `var(--radius-pill)`, `padding: 3px 10px` |
| User email | `13px`, `var(--text-secondary)`, below name |
| Spacing below header | `24px` before first card |

#### Control Center Card

| Element | Spec |
|---------|------|
| Card title `"Control Center"` | `20px`, bold, `var(--text-primary)` |
| Delete trip icon | Top-right, `20px`, `var(--text-tertiary)`, no background, `44×44px` tap target |
| Trip dropdown | Full width. See [Dropdown spec](#dropdown--select). |
| `"Show past trips"` toggle | iOS-style toggle. See [Toggle spec](#ios-toggle-switch). Label: `15px var(--text-primary)`. |
| Add Flight + Add Hotel | Side by side, equal width. Primary button style. Include lucide icon left of label. |
| Stats pill | `"10 flights · 6 hotels"`, centered, `var(--bg-primary)` background, `var(--radius-pill)`, `13px var(--text-secondary)` |

#### Below the Card

`"Show all trips statistics"` — full-width Secondary button. `16px` gap below the Control Center card.

---

### 4.2 Trips Detail (Day View)

#### Day Group Header

| Element | Spec |
|---------|------|
| Date | Weekday + date (e.g. `"Sun, 1 Mar 2026"`), `20px`, bold |
| Summary pill | `"2 flights · 1 hotel"`, `background: #007AFF`, `var(--radius-pill)`, `15px`, bold, white text |
| Separator | `1px solid var(--separator)` below the header row |

Flight cards and hotel cards are listed below the day header in chronological order. Connecting flight groups render as a single grouped unit (see [3.5](#35-connecting-flight-group)).

---

### 4.3 Today

| Element | Spec |
|---------|------|
| Page header date | e.g. `"Friday, 6 March"` — `28px`, bold (large title) |
| Page header subtitle | e.g. `"2 flights today"` — `15px`, `var(--text-secondary)` |
| Flight cards | Use FlightCard component. All cards fully expanded — no collapsing. |
| Pull to refresh | Small circular spinner in `#007AFF` at top of list. |
| Empty state | Large plane emoji (`48px`), `"No flights today"` at `20px` bold, subtext at `15px var(--text-secondary)`. All centered vertically in the remaining screen space. |

---

### 4.4 Upcoming

| Element | Spec |
|---------|------|
| Date group header | e.g. `"MON, 9 MAR 2026"` — `13px`, semibold, uppercase, `var(--text-secondary)`. Horizontal separator line fills remaining width to the right. **Sticky** while scrolling within that group. |
| Active day accent | The current/today group has a `2px` left bar in `#007AFF` on the date header label. |
| Flight cards | Connecting groups default to **collapsed** state. Standard single-segment flights fully expanded. |
| Past flights | If "show past" is enabled: cards at `50%` opacity, no interactive press state. |
| Status badges | Orange `"Upcoming"` pill on each upcoming card. |

---

### 4.5 Days by Country

#### Screen Header

| Element | Spec |
|---------|------|
| Page title | `"Days by Country"` — `34px`, bold (large title) |
| Subtitle | `"Per passenger, per month"` — `15px`, `var(--text-secondary)` |
| Passenger dropdown | Full width. See [Dropdown spec](#dropdown--select). |
| Year toggle | See [Year Toggle Pills](#year-toggle-pills). Left-aligned. |
| `"Calendar view"` button | Text-only, `#007AFF`, `15px`, right-aligned on the same row as the year toggle. |

#### Country Card

| Element | Spec |
|---------|------|
| Country name | `20px`, bold, `var(--text-primary)`, LEFT |
| Total days | `20px`, bold, `var(--text-primary)`, RIGHT |
| Progress bar | Full width, `4px` height, `var(--bg-tertiary)` background. Fill color: `#007AFF`. Fill width: `min((days / 183) * 100%, 100%)`. Fill becomes `#FF453A` when `days > 183`. A small vertical tick mark at the 183-day position. |
| Month grid | 3 columns × 4 rows, `8px` gap. Each cell: `var(--bg-tertiary)` background, `var(--radius-sm)`, `padding: 8px`. Month label: `11px` uppercase `var(--text-secondary)`. Day count: `17px` bold. Zero values: `var(--text-tertiary)`. Values over threshold: `#FF453A`. |

> The **183-day threshold** represents the standard tax residency reference marker. Cells at or above this value turn red automatically.

---

### 4.6 Calendar View

#### Layout & Controls

| Element | Spec |
|---------|------|
| `"List view"` button | Top-right, text-only, `#007AFF`, `15px`. **Sticky** at top. |
| Color legend | Fixed below the toggle button. Horizontal row: colored dot (`8px` circle, filled with the assigned `--country-palette-N` color) + country name (`12px`, `var(--text-secondary)`). Horizontally scrollable if overflow. Built from the **runtime country-to-palette mapping** — not a static list. |
| Month section header | Month name — `20px`, bold. **Sticky** while scrolling within that month. |
| Week row labels | `"M T W T F S S"` — `13px`, `var(--text-tertiary)`, evenly spaced. |

#### Day Cells

| Property | Spec |
|----------|------|
| Minimum size | `44 × 44px` (Apple touch target minimum) |
| Background | Assigned `--country-palette-N` color from the runtime mapping. No data: `transparent`. |
| Day number | `15px`, `var(--text-primary)` if has data. `var(--text-tertiary)` if no data. |
| Flag emoji | Overlaid bottom-right, `10px`, only if cell has country data. |
| Today marker | `2px solid white` circular border around the day number cell. |
| Border radius | `var(--radius-sm)` → `8px` |
| Travel day (split) | If the passenger moved countries on that day: apply a diagonal CSS gradient split between the two assigned palette colors. |

---

### 4.7 Map

| Element | Spec |
|---------|------|
| Year toggle | Year toggle pills (see [3.6](#year-toggle-pills)). Top of screen. |
| `"Full screen"` button | `background: var(--bg-secondary)`, `color: #007AFF`, `15px`, `var(--radius-pill)`, `height: 36px`, `padding: 0 16px`. |
| `"Hide badges"` button | Same spec as Full screen. `8px` gap between the two. |
| Map container | `border-radius: var(--radius-xl)` → `20px`. `overflow: hidden`. `box-shadow: var(--shadow-map)`. |
| Attribution bar | `background: rgba(28,28,30,0.85)` + `backdrop-filter: blur(20px)`. `11px`, `var(--text-secondary)`. |
| Route badges | `white` background, `var(--radius-pill)`, `min: 44×44px`, `box-shadow: var(--shadow-badge)`. Count: `17px`, bold, `#1C1C1E`. Sub-label (e.g. `"5r"`): `11px`, `rgba(0,0,0,0.5)`. |
| Current location badge | Solid `#007AFF` background, white text. Plane emoji replaces the count number. |

---

## 5. Global Implementation Rules

### 5.1 CSS Architecture

1. All design tokens live in `src/styles/tokens.css` as CSS custom properties on `:root`. Import once at the app root. Never duplicate token values.
2. Component `.module.css` files must only reference `var(--token-name)`. No raw hex values. No hardcoded pixel values outside the token spacing scale.
3. `src/styles/global.css` handles: `box-sizing: border-box` on `*`, body `background`/`color`/`font-family`, smooth scrolling, and safe-area utility classes.
4. Safe area utility classes in `global.css`:

```css
.safe-area-top    { padding-top:    env(safe-area-inset-top);    }
.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

### 5.2 Touch & Accessibility

- Every interactive element must have a minimum `44 × 44px` tap target. Use `padding` to expand tap areas without changing visual size.
- All icon-only buttons (trash, etc.) must have an `aria-label` attribute.
- Color is **never** the sole indicator of meaning. Status badges always include a text label alongside their color.
- Apply `-webkit-tap-highlight-color: transparent` on all interactive elements.
- Disable `user-select` on non-text UI elements to prevent accidental text selection on long press.

### 5.3 Token Usage Rules

| ✅ Do | ❌ Do not |
|-------|----------|
| `color: var(--text-primary)` | `color: #FFFFFF` |
| `background: var(--bg-secondary)` | `background: #2C2C2E` |
| `border-radius: var(--radius-lg)` | `border-radius: 16px` |
| `gap: var(--space-3)` | `gap: 12px` |
| Define new values as tokens first | Use `!important` |
| `z-index` max `200`, document exceptions | Undocumented high `z-index` values |

### 5.4 Accent Color Rules

`#007AFF` is used for:
- Primary action buttons
- Active tab indicator
- Active toggle track
- Text links
- Active year pill
- Passenger name pill text
- Current location map badge background
- Active day accent bar (Upcoming screen)
- Focus rings

`#007AFF` is **never** used for:
- Decorative backgrounds
- Section dividers
- Informational text that is not interactive

### 5.5 Icons

- Use `lucide-react` exclusively. Do not mix icon libraries.
- Standard sizes: `16px` (inline / label), `20px` (card actions), `24px` (tab bar), `28px` (large feature icons).
- Icons inherit `currentColor` from parent unless a specific override is documented in the component spec above.
- All icon-only interactive elements must have a `44×44px` tap target and an `aria-label`.

### 5.6 Country Color Assignment (Implementation)

```
// Pseudocode — implement in the data layer, not in components

function buildCountryColorMap(travelDays: TravelDay[]): Map<string, number> {
  const map = new Map<string, number>();
  let paletteIndex = 1;

  for (const day of travelDays.sortedByDate()) {
    if (!map.has(day.countryCode)) {
      map.set(day.countryCode, paletteIndex);
      paletteIndex = paletteIndex === 12 ? 1 : paletteIndex + 1;
    }
  }

  return map; // { "CY": 1, "GB": 2, "DE": 3, ... }
}

// In component CSS, resolve the palette index to a CSS variable:
// style={{ background: `var(--country-palette-${colorMap.get(countryCode)})` }}
```

The color map is computed once when travel data loads for a year and stored in React state or context. It is passed down to both the Days by Country screen and the Calendar View. It is **not** stored in localStorage or any persistent storage.

---

*Travel Manager Design Rules Book — v1.0*
