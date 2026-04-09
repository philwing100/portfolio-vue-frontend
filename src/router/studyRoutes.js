import Study from '@/views/Study.vue';
import StudySession from '@/views/StudySession.vue';

export default [
  {
    path: '/study',
    name: 'Study',
    component: Study,
  },
  {
    // Folder drill-down — reuses Study.vue with a folderId prop
    path: '/study/folder/:id',
    name: 'StudyFolder',
    component: Study,
    props: route => ({ folderId: Number(route.params.id) }),
  },
  {
    path: '/study/session',
    name: 'StudySession',
    component: StudySession,
  },
];
