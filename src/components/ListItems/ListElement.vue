<template>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">

  <div class="template-container">
    <!-- List dropdown selector -->
    <div v-if="!multiplayer" class="list-dropdown-container">
      <div class="list-dropdown" @click="toggleListDropdown">
        <div 
          class="current-list-title" 
          :contenteditable="isListDropdownOpen"
          @blur="updateCurrentListTitle($event)"
          @keydown.enter.prevent="closeListDropdown"
          @input="handleTitleInput"
          ref="currentTitleInput"
          spellcheck="false"
        >
          {{ currentList.title }}
        </div>
        <i class="fa-solid fa-chevron-down dropdown-icon" :class="{ 'rotated': isListDropdownOpen }"></i>
      </div>
      
      <div v-if="isListDropdownOpen" class="list-dropdown-menu">
        <div 
          v-for="(list, listIndex) in lists" 
          :key="listIndex"
          class="list-dropdown-item"
          :class="{ active: currentListIndex === listIndex }"
          @click="selectListForEditing(listIndex)"
        >
          <span 
            class="list-item-title"
            :contenteditable="currentListIndex === listIndex && isListDropdownOpen"
            @blur="updateListTitle(listIndex, $event)"
            @keydown.enter.prevent="closeListDropdown"
            spellcheck="false"
          >
            {{ list.title }}
          </span>
          <button 
            v-if="lists.length > 1"
            class="remove-list-btn-dropdown" 
            @click.stop="removeList(listIndex)"
            aria-label="Remove list"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <div class="list-dropdown-divider"></div>
        
        <div class="list-dropdown-item new-list-item" @click="addNewList">
          <i class="fa-solid fa-plus"></i>
          <span>New List</span>
        </div>
      </div>
    </div>

    <div class="ListContainer">
      <ul class="ListItem">
        <li v-for="(item, index) in currentItems" :key="index" draggable="true" @dragstart="dragStart(index)"
          :style="index === selectedItemIndex ? 'border: 3px solid blue; border-radius:5px; transition: border-color 0.1s ease;' : 'border: 3px solid transparent;'"
          @dragover="dragOver" @drop="drop(index)">
          <div class="item-container" @click="focusEditable(index);">
            <CheckBoxOneWay
              label=""
              @click.stop
              :checked="item.complete"
              @checkbox-toggled="handleCheckboxToggled(index, $event)"
            />
            <div class="text-cursor item-text" :class="{ 'completed-text': item.complete }" ref="itemSpan" contenteditable="true"
              @keydown.enter="handleEnter(index, $event)" @keydown.backspace="handleBackspace(index, $event)"
              @keydown.up="handleArrowUp(index, $event)" @keydown.down="handleArrowDown(index, $event)"
              @input="saveEditableText(index, $event)" spellcheck="false">
              {{ item.textString }}
            </div>
          </div>

          <div v-if="editingIndex === index" class="inline-editor" @click.stop>
            <div class="editor-row inputs-row">
              <div class="editor-input">
                <label class="editor-label">Start</label>
                <TimeInput 
                  v-model="editingTemp.scheduledStartTime" 
                  :maxTime="editingTemp.scheduledEndTime"
                />
              </div>
              <div class="editor-input">
                <label class="editor-label">End</label>
                <TimeInput 
                  v-model="editingTemp.scheduledEndTime" 
                  :minTime="editingTemp.scheduledStartTime"
                />
              </div>
              <div class="editor-input">
                <label class="editor-label">Estimate</label>
                <MinuteInput v-model="editingTemp.taskTimeEstimate" />
              </div>
            </div>

            <div class="editor-row actions-row">
              <div class="actions-left">
                <ContextMenu
                  :items="recurringItems"
                  v-model="editingTemp.showRecurringMenu"
                  @select="handleRecurringSelect"
                >
                  <template #trigger>
                    <button class="recurring-btn">
                      <i class="fa-solid fa-repeat"></i>
                      {{ editingTemp.recurringTask ? (editingTemp.recurringFrequency || 'recurring') : 'recurring?' }}
                    </button>
                  </template>
                </ContextMenu>
              </div>

              <div class="editor-actions">
                <button class="delete-btn" @click="deleteItem(index)"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
          </div>
        </li>
      </ul>
      
      <button @click="addTaskToEnd" class="add-task-button">Add Task</button>
    </div>
  </div>
</template>

<script>
/* eslint-disable*/

import DateInput from './DateInput.vue';
import BooleanSlider from './BooleanSlider.vue';
import CheckBoxOneWay from './CheckboxOneWay.vue';
import TimeInput from './TimeInput.vue';
import MinuteInput from './MinuteInput.vue';
import { createList, getList } from '../../api.js';
import './ListElement.css';
import { getTodayDate, normalizeDate } from '../../date.js';
import { mapState } from 'vuex';
import { debounce } from 'lodash';
import ContextMenu from '../ContextMenu.vue';

const debouncedCreateList = debounce((listData) => {
  createList(listData)
    .then((response) => {
      console.log('Created list:', response);
    })
    .catch((error) => {
      console.error('Failed to create list:', error);
    });
}, 750);

export default {
  name: 'ListElement',
  props: {
    modelValue: {
      type: Array,
      required: true,
      default: () => [],
    },
    listName: {
      type: String,
      required: false
    },
    multiplayer: {
      type: Boolean,
      required: false
    },
    initialDate: {
      type: String,
      required: false,
    }
  },
  data() {
    return {
      lists: [],
      currentListIndex: 0,
      selectedItemIndex: 0,
      listType: null,
      listDescription: "",
      parentPage: 'dashboard',
      draggedIndex: null,
      isDropdownOpen: false,
      isListDropdownOpen: false,
      debugMode: false,
      lastCall: 0,
      editingIndex: null,
      editingTemp: null,
      isInternalUpdate: false,
      editingListIndex: null,
    };
  },
  watch: {
    modelValue: {
      handler(newValue) {
        if (this.isInternalUpdate) {
          this.isInternalUpdate = false;
          return;
        }

        if (Array.isArray(newValue) && newValue.length > 0) {
          if (newValue[0] && typeof newValue[0].title !== 'undefined') {
            this.lists = JSON.parse(JSON.stringify(newValue));
            this.lists.forEach((list, index) => {
              if (list.visible === undefined) {
                list.visible = (index === this.currentListIndex);
              }
              if (list.color === undefined) {
                list.color = '#2196f3';
              }
            });
          } else {
            this.lists = [{
              title: this.listName || 'List 1',
              items: [...newValue],
              visible: true,
              color: '#2196f3',
            }];
          }
        } else if (!newValue || newValue.length === 0) {
          if (this.lists.length === 0) {
            this.lists = [{
              title: this.listName || 'List 1',
              items: [this.createNewItem('')],
              visible: true,
              color: '#2196f3',
            }];
          }
        }

        // If an item is currently being edited, refresh the editingTemp
        // from the updated underlying item so its start/end times stay in sync
        if (this.editingIndex !== null && this.editingIndex !== undefined) {
          const items = this.currentItems;
          if (items && items[this.editingIndex]) {
            this.editingTemp = JSON.parse(JSON.stringify(items[this.editingIndex]));
          }
        }
      },
      immediate: true,
      deep: true,
    },
    currentListIndex: {
      handler(newIndex, oldIndex) {
        this.updateListVisibility(newIndex, oldIndex);
      }
    },
    initialDate() {
      if (this.listName != 'Backburner') {
        this.fetchList();
      }
    },
    'editingTemp.scheduledStartTime'() {
      this.syncEditingItemFromEditor();
    },
    'editingTemp.scheduledEndTime'() {
      this.syncEditingItemFromEditor();
    },
    'editingTemp.taskTimeEstimate'() {
      this.syncEditingItemFromEditor();
    },
    'editingTemp.recurringTask'() {
      this.syncEditingItemFromEditor();
    },
    'editingTemp.recurringFrequency'() {
      this.syncEditingItemFromEditor();
    }
  },
  created() {
    if (this.lists.length === 0) {
      this.lists.push({
        title: this.listName || 'List 1',
        items: [this.createNewItem('')],
        visible: true,
        color: '#2196f3',
      });
    }
  },
  mounted() {
    this.loadInitialData();
  },
  unmounted() {
    if (this.editingIndex !== null) {
      this.saveEditor(this.editingIndex);
    }
    this.emitLists();
  },
  components: {
    DateInput,
    BooleanSlider,
    CheckBoxOneWay,
    TimeInput,
    MinuteInput,
    ContextMenu,
  },
  computed: {
    currentList() {
      return this.lists[this.currentListIndex] || { title: '', items: [] };
    },
    currentItems() {
      return this.currentList.items || [];
    },
    completeItems() {
      return this.currentItems.filter((item) => item.complete);
    },
    incompleteItems() {
      return this.currentItems.filter((item) => !item.complete);
    },
    recurringItems() {
      return [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
      ];
    },
  },
  methods: {
    updateListVisibility(newIndex, oldIndex) {
      this.lists.forEach((list, index) => {
        list.visible = (index === newIndex);
      });
      this.emitLists();
    },

    toggleListDropdown() {
      this.isListDropdownOpen = !this.isListDropdownOpen;
      if (this.isListDropdownOpen) {
        this.$nextTick(() => {
          if (this.$refs.currentTitleInput) {
            this.$refs.currentTitleInput.focus();
            this.selectTitleText(this.$refs.currentTitleInput);
          }
        });
      }
    },

    selectTitleText(element) {
      const range = document.createRange();
      range.selectNodeContents(element);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    },

    closeListDropdown() {
      this.isListDropdownOpen = false;
      this.editingListIndex = null;
    },
    handleTitleInput(event) {
      // Prevent any special formatting during edit
      event.stopPropagation();
    },

    selectListForEditing(index) {
      if (index === this.currentListIndex && this.isListDropdownOpen) {
        // If clicking the same list, enable editing
        this.editingListIndex = index;
        this.$nextTick(() => {
          const items = document.querySelectorAll('.list-item-title');
          if (items[index]) {
            items[index].focus();
            this.selectTitleText(items[index]);
          }
        });
      } else {
        // Switch to the list
        this.switchList(index);
      }
    },

    switchList(index) {
      if (index >= 0 && index < this.lists.length) {
        if (this.editingIndex !== null) {
          this.saveEditor(this.editingIndex);
        }
        this.currentListIndex = index;
        this.selectedItemIndex = 0;
        this.closeListDropdown();
      }
    },
    
    addNewList() {
      this.lists.forEach(list => {
        list.visible = false;
      });

      const newList = {
        title: `List ${this.lists.length + 1}`,
        items: [this.createNewItem('')],
        visible: true,
        color: '#2196f3',
      };
      this.lists.push(newList);
      this.currentListIndex = this.lists.length - 1;
      this.selectedItemIndex = 0;
      this.emitLists();
      
      // Focus on the new list title for editing
      this.$nextTick(() => {
        this.isListDropdownOpen = true;
        this.editingListIndex = this.currentListIndex;
        this.$nextTick(() => {
          const items = document.querySelectorAll('.list-item-title');
          const newIndex = items.length - 2; // -2 because of divider
          if (items[newIndex]) {
            items[newIndex].focus();
            this.selectTitleText(items[newIndex]);
          }
        });
      });
    },
    
    removeList(index) {
      if (this.lists.length === 1) {
        return;
      }
      this.lists.splice(index, 1);
      if (this.currentListIndex >= this.lists.length) {
        this.currentListIndex = this.lists.length - 1;
      }
      this.lists.forEach((list, i) => {
        list.visible = (i === this.currentListIndex);
      });
      this.selectedItemIndex = 0;
      this.emitLists();
    },
    
    updateListTitle(index, event) {
      const newTitle = event.target.innerText.trim();
      if (newTitle && this.lists[index]) {
        this.lists[index].title = newTitle;
        this.emitLists();
      } else {
        // Reset to previous title if empty
        event.target.innerText = this.lists[index].title;
      }
      this.editingListIndex = null;
    },

    updateCurrentListTitle(event) {
      const newTitle = event.target.innerText.trim();
      if (newTitle) {
        this.currentList.title = newTitle;
        this.emitLists();
      } else {
        // Reset to previous title if empty
        event.target.innerText = this.currentList.title;
      }
    },
    
    emitLists() {
      this.isInternalUpdate = true;
      this.$emit("update:modelValue", JSON.parse(JSON.stringify(this.lists)));
    },

    saveEditableText(index, event) {
      const el = event.target;
      const newText = el.innerText.trim();

      const current = this.currentItems[index].textString;
      if (newText !== current) {
        this.currentItems[index].textString = newText;
        // Don't call saveList here, it's too frequent
        // Just emit the update
        this.emitLists();
      }

      const caret = this.getCaretPosition();
      this.$nextTick(() => {
        this.setCaretPosition(el, caret);
      });
    },
    handleCheckboxToggled(index, isChecked) {
      const item = this.currentItems[index];

      if (!item) return;

      // If the item is empty, treat a toggle as a delete
      if (item.textString == null || item.textString === '') {
        this.removeItemByIndex(index);
        this.saveList();
        return;
      }

      if (isChecked) {
        // Mark as complete and move to the end of the list
        if (!item.complete) {
          item.complete = true;
          this.currentItems.splice(this.currentItems.length, 0, item);
          this.currentItems.splice(index, 1);
        }
      } else {
        // Mark as incomplete and move just before the first completed item
        if (item.complete) {
          item.complete = false;

          // Remove from current position
          this.currentItems.splice(index, 1);

          // Find the first completed item to keep all incompletes grouped first
          const firstCompletedIndex = this.currentItems.findIndex((it) => it.complete);

          if (firstCompletedIndex === -1) {
            this.currentItems.push(item);
          } else {
            this.currentItems.splice(firstCompletedIndex, 0, item);
          }
        }
      }

      this.saveList();
    },
    completeItem(index) {
      const item = this.currentItems[index];

      if (!item) return;

      if (item.textString != null && item.textString !== '') {
        if (item.complete) {
          // Already completed; no further action
          return;
        }

        item.complete = true;
        // Move the item to the end of the list
        this.currentItems.splice(this.currentItems.length, 0, item);
        this.currentItems.splice(index, 1);
      } else {
        this.removeItemByIndex(index);
      }

      this.saveList();
    },
    getCaretPosition() {
      const selection = window.getSelection();
      return selection && selection.anchorOffset || 0;
    },
    throttle(func, limit) {
      let lastCall = 0; // Stores the timestamp of the last execution

      return function (...args) {
        const now = Date.now();
        if (now - lastCall >= limit) {
          lastCall = now;
          func.apply(this, args); // Execute the function
        }
      };
    },
    async saveList() {
      // Build a full "list object" for this page/day so the backend
      // can persist everything the dashboard and DailyCalendar need.
      // This uses the same structure as the `dailyLists` object in Dashboard.vue.
      const sanitizedLists = this.lists.map((list) => {
        const items = Array.isArray(list.items) ? list.items : [];

        // Drop a single leading empty item (placeholder row) from each list
        const trimmedItems =
          items.length > 0 && (items[0].textString === '' || items[0].textString === null)
            ? items.slice(1)
            : items;

        return {
          title: list.title,
          visible: list.visible !== false,
          color: list.color || '#2196f3',
          items: trimmedItems,
        };
      });

      const listData = {
        parent_page: this.parentPage || 'dashboard',
        date: this.initialDate,
        lists: sanitizedLists,
      };

      debouncedCreateList(listData);
      // Only emit if lists have actually changed
      this.emitLists();
    },

    async fetchList() {
      await this.$store.dispatch('checkAuth');
      // New-style call: request the full list object for this page/date.
      getList({ parent_page: this.parentPage || 'dashboard', date: this.initialDate })
        .then((response) => {
          if (response?.message === 'No list items to return') {
            return;
          }

          // BACKEND NOTE:
          //   For the new list object format, `response.data` should be an
          //   object with a `lists` array matching what `createList` saves:
          //   {
          //     parent_page: 'dashboard',
          //     date: 'YYYY-MM-DD',
          //     lists: [ { title, visible, color, items: [...] }, ... ]
          //   }
          const data = response && response.data;

          if (data && Array.isArray(data.lists)) {
            // Use the full list object returned from the backend.
            this.lists = data.lists.map((list, index) => ({
              title: list.title || `List ${index + 1}`,
              items: Array.isArray(list.items) ? list.items : [],
              visible: list.visible !== false,
              color: list.color || '#2196f3',
            }));

            // Ensure exactly one list is marked visible.
            let visibleIndex = this.lists.findIndex((l) => l.visible);
            if (visibleIndex === -1 && this.lists.length > 0) {
              visibleIndex = 0;
              this.lists[0].visible = true;
            }
            this.currentListIndex = visibleIndex >= 0 ? visibleIndex : 0;
            this.selectedItemIndex = 0;
            return;
          }

          // Legacy fallback: old API returns a flat array of items in
          // `response.data[0]`. Keep this path to avoid breaking the
          // existing backend until it is migrated.
          if (response?.data && Array.isArray(response.data[0])) {
            this.currentItems.length = 1;
            this.selectedItemIndex = 0;
            this.currentItems.push(this.createNewItem(''));
            this.currentItems.splice(0, 1);

            for (const item of response.data[0]) {
              this.loadItemFromGet(item);
            }
          }
        })
        .catch((error) => {
          console.error('Failed to get list:', error);
        });
    },
    loadItemFromGet(item) {
      let newItem = {
        textString: item.textString,
        scheduledCheckbox: item.scheduledCheckbox ? true : false,
        scheduledDate: normalizeDate(item.scheduledDate),
        scheduledTime: item.scheduledTime,
        taskTimeEstimate: item.taskTimeEstimate,
        recurringTask: item.recurringTask,
        recurringTaskEndDate: item.recurringTaskEndDate,
        dueDateCheckbox: item.dueDateCheckbox,
        dueDate: item.dueDate,
        complete: item.complete,
      };
      this.currentItems.push(newItem);
    },
    loadInitialData() {
      if (!this.currentItems || this.currentItems.length === 0) {
        this.currentItems.push(this.createNewItem(''));
      }
      this.fetchList();
    },
    createTestItem(text) {
      return {
        textString: text || '',
        scheduledCheckbox: true,
        scheduledDate: '2024-12-06',
        scheduledTime: "9:00 PM",
        scheduledStartTime: "9:00PM",
        scheduledEndTime: "10:00PM",
        taskTimeEstimate: "30",
        recurringTask: false,
        recurringFrequency: null,
        recurringTaskEndDate: null,
        dueDateCheckbox: false,
        dueDate: null,
        complete: false,
      };
    },
    createNewItem(text, prevItem = null) {
      let estimatedMinutes = 30;
      let startTime;

      if (prevItem) {
        const prevEstimate = Number(prevItem.taskTimeEstimate) || 30;
        estimatedMinutes = prevEstimate;

        const prevStart = prevItem.scheduledTime || prevItem.scheduledStartTime || null;
        const prevExplicitEnd = prevItem.endingTime || prevItem.scheduledEndTime || null;

        let prevEnd = prevExplicitEnd;
        if (!prevEnd && prevStart) {
          prevEnd = this.getTimeAfterMinutes(prevStart, prevEstimate);
        }

        startTime = prevEnd || this.getNearestTime();
      } else {
        estimatedMinutes = 30;
        startTime = this.getNearestTime();
      }

      const endTime = this.getTimeAfterMinutes(startTime, estimatedMinutes);

      return {
        textString: text || '',
        scheduledCheckbox: false,
        scheduledDate: this.initialDate,
        scheduledTime: startTime,
        scheduledStartTime: startTime,
        scheduledEndTime: endTime,
        taskTimeEstimate: estimatedMinutes,
        recurringTask: false,
        recurringFrequency: null,
        recurringTaskEndDate: null,
        dueDateCheckbox: false,
        dueDate: null,
        complete: false,
      };
    },
    createItemWithExistingValues(text) {
      const base = this.currentItems[this.selectedItemIndex] || {};

      const baseEstimate = Number(base.taskTimeEstimate) || 30;
      const baseStart = base.scheduledTime || base.scheduledStartTime || this.getNearestTime();
      const baseExplicitEnd = base.endingTime || base.scheduledEndTime || null;
      const baseEnd = baseExplicitEnd || this.getTimeAfterMinutes(baseStart, baseEstimate);

      return {
        textString: text,
        scheduledCheckbox: base.scheduledCheckbox || false,
        scheduledDate: base.scheduledDate || this.initialDate,
        scheduledTime: baseStart,
        scheduledStartTime: baseStart,
        scheduledEndTime: baseEnd,
        taskTimeEstimate: baseEstimate,
        recurringTask: !!base.recurringTask,
        recurringFrequency: base.recurringFrequency || null,
        recurringTaskEndDate: base.recurringTaskEndDate || null,
        addToCalendarCheckbox: base.addToCalendarCheckbox,
        dueDateCheckbox: base.dueDateCheckbox || false,
        dueDate: base.dueDate || null,
        complete: false,
      };
    },
    dragStart(index) {
      const element = this.$refs.itemSpan[index];
      if (element) {
        this.currentItems[index].textString = element.innerText;
        this.saveList();
      }
      this.draggedIndex = index;
    },
    dragOver(event) {
      event.preventDefault();
    },
    drop(index) {
      const draggedItem = this.currentItems[this.draggedIndex];
      this.currentItems.splice(this.draggedIndex, 1);
      this.currentItems.splice(index, 0, draggedItem);
      this.draggedIndex = null;
      this.saveList();
    },
    focusEditable(index, position = null) {
      if (this.editingIndex !== null && this.editingIndex !== index) {
        this.saveEditor(this.editingIndex);
      }
      this.selectedItemIndex = this.incompleteItems.length <= index ? this.incompleteItems.length - 1 : index;
      this.$nextTick(() => {
        const element = this.$refs.itemSpan[index];
        if (element) {
          element.focus();
          if (position !== null) {
            this.setCaretPosition(element, position);
          }
        }
      });
      const item = this.incompleteItems[index] || this.currentItems[index];
      if (item) {
        this.openEditor(index, item);
      }
      this.saveList();
    },
    handleEnter(index, event) {
      if (event.shiftKey) {
        return;
      }

      event.preventDefault();

      const text = event.target.innerText;
      const selection = window.getSelection();
      const caretPosition = selection.anchorOffset;

      const textBeforeCaret = text.substring(0, caretPosition);
      const textAfterCaret = text.substring(caretPosition);

      // Preserve the original item's timing for the first part,
      // then start the new item at the previous item's end time.
      const baseItem = this.currentItems[index];
      const firstItem = this.createItemWithExistingValues(textBeforeCaret);

      const baseEstimate = Number(baseItem && baseItem.taskTimeEstimate) || 30;
      const baseStart =
        (baseItem && (baseItem.scheduledTime || baseItem.scheduledStartTime)) ||
        this.getNearestTime();
      const baseExplicitEnd = baseItem && (baseItem.endingTime || baseItem.scheduledEndTime) || null;
      const baseEnd = baseExplicitEnd || this.getTimeAfterMinutes(baseStart, baseEstimate);

      const secondItem = this.createItemWithExistingValues(textAfterCaret);
      secondItem.scheduledTime = baseEnd;
      secondItem.scheduledStartTime = baseEnd;
      const secondEstimate = Number(secondItem.taskTimeEstimate) || baseEstimate;
      const secondEnd = this.getTimeAfterMinutes(baseEnd, secondEstimate);
      secondItem.scheduledEndTime = secondEnd;
      secondItem.endingTime = secondEnd;

      this.currentItems.splice(index, 1, firstItem);
      this.currentItems.splice(index + 1, 0, secondItem);

      this.$nextTick(() => {
        this.focusEditable(index + 1, 0);
      });
      this.saveList();
    },
    handleBackspace(index, event) {
      if (window.getSelection().anchorOffset === 0 && index > 0) {
        event.preventDefault();

        const currentText = event.target.innerText;
        const previousText = this.currentItems[index - 1].textString;
        const combinedText = previousText + currentText;

        this.currentItems.splice(index - 1, 1, this.createItemWithExistingValues(combinedText));
        this.currentItems.splice(index, 1);
        this.selectedItemIndex = index - 1;

        this.$nextTick(() => {
          const previousElement = this.$refs.itemSpan[this.selectedItemIndex];
          if (previousElement) {
            this.focusEditable(this.selectedItemIndex, previousText.length);
          }
          this.saveList();
        });
      }
    },
    handleArrowUp(index, event) {
      if (event.target.innerText.length === 0 && index - 1 >= 0) {
        event.preventDefault();
        this.focusEditable(index - 1, this.currentItems[index - 1].length);
      }
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const elementRect = event.target.getBoundingClientRect();

      const isTopRow = rect.top === elementRect.top;

      if ((isTopRow || event.target.innerText.length === 0) && index - 1 >= 0) {
        event.preventDefault();
        this.focusEditable(index - 1, this.currentItems[index - 1].length);
      }
    },
    handleArrowDown(index, event) {
      if (event.target.innerText.length === 0 && index + 1 < this.incompleteItems.length) {
        event.preventDefault();
        this.focusEditable(index + 1, 0);
      }
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const elementRect = event.target.getBoundingClientRect();

      const isBottomRow = Math.abs(rect.bottom - elementRect.bottom) < 1;

      if ((isBottomRow || event.target.innerText.length === 0) && index + 1 < this.currentItems.length) {
        event.preventDefault();
        this.focusEditable(index + 1, 0);
      }
    },
    removeItemByIndex(index) {
      if (this.currentItems.length === 0) {
        this.currentItems.push(this.createNewItem(''));
      }

      if (this.currentItems.length > 0) {
        let newIndex = index - 1;

        if (newIndex < 0) newIndex = 0;

        this.$nextTick(() => {
          this.focusEditable(newIndex);
          this.currentItems.splice(index, 1);
          if (this.currentItems.length === 0) {
            this.currentItems.push(this.createNewItem(''));
            this.saveList();
          }
        });
      }
    },
    setCaretPosition(element, position) {
      const range = document.createRange();
      const sel = window.getSelection();
      
      // Ensure element has content
      if (!element.firstChild) {
        const textNode = document.createTextNode('');
        element.appendChild(textNode);
      }

      try {
        const textNode = element.firstChild;
        const maxOffset = textNode.nodeType === Node.TEXT_NODE ? textNode.length : 0;
        const safePosition = Math.min(position, maxOffset);
        
        range.setStart(textNode, safePosition);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (error) {
        // If there's still an error, just focus the element
        console.warn('Could not set caret position:', error);
        element.focus();
      }
    },
    clearStorage() {
      localStorage.clear();
      this.lists = [{
        title: this.listName || 'List 1',
        items: [this.createNewItem('')],
        visible: true,
        color: '#2196f3',
      }];
      this.currentListIndex = 0;
      this.loadInitialData();
    },
    
    toggleDropdown() {
      this.isDropdownOpen = !this.isDropdownOpen;
    },
    incompleteItem(index) {
      this.currentItems.splice(this.incompleteItems.length, 0, this.currentItems[this.incompleteItems.length + index]);
      this.currentItems[index + this.incompleteItems.length + 1].complete = false;
      this.currentItems.splice(this.incompleteItems.length + index - 1, 1);
      this.saveList();
    },
    openEditor(index, item) {
      this.editingIndex = index;
      this.editingTemp = JSON.parse(JSON.stringify(item));

      // Set defaults using current time and 30 minutes later
      const currentTime = this.getNearestTime();
      const defaultEndTime = this.getTimeAfterMinutes(currentTime, 30);

      if (this.editingTemp.scheduledStartTime === undefined || !this.editingTemp.scheduledStartTime) {
        this.editingTemp.scheduledStartTime = this.editingTemp.scheduledTime || currentTime;
      }
      if (this.editingTemp.scheduledEndTime === undefined || !this.editingTemp.scheduledEndTime) {
        this.editingTemp.scheduledEndTime = this.getTimeAfterMinutes(this.editingTemp.scheduledStartTime, this.editingTemp.taskTimeEstimate || 30);
      }
      if (this.editingTemp.taskTimeEstimate === undefined) {
        this.editingTemp.taskTimeEstimate = this.editingTemp.taskTimeEstimate || 30;
      }
      if (this.editingTemp.recurringTask === undefined) {
        this.editingTemp.recurringTask = !!this.editingTemp.recurringFrequency;
      }
      this.editingTemp.showRecurringMenu = false;
    },
    getNearestTime() {
      const now = new Date();
      let minutes = now.getMinutes();
      let hours = now.getHours();

      // Round to the nearest 15 minutes
      let rounded = Math.round(minutes / 15) * 15;
      if (rounded >= 60) {
        rounded = 0;
        hours = (hours + 1) % 24;
      }

      const period = hours < 12 ? 'am' : 'pm';
      const formattedHour = hours % 12 === 0 ? 12 : hours % 12;
      return `${formattedHour}:${String(rounded).padStart(2, '0')}${period}`;
    },
    getTimeAfterMinutes(timeString, minutesToAdd) {
      if (!timeString) return this.getNearestTime();
      
      const match = timeString.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
      if (!match) return this.getNearestTime();
      
      let [_, hour, minute, period] = match;
      hour = parseInt(hour, 10);
      minute = parseInt(minute, 10);
      
      // Convert to 24-hour format
      if (period.toLowerCase() === 'pm' && hour !== 12) hour += 12;
      if (period.toLowerCase() === 'am' && hour === 12) hour = 0;
      
      // Add minutes
      const totalMinutes = hour * 60 + minute + minutesToAdd;
      const newHours = Math.floor(totalMinutes / 60) % 24;
      const newMinutes = totalMinutes % 60;
      
      // Convert back to 12-hour format
      const newPeriod = newHours < 12 ? 'am' : 'pm';
      const newHour12 = newHours % 12 === 0 ? 12 : newHours % 12;
      
      return `${newHour12}:${String(newMinutes).padStart(2, '0')}${newPeriod}`;
    },
    timeStringToMinutes(timeString) {
      if (!timeString) return null;
      const match = timeString.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
      if (!match) return null;

      let [_, hour, minute, period] = match;
      hour = parseInt(hour, 10);
      minute = parseInt(minute, 10);

      if (period.toLowerCase() === 'pm' && hour !== 12) hour += 12;
      if (period.toLowerCase() === 'am' && hour === 12) hour = 0;

      return hour * 60 + minute;
    },
    syncEditingItemFromEditor() {
      if (this.editingIndex === null || this.editingIndex === undefined) return;
      if (!this.editingTemp) return;

      const item = this.currentItems[this.editingIndex];
      if (!item) return;

      const startStr = this.editingTemp.scheduledStartTime || this.editingTemp.scheduledTime || item.scheduledStartTime || item.scheduledTime;
      const endStr = this.editingTemp.scheduledEndTime || this.editingTemp.endingTime || item.scheduledEndTime || item.endingTime;

      let duration = Number(this.editingTemp.taskTimeEstimate || item.taskTimeEstimate || 60);
      const startMin = this.timeStringToMinutes(startStr);
      const endMin = this.timeStringToMinutes(endStr);

      if (startMin !== null && endMin !== null && endMin > startMin) {
        duration = endMin - startMin;
      }

      item.scheduledStartTime = startStr;
      item.scheduledEndTime = endStr;
      item.scheduledTime = startStr;
      item.endingTime = endStr;
      item.taskTimeEstimate = duration;
      item.recurringTask = !!this.editingTemp.recurringTask;

      if (this.editingTemp.recurringFrequency) {
        item.recurringFrequency = this.editingTemp.recurringFrequency;
      } else {
        delete item.recurringFrequency;
      }

      // Propagate changes so DailyCalendar (and parents) see the update
      this.saveList();
    },
    closeEditor() {
      this.editingIndex = null;
      this.editingTemp = null;
    },
    handleRecurringSelect(item) {
      if (!this.editingTemp) return;
      this.editingTemp.recurringTask = true;
      this.editingTemp.recurringFrequency = item.value;
      this.editingTemp.showRecurringMenu = false;
    },

    deleteItem(index) {
      this.currentItems.splice(index, 1);
      this.closeEditor();
      const newIndex = Math.max(0, index - 1);
      this.$nextTick(() => {
        if (this.currentItems.length === 0) {
          this.currentItems.push(this.createNewItem(''));
        }
        this.focusEditable(newIndex);
        this.saveList();
      });
    },

    saveEditor(index) {
      const item = this.currentItems[index];
      if (!item || !this.editingTemp) {
        this.closeEditor();
        return;
      }

      const startStr = this.editingTemp.scheduledStartTime || this.editingTemp.scheduledTime || item.scheduledStartTime || item.scheduledTime;
      const endStr = this.editingTemp.scheduledEndTime || this.editingTemp.endingTime || item.scheduledEndTime || item.endingTime;

      let duration = Number(this.editingTemp.taskTimeEstimate || item.taskTimeEstimate || 60);
      const startMin = this.timeStringToMinutes(startStr);
      const endMin = this.timeStringToMinutes(endStr);

      if (startMin !== null && endMin !== null && endMin > startMin) {
        duration = endMin - startMin;
      }

      item.scheduledStartTime = startStr;
      item.scheduledEndTime = endStr;
      item.scheduledTime = startStr;
      item.endingTime = endStr;
      item.taskTimeEstimate = duration;
      item.recurringTask = !!this.editingTemp.recurringTask;

      if (this.editingTemp.recurringFrequency) {
        item.recurringFrequency = this.editingTemp.recurringFrequency;
      } else {
        delete item.recurringFrequency;
      }

      this.saveList();
      this.closeEditor();
    },
    addTaskToEnd() {
      const newIndex = this.currentItems.length;
      const prevItem = this.currentItems.length > 0 ? this.currentItems[this.currentItems.length - 1] : null;
      this.currentItems.push(this.createNewItem('', prevItem));
      this.$nextTick(() => {
        this.focusEditable(newIndex, 0);
        this.saveList();
      });
    }
  }
};
</script>

<style scoped>
/* ...existing styles... */

/* List dropdown styling */
.list-dropdown-container {
  position: relative;
  margin-bottom: 1rem;
}

.list-dropdown {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--secondaryColor);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.2s;
}

.list-dropdown:hover {
  background: rgba(255,255,255,0.1);
}

.current-list-title {
  flex: 1;
  font-size: 1.125rem;
  font-weight: 500;
  color: var(--accentColor);
  outline: none;
  cursor: text;
}

.current-list-title:not([contenteditable="true"]) {
  cursor: pointer;
}

.dropdown-icon {
  font-size: 0.875rem;
  color: var(--accentColor);
  transition: transform 0.2s;
}

.dropdown-icon.rotated {
  transform: rotate(180deg);
}

.item-text.completed-text {
  text-decoration: line-through;
  opacity: 0.7;
}

.list-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 0.25rem;
  background: var(--secondaryColor);
  border-radius: 0.375rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.3);
  z-index: 1000;
  max-height: 20rem;
  overflow-y: auto;
}

.list-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  color: var(--accentColor);
  cursor: pointer;
  transition: background 0.2s;
}

.list-dropdown-item:hover {
  background: rgba(255,255,255,0.08);
}

.list-dropdown-item.active {
  background: rgba(255,255,255,0.12);
}

.list-item-title {
  flex: 1;
  font-size: 0.9375rem;
  outline: none;
  cursor: default;
}

.list-item-title[contenteditable="true"] {
  cursor: text;
  background: rgba(0, 0, 0, 0.2);
  padding: 0.25rem 0.375rem;
  border-radius: 0.25rem;
}

.remove-list-btn-dropdown {
  background: transparent;
  border: none;
  color: var(--accentColor);
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 0.875rem;
}

.list-dropdown-item:hover .remove-list-btn-dropdown {
  opacity: 0.7;
}

.remove-list-btn-dropdown:hover {
  opacity: 1 !important;
  color: #ff4d4f;
}

.list-dropdown-divider {
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin: 0.25rem 0;
}

.new-list-item {
  gap: 0.5rem;
  font-weight: 500;
}

.new-list-item i {
  font-size: 0.875rem;
}

/* Inline editor layout */
.inline-editor {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  background: rgba(0,0,0,0.45);
  padding: 0.5rem;
  margin-top: 0.25rem;
  border-radius: 0.375rem;
  z-index: 4;
}

.editor-row.inputs-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.editor-input {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1 1 0;
  max-width: 8.5rem;
  min-width: 0;
}

.editor-input .time-input,
.editor-input .minute-input-field,
.editor-input input[type="text"] {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box;
}

.editor-label {
  font-size: 0.75rem;
  color: var(--accentColor);
}

.actions-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.actions-left {
  display: flex;
  align-items: center;
}

.editor-actions {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
  align-items: center;
}

.save-btn, .cancel-btn, .delete-btn {
  padding: 0.35rem 0.5rem;
  border-radius: 0.25rem;
  cursor: pointer;
}

.delete-btn {
  background: #ff4d4f;
  color: #fff;
  border: none;
}

.recurring-btn {
  background: rgba(255,255,255,0.06);
  color: var(--accentColor);
  border: 0;
  padding: 0.35rem;
  border-radius: 0.25rem;
  cursor: pointer;
}

.item-container { position: relative; }
.edit-button {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
}
.ListItem li:hover .edit-button { display: block; }

.add-task-button {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: var(--primaryColor);
  color: var(--accentColor);
  border: 1px solid var(--accentColor);
  border-radius: 0.25rem;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.add-task-button:hover {
  background-color: var(--secondaryColor);
}

/* ...existing styles... */
</style>