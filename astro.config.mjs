import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://qinindexcode.site',
  output: 'static',
  build: {
    format: 'file'
  },
  vite: {
    build: {
      rollupOptions: {
        input: {
          index: './src/pages/index.astro',
          home: './src/pages/home.astro',
          tech: './src/pages/tech.astro',
          projects: './src/pages/projects.astro',
          blogs: './src/pages/blogs.astro',
          tools: './src/pages/tools.astro',
          about: './src/pages/about.astro',
          donate: './src/pages/donate.astro',
          authCallback: './src/pages/auth-callback.astro',
          notFound: './src/pages/404.astro'
        }
      }
    }
  }
});
