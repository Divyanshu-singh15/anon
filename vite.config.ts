import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// server: {
	//   proxy: {
	// 	'/socket': {
	// 	  target: 'ws://localhost:3000',
	// 	  ws: true
	// 	}
	//   }
	// }
  });