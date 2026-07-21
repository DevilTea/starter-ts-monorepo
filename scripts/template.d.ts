export type PackageFormat = 'dual' | 'esm'
export type PackageRuntime = 'browser' | 'neutral' | 'node'
export interface CreatePackageOptions {
	description: string
	directoryName: string
	format: PackageFormat
	packageName: string
	runtime: PackageRuntime
}
export interface InitializeTemplateOptions {
	authorEmail?: string
	authorName: string
	description: string
	packageDirectory: string
	packageFormat: PackageFormat
	packageName: string
	packageRuntime: PackageRuntime
	repositoryName: string
	repositoryOwner: string
}
export declare function validatePackageDirectoryName(value: string): string | undefined
export declare function validatePackageName(value: string): string | undefined
export declare function validateRepositoryName(value: string): string | undefined
export declare function validateRepositoryOwner(value: string): string | undefined
export declare function getDefaultPackageName(root: string, directoryName: string): Promise<string>
export declare function createPackage(root: string, options: CreatePackageOptions): Promise<void>
export declare function initializeTemplate(root: string, options: InitializeTemplateOptions): Promise<void>
