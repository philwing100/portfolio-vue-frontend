import Study from '@/views/Study.vue';
import StudySession from '@/views/StudySession.vue';
import SetEditor from '@/views/SetEditor.vue';
import MediaStudy from '@/views/MediaStudy.vue';

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
    props: route => ({ folderId: route.params.id }),
  },
  {
    path: '/study/set/:id',
    name: 'SetEditor',
    component: SetEditor,
    props: route => ({ setId: route.params.id === 'new' ? null : route.params.id }),
  },
  {
    path: '/study/session',
    name: 'StudySession',
    component: StudySession,
  },
  {
    path: '/study/media-session',
    name: 'MediaStudy',
    component: MediaStudy,
  },
];
