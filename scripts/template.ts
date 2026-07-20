import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

interface PackageJson {
	[key: string]: unknown
	author?: unknown
	bugs?: unknown
	config?: {
		packageScope?: string
		[key: string]: unknown
	}
	description?: string
	homepage?: string
	license?: string
	name?: string
	publishConfig?: {
		access?: string
		[key: string]: unknown
	}
	repository?: unknown
	version?: string
}

interface TsConfig {
	files?: string[]
	references?: Array<{ path: string }>
	[key: string]: unknown
}

export type PackageFormat = 'dual' | 'esm'
export type PackageRuntime = 'browser' | 'neutral' | 'node'

export interface CreatePackageOptions {
	description: string
	directoryName: string
	format: PackageFormat
	packageName: string
	runtime: PackageRuntime
}

export interface InitializeTemplateOptions {
	authorEmail?: string
	authorName: string
	description: string
	packageDirectory: string
	packageFormat: PackageFormat
	packageName: string
	packageRuntime: PackageRuntime
	repositoryName: string
	repositoryOwner: string
}

const packageDirectoryPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const packageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const repositoryNamePattern = /^[\w.-]+$/
const repositoryOwnerPattern = /^[A-Z0-9](?:[A-Z0-9-]{0,37}[A-Z0-9])?$/i

export function validatePackageDirectoryName(value: string): string | undefined {
	if (!value)
		return 'Required.'
	if (!packageDirectoryPattern.test(value))
		return 'Use lowercase letters, numbers, and single hyphens between words.'
	return undefined
}

export function validatePackageName(value: string): string | undefined {
	if (!value)
		return 'Required.'
	if (!packageNamePattern.test(value))
		return 'Use a lowercase npm package name, optionally scoped (for example @scope/package).'
	return undefined
}

export function validateRepositoryName(value: string): string | undefined {
	if (!value)
		return 'Required.'
	if (!repositoryNamePattern.test(value))
		return 'Use letters, numbers, dots, underscores, or hyphens.'
	return undefined
}

export function validateRepositoryOwner(value: string): string | undefined {
	if (!value)
		return 'Required.'
	if (!repositoryOwnerPattern.test(value))
		return 'Enter a valid GitHub user or organization name.'
	return undefined
}

export async function getDefaultPackageName(root: string, directoryName: string): Promise<string> {
	const rootPackage = await readJson<PackageJson>(join(root, 'package.json'))
	const packageScope = rootPackage.config?.packageScope?.trim()
	return packageScope ? `${packageScope}/${directoryName}` : directoryName
}

export async function createPackage(root: string, options: CreatePackageOptions): Promise<void> {
	const directoryError = validatePackageDirectoryName(options.directoryName)
	if (directoryError)
		throw new Error(directoryError)

	const packageNameError = validatePackageName(options.packageName)
	if (packageNameError)
		throw new Error(packageNameError)
	if (!options.description.trim())
		throw new Error('Package description is required.')

	const packagesRoot = join(root, 'packages')
	const packageDirectory = join(packagesRoot, options.directoryName)
	if (await pathExists(packageDirectory))
		throw new Error(`Package directory already exists: packages/${options.directoryName}`)

	const rootPackage = await readJson<PackageJson>(join(root, 'package.json'))
	const rootLicense = await readFile(join(root, 'LICENSE'), 'utf8')
	const rootTsConfigPath = join(root, 'tsconfig.json')
	const rootTsConfig = await readJson<TsConfig>(rootTsConfigPath)
	const referencePath = `./packages/${options.directoryName}/tsconfig.json`
	if (rootTsConfig.references?.some(reference => reference.path === referencePath))
		throw new Error(`TypeScript project reference already exists: ${referencePath}`)

	await mkdir(packagesRoot, { recursive: true })
	const temporaryDirectory = await mkdtemp(join(packagesRoot, `.new-${options.directoryName}-`))
	let moved = false

	try {
		const files = createPackageFiles(rootPackage, options, rootLicense)
		for (const [relativePath, content] of Object.entries(files)) {
			const filePath = join(temporaryDirectory, relativePath)
			await mkdir(dirname(filePath), { recursive: true })
			await writeFile(filePath, `${content.trim()}\n`)
		}

		await rename(temporaryDirectory, packageDirectory)
		moved = true

		rootTsConfig.files ??= []
		rootTsConfig.references = [
			...(rootTsConfig.references ?? []),
			{ path: referencePath },
		].sort((left, right) => left.path.localeCompare(right.path))
		await writeJson(rootTsConfigPath, rootTsConfig)
	}
	catch (error) {
		await rm(moved ? packageDirectory : temporaryDirectory, { force: true, recursive: true })
		throw error
	}
}

export async function initializeTemplate(root: string, options: InitializeTemplateOptions): Promise<void> {
	const ownerError = validateRepositoryOwner(options.repositoryOwner)
	if (ownerError)
		throw new Error(ownerError)

	const repositoryError = validateRepositoryName(options.repositoryName)
	if (repositoryError)
		throw new Error(repositoryError)

	const directoryError = validatePackageDirectoryName(options.packageDirectory)
	if (directoryError)
		throw new Error(directoryError)

	const packageNameError = validatePackageName(options.packageName)
	if (packageNameError)
		throw new Error(packageNameError)

	if (!options.authorName.trim())
		throw new Error('Author name is required.')
	if (!options.description.trim())
		throw new Error('Description is required.')

	const placeholderDirectory = join(root, 'packages', 'pkg-placeholder')
	if (!(await pathExists(placeholderDirectory)))
		throw new Error('packages/pkg-placeholder was not found. The template may already be initialized.')

	const targetDirectory = join(root, 'packages', options.packageDirectory)
	if (targetDirectory !== placeholderDirectory && await pathExists(targetDirectory))
		throw new Error(`Target package directory already exists: packages/${options.packageDirectory}`)

	const rootPackagePath = join(root, 'package.json')
	const packageJsonPath = join(placeholderDirectory, 'package.json')
	const rootTsConfigPath = join(root, 'tsconfig.json')
	const rootPackage = await readJson<PackageJson>(rootPackagePath)
	const packageJson = await readJson<PackageJson>(packageJsonPath)
	const rootTsConfig = await readJson<TsConfig>(rootTsConfigPath)
	const repositoryUrl = `https://github.com/${options.repositoryOwner}/${options.repositoryName}`
	const author = options.authorEmail?.trim()
		? `${options.authorName.trim()} <${options.authorEmail.trim()}>`
		: options.authorName.trim()
	const packageScope = options.packageName.startsWith('@')
		? options.packageName.slice(0, options.packageName.indexOf('/'))
		: ''

	Object.assign(rootPackage, {
		name: options.repositoryName,
		description: options.description.trim(),
		author,
		homepage: `${repositoryUrl}#readme`,
		repository: {
			type: 'git',
			url: `git+${repositoryUrl}.git`,
		},
		bugs: `${repositoryUrl}/issues`,
		config: {
			...(rootPackage.config ?? {}),
			packageScope,
		},
	})

	Object.assign(packageJson, {
		name: options.packageName,
		description: options.description.trim(),
		author,
		homepage: `${repositoryUrl}#readme`,
		repository: {
			type: 'git',
			url: `git+${repositoryUrl}.git`,
			directory: `packages/${options.packageDirectory}`,
		},
		bugs: {
			url: `${repositoryUrl}/issues`,
		},
		keywords: createKeywords(options.packageRuntime),
		sideEffects: false,
		publishConfig: {
			access: 'public',
		},
	})
	applyPackageRuntime(packageJson, options.packageRuntime)
	applyPackageFormat(packageJson, options.packageFormat)

	rootTsConfig.references = (rootTsConfig.references ?? []).map(reference => (
		reference.path === './packages/pkg-placeholder/tsconfig.json'
			? { path: `./packages/${options.packageDirectory}/tsconfig.json` }
			: reference
	))

	const license = createMitLicense(options.authorName.trim())
	await writeJson(rootPackagePath, rootPackage)
	await writeJson(packageJsonPath, packageJson)
	await writeJson(rootTsConfigPath, rootTsConfig)
	await writeFile(join(root, 'LICENSE'), license)
	await writeFile(join(placeholderDirectory, 'LICENSE'), license)
	await writeFile(
		join(placeholderDirectory, 'README.md'),
		createPackageReadme(options.packageName, options.description, options.packageRuntime),
	)
	await writeFile(
		join(placeholderDirectory, 'tsdown.config.ts'),
		createTsdownConfig(options.packageFormat, options.packageRuntime),
	)
	await writeFile(
		join(placeholderDirectory, 'tsconfig.package.json'),
		createPackageTsConfig(options.packageRuntime),
	)
	await writeFile(
		join(placeholderDirectory, 'tsconfig.tests.json'),
		createTestsTsConfig(options.packageRuntime),
	)
	await updateTemplateTextFiles(root, options, repositoryUrl, author)

	if (targetDirectory !== placeholderDirectory)
		await rename(placeholderDirectory, targetDirectory)
}

function createPackageFiles(
	rootPackage: PackageJson,
	options: CreatePackageOptions,
	license: string,
): Record<string, string> {
	const packageJson: PackageJson = {
		name: options.packageName,
		type: 'module',
		version: rootPackage.version ?? '0.0.0',
		description: options.description.trim(),
		author: rootPackage.author,
		license: rootPackage.license ?? 'MIT',
		homepage: rootPackage.homepage,
		repository: normalizeRepository(rootPackage.repository, options.directoryName),
		bugs: normalizeBugs(rootPackage.bugs),
		keywords: createKeywords(options.runtime),
		sideEffects: false,
		publishConfig: {
			access: rootPackage.publishConfig?.access ?? 'public',
		},
		files: ['dist'],
		scripts: {
			'build': 'tsdown',
			'build:pack': 'pnpm build && pnpm pack',
			'typecheck': 'pnpm typecheck:package && pnpm typecheck:test',
			'typecheck:package': 'tsc --project ./tsconfig.package.json --noEmit',
			'typecheck:test': 'tsc --project ./tsconfig.tests.json --noEmit',
		},
	}
	applyPackageRuntime(packageJson, options.runtime)
	applyPackageFormat(packageJson, options.format)

	return {
		'LICENSE': license,
		'README.md': createPackageReadme(options.packageName, options.description, options.runtime),
		'package.json': JSON.stringify(packageJson, null, '\t'),
		'tsdown.config.ts': createTsdownConfig(options.format, options.runtime),
		'src/index.ts': 'export {}',
		'tests/some.test.ts': `
import { describe, expect, it } from 'vitest'

describe('${options.packageName}', () => {
	it('is ready for tests', () => {
		expect(true).toBe(true)
	})
})`,
		'tsconfig.json': `
{
	"references": [
		{ "path": "./tsconfig.package.json" },
		{ "path": "./tsconfig.tests.json" }
	],
	"files": []
}`,
		'tsconfig.package.json': createPackageTsConfig(options.runtime),
		'tsconfig.tests.json': createTestsTsConfig(options.runtime),
		'vitest.config.ts': `
import { defineProject } from 'vitest/config'

export default defineProject({})`,
	}
}

function createPackageTsConfig(runtime: PackageRuntime): string {
	const extendsConfig = runtime === 'browser'
		? '@deviltea/tsconfig/dom'
		: runtime === 'node'
			? '@deviltea/tsconfig/node'
			: '@deviltea/tsconfig/base'
	const compilerOptions: Record<string, unknown> = {
		composite: true,
	}
	if (runtime === 'neutral') {
		compilerOptions.lib = ['ESNext']
		compilerOptions.types = []
	}
	return `${JSON.stringify({
		extends: extendsConfig,
		compilerOptions,
		include: ['./src/**/*.ts'],
	}, null, '\t')}\n`
}

function createTestsTsConfig(runtime: PackageRuntime): string {
	const compilerOptions: Record<string, unknown> = {
		composite: true,
	}
	if (runtime === 'browser')
		compilerOptions.lib = ['ESNext', 'DOM', 'DOM.Iterable']
	return `${JSON.stringify({
		extends: '@deviltea/tsconfig/node',
		compilerOptions,
		include: ['./src/**/*.ts', './tests/**/*.ts'],
	}, null, '\t')}\n`
}

function applyPackageRuntime(packageJson: PackageJson, runtime: PackageRuntime): void {
	delete packageJson.engines

	if (runtime === 'node') {
		packageJson.engines = {
			node: '>=22',
		}
	}
}

function applyPackageFormat(packageJson: PackageJson, format: PackageFormat): void {
	delete packageJson.exports
	delete packageJson.main
	delete packageJson.module
	delete packageJson.types

	if (format === 'esm') {
		Object.assign(packageJson, {
			exports: {
				'.': {
					types: './dist/index.d.ts',
					default: './dist/index.js',
				},
			},
			main: './dist/index.js',
			module: './dist/index.js',
			types: './dist/index.d.ts',
		})
		return
	}

	Object.assign(packageJson, {
		exports: {
			'.': {
				import: {
					types: './dist/index.d.mts',
					default: './dist/index.mjs',
				},
				require: {
					types: './dist/index.d.cts',
					default: './dist/index.cjs',
				},
			},
		},
		main: './dist/index.cjs',
		module: './dist/index.mjs',
		types: './dist/index.d.mts',
	})
}

function createTsdownConfig(format: PackageFormat, runtime: PackageRuntime): string {
	const formats = format === 'esm' ? '[\'esm\']' : '[\'esm\', \'cjs\']'
	const target = runtime === 'node' ? 'node22' : 'es2022'
	const fixedExtension = format === 'dual' ? '\n\tfixedExtension: true,' : ''
	return `import { defineConfig } from 'tsdown'

export default defineConfig({
	entry: ['src/index.ts'],
	format: ${formats},
	platform: '${runtime}',
	target: '${target}',${fixedExtension}
	dts: {
		tsconfig: 'tsconfig.package.json',
		compilerOptions: {
			composite: false,
		},
	},
	clean: true,
})
`
}

function createKeywords(runtime: PackageRuntime): string[] {
	if (runtime === 'browser')
		return ['typescript', 'browser']
	if (runtime === 'node')
		return ['typescript', 'node']
	return ['typescript']
}

function createPackageReadme(
	packageName: string,
	description: string,
	runtime: PackageRuntime,
): string {
	return `# ${packageName}

${description.trim()}

## Runtime

${getRuntimeDescription(runtime)}

## Install

\`\`\`bash
pnpm add ${packageName}
\`\`\`

## Usage

\`\`\`ts
import {} from '${packageName}'
\`\`\`

## License

[MIT](./LICENSE)
`
}

function getRuntimeDescription(runtime: PackageRuntime): string {
	if (runtime === 'browser')
		return 'Browser-targeted package output.'
	if (runtime === 'node')
		return 'Node.js 22 or newer.'
	return 'Platform-neutral package output for shared libraries.'
}

function createMitLicense(authorName: string): string {
	const currentYear = new Date()
		.getUTCFullYear()
	return `MIT License

Copyright (c) ${currentYear} ${authorName}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`
}

async function updateTemplateTextFiles(
	root: string,
	options: InitializeTemplateOptions,
	repositoryUrl: string,
	author: string,
): Promise<void> {
	await writeFile(join(root, 'README.md'), createInitializedReadme(options, repositoryUrl))

	const replacements: Array<[string, string]> = [
		['@deviltea/pkg-placeholder', options.packageName],
		['packages/pkg-placeholder', `packages/${options.packageDirectory}`],
		['https://github.com/DevilTea/repo-placeholder', repositoryUrl],
		['https://github.com/DevilTea', `https://github.com/${options.repositoryOwner}`],
		['DevilTea <ch870814@gmail.com>', author],
		['DevilTea <ch19980814@gmail.com>', author],
		['repo-placeholder', options.repositoryName],
		['pkg-placeholder', options.packageName],
		['_description_', options.description.trim()],
	]

	for (const relativePath of ['docs/index.md', 'docs/.vitepress/config.ts', 'AGENTS.md']) {
		const filePath = join(root, relativePath)
		if (!(await pathExists(filePath)))
			continue

		let content = await readFile(filePath, 'utf8')
		for (const [search, replacement] of replacements)
			content = content.replaceAll(search, replacement)

		if (relativePath === 'docs/.vitepress/config.ts')
			content = content.replace('https://github.com/vuejs/vitepress', repositoryUrl)
		if (relativePath === 'AGENTS.md') {
			content = content
				.replace(/Starter template for a TypeScript pnpm monorepo[^\n]+\n/, `${options.repositoryName} is a TypeScript pnpm monorepo publishing packages to npm, with a VitePress documentation site. Requires Node >=24 and pnpm 10.34.4. All dependency versions are managed centrally through the catalog in pnpm-workspace.yaml.\n`)
				.replace(/- This is a template:[^\n]+\n/, '')
		}

		await writeFile(filePath, content)
	}
}

function createInitializedReadme(options: InitializeTemplateOptions, repositoryUrl: string): string {
	const currentYear = new Date()
		.getUTCFullYear()
	return `# ${options.repositoryName}

${options.description.trim()}

## Packages

- [\`${options.packageName}\`](./packages/${options.packageDirectory}) — ${getRuntimeDescription(options.packageRuntime)}

## Requirements

- Node.js 24 or newer for repository tooling
- pnpm 10.34.4 through Corepack

## Development

\`\`\`bash
corepack enable
pnpm install
pnpm lint
pnpm typecheck
pnpm typecheck:build
pnpm test:coverage
pnpm build
pnpm publint
pnpm package:smoke
pnpm docs:build
\`\`\`

See [CONTRIBUTING.md](./CONTRIBUTING.md) for pull request requirements and [SECURITY.md](./SECURITY.md) for private vulnerability reporting.

## Release setup

Configure GitHub Pages, a protected \`release\` environment, and npm trusted publishing for \`release.yml\` before running the release workflows.

## License

[MIT](./LICENSE) License © ${currentYear} [${options.authorName.trim()}](https://github.com/${options.repositoryOwner})

Repository: ${repositoryUrl}
`
}

function normalizeRepository(repository: unknown, directoryName: string): unknown {
	if (typeof repository === 'string')
		return { type: 'git', url: repository, directory: `packages/${directoryName}` }
	if (repository && typeof repository === 'object')
		return { ...repository, directory: `packages/${directoryName}` }
	return undefined
}

function normalizeBugs(bugs: unknown): unknown {
	if (typeof bugs === 'string')
		return { url: bugs }
	return bugs
}

async function readJson<T>(filePath: string): Promise<T> {
	return JSON.parse(await readFile(filePath, 'utf8')) as T
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
	await writeFile(filePath, `${JSON.stringify(value, null, '\t')}\n`)
}

async function pathExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath)
		return true
	}
	catch {
		return false
	}
}
