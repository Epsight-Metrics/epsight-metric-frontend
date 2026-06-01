import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {

	const env = loadEnv(mode, process.cwd(), '');

	return {
		plugins: [sveltekit()],
		server: {
			host: '0.0.0.0', // Allow external connections (for mobile access)
			port: 5173,
			proxy: {
				'/api': {

					target: env.VITE_API_URL || 'http://localhost:3000',
					changeOrigin: true,
				},
			},
		},
	};
});
