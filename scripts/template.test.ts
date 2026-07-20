import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createPackage, initializeTemplate } from './template.js'

const roots: string[] = []

afterEach(async () => {
	await Promise.all(roots.splice(0)
		.map(root => rm(root, { force: true, recursive: true })))
})

describe('createPackage', () => {
	it('creates a documented dual-format package and project reference', async () => {
		const root = await createRoot()

		await createPackage(root, {
			description: 'A dual-format package',
			directoryName: 'new-package',
			format: 'dual',
			packageName: '@example/new-package',
		})

		const packageJson = await readJson(join(root, 'packages/new-package/package.json'))
		const tsConfig = await readJson(join(root, 'tsconfig.json'))
		expect(packageJson.types)
			.toBe('./dist/index.d.mts')
		expect(packageJson.sideEffects)
			.toBe(false)
		expect(packageJson.engines)
			.toEqual({ node: '>=22' })
		expect(await readFile(join(root, 'packages/new-package/README.md'), 'utf8'))
			.toContain('A dual-format package')
		expect(await readFile(join(root, 'packages/new-package/LICENSE'), 'utf8'))
			.toContain('MIT License')
		expect(await readFile(join(root, 'packages/new-package/tsdown.config.ts'), 'utf8'))
			.toContain('format: [\'esm\', \'cjs\']')
		expect(tsConfig.references)
			.toContainEqual({ path: './packages/new-package/tsconfig.json' })
	})

	it('creates an ESM-only package with matching exports', async () => {
		const root = await createRoot()

		await createPackage(root, {
			description: 'An ESM package',
			directoryName: 'esm-package',
			format: 'esm',
			packageName: '@example/esm-package',
		})

		const packageJson = await readJson(join(root, 'packages/esm-package/package.json'))
		expect(packageJson.exports)
			.toEqual({
				'.': {
					types: './dist/index.d.ts',
					default: './dist/index.js',
				},
			})
		expect(packageJson.main)
			.toBe('./dist/index.js')
		expect(await readFile(join(root, 'packages/esm-package/tsdown.config.ts'), 'utf8'))
			.toContain('format: [\'esm\']')
	})

	it('refuses to overwrite an existing package directory', async () => {
		const root = await createRoot()
		await mkdir(join(root, 'packages/existing'), { recursive: true })

		await expect(createPackage(root, {
			description: 'Existing package',
			directoryName: 'existing',
			format: 'esm',
			packageName: '@example/existing',
		})).rejects.toThrow('already exists')
	})
})

describe('initializeTemplate', () => {
	it('renames and productizes the placeholder package', async () => {
		const root = await createRoot()
		await mkdir(join(root, 'packages/pkg-placeholder'), { recursive: true })
		await writeJson(join(root, 'packages/pkg-placeholder/package.json'), {
			name: '@deviltea/pkg-placeholder',
			version: '0.0.0',
		})
		await writeFile(join(root, 'packages/pkg-placeholder/tsdown.config.ts'), '')
		await writeFile(join(root, 'README.md'), '# pkg-placeholder\n\n_description_\n')
		await mkdir(join(root, 'docs/.vitepress'), { recursive: true })
		await writeFile(join(root, 'docs/index.md'), 'repo-placeholder\n')
		await writeFile(join(root, 'docs/.vitepress/config.ts'), 'title: \'repo-placeholder\'\n')
		await writeFile(join(root, 'AGENTS.md'), 'packages/pkg-placeholder\n')

		await initializeTemplate(root, {
			repositoryOwner: 'ExampleOrg',
			repositoryName: 'example-repo',
			description: 'Example project',
			packageDirectory: 'core',
			packageFormat: 'esm',
			packageName: '@example/core',
			authorName: 'Example Author',
			authorEmail: 'author@example.com',
		})

		const rootPackage = await readJson(join(root, 'package.json'))
		const packageJson = await readJson(join(root, 'packages/core/package.json'))
		const tsConfig = await readJson(join(root, 'tsconfig.json'))
		const readme = await readFile(join(root, 'README.md'), 'utf8')
		expect(rootPackage.repository)
			.toEqual({
				type: 'git',
				url: 'git+https://github.com/ExampleOrg/example-repo.git',
			})
		expect(packageJson.name)
			.toBe('@example/core')
		expect(packageJson.exports)
			.toEqual({
				'.': {
					types: './dist/index.d.ts',
					default: './dist/index.js',
				},
			})
		expect(tsConfig.references)
			.toContainEqual({ path: './packages/core/tsconfig.json' })
		expect(readme).not.toMatch(/pkg-placeholder|repo-placeholder|_description_/)
		expect(await readFile(join(root, 'packages/core/README.md'), 'utf8'))
			.toContain('Example project')
		expect(await readFile(join(root, 'packages/core/LICENSE'), 'utf8'))
			.toContain('Example Author')
	})
})

async function createRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), 'starter-ts-monorepo-'))
	roots.push(root)
	await mkdir(join(root, 'packages'), { recursive: true })
	await writeFile(join(root, 'LICENSE'), 'MIT License\n\nCopyright (c) 2026 Example Author\n')
	await writeJson(join(root, 'package.json'), {
		name: 'monorepo',
		version: '0.0.0',
		author: 'Example Author <author@example.com>',
		license: 'MIT',
		homepage: 'https://github.com/ExampleOrg/example-repo#readme',
		repository: {
			type: 'git',
			url: 'git+https://github.com/ExampleOrg/example-repo.git',
		},
		bugs: 'https://github.com/ExampleOrg/example-repo/issues',
		publishConfig: {
			access: 'public',
		},
		config: {
			packageScope: '@example',
		},
	})
	await writeJson(join(root, 'tsconfig.json'), {
		files: [],
		references: [
			{ path: './tsconfig.scripts.json' },
			{ path: './packages/pkg-placeholder/tsconfig.json' },
		],
	})
	return root
}

async function readJson(filePath: string): Promise<Record<string, unknown>> {
	return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
	await writeFile(filePath, `${JSON.stringify(value, null, '\t')}\n`)
}
