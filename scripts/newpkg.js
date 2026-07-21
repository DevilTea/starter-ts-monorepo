import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { cancel, intro, isCancel, outro, select, text } from '@clack/prompts'
import { createPackage, getDefaultPackageName, validatePackageDirectoryName, validatePackageName } from './template.js'

const root = fileURLToPath(new URL('..', import.meta.url))
intro('Create a new package')
const packageDirectory = await text({
	message: 'Package directory name (/packages/<name>)',
	validate: validatePackageDirectoryName,
})
if (isCancel(packageDirectory)) {
	cancel('Operation cancelled.')
	process.exit(0)
}
const packageName = await text({
	message: 'npm package name',
	initialValue: await getDefaultPackageName(root, packageDirectory),
	validate: validatePackageName,
})
if (isCancel(packageName)) {
	cancel('Operation cancelled.')
	process.exit(0)
}
const description = await text({
	message: 'Package description',
	validate: value => value?.trim() ? undefined : 'Required.',
})
if (isCancel(description)) {
	cancel('Operation cancelled.')
	process.exit(0)
}
const runtime = await select({
	message: 'Runtime target',
	initialValue: 'neutral',
	options: [
		{
			value: 'neutral',
			label: 'Platform-neutral',
			hint: 'recommended for shared libraries',
		},
		{
			value: 'browser',
			label: 'Browser',
			hint: 'browser globals and bundlers',
		},
		{
			value: 'node',
			label: 'Node.js 22+',
			hint: 'Node.js APIs and runtime targeting',
		},
	],
})
if (isCancel(runtime)) {
	cancel('Operation cancelled.')
	process.exit(0)
}
const format = await select({
	message: 'Published module format',
	initialValue: 'esm',
	options: [
		{
			value: 'esm',
			label: 'ESM only',
			hint: 'recommended for new libraries',
		},
		{
			value: 'dual',
			label: 'ESM + CommonJS',
			hint: 'use only when CommonJS consumers are required',
		},
	],
})
if (isCancel(format)) {
	cancel('Operation cancelled.')
	process.exit(0)
}
try {
	await createPackage(root, {
		directoryName: packageDirectory,
		packageName,
		description,
		runtime,
		format,
	})
	outro(`Package "${packageName}" created in packages/${packageDirectory}.`)
}
catch (error) {
	cancel(error instanceof Error ? error.message : String(error))
	process.exitCode = 1
}
