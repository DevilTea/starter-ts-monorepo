import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['esm', 'cjs'],
	platform: 'neutral',
	target: 'es2022',
	fixedExtension: true,
	dts: {
		tsconfig: 'tsconfig.package.json',
		compilerOptions: {
			composite: false,
		},
	},
	clean: true,
})
