import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	const env = loadEnv(mode, process.cwd(), '');
	
	return {
		plugins: [sveltekit()],
		server: {
			port: 5173,
			strictPort: true,
			host: 'localhost'
		},
		preview: {
			port: 5173,
			strictPort: true,
			host: 'localhost'
		},
		define: {
			// Make server-side env vars available to SSR
			'process.env.RESEND_API_KEY': JSON.stringify(env.RESEND_API_KEY),
			'process.env.EMAIL_FROM': JSON.stringify(env.EMAIL_FROM),
			'process.env.APP_BASE_URL': JSON.stringify(env.APP_BASE_URL),
			'process.env.DAILY_REMINDER_TOKEN': JSON.stringify(env.DAILY_REMINDER_TOKEN)
		}
	};
});
