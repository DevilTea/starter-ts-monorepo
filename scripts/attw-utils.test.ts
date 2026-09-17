import { describe, expect, it } from 'vitest'
import { getAttwProfile, resolvePackedTarballPath } from './attw-utils.js'

describe('attw helpers', () => {
	it('uses publishConfig.exports when selecting the profile', () => {
		expect(getAttwProfile({
			exports: {
				'.': {
					require: './dist/index.cjs',
				},
			},
			publishConfig: {
				exports: {
					'.': {
						default: './dist/index.js',
					},
				},
			},
		}))
			.toBe('esm-only')
	})

	it('uses publishConfig.main when selecting the profile', () => {
		expect(getAttwProfile({
			main: './dist/index.js',
			publishConfig: {
				main: './dist/index.cjs',
			},
		}))
			.toBe('node16')
	})

	it('falls back to top-level publish fields', () => {
		expect(getAttwProfile({
			exports: {
				'.': {
					require: './dist/index.cjs',
				},
			},
		}))
			.toBe('node16')
	})

	it('resolves relative tarballs inside the pack destination', () => {
		expect(resolvePackedTarballPath('package-1.0.0.tgz', '/tmp/attw-output'))
			.toBe('/tmp/attw-output/package-1.0.0.tgz')
	})

	it('rejects tarball paths outside the pack destination', () => {
		expect(() => resolvePackedTarballPath('../package-1.0.0.tgz', '/tmp/attw-output'))
			.toThrow('outside its pack destination')
	})
})
