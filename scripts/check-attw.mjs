import { existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import process from 'node:process'
import spawn from 'cross-spawn'
import { getAttwProfile, isPathInside, resolvePackedTarballPath } from './attw-utils.js'

const root = resolve(import.meta.dirname, '..')
const packagesRoot = join(root, 'packages')
const packages = readdirSync(packagesRoot, { withFileTypes: true })
	.filter(entry => entry.isDirectory())
	.map(entry => join(packagesRoot, entry.name))
	.filter(packageDirectory => existsSync(join(packageDirectory, 'package.json')))

let validated = 0
let failed = false

for (const packageDirectory of packages) {
	const manifestPath = join(packageDirectory, 'package.json')
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
	if (manifest.private)
		continue
	if (typeof manifest.name !== 'string')
		throw new Error(`${manifestPath} does not define a package name.`)

	const configPath = join(packageDirectory, '.attw.json')
	const configuredProfile = readAttwProfile(configPath, manifest.name)
	const profile = getAttwProfile(manifest)
	if (configuredProfile !== profile)
		throw new Error(`${manifest.name}: .attw.json profile ${configuredProfile} does not match the effective publish manifest profile ${profile}.`)
	validated += 1
	const outputDirectory = mkdtempSync(join(tmpdir(), 'starter-attw-'))
	try {
		const tarball = pack(packageDirectory, outputDirectory, manifest.name)
		console.log(`Checking ${manifest.name} packed artifact with attw (${profile})...`)
		try {
			execPnpm(['exec', 'attw', tarball, '--config-path', configPath], {
				cwd: root,
				stdio: 'inherit',
			})
		}
		catch {
			failed = true
		}
	}
	catch (error) {
		failed = true
		console.error(`Failed to validate ${manifest.name}: ${error instanceof Error ? error.message : String(error)}`)
	}
	finally {
		rmSync(outputDirectory, { force: true, recursive: true })
	}
}

if (validated === 0)
	throw new Error('No publishable packages were found under packages/.')

if (failed) {
	console.error('\nattw found problems in one or more packed package artifacts.')
	process.exitCode = 1
}
else {
	console.log(`Validated ${validated} packed publishable package${validated === 1 ? '' : 's'} with attw.`)
}

function readAttwProfile(configPath, packageName) {
	if (!existsSync(configPath))
		throw new Error(`${packageName}: missing ${configPath}. Each publishable package must declare its ATTW profile.`)

	let config
	try {
		config = JSON.parse(readFileSync(configPath, 'utf8'))
	}
	catch (error) {
		throw new Error(`${packageName}: invalid .attw.json: ${error instanceof Error ? error.message : String(error)}`)
	}

	if (!config || typeof config !== 'object' || typeof config.profile !== 'string' || !config.profile.trim())
		throw new Error(`${packageName}: .attw.json must set a non-empty profile string.`)
	return config.profile
}

function pack(packageDirectory, outputDirectory, packageName) {
	let output
	try {
		output = execPnpm(['pack', '--json', '--pack-destination', outputDirectory], {
			cwd: packageDirectory,
			encoding: 'utf8',
		})
	}
	catch (error) {
		const details = error && typeof error === 'object' && 'stderr' in error
			? String(error.stderr)
			: error instanceof Error ? error.message : String(error)
		throw new Error(`${packageName}: pnpm pack failed\n${details}`)
	}

	let packResult
	try {
		const parsed = JSON.parse(output)
		packResult = Array.isArray(parsed) ? parsed.at(-1) : parsed
	}
	catch (error) {
		throw new Error(`${packageName}: pnpm pack returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
	}

	if (!packResult || typeof packResult !== 'object' || typeof packResult.filename !== 'string')
		throw new Error(`${packageName}: pnpm pack JSON did not include a filename.`)

	let tarball
	try {
		tarball = resolvePackedTarballPath(packResult.filename, outputDirectory)
		const outputRoot = realpathSync(outputDirectory)
		const realTarball = realpathSync(tarball)
		if (!isPathInside(outputRoot, realTarball))
			throw new Error('resolved tarball is outside the pack destination')
		const tarballStats = statSync(realTarball)
		if (!tarballStats.isFile())
			throw new Error('resolved tarball is not a regular file')
		const tarballExtension = realTarball.toLowerCase()
		if (!tarballExtension.endsWith('.tgz'))
			throw new Error('resolved tarball does not use the .tgz extension')
		return realTarball
	}
	catch (error) {
		throw new Error(`${packageName}: pnpm pack returned an invalid tarball path: ${packResult.filename} (${error instanceof Error ? error.message : String(error)})`)
	}
}

function execPnpm(args, options) {
	const result = spawn.sync('pnpm', args, options)
	if (result.error)
		throw result.error
	if (result.status !== 0)
		throw new Error(`pnpm ${args.join(' ')} failed (${result.signal ?? result.status}).`)
	return result.stdout
}
