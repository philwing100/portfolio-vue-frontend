<template class="page">
  <div>
    <FullPage :sections="sections" :showIndicator="true" />
  </div>
</template>

<script>
import FullPage from '../components/AboutMeComponents/FullPage.vue'; 


export default {
  components: {
    FullPage,
  },
  data() {
    return {
      sections: [
        {
          id: 1,
          title: 'Hi I\'m Phillip',
          content:
            'I\'m a Software Engineer at the Heartland National TB Center and getting my Masters in Computer Science from UT Austin.\n\nI am busy getting cracked at C++ and building lots of tools to grow my expertise.'
        },
        {
          id: 2,
          title: 'Skills',
          content:
            'Languages: C/C++, Python, C#, Java, SQL (Postgres, MySQL, T-SQL), JavaScript, BASH\n\nTechnologies: PyTorch, Matplotlib, .NET, Vue.js, Node.js, Playwright, WSL, Ubuntu\n\nDeveloper Tools: Git, GitHub Actions, Linux, Generative AI, VS Code, Valgrind, MATLAB'
        },
        {
          id: 3,
          title: 'Featured Projects',
          content:
            'A sample of recent systems, parallel computing, and distributed systems projects. Scroll to explore the details.'
        },
        {
          id: 4,
          title: 'Experience',
          content:
            'Recent roles focused on backend services, databases, and infrastructure supporting healthcare and industrial systems.'
        }
      ]
    };
  }
};
</script>

<style>
.page{

}

</style>
