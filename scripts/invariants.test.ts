import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

describe('repository invariants', () => {
	it('keeps project-reference typechecking non-emitting', async () => {
		const packageJson = await readJson<RootPackageJson>(join(root, 'package.json'))

		expect(packageJson.scripts?.['typecheck:build'])
			.toBe('tsc --build --pretty --noEmit')
	})

	it('keeps root package project references unique, sorted, and resolvable', async () => {
		const rootTsConfig = await readJson<RootTsConfig>(join(root, 'tsconfig.json'))
		const rootReferencePaths = rootTsConfig.references.map(reference => reference.path)
		const packageReferencePaths = rootReferencePaths.filter(referencePath => referencePath.startsWith('./packages/'))

		expect(rootReferencePaths.length)
			.toBeGreaterThan(0)
		expect(new Set(rootReferencePaths).size)
			.toBe(rootReferencePaths.length)
		expect(rootReferencePaths)
			.toEqual([...rootReferencePaths].sort())
		expect(packageReferencePaths.length)
			.toBeGreaterThan(0)

		for (const referencePath of rootReferencePaths) {
			const configPath = referencePath.endsWith('.json')
				? join(root, referencePath)
				: join(root, referencePath, 'tsconfig.json')
			expect(await pathExists(configPath))
				.toBe(true)
			await readJson<unknown>(configPath)
		}
	})
})

interface RootPackageJson {
	scripts?: Record<string, string>
}

interface RootTsConfig {
	references: Array<{ path: string }>
}

async function readJson<T>(filePath: string): Promise<T> {
	return JSON.parse(await readFile(filePath, 'utf8')) as T
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
