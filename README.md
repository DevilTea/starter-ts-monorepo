# starter-ts-monorepo

A TypeScript pnpm monorepo starter for publishing npm packages with ESM/CJS output, Vitest, VitePress, and GitHub Actions.

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

   It updates repository and package metadata, renames `packages/pkg-placeholder`, rewrites TypeScript project references, and replaces the starter documentation without modifying `@deviltea/eslint-config` or `@deviltea/tsconfig`.

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

6. Configure GitHub Pages for the documentation workflow.
7. Create a GitHub environment named `release`. Add approval and tag/branch protection rules as required by the repository.
8. Configure npm trusted publishing for every public package with:
   - the generated GitHub repository owner and name
   - workflow filename `release.yml`
   - environment `release`
   - allowed action `npm publish`

The release workflow uses OIDC and does not require an `NPM_TOKEN` repository secret.

## Add another package

```bash
pnpm newpkg
```

The scaffold refuses to overwrite an existing directory and adds the package to the root TypeScript project-reference graph.

## Release

1. Run the **Prepare Release** workflow from `main` and select `patch`, `minor`, or `major`.
2. The workflow validates the repository, creates one version commit and `v*` tag, pushes both, and uploads immutable release metadata.
3. The **Release** workflow starts after preparation completes, checks out the exact tag, validates it again, publishes missing package versions through npm trusted publishing, and creates GitHub release notes.

Publishing is resumable. Already-published package versions and an existing GitHub release are skipped. To recover a failed publish after the preparation artifact expires, manually run the **Release** workflow and enter the existing `v*` tag. Never run **Prepare Release** again merely to retry publishing, because that creates a new version.

## License

[MIT](./LICENSE) License © 2023-PRESENT [DevilTea](https://github.com/DevilTea)
