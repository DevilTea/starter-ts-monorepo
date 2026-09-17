import { isAbsolute, relative, resolve, sep } from 'node:path'

/**
 * @typedef {{ exports?: unknown, main?: unknown, publishConfig?: Record<string, unknown> }} PublishManifest
 */

/**
 * @param {PublishManifest} manifest
 * @returns {{ exports: unknown, main: unknown }} Effective published entry-point fields.
 */
export function getEffectivePublishManifest(manifest) {
	const publishConfig = isRecord(manifest.publishConfig) ? manifest.publishConfig : {}
	return {
		exports: Object.hasOwn(publishConfig, 'exports') ? publishConfig.exports : manifest.exports,
		main: Object.hasOwn(publishConfig, 'main') ? publishConfig.main : manifest.main,
	}
}

/**
 * @param {PublishManifest} manifest
 * @returns {'esm-only' | 'node16'} The ATTW profile matching the effective entry points.
 */
export function getAttwProfile(manifest) {
	const effectiveManifest = getEffectivePublishManifest(manifest)
	const supportsRequire = hasCondition(effectiveManifest.exports, 'require')
		|| (typeof effectiveManifest.main === 'string' && effectiveManifest.main.endsWith('.cjs'))
	return supportsRequire ? 'node16' : 'esm-only'
}

/**
 * @param {string} filename
 * @param {string} outputDirectory
 * @returns {string} The validated tarball path inside the pack destination.
 */
export function resolvePackedTarballPath(filename, outputDirectory) {
	if (typeof filename !== 'string' || !filename.trim() || filename !== filename.trim() || !/\.tgz$/i.test(filename))
		throw new Error(`pnpm pack returned an invalid tarball filename: ${String(filename)}`)

	const outputRoot = resolve(outputDirectory)
	const tarballPath = isAbsolute(filename)
		? resolve(filename)
		: resolve(outputRoot, filename)
	if (!isPathInside(outputRoot, tarballPath))
		throw new Error(`pnpm pack returned a tarball outside its pack destination: ${filename}`)
	return tarballPath
}

/**
 * @param {string} directory
 * @param {string} target
 * @returns {boolean} Whether the target is a strict descendant of the directory.
 */
export function isPathInside(directory, target) {
	const relativePath = relative(resolve(directory), resolve(target))
	return relativePath !== ''
		&& relativePath !== '..'
		&& !relativePath.startsWith(`..${sep}`)
		&& !isAbsolute(relativePath)
}

/**
 * @param {unknown} value
 * @param {string} condition
 * @returns {boolean} Whether the condition appears anywhere in the entry-point map.
 */
function hasCondition(value, condition) {
	if (Array.isArray(value))
		return value.some(item => hasCondition(item, condition))
	if (!isRecord(value))
		return false
	return Object.entries(value)
		.some(([key, nestedValue]) => key === condition || hasCondition(nestedValue, condition))
}

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>} Whether the value is a non-array object.
 */
function isRecord(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
}
