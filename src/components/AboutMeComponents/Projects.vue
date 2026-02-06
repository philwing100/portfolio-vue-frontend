<!-- eslint-disable -->
<template>
  <div class="projects-container">
    <div class="projects-grid">
      <div
        v-for="(project, index) in displayedProjects"
        :key="project.slug || index"
        class="project-card"
        @click="goToProject(project)"
      >
        <img :src="project.image" :alt="project.title" class="project-image" />
        <div class="project-details">
          <h3 class="project-title">{{ project.title }}</h3>
          <p class="project-summary">{{ project.summary }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      // Supports up to a 4x4 grid (16 projects)
      projects: [
        {
          slug: 'gpu-kmeans',
          title: 'GPU Accelerated K-Means Optimization',
          image: require('@/assets/Images/ProductivityImage.jpeg'),
          summary:
            'Implemented three GPU-parallel K-Means variants using CUDA and Thrust, achieving up to 17× faster iteration time than a CPU baseline.',
          enabled: true,
        },
        {
          slug: 'linux-shell',
          title: 'Linux Shell',
          image: require('@/assets/Images/winformsexample.png'),
          summary:
            'Built a Unix-like shell in C supporting interactive and batch modes with robust error handling and parallel command execution.',
          enabled: true,
        },
        {
          slug: 'parallel-prefix-scan',
          title: 'Parallel Prefix Scan and Barriers',
          image: require('@/assets/Images/ProductivityImage.jpeg'),
          summary:
            'Implemented an asynchronous prefix scan and custom barrier using POSIX threads, delivering over 2× speedup versus pthread barriers.',
          enabled: true,
        },
        {
          slug: 'two-phase-commit',
          title: 'Two-Phase Commit Simulator',
          image: require('@/assets/Images/winformsexample.png'),
          summary:
            'Developed a distributed two-phase commit simulator in Rust with probabilistic failures and non-blocking coordinator design.',
          enabled: true,
        },
        // Additional projects can be added here, up to 16 total.
      ],
    };
  },
  computed: {
    activeProjects() {
      return this.projects.filter((project) => project.enabled);
    },
    displayedProjects() {
      // Cap at 16 items to support a 4x4 grid.
      return this.activeProjects.slice(0, 16);
    },
  },
  methods: {
    goToProject(project) {
      if (!this.$router) return;
      this.$router.push({ name: 'ProjectDetail', params: { slug: project.slug } });
    },
  },
};
</script>

<style scoped>
.projects-container {
  width: 100%;
  padding: 20px;
  background: #111;
}

.projects-grid {
  display: grid;
  gap: 20px;
  justify-content: center;
  max-width: 1200px;
  margin: 0 auto;
}

@media (min-width: 320px) {
  .projects-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
}

@media (min-width: 1024px) {
  .projects-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.project-card {
  display: flex;
  flex-direction: column;
  background: #222;
  color: #fff;
  padding: 12px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(255, 255, 255, 0.1);
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  cursor: pointer;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(255, 255, 255, 0.15);
}

.project-image {
  width: 100%;
  height: 160px;
  object-fit: cover;
  border-radius: 5px;
  margin-bottom: 10px;
}

.project-details {
  flex: 1;
}

.project-title {
  font-size: 1.1rem;
  margin-bottom: 6px;
  color: #fff;
}

.project-summary {
  font-size: 0.9rem;
  color: #ccc;
}
</style>
