import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	dts: {
		tsconfig: 'tsconfig.package.json',
		compilerOptions: {
			composite: false,
		},
	},
	clean: true,
})
