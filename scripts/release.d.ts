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
export declare function discoverPublishablePackages(root: string): Promise<PublishablePackage[]>
export declare function isPackageVersionPublished(package_: PublishablePackage, result: CommandResult): boolean
