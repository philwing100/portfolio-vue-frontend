<!-- eslint-disable -->
<template>
  <div class="project-detail">
    <div class="project-detail__header">
      <button class="back-button" @click="goBack">← Back</button>
      <h1 class="title" v-if="project">{{ project.title }}</h1>
      <h1 class="title" v-else>Project Not Found</h1>
    </div>

    <div v-if="project" class="project-detail__content">
      <img v-if="project.image" :src="project.image" :alt="project.title" class="hero-image" />
      <p class="summary">{{ project.summary }}</p>

      <div class="body">
        <div v-for="(section, index) in project.sections" :key="index" class="section">
          <h2 v-if="section.heading" class="section-heading">{{ section.heading }}</h2>
          <p v-for="(para, i) in section.paragraphs" :key="i" class="paragraph">
            {{ para }}
          </p>
          <ul v-if="section.bullets && section.bullets.length" class="bullets">
            <li v-for="(bullet, j) in section.bullets" :key="j">{{ bullet }}</li>
          </ul>
        </div>
      </div>
    </div>

    <div v-else class="project-detail__content">
      <p>This project could not be found. Please return to the featured projects section.</p>
    </div>
  </div>
</template>

<script>
const PROJECT_DETAILS = [
  {
    slug: 'gpu-kmeans',
    title: 'GPU Accelerated K-Means Optimization',
    image: require('@/assets/Images/ProductivityImage.jpeg'),
    summary:
      'Implemented three GPU-parallel K-Means variants using CUDA and Thrust, achieving up to 17× speedup over a CPU baseline.',
    sections: [
      {
        heading: 'Overview',
        paragraphs: [
          'This project explores how classic K-Means clustering can be accelerated using GPUs. I implemented three different parallelization strategies using CUDA and Thrust and compared them against a sequential CPU baseline.',
        ],
      },
      {
        heading: 'What I Built',
        paragraphs: [
          'I wrote GPU kernels for the assignment and update steps of K-Means and used Thrust primitives to manage device memory and parallel reductions.',
        ],
        bullets: [
          'Three GPU-parallel K-Means variants with different memory and work partitioning strategies.',
          'Instrumentation to measure iteration time and total runtime across dataset sizes.',
        ],
      },
      {
        heading: 'Results',
        paragraphs: [
          'With careful memory access patterns and minimized synchronization, the GPU versions achieved up to 17× faster iteration time than the CPU baseline while maintaining the same clustering quality.',
        ],
      },
    ],
  },
  {
    slug: 'linux-shell',
    title: 'Linux Shell',
    image: require('@/assets/Images/winformsexample.png'),
    summary:
      'Built a Unix-like shell in C that supports interactive and batch modes with parallel command execution and strict error handling.',
    sections: [
      {
        heading: 'Overview',
        paragraphs: [
          'I implemented a small Unix-like shell from scratch in C as part of an operating systems course. The shell supports both interactive and batch input modes.',
        ],
      },
      {
        heading: 'Core Features',
        paragraphs: [
          'The shell can execute existing Linux binaries and built-in commands while handling errors robustly.',
        ],
        bullets: [
          'Uses fork, execv, and waitpid to launch programs and wait for completion.',
          'Supports simple parallel execution using the & separator in a command line.',
          'Implements built-in commands such as exit, cd, and path with clear, consistent error messages.',
        ],
      },
      {
        heading: 'Quality and Testing',
        paragraphs: [
          'I used Valgrind extensively to track down and eliminate memory leaks, achieving zero leaks on both public and hidden test suites.',
        ],
      },
    ],
  },
  {
    slug: 'parallel-prefix-scan',
    title: 'Parallel Prefix Scan and Barriers',
    image: require('@/assets/Images/ProductivityImage.jpeg'),
    summary:
      'Implemented an asynchronous prefix scan and custom barrier using POSIX threads, achieving over 2× speedup compared to pthread barriers.',
    sections: [
      {
        heading: 'Overview',
        paragraphs: [
          'This project focuses on building efficient parallel primitives: a work-efficient prefix scan and a custom barrier implementation using POSIX threads.',
        ],
      },
      {
        heading: 'Implementation',
        paragraphs: [
          'I implemented an asynchronous prefix scan that balances work across threads and minimizes synchronization.',
        ],
        bullets: [
          'Custom reentrant barrier built using a local-sense spinlock design.',
          'Careful use of atomic operations to coordinate thread arrival and release.',
        ],
      },
      {
        heading: 'Performance',
        paragraphs: [
          'Benchmarks showed the custom barrier achieving over 2× speedup compared to pthread barriers at moderate thread counts.',
        ],
      },
    ],
  },
  {
    slug: 'two-phase-commit',
    title: 'Two-Phase Commit Simulator',
    image: require('@/assets/Images/winformsexample.png'),
    summary:
      'Developed a distributed two-phase commit simulator in Rust with probabilistic failures and non-blocking coordinator design.',
    sections: [
      {
        heading: 'Overview',
        paragraphs: [
          'I implemented a simulator for the two-phase commit protocol to study distributed transaction coordination and failure handling.',
        ],
      },
      {
        heading: 'Design',
        paragraphs: [
          'The system models one coordinator and multiple participant nodes communicating over channels.',
        ],
        bullets: [
          'Uses bidirectional channels and asynchronous messaging between nodes.',
          'Injects probabilistic failures to test commit, abort, and recovery behaviors.',
        ],
      },
      {
        heading: 'Improvements',
        paragraphs: [
          'I improved throughput by replacing blocking waits on the coordinator’s critical path with non-blocking polling, reducing idle time while waiting for participant responses.',
        ],
      },
    ],
  },
];

export default {
  name: 'ProjectDetail',
  props: {
    slug: {
      type: String,
      required: false,
    },
  },
  computed: {
    project() {
      const key = this.slug || (this.$route && this.$route.params && this.$route.params.slug);
      return PROJECT_DETAILS.find((p) => p.slug === key) || null;
    },
  },
  methods: {
    goBack() {
      // Always return to the About Me page focused on the projects section
      this.$router.push({ name: 'AboutMe', query: { section: 'projects' } });
    },
  },
};
</script>

<style scoped>
.project-detail {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  /* Use theme variables so the title is readable on any background */
  background: var(--primaryColor);
  color: var(--accentColor);
}

.project-detail__header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
}

.back-button {
  background: transparent;
  border: 1px solid #888;
  color: #f5f5f5;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.back-button:hover {
  background: #333;
}

.title {
  font-size: 1.8rem;
  font-weight: 600;
  /* Subtle shadow so text stands out regardless of background tweaks */
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
}

.project-detail__content {
  background: var(--secondaryColor);
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.hero-image {
  width: 100%;
  max-height: 320px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 16px;
}

.summary {
  font-size: 1rem;
  margin-bottom: 16px;
  color: #ddd;
}

.body {
  margin-top: 8px;
}

.section {
  margin-bottom: 18px;
}

.section-heading {
  font-size: 1.2rem;
  margin-bottom: 6px;
}

.paragraph {
  margin-bottom: 6px;
  line-height: 1.5;
}

.bullets {
  margin: 6px 0 0 20px;
}

.bullets li {
  margin-bottom: 4px;
}
</style>
