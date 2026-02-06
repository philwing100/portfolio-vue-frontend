// src/router/routes/generalRoutes.js
import Learn from '@/views/Learn.vue';
import Lists from '@/views/Lists.vue';
import Settings from '@/views/Settings.vue';
import Habits from '@/views/Habits.vue';
import Stats from '@/views/Stats.vue';
import ProjectDetail from '@/views/ProjectDetail.vue';

export default [
  /*{
    path: '/learn',
    name: 'Learn',
    component: Learn
  },*/
  {
    path: '/Streaks',
    name: 'HabitsPage',
    component: Habits
  },
  {
    path: '/Stats',
    name: 'StatsPage',
    component: Stats
  },
  {
    path: '/projects/:slug',
    name: 'ProjectDetail',
    component: ProjectDetail,
    props: true,
  },
  /*{
    path: '/type',
    name: 'Type',
    component: Type
  },
  {
    path: '/Lists',
    name: 'Lists',
    component: Lists
  },
  {
    path: '/Settings',
    name: 'Settings',
    component: Settings
  }*/
];
