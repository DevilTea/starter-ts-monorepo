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
			provider: 'v8',
			include: ['packages/*/src/**/*.ts'],
			exclude: [
				'**/*.config.*',
				'**/docs/**',
				'**/scripts/**',
				'**/dist/**',
				'**/coverage/**',
				'**/*.bench.*',
			],
			reporter: ['text', 'json-summary', 'html'],
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
