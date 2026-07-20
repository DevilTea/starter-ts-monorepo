import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		projects: [
			'packages/*',
			{
				test: {
					name: 'scripts',
					environment: 'node',
					include: ['scripts/**/*.test.ts'],
				},
			},
		],
		coverage: {
			enabled: true,
			exclude: [
				'**/*.config.*',
				'**/docs/**',
				'**/scripts/**',
				'**/dist/**',
				'**/coverage/**',
				'**/*.bench.*',
			],
		},
		typecheck: {
			enabled: true,
		},
		benchmark: {
			include: ['**/*.bench.ts'],
			exclude: ['**/node_modules/**', '**/dist/**'],
		},
	},
})
