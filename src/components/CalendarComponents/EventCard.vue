<template>
  <div
    class="event-card"
    :style="cardPositionStyle"
  >
    <div class="event-card-header">
      <TextField
        ref="titleInput"
        v-model="localEvent.textString"
        placeholder="Add title"
        class="event-title"
        autofocus
      />
      <Button class="close-btn" @click="$emit('close')">✕</Button>
    </div>
    <div class="event-card-body">
      <div class="event-time-row">
        <div class="time-input-group">
          <label class="time-label">Start</label>
          <TimeInput
            v-model="localEvent.scheduledTime"
            :maxTime="localEvent.endingTime"
          />
        </div>
        <span class="time-separator">–</span>
        <div class="time-input-group">
          <label class="time-label">End</label>
          <TimeInput
            v-model="localEvent.endingTime"
            :minTime="localEvent.scheduledTime"
          />
        </div>
      </div>
    </div>
    <div class="event-card-footer">
      <Button class="more-btn" @click="toggleDrawer" aria-label="List settings">
        ⚙
      </Button>
      <Button class="save-btn" @click="saveEvent">Save</Button>
    </div>
    <Drawer
      v-if="drawerOpen"
      :event="localEvent"
      :listTitle="list ? list.title : ''"
      :color="list && list.color ? list.color : localEvent.color"
      @close="drawerOpen = false"
      @update-list-color="handleDrawerListColor"
    />
  </div>
</template>

<script>
import TextField from '../GeneralComponents/TextField.vue';
import TimeInput from '../ListItems/TimeInput.vue';
import ColorPicker from '../SettingsComponents/ColorPicker.vue';
import DownwardExpandContent from '../GeneralComponents/DownwardExpandContent.vue';
import Button from '../GeneralComponents/Button.vue';
import Drawer from './Drawer.vue';

export default {
  name: 'EventCard',
  components: {
    TextField,
    TimeInput,
    ColorPicker,
    DownwardExpandContent,
    Button,
    Drawer,
  },
  props: {
    event: {
      type: Object,
      default: () => ({
        textString: '',
        scheduledTime: '',
        endingTime: '',
        color: '#2196f3',
      }),
    list: {
      type: Object,
      default: () => null,
    },
    },
    eventPosition: {
      type: Object,
      // top/left are numeric pixel values relative to the calendar content
      default: () => ({ top: 200, left: 200 }),
    },
  },
  data() {
    return {
      localEvent: { ...this.event },
      drawerOpen: false,
    };
  },
  computed: {
    cardPositionStyle() {
      const shift = 32;
      let top = this.eventPosition.top - shift;
      if (top < 0) top = 0;
      return {
        position: 'absolute',
        left: `${this.eventPosition.left}px`,
        top: `${top}px`,
        zIndex: 2000,
      };
    },
    
  },
  watch: {
    event: {
      handler(newVal) {
        this.localEvent = { ...newVal };
      },
      deep: true,
    },
  },
  mounted() {
    this.$nextTick(() => {
      if (this.$refs.titleInput && this.$refs.titleInput.$el.querySelector('input')) {
        this.$refs.titleInput.$el.querySelector('input').focus();
      }
    });
  },
  methods: {
    saveEvent() {
      this.$emit('save', { ...this.localEvent });
    },
    toggleDrawer() {
      this.drawerOpen = !this.drawerOpen;
    },
    handleDrawerListColor(color) {
      this.$emit('update-list-color', color);
    },
    
  },
};
</script>

<style scoped>
.event-card {
  min-width: 320px;
  max-width: 400px;
  background: var(--primaryColor);
  border-radius: 0.75rem;
  box-shadow: 0 4px 24px rgba(0,0,0,0.15);
  padding: 1.25rem 1.5rem 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.event-title {
  flex: 1;
  font-size: 1.1rem;
  font-weight: 600;
}

.close-btn {
  background: transparent;
  color: var(--accentColor);
  font-size: 1.25rem;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

.event-card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-time-row {
  display: flex;
  align-items: end;
  gap: 0.5rem;
}

.time-input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.time-label {
  font-size: 0.875rem;
  color: var(--accentColor);
  font-weight: 500;
}

.time-separator {
  font-size: 1.25rem;
  color: var(--accentColor);
  margin-bottom: 0.25rem;
}



.event-card-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 1rem;
}

.more-btn {
  background: var(--secondaryColor);
  color: var(--accentColor);
  border-radius: 0.25rem;
  font-weight: 500;
  padding: 0.5rem 1.25rem;
  border: none;
  cursor: pointer;
  transition: background 0.2s;
}
.more-btn:hover {
  background: var(--accentColor);
  color: var(--primaryColor);
}

.save-btn {
  background: var(--accentColor);
  color: var(--primaryColor);
  border-radius: 0.25rem;
  font-weight: 600;
  padding: 0.5rem 1.25rem;
  border: none;
  cursor: pointer;
}
</style>