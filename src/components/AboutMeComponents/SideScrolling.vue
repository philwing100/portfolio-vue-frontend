<template>
  <div id="scroll-container">
    <div id="scroll-track">
      <!-- Repeated sets for a smooth, continuous loop -->
      <font-awesome-icon
        v-for="(icon, index) in repeatedIcons"
        :key="icon.key + '-' + index"
        :icon="[icon.prefix, icon.name]"
        :style="{ color: icon.color }"
        class="scroll-icon"
      />
    </div>
  </div>
  
</template>

<script>
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faJs,
  faHtml5,
  faCss3,
  faNodeJs,
  faVuejs,
  faJava,
  faGithub,
  faGitAlt,
  faMicrosoft,
  faLinux,
  faPython,
  faUbuntu
} from "@fortawesome/free-brands-svg-icons";
import { faDatabase, faTerminal, faCode, faRobot } from "@fortawesome/free-solid-svg-icons";

library.add(
  faJs,
  faHtml5,
  faCss3,
  faNodeJs,
  faVuejs,
  faJava,
  faGithub,
  faGitAlt,
  faMicrosoft,
  faLinux,
  faPython,
  faUbuntu,
  faDatabase,
  faTerminal,
  faCode,
  faRobot
);

export default {
  components: {
    FontAwesomeIcon,
  },
  data() {
    return {
      // Icons chosen to reflect Languages, Technologies, and Developer Tools
      icons: [
        // Languages
        { key: 'js',       prefix: 'fab', name: 'js',       color: '#f7df1e' }, // JavaScript
        { key: 'python',   prefix: 'fab', name: 'python',   color: '#3776AB' }, // Python
        { key: 'java',     prefix: 'fab', name: 'java',     color: '#f89820' }, // Java

        // Data / SQL (generic DB icon)
        { key: 'database', prefix: 'fas', name: 'database', color: '#4DB6AC' },

        // Web stack
        { key: 'html5',    prefix: 'fab', name: 'html5',    color: '#e34f26' },
        { key: 'css3',     prefix: 'fab', name: 'css3',     color: '#1572b6' },
        { key: 'node',     prefix: 'fab', name: 'node-js',  color: '#83cd29' },
        { key: 'vue',      prefix: 'fab', name: 'vuejs',    color: '#42b883' },

        // OS / platforms
        { key: 'ubuntu',   prefix: 'fab', name: 'ubuntu',   color: '#dd4814' },
        { key: 'linux',    prefix: 'fab', name: 'linux',    color: '#000000' },
        { key: 'windows',  prefix: 'fab', name: 'microsoft',color: '#00a4ef' },

        // Developer tools
        { key: 'git',      prefix: 'fab', name: 'git-alt',  color: '#f34f29' },
        { key: 'github',   prefix: 'fab', name: 'github',   color: '#ffffff' },
        { key: 'terminal', prefix: 'fas', name: 'terminal', color: '#f0db4f' }, // BASH / shell
        { key: 'code',     prefix: 'fas', name: 'code',     color: '#42a5f5' }, // Editors / VS Code
        { key: 'robot',    prefix: 'fas', name: 'robot',    color: '#9c27b0' }, // Generative AI
      ],
    };
  },
  computed: {
    repeatedIcons() {
      // Duplicate the sequence a few times so the marquee looks continuous
      return [
        ...this.icons,
        ...this.icons,
        ...this.icons,
        ...this.icons,
      ];
    },
  },
};
</script>

<style>
/* Scrolling bar container */
#scroll-container {
  width: 100vw; /* Full width of window */
  overflow: hidden;
  white-space: nowrap;
  position: relative;
  padding: 10px 0;
}

/* Moving icons track */
#scroll-track {
  display: flex;
  gap: 40px; /* Spacing between icons */
  width: max-content;
  animation: scroll-animation 10s linear infinite;
}

/* Styling for individual icons */
.scroll-icon {
  font-size: 3rem;
  opacity: 0.9;
}

/* Animation for infinite scrolling */
@keyframes scroll-animation {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
</style>
