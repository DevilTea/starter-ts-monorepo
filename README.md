# starter-ts-monorepo

A TypeScript pnpm monorepo starter for publishing platform-neutral, browser, or Node.js npm packages with ESM-only or ESM/CommonJS output, Vitest, VitePress, and hardened GitHub Actions.

## Requirements

- Node.js 24 or newer for repository tooling
- pnpm 10.34.4 through Corepack

## Use this template

1. Create a repository from this GitHub template.
2. Install the pinned toolchain dependencies:

   ```bash
   corepack enable
   pnpm install
   ```

3. Run the interactive initializer:

   ```bash
   pnpm init:template
   ```

   It updates repository and package metadata, selects a platform-neutral, browser, or Node.js runtime target, selects ESM-only or dual ESM/CommonJS output, renames `packages/pkg-placeholder`, creates package-local README and LICENSE files, rewrites TypeScript project references, and replaces starter documentation without modifying `@deviltea/eslint-config` or `@deviltea/tsconfig`.

4. Refresh the lockfile after the workspace path has been renamed:

   ```bash
   pnpm install --no-frozen-lockfile
   ```

5. Validate the initialized repository:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm typecheck:build
   pnpm test:coverage
   pnpm build
   pnpm publint
   pnpm package:smoke
   pnpm docs:build
   ```

## Package profiles

The initializer and `pnpm newpkg` ask for two independent choices:

- **Runtime:** platform-neutral for shared libraries, browser for browser-oriented packages, or Node.js 22+ for packages that use Node.js APIs.
- **Module format:** ESM-only by default, or dual ESM/CommonJS when legacy CommonJS consumers are an explicit requirement.

The selected runtime controls both the tsdown platform/target and the TypeScript environment:

- Platform-neutral packages use the base config with only `ESNext` libraries and no ambient platform types.
- Browser packages use DOM libraries and browser-oriented builds.
- Node.js packages use Node types, target Node.js 22, and declare `engines.node >=22`.

## Repository setup checklist

- Enable GitHub Pages with **GitHub Actions** as the source.
- Protect `main` with required CI checks and pull requests.
- Create a protected GitHub environment named `release`.
- Configure npm trusted publishing for each public package with workflow `release.yml`, environment `release`, and action `npm publish`.
- Enable Dependabot alerts, secret scanning, push protection, and code scanning where available.
- Enable private vulnerability reporting so `SECURITY.md` can direct reporters to a confidential channel.
- Confirm the source repository itself has GitHub's **Template repository** setting enabled.

The release workflow uses OIDC and does not require an `NPM_TOKEN` repository secret.

## Add another package

```bash
pnpm newpkg
```

The scaffold requests package metadata, runtime target, and module format; refuses to overwrite an existing directory; copies the repository license; creates a package-local README; and adds the package to the root TypeScript project-reference graph.

## Contributing and security

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the complete quality gate. Report vulnerabilities privately according to [SECURITY.md](./SECURITY.md), not through a public issue.

## Release

1. Run the **Prepare Release** workflow from `main` and select `patch`, `minor`, or `major`.
2. The workflow validates the repository, creates one version commit and `v*` tag, pushes both, and uploads immutable release metadata.
3. The **Release** workflow starts after preparation completes, checks out the exact tag, validates it again, publishes missing package versions through npm trusted publishing, and creates GitHub release notes.

Publishing is resumable. Already-published package versions and an existing GitHub release are skipped. To recover a failed publish after the preparation artifact expires, manually run the **Release** workflow and enter the existing `v*` tag. Never run **Prepare Release** again merely to retry publishing, because that creates a new version.

## License

[MIT](./LICENSE) License © 2023-PRESENT [DevilTea](https://github.com/DevilTea)
