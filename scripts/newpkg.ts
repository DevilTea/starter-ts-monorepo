import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { cancel, intro, isCancel, outro, text } from '@clack/prompts'
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

try {
	await createPackage(root, {
		directoryName: packageDirectory,
		packageName,
	})
	outro(`Package "${packageName}" created in packages/${packageDirectory}.`)
}
catch (error) {
	cancel(error instanceof Error ? error.message : String(error))
	process.exitCode = 1
}
