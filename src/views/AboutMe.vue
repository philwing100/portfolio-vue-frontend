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
        { id: 1, title: 'Hi I\'m Phillip', content: 'I\'m a senior year computer science student attending UT Tyler with passion for continuous learning.' },
        { id: 2, title: 'Skills', content: 'Languages: C#, JavaScript, HTML/CSS, SQL, Java, Vue.js, BASH, Node, Express.js \n\nTechnologies: Git/Github, Azure DevOps, Vscode, Wireshark, SSMS, Linux' },
        { id: 3, title: 'Featured Projects', content: '' },
        { id: 4, title: '', content: '' }
      ]
    };
  }
};
</script>

<style>
.page{

}

</style>
