const fs = require('node:fs')

function read(file) {
	return fs.readFileSync(file, 'utf8')
}

function write(file, content) {
	fs.writeFileSync(file, content)
}

function replaceOnce(file, from, to) {
	const content = read(file)
	if (!content.includes(from))
		throw new Error(`Expected text not found in ${file}: ${from.slice(0, 120)}`)
	write(file, content.replace(from, to))
}

function updateJson(file, update) {
	const value = JSON.parse(read(file))
	update(value)
	write(file, `${JSON.stringify(value, null, '\t')}\n`)
}

replaceOnce(
	'pnpm-workspace.yaml',
	`# Vetted Node.js-owned type package required by @types/node 22.x; this historical
# version predates consistent npm provenance and is exempted narrowly by version.
trustPolicyExclude:
  - undici-types@6.21.0
`,
	'',
)
replaceOnce('pnpm-workspace.yaml', "  '@deviltea/eslint-config': 8.0.2", "  '@deviltea/eslint-config': 9.0.0")
replaceOnce('pnpm-workspace.yaml', "  '@deviltea/tsconfig': 0.0.10", "  '@deviltea/tsconfig': 1.0.0")
replaceOnce('pnpm-workspace.yaml', "  '@types/node': ^22.20.0", "  '@types/node': ^24.3.0")
replaceOnce('pnpm-workspace.yaml', '  typescript: ^5.9.3', '  typescript: ^6.0.3')

updateJson('tsconfig.scripts.json', (value) => {
	value.extends = '@deviltea/tsconfig/tooling'
})
updateJson('docs/tsconfig.docs.json', (value) => {
	value.extends = '@deviltea/tsconfig/browser'
})
updateJson('docs/tsconfig.configs.json', (value) => {
	value.extends = '@deviltea/tsconfig/tooling'
})
updateJson('packages/pkg-placeholder/tsconfig.package.json', (value) => {
	value.extends = '@deviltea/tsconfig/neutral'
	value.compilerOptions = {
		composite: true,
	}
})
updateJson('packages/pkg-placeholder/tsconfig.tests.json', (value) => {
	value.extends = '@deviltea/tsconfig/tooling'
})

replaceOnce(
	'scripts/template.ts',
	`function createPackageTsConfig(runtime: PackageRuntime): string {
\tconst extendsConfig = runtime === 'browser'
\t\t? '@deviltea/tsconfig/dom'
\t\t: runtime === 'node'
\t\t\t? '@deviltea/tsconfig/node'
\t\t\t: '@deviltea/tsconfig/base'
\tconst compilerOptions: Record<string, unknown> = {
\t\tcomposite: true,
\t}
\tif (runtime === 'neutral') {
\t\tcompilerOptions.lib = ['ESNext']
\t\tcompilerOptions.types = []
\t}
\treturn \`${'${'}JSON.stringify({
\t\textends: extendsConfig,
\t\tcompilerOptions,
\t\tinclude: ['./src/**/*.ts'],
\t}, null, '\\t')}\\n\`
}

function createTestsTsConfig(runtime: PackageRuntime): string {
\tconst compilerOptions: Record<string, unknown> = {
\t\tcomposite: true,
\t}
\tif (runtime === 'browser')
\t\tcompilerOptions.lib = ['ESNext', 'DOM', 'DOM.Iterable']
\treturn \`${'${'}JSON.stringify({
\t\textends: '@deviltea/tsconfig/node',
\t\tcompilerOptions,
\t\tinclude: ['./src/**/*.ts', './tests/**/*.ts'],
\t}, null, '\\t')}\\n\`
}`,
	`function createPackageTsConfig(runtime: PackageRuntime): string {
\tconst extendsConfig = runtime === 'browser'
\t\t? '@deviltea/tsconfig/browser'
\t\t: runtime === 'node'
\t\t\t? '@deviltea/tsconfig/node-bundler'
\t\t\t: '@deviltea/tsconfig/neutral'
\treturn \`${'${'}JSON.stringify({
\t\textends: extendsConfig,
\t\tcompilerOptions: {
\t\t\tcomposite: true,
\t\t},
\t\tinclude: ['./src/**/*.ts'],
\t}, null, '\\t')}\\n\`
}

function createTestsTsConfig(runtime: PackageRuntime): string {
\tconst compilerOptions: Record<string, unknown> = {
\t\tcomposite: true,
\t}
\tif (runtime === 'browser')
\t\tcompilerOptions.lib = ['ES2024', 'DOM', 'DOM.Iterable']
\treturn \`${'${'}JSON.stringify({
\t\textends: '@deviltea/tsconfig/tooling',
\t\tcompilerOptions,
\t\tinclude: ['./src/**/*.ts', './tests/**/*.ts'],
\t}, null, '\\t')}\\n\`
}`,
)

replaceOnce(
	'scripts/template.ts',
	'Requires Node >=24 and pnpm 10.34.4. All dependency versions are managed centrally through the catalog in pnpm-workspace.yaml.',
	'Requires Node >=24, TypeScript 6, and pnpm 10.34.4. All dependency versions are managed centrally through the catalog in pnpm-workspace.yaml.',
)
replaceOnce(
	'scripts/template.ts',
	`- Node.js 24 or newer for repository tooling
- pnpm 10.34.4 through Corepack`,
	`- Node.js 24 or newer for repository tooling
- TypeScript 6 through the workspace catalog
- pnpm 10.34.4 through Corepack`,
)

replaceOnce('scripts/template.test.ts', "\t\t\t.toBe('@deviltea/tsconfig/node')", "\t\t\t.toBe('@deviltea/tsconfig/node-bundler')")
replaceOnce('scripts/template.test.ts', "\t\t\t.toBe('@deviltea/tsconfig/dom')", "\t\t\t.toBe('@deviltea/tsconfig/browser')")
replaceOnce(
	'scripts/template.test.ts',
	`\t\texpect(testsTsConfig.compilerOptions)
\t\t\t.toEqual({
\t\t\t\tcomposite: true,
\t\t\t\tlib: ['ESNext', 'DOM', 'DOM.Iterable'],
\t\t\t})`,
	`\t\texpect(testsTsConfig.extends)
\t\t\t.toBe('@deviltea/tsconfig/tooling')
\t\texpect(testsTsConfig.compilerOptions)
\t\t\t.toEqual({
\t\t\t\tcomposite: true,
\t\t\t\tlib: ['ES2024', 'DOM', 'DOM.Iterable'],
\t\t\t})`,
)
replaceOnce('scripts/template.test.ts', "\t\t\t.toBe('@deviltea/tsconfig/base')", "\t\t\t.toBe('@deviltea/tsconfig/neutral')")
replaceOnce(
	'scripts/template.test.ts',
	`\t\texpect(packageTsConfig.compilerOptions)
\t\t\t.toEqual({
\t\t\t\tcomposite: true,
\t\t\t\tlib: ['ESNext'],
\t\t\t\ttypes: [],
\t\t\t})`,
	`\t\texpect(packageTsConfig.compilerOptions)
\t\t\t.toEqual({
\t\t\t\tcomposite: true,
\t\t\t})`,
)
replaceOnce(
	'scripts/template.test.ts',
	`\t\texpect(buildConfig)
\t\t\t.toContain('platform: \'neutral\'')
\t\texpect(packageTsConfig.compilerOptions)`,
	`\t\texpect(buildConfig)
\t\t\t.toContain('platform: \'neutral\'')
\t\texpect(packageTsConfig.extends)
\t\t\t.toBe('@deviltea/tsconfig/neutral')
\t\texpect(packageTsConfig.compilerOptions)`,
)
replaceOnce(
	'scripts/template.test.ts',
	`\t\texpect(packageTsConfig.compilerOptions)
\t\t\t.toEqual({
\t\t\t\tcomposite: true,
\t\t\t\tlib: ['ESNext'],
\t\t\t\ttypes: [],
\t\t\t})`,
	`\t\texpect(packageTsConfig.compilerOptions)
\t\t\t.toEqual({
\t\t\t\tcomposite: true,
\t\t\t})`,
)

replaceOnce(
	'README.md',
	`- Node.js 24 or newer for repository tooling
- pnpm 10.34.4 through Corepack`,
	`- Node.js 24 or newer for repository tooling
- TypeScript 6 through the workspace catalog
- pnpm 10.34.4 through Corepack`,
)
replaceOnce(
	'README.md',
	`The selected runtime controls both the tsdown platform/target and the TypeScript environment:

- Platform-neutral packages use the base config with only \`ESNext\` libraries and no ambient platform types.
- Browser packages use DOM libraries and browser-oriented builds.
- Node.js packages use Node types, target Node.js 22, and declare \`engines.node >=22\`.`,
	`The selected runtime maps to a matching \`@deviltea/tsconfig\` v1 preset and tsdown target:

- Platform-neutral packages use \`neutral\`, which excludes browser and Node.js globals.
- Browser packages use \`browser\`, which provides DOM libraries.
- Node.js packages use \`node-bundler\`, target Node.js 22, and declare \`engines.node >=22\`.
- Tests, repository scripts, and tool configuration use \`tooling\`.`,
)
replaceOnce(
	'AGENTS.md',
	'Requires Node >=24 and pnpm 10.34.4 (pinned via `packageManager`).',
	'Requires Node >=24, TypeScript 6, and pnpm 10.34.4 (pinned via `packageManager`).',
)
replaceOnce(
	'AGENTS.md',
	'- tsconfigs extend `@deviltea/tsconfig/base` and use composite project references; each package typechecks `src` and `tests` with separate tsconfig projects.',
	'- TypeScript 6 projects use `@deviltea/tsconfig` v1 runtime presets: package source selects `neutral`, `browser`, or `node-bundler`; repository scripts, tests, and tool configuration use `tooling`. Composite project references keep package source and tests separate.',
)
replaceOnce(
	'docs/index.md',
	'details: Generate platform-neutral, browser, or Node.js packages with matching tsdown and TypeScript environments.',
	'details: Generate platform-neutral, browser, or Node.js packages with matching tsdown targets and TypeScript 6 runtime presets.',
)
