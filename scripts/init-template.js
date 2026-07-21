import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { cancel, confirm, intro, isCancel, outro, select, text } from '@clack/prompts'
import { initializeTemplate, validatePackageDirectoryName, validatePackageName, validateRepositoryName, validateRepositoryOwner } from './template.js'

const root = fileURLToPath(new URL('..', import.meta.url))
intro('Initialize starter-ts-monorepo')
const repositoryOwner = await text({
	message: 'GitHub repository owner',
	initialValue: 'DevilTea',
	validate: validateRepositoryOwner,
})
if (isCancel(repositoryOwner))
	exitCancelled()
const repositoryName = await text({
	message: 'GitHub repository name',
	initialValue: 'my-ts-monorepo',
	validate: validateRepositoryName,
})
if (isCancel(repositoryName))
	exitCancelled()
const description = await text({
	message: 'Project description',
	validate: value => value?.trim() ? undefined : 'Required.',
})
if (isCancel(description))
	exitCancelled()
const packageDirectory = await text({
	message: 'Initial package directory name',
	initialValue: repositoryName,
	validate: validatePackageDirectoryName,
})
if (isCancel(packageDirectory))
	exitCancelled()
const packageName = await text({
	message: 'Initial npm package name',
	initialValue: `@${repositoryOwner.toLowerCase()}/${packageDirectory}`,
	validate: validatePackageName,
})
if (isCancel(packageName))
	exitCancelled()
const packageRuntime = await select({
	message: 'Initial package runtime target',
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
if (isCancel(packageRuntime))
	exitCancelled()
const packageFormat = await select({
	message: 'Initial package module format',
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
if (isCancel(packageFormat))
	exitCancelled()
const authorName = await text({
	message: 'Author name',
	initialValue: repositoryOwner,
	validate: value => value?.trim() ? undefined : 'Required.',
})
if (isCancel(authorName))
	exitCancelled()
const authorEmail = await text({
	message: 'Author email (optional)',
})
if (isCancel(authorEmail))
	exitCancelled()
const shouldInitialize = await confirm({
	message: `Initialize ${repositoryOwner}/${repositoryName} with ${packageName}?`,
})
if (isCancel(shouldInitialize) || !shouldInitialize)
	exitCancelled()
try {
	await initializeTemplate(root, {
		repositoryOwner,
		repositoryName,
		description,
		packageDirectory,
		packageName,
		packageRuntime,
		packageFormat,
		authorName,
		authorEmail: authorEmail || undefined,
	})
	outro('Template initialized. Run pnpm install --no-frozen-lockfile to refresh workspace importers, then validate the repository.')
}
catch (error) {
	cancel(error instanceof Error ? error.message : String(error))
	process.exitCode = 1
}
function exitCancelled() {
	cancel('Operation cancelled.')
	process.exit(0)
}
