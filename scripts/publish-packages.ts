import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { discoverPublishablePackages, isPackageVersionPublished, type CommandResult } from './release.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const packages = await discoverPublishablePackages(root)

if (packages.length === 0)
	throw new Error('No publishable packages were found under packages/.')

for (const package_ of packages) {
	const spec = `${package_.name}@${package_.version}`
	const viewResult = await runNpm(['view', spec, 'version', '--json'], package_.directory, true)
	if (isPackageVersionPublished(package_, viewResult)) {
		console.log(`Skipping ${spec}: already published.`)
		continue
	}

	console.log(`Publishing ${spec}.`)
	const publishResult = await runNpm(['publish', '--access', 'public'], package_.directory, false)
	if (publishResult.code !== 0) {
		throw new Error(
			`Failed to publish ${spec}.\n${publishResult.stdout}\n${publishResult.stderr}`,
		)
	}
}

async function runNpm(
	arguments_: string[],
	cwd: string,
	captureOutput: boolean,
): Promise<CommandResult> {
	return new Promise((resolve, reject) => {
		const child = spawn('npm', arguments_, {
			cwd,
			stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
		})
		let stdout = ''
		let stderr = ''
		child.stdout?.setEncoding('utf8')
		child.stderr?.setEncoding('utf8')
		child.stdout?.on('data', chunk => stdout += chunk)
		child.stderr?.on('data', chunk => stderr += chunk)
		child.once('error', reject)
		child.once('exit', code => resolve({ code, stdout, stderr }))
	})
}
