# UI Component Reference

All reusable components live under `src/components/`. Use CSS custom properties `var(--primaryColor)`, `var(--secondaryColor)`, and `var(--accentColor)` for consistent theming.

---

## GeneralComponents

### `Button.vue`
Simple styled button.
```html
<Button :onClick="handleClick" variant="primary">Label</Button>
```
- **Props:** `onClick` (Function, required), `variant` (String, default `'primary'`)

---

### `TextField.vue`
Single-line text input with optional label and character counter.
```html
<TextField v-model="text" label="Name" :maxLength="60" />
```
- **Props:** `modelValue` (String), `label` (String), `maxLength` (Number|null)
- **Emits:** `update:modelValue`

---

### `IntInput.vue`
Number input clamped to min/max.
```html
<IntInput v-model="count" label="Amount" :min="1" :max="100" />
```
- **Props:** `modelValue` (Number, required), `min` (default 0), `max` (default 100), `label` (String)
- **Emits:** `update:modelValue`

---

### `Dropdown.vue`
Single-select dropdown. Use `labelKey`/`valueKey` for object arrays.
```html
<Dropdown v-model="selected" :options="['A','B','C']" />
<Dropdown v-model="val" :options="items" labelKey="name" valueKey="id" />
```
- **Props:** `options` (Array, required), `modelValue`, `labelKey` (String), `valueKey` (String)
- **Emits:** `update:modelValue`, `selected` (full option object)

---

### `Tabs.vue`
Tab container — renders the named slot matching the active tab.
```html
<Tabs :tabs="[{ label: 'A', slotName: 'a' }, { label: 'B', slotName: 'b' }]">
  <template #a>Content A</template>
  <template #b>Content B</template>
</Tabs>
```
- **Props:** `tabs` (Array `[{ label, slotName? }]`, required), `initial` (Number, default 0)
- **Note:** `slotName` falls back to `label` — avoid spaces in `label` if `slotName` is omitted.

---

### `GenericModal.vue`
Three-slot modal overlay (`header`, `body`, `footer`). Close button always visible.
```html
<GenericModal :isOpen="show" @close="show = false">
  <template #header>Title</template>
  <template #body>Content</template>
  <template #footer><button>OK</button></template>
</GenericModal>
```
- **Props:** `isOpen` (Boolean)
- **Emits:** `close`

---

### `DownwardExpandContent.vue`
Collapsible section with animated arrow toggle.
```html
<DownwardExpandContent label="Advanced" :initiallyExpanded="false">
  Hidden content here
</DownwardExpandContent>
```
- **Props:** `label` (String, required), `initiallyExpanded` (Boolean, default false)

---

### `BooleanSlider.vue`
Toggle switch that shows Yes / No.
```html
<BooleanSlider v-model="isOn" label="Enable" />
```
- **Props:** `modelValue` (Boolean, default false), `label` (String)
- **Emits:** `update:modelValue`

---

### `DaysOfTheWeek.vue`
Bitmask day-of-week selector (Mon–Sun = bits 0–6).
```html
<DaysOfTheWeek v-model="daysBitmask" :disabled="false" />
```
- **Props:** `modelValue` (Number bitmask, default 0), `disabled` (Boolean)
- **Emits:** `update:modelValue`

---

### `TestButton.vue`
Debug/test button with a label prop.
```html
<TestButton label="Test me" :onClick="fn" />
```
- **Props:** `label` (String), `onClick` (Function, required)

---

## Root-level Components

### `ContextMenu.vue`
Dropdown context menu attached to a trigger.
```html
<ContextMenu
  :items="[{ label: 'Edit' }, { label: 'Delete' }]"
  @select="handleSelect"
/>
```
- **Props:** `modelValue` (Boolean visibility), `items` (Array `[{ label }]`)
- **Emits:** `update:modelValue`, `select` (item object)
- **Slots:** `trigger` (defaults to "⋯" button), default (extra items)
- **Note:** Add `@click.stop` on the wrapper if inside a clickable parent.

---

## ListItems

### `DateInput.vue`
Calendar date picker (YYYY-MM-DD).
```html
<DateInput v-model="date" />
```
- **Props:** `modelValue` (String|null)
- **Emits:** `update:modelValue`

### `TimeInput.vue`
12-hour time picker (30-min slots). Supports min/max range.
```html
<TimeInput v-model="time" minTime="8:00am" maxTime="6:00pm" />
```
- **Props:** `modelValue` (String|null), `minTime`, `maxTime`
- **Emits:** `update:modelValue`

### `MinuteInput.vue`
Duration input in minutes (1–1440).
```html
<MinuteInput v-model="duration" />
```
- **Props:** `modelValue` (String)
- **Emits:** `update:modelValue`

### `CheckboxOneWay.vue`
One-way checkbox (cannot uncheck once checked).
```html
<CheckBoxOneWay :checked="item.complete" @checkbox-toggled="onToggle" />
```
- **Props:** `checked` (Boolean)
- **Emits:** `checkbox-toggled`

---

## HabitComponents

### `Habit.vue`
Habit card with animated progress bar, streak count, and goal tracking.
```html
<Habit :habit="habitObj" @edit="openModal" />
```
- **Props:** `habit` `{ id, title, color, currentStreak, highestStreak, goal, days, lastUpdated }`
- **Emits:** `edit`

### `HabitModal.vue`
Full create/edit/delete modal for a habit.
```html
<HabitModal :isOpen="show" :habit="selected" @update="save" @delete="del" @close="show=false" />
```
- **Props:** `isOpen`, `habit` (Object)
- **Emits:** `close`, `update`, `delete`

### `AddButton.vue`
Large circular "+" button.
```html
<AddButton @click="createNew" />
```
- **Emits:** `click`

---

## FlashcardComponents

### `FolderCard.vue`
Clickable folder tile with color bar and context menu.
```html
<FolderCard :folder="f" :setCount="3" @click="open" @edit="edit" @delete="del" />
```
- **Props:** `folder` `{ id, title, color }`, `setCount` (Number)
- **Emits:** `click`, `edit`, `delete`

### `SetCard.vue`
Clickable set tile showing card count, due badge, and new badge.
```html
<SetCard :set="s" :dueCount="5" @study="study" @edit="edit" @delete="del" />
```
- **Props:** `set` `{ id, title, cards[] }`, `dueCount` (Number)
- **Emits:** `study`, `edit`, `delete`

### `FlashcardDisplay.vue`
3-D flip card. Clicking reveals the back face; emits `flip` once.  
Automatically resets when the `card` prop changes.
```html
<FlashcardDisplay :card="{ front: 'Q', back: 'A' }" @flip="showRatings = true" />
```
- **Props:** `card` `{ front, back }`
- **Emits:** `flip`

### `FolderModal.vue`
Create/edit folder modal (name + color picker).
```html
<FolderModal :isOpen="show" :folder="selected" @save="save" @delete="del" @close="show=false" />
```
- **Props:** `isOpen`, `folder` (Object|null — null = create mode)
- **Emits:** `save`, `delete`, `close`

### `SetModal.vue`
Create/edit set modal with three tabs: **Cards**, **Options**, **Import / Export**.
```html
<SetModal :isOpen="show" :set="selected" :folders="folders" @save="save" @delete="del" @close="show=false" />
```
- **Props:** `isOpen`, `set` (Object|null), `folders` (Array)
- **Emits:** `save`, `delete`, `close`
- **Import/Export:** User types term delimiter (default `\t`) and card delimiter (default `\n`); escape sequences `\t` and `\n` are parsed automatically.

---

## SettingsComponents

### `ColorPicker.vue`
Chrome-style color picker wrapping `vue-color`.
```html
<ColorPicker v-model="hexColor" label="Primary" />
```
- **Props:** `modelValue` (String hex, default `'#68CCCA'`), `label` (String)
- **Emits:** `update:modelValue`

---

## StatsComponents

### `LifeCalendar.vue`
91×52 weekly grid visualization of a lifespan.
```html
<LifeCalendar startDate="1995-06-15" />
```
- **Props:** `startDate` (String YYYY-MM-DD, required)

---

## LearnComponents

### `Pomodoro.vue`
SVG ring timer with draggable duration, Work/Break modes, and PiP support.
No props — self-contained with `localStorage` state.

### `PiP.vue`
Minimal timer for the `DocumentPictureInPicture` floating window.
Communicates with `Pomodoro.vue` via `BroadcastChannel`.

---

## CalendarComponents

### `DailyCalendar.vue`
24-hour drag-to-resize event timeline.
```html
<DailyCalendar v-model:lists="lists" :date="dateStr" />
```
- **Props:** `lists` (Array, required), `date` (String YYYY-MM-DD, required)
- **Emits:** `update:lists`

### `EventCard.vue`
Popup editor for a single calendar event.
- **Props:** `event`, `eventPosition`, `list`
- **Emits:** `close`, `save`, `update-list-color`

---

## SidebarComponents

### `SideBar.vue`
Collapsible navigation sidebar. Self-contained — reads routes from a hardcoded list.
Persists open/closed state in `localStorage('isSideBarExtended')`.

---

## AboutMeComponents

| Component | Purpose |
|-----------|---------|
| `FullPage.vue` | Full-viewport scroll container with section navigation |
| `ProfilePicture.vue` | Circular hero image |
| `SideScrolling.vue` | Horizontal marquee of tech icons |
| `Projects.vue` | Project card grid |
| `Experience.vue` | Job history list |
| `ConnectWithMe.vue` | Social / contact links |
| `AshEffect.vue` | Falling particle canvas animation |
