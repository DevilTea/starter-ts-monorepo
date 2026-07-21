import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { discoverPublishablePackages, isPackageVersionPublished } from './release.js'

const roots = []
afterEach(async () => {
	await Promise.all(roots.splice(0)
		.map(root => rm(root, { force: true, recursive: true })))
})
describe('discoverPublishablePackages', () => {
	it('returns only public packages in deterministic order', async () => {
		const root = await createRoot()
		await createPackage(root, 'zeta', { name: '@example/zeta', version: '1.2.3' })
		await createPackage(root, 'private', { name: '@example/private', private: true, version: '1.2.3' })
		await createPackage(root, 'alpha', { name: '@example/alpha', version: '1.2.3' })
		const packages = await discoverPublishablePackages(root)
		expect(packages.map(package_ => package_.name))
			.toEqual(['@example/alpha', '@example/zeta'])
	})
})
describe('isPackageVersionPublished', () => {
	const package_ = {
		directory: '/tmp/package',
		name: '@example/package',
		version: '1.2.3',
	}
	it('recognizes an existing exact version', () => {
		expect(isPackageVersionPublished(package_, {
			code: 0,
			stdout: '"1.2.3"\n',
			stderr: '',
		}))
			.toBe(true)
	})
	it('recognizes npm E404 as an unpublished version', () => {
		expect(isPackageVersionPublished(package_, {
			code: 1,
			stdout: '',
			stderr: 'npm error code E404\nnpm error 404 Not Found',
		}))
			.toBe(false)
	})
	it('does not treat registry or network failures as an unpublished version', () => {
		expect(() => isPackageVersionPublished(package_, {
			code: 1,
			stdout: '',
			stderr: 'npm error code EAI_AGAIN',
		}))
			.toThrow('Unable to determine')
	})
})
async function createRoot() {
	const root = await mkdtemp(join(tmpdir(), 'release-test-'))
	roots.push(root)
	await mkdir(join(root, 'packages'), { recursive: true })
	return root
}
async function createPackage(root, directoryName, manifest) {
	const directory = join(root, 'packages', directoryName)
	await mkdir(directory, { recursive: true })
	await writeFile(join(directory, 'package.json'), `${JSON.stringify(manifest, null, '\t')}\n`)
}
