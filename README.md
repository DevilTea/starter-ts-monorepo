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
   pnpm test
   pnpm build
   pnpm publint
   ```

6. Configure GitHub Pages for the documentation workflow and configure npm trusted publishing for each public package. The release workflow uses OIDC and does not require an `NPM_TOKEN` repository secret.

## Add another package

```bash
pnpm newpkg
```

The scaffold refuses to overwrite an existing directory and adds the package to the root TypeScript project-reference graph.

## License

[MIT](./LICENSE) License © 2023-PRESENT [DevilTea](https://github.com/DevilTea)
