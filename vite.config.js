import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  base:'./',
  build:{rolldownOptions:{input:{
    portal:fileURLToPath(new URL('./index.html',import.meta.url)),
    about:fileURLToPath(new URL('./about.html',import.meta.url))
  }}}
});
