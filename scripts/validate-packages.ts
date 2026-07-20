import { cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

interface PackageManifest {
	name?: string
	private?: boolean
	exports?: unknown
	main?: string
}

const root = fileURLToPath(new URL('..', import.meta.url))
const packagesRoot = join(root, 'packages')
const packageDirectories = (await readdir(packagesRoot, { withFileTypes: true }))
	.filter(entry => entry.isDirectory())
	.map(entry => join(packagesRoot, entry.name))

let validated = 0
for (const packageDirectory of packageDirectories) {
	const packageJsonPath = join(packageDirectory, 'package.json')
	const manifest = JSON.parse(await readFile(packageJsonPath, 'utf8')) as PackageManifest
	if (manifest.private)
		continue
	if (!manifest.name)
		throw new Error(`${packageJsonPath} does not define a package name.`)

	await validatePackage(packageDirectory, manifest)
	validated += 1
}

if (validated === 0)
	throw new Error('No publishable packages were found under packages/.')

console.log(`Validated ${validated} publishable package${validated === 1 ? '' : 's'}.`)

async function validatePackage(packageDirectory: string, manifest: PackageManifest): Promise<void> {
	const packageName = manifest.name as string
	const distDirectory = join(packageDirectory, 'dist')
	const exportTargets = collectExportTargets(manifest.exports)
	if (manifest.main?.startsWith('./'))
		exportTargets.add(manifest.main)

	if (exportTargets.size === 0)
		throw new Error(`${packageName} does not expose any relative package entry points.`)

	for (const target of exportTargets) {
		const targetPath = join(packageDirectory, target)
		try {
			await readFile(targetPath)
		}
		catch {
			throw new Error(`${packageName} points to a missing published file: ${target}`)
		}
	}

	const temporaryRoot = await mkdtemp(join(tmpdir(), 'package-consumer-'))
	try {
		const installedPackageDirectory = join(temporaryRoot, 'node_modules', ...packageName.split('/'))
		await mkdir(installedPackageDirectory, { recursive: true })
		await cp(distDirectory, join(installedPackageDirectory, 'dist'), { recursive: true })
		await cp(join(packageDirectory, 'package.json'), join(installedPackageDirectory, 'package.json'))
		await writeFile(join(temporaryRoot, 'package.json'), '{"private":true,"type":"module"}\n')

		await writeFile(
			join(temporaryRoot, 'import.mjs'),
			`import * as packageModule from ${JSON.stringify(packageName)}\nvoid packageModule\n`,
		)
		await run(process.execPath, ['import.mjs'], temporaryRoot)

		const supportsRequire = hasCondition(manifest.exports, 'require') || manifest.main?.endsWith('.cjs') === true
		if (supportsRequire) {
			await writeFile(
				join(temporaryRoot, 'require.cjs'),
				`const packageModule = require(${JSON.stringify(packageName)})\nvoid packageModule\n`,
			)
			await run(process.execPath, ['require.cjs'], temporaryRoot)
		}

		await validateTypeScriptConsumers(temporaryRoot, packageName, supportsRequire)
	}
	finally {
		await rm(temporaryRoot, { force: true, recursive: true })
	}
}

async function validateTypeScriptConsumers(
	temporaryRoot: string,
	packageName: string,
	supportsRequire: boolean,
): Promise<void> {
	await writeFile(
		join(temporaryRoot, 'consumer.ts'),
		`import * as packageModule from ${JSON.stringify(packageName)}\nvoid packageModule\n`,
	)

	await writeJson(join(temporaryRoot, 'tsconfig.bundler.json'), {
		compilerOptions: {
			module: 'ESNext',
			moduleResolution: 'Bundler',
			noEmit: true,
			skipLibCheck: false,
			strict: true,
			target: 'ES2022',
		},
		files: ['./consumer.ts'],
	})
	await runPnpm(['exec', 'tsc', '--project', join(temporaryRoot, 'tsconfig.bundler.json')], root)

	const nodeNextFiles = ['./consumer.ts']
	if (supportsRequire) {
		await writeFile(
			join(temporaryRoot, 'consumer.cts'),
			`import packageModule = require(${JSON.stringify(packageName)})\nvoid packageModule\n`,
		)
		nodeNextFiles.push('./consumer.cts')
	}
	await writeJson(join(temporaryRoot, 'tsconfig.nodenext.json'), {
		compilerOptions: {
			module: 'NodeNext',
			moduleResolution: 'NodeNext',
			noEmit: true,
			skipLibCheck: false,
			strict: true,
			target: 'ES2022',
		},
		files: nodeNextFiles,
	})
	await runPnpm(['exec', 'tsc', '--project', join(temporaryRoot, 'tsconfig.nodenext.json')], root)
}

function collectExportTargets(value: unknown, targets = new Set<string>()): Set<string> {
	if (typeof value === 'string') {
		if (value.startsWith('./'))
			targets.add(value)
		return targets
	}
	if (Array.isArray(value)) {
		for (const item of value)
			collectExportTargets(item, targets)
		return targets
	}
	if (value && typeof value === 'object') {
		for (const nestedValue of Object.values(value))
			collectExportTargets(nestedValue, targets)
	}
	return targets
}

function hasCondition(value: unknown, condition: string): boolean {
	if (Array.isArray(value))
		return value.some(item => hasCondition(item, condition))
	if (!value || typeof value !== 'object')
		return false
	return Object.entries(value).some(([key, nestedValue]) => (
		key === condition || hasCondition(nestedValue, condition)
	))
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
	await mkdir(dirname(filePath), { recursive: true })
	await writeFile(filePath, `${JSON.stringify(value, null, '\t')}\n`)
}

async function runPnpm(arguments_: string[], cwd: string): Promise<void> {
	await run(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', arguments_, cwd)
}

async function run(command: string, arguments_: string[], cwd: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, arguments_, {
			cwd,
			stdio: 'inherit',
		})
		child.once('error', reject)
		child.once('exit', (code, signal) => {
			if (code === 0)
				resolve()
			else
				reject(new Error(`${command} ${arguments_.join(' ')} failed (${signal ?? code}).`))
		})
	})
}
