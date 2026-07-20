import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface PackageManifest {
	name?: string
	private?: boolean
	version?: string
}

export interface PublishablePackage {
	directory: string
	name: string
	version: string
}

export interface CommandResult {
	code: number | null
	stderr: string
	stdout: string
}

export async function discoverPublishablePackages(root: string): Promise<PublishablePackage[]> {
	const packagesRoot = join(root, 'packages')
	const entries = await readdir(packagesRoot, { withFileTypes: true })
	const packages: PublishablePackage[] = []

	for (const entry of entries) {
		if (!entry.isDirectory())
			continue

		const directory = join(packagesRoot, entry.name)
		const packageJsonPath = join(directory, 'package.json')
		const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageManifest
		if (manifest.private)
			continue
		if (!manifest.name)
			throw new Error(`${packageJsonPath} does not define a package name.`)
		if (!manifest.version)
			throw new Error(`${packageJsonPath} does not define a package version.`)

		packages.push({
			directory,
			name: manifest.name,
			version: manifest.version,
		})
	}

	return packages.sort((left, right) => left.name.localeCompare(right.name))
}

export function isPackageVersionPublished(
	package_: PublishablePackage,
	result: CommandResult,
): boolean {
	if (result.code === 0) {
		const value = JSON.parse(result.stdout) as unknown
		if (value !== package_.version) {
			throw new Error(
				`npm returned an unexpected version for ${package_.name}@${package_.version}: ${result.stdout.trim()}`,
			)
		}
		return true
	}

	const output = `${result.stdout}\n${result.stderr}`
	if (/\bE404\b|404 Not Found/i.test(output))
		return false

	throw new Error(
		`Unable to determine whether ${package_.name}@${package_.version} is published.\n${output.trim()}`,
	)
}
