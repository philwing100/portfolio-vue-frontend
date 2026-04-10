import Study from '@/views/Study.vue';
import StudySession from '@/views/StudySession.vue';
import SetEditor from '@/views/SetEditor.vue';

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
    path: '/study/set/:id',
    name: 'SetEditor',
    component: SetEditor,
    props: route => ({ setId: route.params.id === 'new' ? null : Number(route.params.id) }),
  },
  {
    path: '/study/session',
    name: 'StudySession',
    component: StudySession,
  },
];
