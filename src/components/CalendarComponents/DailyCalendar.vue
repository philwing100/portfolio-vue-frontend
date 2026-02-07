<template>
  <div class="daily-calendar">
    <div 
      class="calendar-container" 
      ref="calendarContainer" 
      @mousedown="handleCalendarMouseDown"
      @click="handleEmptySpaceClick($event)"
    >
      <div class="time-slots">
        <!-- Generate time slots (24 hours) -->
        <div
          v-for="hour in 24"
          :key="hour"
          class="time-slot"
          :style="{ top: calculateTopPosition(hour) }"
        >
          {{ formatHour(hour) }}
        </div>
      </div>

      <div class="events">
        <!-- Render events dynamically -->
        <div
          v-for="(event, index) in combinedEvents"
          :key="`${event.listIndex}-${event.itemIndex}`"
          :class="['event', eventSizeClass(event), { 'event-complete': event.complete }]"
          :style="getEventDynamicStyle(event)"
          @mousedown.stop.prevent="handleEventMouseDown(event, index, $event)"
        >
          <!-- top/bottom drag handles -->
          <div
            class="drag-handle top"
            @mousedown.stop.prevent="startDrag(event.listIndex, event.itemIndex, 'top', $event)"
            @click.stop
          />
          <div
            class="drag-handle bottom"
            @mousedown.stop.prevent="startDrag(event.listIndex, event.itemIndex, 'bottom', $event)"
            @click.stop
          />
          <div class="event-content">
            <div class="event-title">{{ event.textString }}</div>
            <div class="event-time" v-if="event.scheduledTime || event.endingTime">
              {{ (event.scheduledTime || '') + (event.scheduledTime && event.endingTime ? ' – ' : '') + (event.endingTime || '') }}
            </div>
          </div>
        </div>
      </div>

      <!-- EventCard integration -->
      <EventCard
        v-if="showEventCard"
        :event="activeEvent"
        :eventPosition="eventCardPosition"
        :list="activeList"
        @close="closeEventCard"
        @save="saveEvent"
        @update-list-color="handleUpdateListColor"
      />
    </div>
  </div>
</template>

<script>
import { getTodayDate } from '../../date.js';
import EventCard from './EventCard.vue';

export default {
  name: "DailyCalendar",
  components: {
    EventCard,
  },
  props: {
    lists: {
      type: Array,
      required: true,
      default: () => [],
    },
    date: {
      type: String,
      required: true,
    },
  },
  emits: ["update:lists"],
  data() {
    return {
      showEventCard: false,
      activeEvent: null,
      activeEventIndex: null,
      activeListIndex: null,
      eventCardPosition: { top: 200, left: 200 },
      mouseDownOnEmptySpace: false,
      dragState: {
        active: false,
        isDragging: false,
        listIndex: null,
        itemIndex: null,
        handle: null,
        startClientY: 0,
        startClientX: 0,
        pxPerMinute: 1,
        originalStartMin: 0,
        originalDurationMin: 60,
        previewStartMin: 0,
        previewDurationMin: 60,
      },
      snapInterval: 5,
      dragThreshold: 3,
      boundDragHandlers: {
        onDragging: null,
        endDrag: null,
      },
    };
  },
  computed: {
    combinedEvents() {
      const today = this.date;
      const events = [];
      
      this.lists.forEach((list, listIndex) => {
        // Skip lists that are not visible
        if (list.visible === false) return;
        
        const items = list.items || [];
        items.forEach((item, itemIndex) => {
          if (item.scheduledDate === today) {
            events.push({
              ...item,
              listIndex,
              itemIndex,
            });
          }
        });
      });
      
      return events;
    },
    visibleListLayout() {
      const positions = {};
      const visibleListIndexes = [];
      this.lists.forEach((list, index) => {
        if (list.visible !== false) {
          visibleListIndexes.push(index);
        }
      });

      visibleListIndexes.forEach((listIndex, position) => {
        positions[listIndex] = position;
      });

      const count = visibleListIndexes.length || 1;
      return { positions, count };
    },
    activeList() {
      if (this.activeListIndex === null || this.activeListIndex === undefined) return null;
      return this.lists[this.activeListIndex] || null;
    },
  },
  watch: {
    lists: {
      deep: true,
      handler(newLists) {
        if (this.activeListIndex === null || this.activeListIndex === undefined) return;
        if (this.activeEventIndex === null || this.activeEventIndex === undefined) return;

        const list = newLists[this.activeListIndex];
        if (!list || !Array.isArray(list.items)) return;

        const item = list.items[this.activeEventIndex];
        if (!item) return;

        const startMin = this.timeStringToMinutes(item.scheduledTime || item.scheduledStartTime || '');
        const endMin = startMin + Math.max(1, Math.round(item.taskTimeEstimate || 60));

        this.activeEvent = {
          ...item,
          scheduledTime: this.minutesToTimeString(startMin),
          endingTime: this.minutesToTimeString(endMin),
        };
      },
    },
  },
  methods: {
    // ------------------
    // Time conversions
    // ------------------
    timeStringToMinutes(time) {
      if (!time) return 0;
      const regex = /(\d{1,2}):(\d{2})(am|pm)/i;
      const m = time.trim().match(regex);
      if (!m) return 0;
      let [_, h, min, period] = m;
      h = parseInt(h, 10);
      min = parseInt(min, 10);
      if (period.toLowerCase() === 'pm' && h !== 12) h += 12;
      if (period.toLowerCase() === 'am' && h === 12) h = 0;
      return h * 60 + min;
    },
    minutesToTimeString(totalMin) {
      totalMin = Math.max(0, Math.min(totalMin, 24 * 60 - 1));
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const ampm = h >= 12 ? 'pm' : 'am';
      const hour12 = h % 12 === 0 ? 12 : h % 12;
      return `${hour12}:${m.toString().padStart(2, '0')}${ampm}`;
    },

    // ------------------
    // Drag handlers
    // ------------------
    startDrag(listIndex, itemIndex, handle, mouseEvent) {
      const slot = this.$refs.calendarContainer.querySelector('.time-slot');
      const slotHeight = slot ? slot.getBoundingClientRect().height : 60;
      const pxPerMinute = slotHeight / 60;

      const item = this.lists[listIndex].items[itemIndex];
      const startMin = this.timeStringToMinutes(item.scheduledTime);
      const durationMin = Math.max(1, Math.round(item.taskTimeEstimate));

      this.dragState = {
        active: true,
        isDragging: false,
        listIndex,
        itemIndex,
        handle,
        startClientY: mouseEvent.clientY,
        startClientX: mouseEvent.clientX,
        pxPerMinute,
        originalStartMin: startMin,
        originalDurationMin: durationMin,
        previewStartMin: startMin,
        previewDurationMin: durationMin,
      };

      // Bind methods to preserve 'this' context and store references for removal
      this.boundDragHandlers.onDragging = this.onDragging.bind(this);
      this.boundDragHandlers.endDrag = this.endDrag.bind(this);

      window.addEventListener('mousemove', this.boundDragHandlers.onDragging);
      window.addEventListener('mouseup', this.boundDragHandlers.endDrag);
    },
    onDragging(mouseEvent) {
      if (!this.dragState.active) return;
      const ds = this.dragState;
      
      const dx = mouseEvent.clientX - ds.startClientX;
      const dy = mouseEvent.clientY - ds.startClientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (!ds.isDragging && distance < this.dragThreshold) {
        return;
      }
      
      ds.isDragging = true;
      
      const deltaMinutesRaw = dy / ds.pxPerMinute;
      const deltaMinutes = Math.round(deltaMinutesRaw / this.snapInterval) * this.snapInterval;

      if (ds.handle === 'top') {
        let newStart = ds.originalStartMin + deltaMinutes;
        const maxStart = ds.originalStartMin + ds.originalDurationMin - this.snapInterval;
        newStart = Math.max(0, Math.min(newStart, maxStart));
        const newDuration = ds.originalStartMin + ds.originalDurationMin - newStart;
        ds.previewStartMin = newStart;
        ds.previewDurationMin = newDuration;
      } else if (ds.handle === 'bottom') {
        let newDuration = ds.originalDurationMin + deltaMinutes;
        newDuration = Math.max(this.snapInterval, newDuration);
        const maxDuration = 24 * 60 - ds.originalStartMin;
        newDuration = Math.min(newDuration, maxDuration);
        ds.previewDurationMin = newDuration;
      } else if (ds.handle === 'center') {
        let newStart = ds.originalStartMin + deltaMinutes;
        const maxStart = 24 * 60 - ds.originalDurationMin;
        newStart = Math.max(0, Math.min(newStart, maxStart));
        ds.previewStartMin = newStart;
        ds.previewDurationMin = ds.originalDurationMin;
      }

      this.dragState = { ...ds };
    },
    endDrag(mouseEvent) {
      const ds = this.dragState;
      if (!ds.active) return;

      window.removeEventListener('mousemove', this.boundDragHandlers.onDragging);
      window.removeEventListener('mouseup', this.boundDragHandlers.endDrag);

      if (!ds.isDragging) {
        const item = this.lists[ds.listIndex].items[ds.itemIndex];
        
        const startMin = this.timeStringToMinutes(item.scheduledTime);
        const endMin = startMin + Math.max(1, Math.round(item.taskTimeEstimate || 60));
        this.activeEvent = {
          ...item,
          scheduledTime: this.minutesToTimeString(startMin),
          endingTime: this.minutesToTimeString(endMin),
        };
        this.activeEventIndex = ds.itemIndex;
        this.activeListIndex = ds.listIndex;
        
        const calRect = this.$refs.calendarContainer.getBoundingClientRect();
        const x = mouseEvent.clientX - calRect.left;
        const y = mouseEvent.clientY - calRect.top;
        this.setEventCardPosition(x, y, calRect);
        this.showEventCard = true;
        
        this.resetDragState();
        return;
      }

      const item = this.lists[ds.listIndex].items[ds.itemIndex];
      const newStartMin = ds.previewStartMin;
      const newDurationMin = ds.previewDurationMin;

      const updatedItem = {
        ...item,
        scheduledTime: this.minutesToTimeString(newStartMin),
        endingTime: this.minutesToTimeString(newStartMin + newDurationMin),
        scheduledStartTime: this.minutesToTimeString(newStartMin),
        scheduledEndTime: this.minutesToTimeString(newStartMin + newDurationMin),
        taskTimeEstimate: newDurationMin,
      };

      this.updateItem(ds.listIndex, ds.itemIndex, updatedItem);
      this.resetDragState();
    },
    
    resetDragState() {
      this.dragState = {
        active: false,
        isDragging: false,
        listIndex: null,
        itemIndex: null,
        handle: null,
        startClientY: 0,
        startClientX: 0,
        pxPerMinute: 1,
        originalStartMin: 0,
        originalDurationMin: 60,
        previewStartMin: 0,
        previewDurationMin: 60,
      };
    },
    
    updateItem(listIndex, itemIndex, updatedItem) {
      const updatedLists = JSON.parse(JSON.stringify(this.lists));
      updatedLists[listIndex].items[itemIndex] = updatedItem;
      this.$emit('update:lists', updatedLists);
    },
    handleUpdateListColor(newColor) {
      if (this.activeListIndex === null || this.activeListIndex === undefined) return;
      const updatedLists = JSON.parse(JSON.stringify(this.lists));
      const targetList = updatedLists[this.activeListIndex];
      if (!targetList) return;
      const previousColor = targetList.color;

      targetList.color = newColor;

      if (Array.isArray(targetList.items)) {
        targetList.items = targetList.items.map((item) => {
          if (!item || typeof item !== 'object') return item;

          if (!item.color || item.color === previousColor) {
            return { ...item, color: newColor };
          }

          return item;
        });
      }
      this.$emit('update:lists', updatedLists);
    },
    
    // ------------------
    // END Drag handlers
    // ------------------
    calculateTopPosition(hour) {
      return `${hour * 3.75}rem`;
    },
    formatHour(hour) {
      const ampm = hour >= 12 ? "PM" : "AM";
      const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
      return `${formattedHour} ${ampm}`;
    },
    getEventDynamicStyle(event) {
      const { positions, count } = this.visibleListLayout;
      const positionIndex = positions[event.listIndex] ?? 0;

      const isPreview =
        this.dragState.active &&
        this.dragState.listIndex === event.listIndex &&
        this.dragState.itemIndex === event.itemIndex;

      const startMin = isPreview
        ? this.dragState.previewStartMin
        : this.timeStringToMinutes(event.scheduledTime);
      const durationMin = isPreview
        ? this.dragState.previewDurationMin
        : Math.max(1, Math.round(event.taskTimeEstimate));

      const endMin = startMin + durationMin;

      const topRem = (startMin / 60) * 3.75;
      const heightRem = (durationMin / 60) * 3.75;
      const minHeight = 1.5625;
      const finalHeightRem = Math.max(minHeight, heightRem);

      const baseLeftPercent = 10;
      const baseWidthPercent = 80;
      const columnWidth = baseWidthPercent / count;
      let leftPercent = baseLeftPercent + positionIndex * columnWidth;
      let widthPercent = columnWidth;

      // Compute overlap depth for events in the same list column
      const overlapShiftPercent = 4; // small horizontal shift per overlapping layer
      let overlapIndex = 0;
      const sameListEvents = this.combinedEvents.filter(
        (e) => e.listIndex === event.listIndex
      );

      sameListEvents.forEach((other) => {
        if (other === event) return;
        const otherStart = this.timeStringToMinutes(other.scheduledTime);
        const otherDur = Math.max(1, Math.round(other.taskTimeEstimate));
        const otherEnd = otherStart + otherDur;

        const overlaps = otherEnd > startMin && otherStart < endMin;

        if (overlaps) {
          if (
            otherStart < startMin ||
            (otherStart === startMin && other.itemIndex < event.itemIndex)
          ) {
            overlapIndex += 1;
          }
        }
      });

      if (overlapIndex > 0) {
        const totalShift = overlapIndex * overlapShiftPercent;
        leftPercent += totalShift;
        widthPercent = Math.max(10, columnWidth - totalShift);
      }

      const listColor = (this.lists[event.listIndex] && this.lists[event.listIndex].color) || null;
      const backgroundColor = event.color || listColor || "var(--accentColor)";

      return {
        left: `${leftPercent}%`,
        width: `${widthPercent}%`,
        top: `${topRem}rem`,
        height: `${finalHeightRem}rem`,
        zIndex: Math.max(1, Math.round(startMin)),
        backgroundColor,
        textDecoration: event.complete ? "line-through" : "none",
        boxShadow: overlapIndex > 0 ? '0 0 0 2px var(--secondaryColor)' : 'none',
      };
    },
    getEventDurationMinutes(event) {
      if (!event) return 0;
      if (event.taskTimeEstimate) {
        return Math.max(1, Math.round(event.taskTimeEstimate));
      }
      const start = this.timeStringToMinutes(event.scheduledTime || event.scheduledStartTime || '');
      const end = this.timeStringToMinutes(event.endingTime || event.scheduledEndTime || '');
      if (end && end > start) {
        return end - start;
      }
      return 60;
    },
    eventSizeClass(event) {
      const duration = this.getEventDurationMinutes(event);
      if (duration <= 15) return 'event--short';
      if (duration <= 40) return 'event--medium';
      return 'event--long';
    },
    handleEventMouseDown(event, index, mouseEvent) {
      this.mouseDownOnEmptySpace = false;
      
      if (this.dragState && this.dragState.active) return;
      
      const eventEl = mouseEvent.currentTarget;
      const rect = eventEl.getBoundingClientRect();
      const handleHeight = 8;
      const clickY = mouseEvent.clientY - rect.top;
      
      let handle = 'center';
      if (clickY <= handleHeight) {
        handle = 'top';
      } else if (clickY >= rect.height - handleHeight) {
        handle = 'bottom';
      }
      
      this.startDrag(event.listIndex, event.itemIndex, handle, mouseEvent);
    },
    handleEmptySpaceClick(e) {
      if (e.target.classList.contains('calendar-container') && this.mouseDownOnEmptySpace) {
        const rect = this.$refs.calendarContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hour = Math.floor(y / 60);
        const minute = Math.floor((y % 60) / 1);
        const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
        const timeString = `${formattedHour}:${minute.toString().padStart(2, '0')}${hour >= 12 ? 'pm' : 'am'}`;
        const startMin = this.timeStringToMinutes(timeString);
        const endMin = startMin + 60;
        this.activeEvent = {
          title: '',
          startTime: timeString,
          endTime: '',
          color: '#2196f3',
          scheduledDate: this.date,
          scheduledTime: timeString,
          endingTime: this.minutesToTimeString(endMin),
          textString: '',
          taskTimeEstimate: 60,
          complete: false,
        };
        this.activeEventIndex = null;
        this.activeEventListType = null;
        this.setEventCardPosition(x, y, rect);
        this.showEventCard = true;
      }
    },
    handleCalendarMouseDown(e) {
      if (e.target.classList.contains('calendar-container')) {
        this.mouseDownOnEmptySpace = true;
      } else {
        this.mouseDownOnEmptySpace = false;
      }
    },
    setEventCardPosition(clickX, clickY, containerRect) {
      const cardWidth = 360;
      const cardHeight = 220;
      const cardShift = 32;

      const scrollTop = this.$refs.calendarContainer.scrollTop || 0;
      let desiredLeft = clickX - cardWidth / 2;
      let desiredTop = clickY + scrollTop - cardHeight / 2;

      const contentWidth = containerRect.width;
      const contentHeight = this.$refs.calendarContainer.scrollHeight;

      let finalLeft = desiredLeft;
      let finalTop = desiredTop - cardShift;

      if (finalLeft < 0) {
        const overflow = -finalLeft;
        desiredLeft += overflow + 30;
        finalLeft = desiredLeft;
      }
      if (finalLeft + cardWidth > contentWidth) {
        const overflow = finalLeft + cardWidth - contentWidth;
        desiredLeft -= overflow + 30;
        finalLeft = desiredLeft;
      }

      if (finalTop < 0) {
        const overflow = -finalTop;
        desiredTop += overflow + 10;
        finalTop = desiredTop - cardShift;
      }
      if (finalTop + cardHeight > contentHeight) {
        const overflow = finalTop + cardHeight - contentHeight;
        desiredTop -= overflow + 10;
        finalTop = desiredTop - cardShift;
      }

      const maxLeft = Math.max(0, contentWidth - cardWidth);
      const maxTop = Math.max(0, contentHeight - cardHeight);
      const left = Math.min(Math.max(0, desiredLeft), maxLeft);
      const top = Math.min(Math.max(0, desiredTop), maxTop);

      this.eventCardPosition = { left, top };
    },
    closeEventCard() {
      this.showEventCard = false;
      this.activeEvent = null;
      this.activeEventIndex = null;
      this.activeListIndex = null;
    },
    saveEvent(eventData) {
      const startMin = this.timeStringToMinutes(eventData.scheduledTime || '');
      const endMinFromField = this.timeStringToMinutes(eventData.endingTime || '');
      const endMin = endMinFromField || (startMin + Math.max(1, Math.round(eventData.taskTimeEstimate || 60)));
      const duration = Math.max(1, endMin - startMin);
      const normalized = {
        ...eventData,
        scheduledTime: this.minutesToTimeString(startMin),
        endingTime: this.minutesToTimeString(startMin + duration),
        scheduledStartTime: this.minutesToTimeString(startMin),
        scheduledEndTime: this.minutesToTimeString(startMin + duration),
        taskTimeEstimate: duration,
      };

      const updatedLists = JSON.parse(JSON.stringify(this.lists));
      
      if (
        this.activeListIndex !== null &&
        this.activeEventIndex !== null &&
        updatedLists[this.activeListIndex] &&
        Array.isArray(updatedLists[this.activeListIndex].items)
      ) {
        // Update existing item
        updatedLists[this.activeListIndex].items[this.activeEventIndex] = normalized;
      } else {
        // Ensure there is at least one list to add the new item to
        let targetIndex = updatedLists.findIndex(list => list.visible !== false);

        if (targetIndex === -1) {
          if (updatedLists.length === 0) {
            updatedLists.push({
              title: 'List 1',
              items: [],
              visible: true,
              color: '#2196f3',
            });
            targetIndex = 0;
          } else {
            targetIndex = 0;
          }
        }

        if (!Array.isArray(updatedLists[targetIndex].items)) {
          updatedLists[targetIndex].items = [];
        }

        updatedLists[targetIndex].items.push(normalized);
      }
      
      this.$emit('update:lists', updatedLists);
      this.closeEventCard();
    },
    scrollToDefaultTime() {
      const currentTime = new Date();
      const defaultScrollTime = currentTime.getHours() - 1;
      const scrollPosition = defaultScrollTime * 3.75 * 16;
      this.$refs.calendarContainer.scrollTop = scrollPosition;
    },
    normalizeList(list = []) {
      return list.map((item) => {
        const normalized = { ...item };
        const defaultStart = this.minutesToTimeString(8 * 60);
        const startTime = normalized.scheduledTime || normalized.scheduledStartTime || defaultStart;
        const duration = Number(normalized.taskTimeEstimate || normalized.timeEstimate) || 60;
        const startMinutes = this.timeStringToMinutes(startTime);
        const endTime =
          normalized.endingTime ||
          normalized.scheduledEndTime ||
          this.minutesToTimeString(startMinutes + duration);

        normalized.scheduledDate = normalized.scheduledDate || this.date;
        normalized.scheduledTime = startTime;
        normalized.scheduledStartTime = startTime;
        normalized.endingTime = endTime;
        normalized.scheduledEndTime = endTime;
        normalized.taskTimeEstimate = duration;

        return normalized;
      });
    },
  },
  mounted() {
    const updatedLists = this.lists.map(list => ({
      ...list,
      items: this.normalizeList(list.items || [])
    }));
    
    const hasChanges = JSON.stringify(updatedLists) !== JSON.stringify(this.lists);
    if (hasChanges) {
      this.$emit('update:lists', updatedLists);
    }
    
    this.scrollToDefaultTime();
  },
};
</script>

<style scoped>
.daily-calendar {
  position: relative;
  height: 100%;
  width: 100%;
}

.calendar-container {
  position: relative;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--secondaryColor);
}

.time-slots {
  position: absolute;
  width: 100%;
  pointer-events: none;
}

.time-slot {
  position: absolute;
  left: 0;
  width: 100%;
  height: 3.75rem;
  border-top: 0.0625rem solid var(--accentColor);
  text-align: left;
  padding-left: 0.625rem;
  box-sizing: border-box;
  font-size: 0.75rem;
  color: var(--accentColor);
  background-color: var(--secondaryColor);
}

.events {
  position: absolute;
  width: 100%;
}

.event {
  position: absolute;
  left: 20%;
  width: 60%;
  color: var(--primaryColor);
  border-radius: 0.25rem;
  padding-left: 0.625rem;
  padding-top: 0.3125rem;
  box-sizing: border-box;
  cursor: move; /* changed from pointer to move */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  background-color: var(--accentColor);
  font-size: 1rem;
  transition: background-color 0.2s;
  position: absolute;
}

.event-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  padding-right: 0.5rem;
}

.event-title {
  font-weight: 600;
  font-size: 0.9rem;
}

.event-time {
  font-size: 0.75rem;
}

.event--short .event-content,
.event--medium .event-content {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.event--short .event-time {
  font-size: 0.65rem;
}

.event--long .event-content {
  flex-direction: column;
  align-items: flex-start;
}

/* drag handles */
.drag-handle {
  position: absolute;
  left: 0;
  width: 100%;
  height: 8px;
  background: transparent;
  cursor: ns-resize;
  z-index: 2;
}
.drag-handle.top {
  top: 0;
  border-top-left-radius: 0.25rem;
  border-top-right-radius: 0.25rem;
}
.drag-handle.bottom {
  bottom: 0;
  border-bottom-left-radius: 0.25rem;
  border-bottom-right-radius: 0.25rem;
}
/* visual hint on hover */
.drag-handle:hover {
  background: rgba(0,0,0,0.06);
}

.event-complete {
  text-decoration: line-through;
}

.event:hover {
  background-color: var(--primaryColor);
}
</style>