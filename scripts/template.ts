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

export interface CreatePackageOptions {
	directoryName: string
	packageName: string
}

export interface InitializeTemplateOptions {
	authorEmail?: string
	authorName: string
	description: string
	packageDirectory: string
	packageName: string
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
}

export function validatePackageName(value: string): string | undefined {
	if (!value)
		return 'Required.'
	if (!packageNamePattern.test(value))
		return 'Use a lowercase npm package name, optionally scoped (for example @scope/package).'
}

export function validateRepositoryName(value: string): string | undefined {
	if (!value)
		return 'Required.'
	if (!repositoryNamePattern.test(value))
		return 'Use letters, numbers, dots, underscores, or hyphens.'
}

export function validateRepositoryOwner(value: string): string | undefined {
	if (!value)
		return 'Required.'
	if (!repositoryOwnerPattern.test(value))
		return 'Enter a valid GitHub user or organization name.'
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

	const packagesRoot = join(root, 'packages')
	const packageDirectory = join(packagesRoot, options.directoryName)
	if (await pathExists(packageDirectory))
		throw new Error(`Package directory already exists: packages/${options.directoryName}`)

	const rootPackage = await readJson<PackageJson>(join(root, 'package.json'))
	const rootTsConfigPath = join(root, 'tsconfig.json')
	const rootTsConfig = await readJson<TsConfig>(rootTsConfigPath)
	const referencePath = `./packages/${options.directoryName}/tsconfig.json`
	if (rootTsConfig.references?.some(reference => reference.path === referencePath))
		throw new Error(`TypeScript project reference already exists: ${referencePath}`)

	await mkdir(packagesRoot, { recursive: true })
	const temporaryDirectory = await mkdtemp(join(packagesRoot, `.new-${options.directoryName}-`))
	let moved = false

	try {
		const files = createPackageFiles(rootPackage, options)
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
		sideEffects: false,
	})

	rootTsConfig.references = (rootTsConfig.references ?? []).map(reference => (
		reference.path === './packages/pkg-placeholder/tsconfig.json'
			? { path: `./packages/${options.packageDirectory}/tsconfig.json` }
			: reference
	))

	await writeJson(rootPackagePath, rootPackage)
	await writeJson(packageJsonPath, packageJson)
	await writeJson(rootTsConfigPath, rootTsConfig)
	await updateTemplateTextFiles(root, options, repositoryUrl, author)

	if (targetDirectory !== placeholderDirectory)
		await rename(placeholderDirectory, targetDirectory)
}

function createPackageFiles(rootPackage: PackageJson, options: CreatePackageOptions): Record<string, string> {
	const repository = normalizeRepository(rootPackage.repository, options.directoryName)
	const bugs = normalizeBugs(rootPackage.bugs)
	const packageJson = {
		name: options.packageName,
		type: 'module',
		version: rootPackage.version ?? '0.0.0',
		description: '',
		author: rootPackage.author,
		license: rootPackage.license ?? 'MIT',
		homepage: rootPackage.homepage,
		repository,
		bugs,
		keywords: [],
		sideEffects: false,
		publishConfig: {
			access: rootPackage.publishConfig?.access ?? 'public',
		},
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
		files: ['dist'],
		scripts: {
			'build': 'tsdown',
			'build:pack': 'pnpm build && pnpm pack',
			'typecheck': 'pnpm typecheck:package && pnpm typecheck:test',
			'typecheck:package': 'tsc --project ./tsconfig.package.json --noEmit',
			'typecheck:test': 'tsc --project ./tsconfig.tests.json --noEmit',
		},
	}

	return {
		'package.json': JSON.stringify(packageJson, null, '\t'),
		'tsdown.config.ts': `
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
})`,
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
		'tsconfig.package.json': `
{
	"extends": "@deviltea/tsconfig/base",
	"compilerOptions": {
		"composite": true
	},
	"include": [
		"./src/**/*.ts"
	]
}`,
		'tsconfig.tests.json': `
{
	"extends": "@deviltea/tsconfig/node",
	"compilerOptions": {
		"composite": true
	},
	"include": [
		"./src/**/*.ts",
		"./tests/**/*.ts"
	]
}`,
		'vitest.config.ts': `
import { defineProject } from 'vitest/config'

export default defineProject({})`,
	}
}

async function updateTemplateTextFiles(
	root: string,
	options: InitializeTemplateOptions,
	repositoryUrl: string,
	author: string,
): Promise<void> {
	const readmePath = join(root, 'README.md')
	await writeFile(readmePath, createInitializedReadme(options, repositoryUrl))

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
	return `# ${options.repositoryName}

${options.description.trim()}

## Packages

- [\`${options.packageName}\`](./packages/${options.packageDirectory})

## Development

\`\`\`bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
\`\`\`

## License

[MIT](./LICENSE) License © 2023-PRESENT [${options.authorName.trim()}](https://github.com/${options.repositoryOwner})

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
