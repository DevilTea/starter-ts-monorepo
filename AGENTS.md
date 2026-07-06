# AGENTS.md

## Project Overview

Starter template for a TypeScript pnpm monorepo publishing packages to npm, with a VitePress docs site. Ships one placeholder package (`@deviltea/pkg-placeholder`); `pkg-placeholder`, `repo-placeholder`, `_description_`, and `deviltea` are global placeholders to replace when using the template (see README checklist). Requires Node >=24 and pnpm 10.34.4 (pinned via `packageManager`). All dependency versions are managed centrally through the `catalog:` in `pnpm-workspace.yaml` — packages declare deps as `"catalog:"`.

**Repository structure:**
```
pnpm-workspace.yaml       # Workspace globs (docs, packages/*), version catalog, supply-chain security settings
packages/
└── pkg-placeholder/      # @deviltea/pkg-placeholder — placeholder package
    ├── src/index.ts      # Source (tsdown builds ESM + CJS + dts to dist/)
    ├── tests/            # Vitest tests
    └── tsdown.config.ts  # Build config
docs/                     # VitePress docs site (deployed to GitHub Pages)
scripts/newpkg.ts         # Interactive scaffold for a new package under packages/
vitest.config.ts          # Root Vitest config: projects = packages/*, coverage + typecheck enabled
eslint.config.js          # @deviltea/eslint-config
tsconfig.json             # Root of the TS project-references graph
.github/workflows/        # ci, release, deploy-docs, security-audit
```

## Setup Commands

```bash
# Install dependencies
pnpm install

# Build all packages (recursive, ./packages/* only)
pnpm build

# Scaffold a new package under packages/ (interactive prompts)
pnpm newpkg

# Run all tests once (with coverage and type tests)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Lint and auto-fix
pnpm lint

# Type check all workspace packages
pnpm typecheck

# Docs: dev server / build / preview
pnpm docs:dev
pnpm docs:build
pnpm docs:preview

# Validate publish artifacts of all packages
pnpm publint
```

## Code Style

- TypeScript, ESM-first (`"type": "module"`, `sideEffects: false`); tsdown emits both ESM and CJS with type declarations.
- ESLint via `@deviltea/eslint-config` (flat config in `eslint.config.js`); tabs for indentation, single quotes, no semicolons — enforced by `pnpm lint`.
- tsconfigs extend `@deviltea/tsconfig/base` and use composite project references; each package typechecks `src` and `tests` with separate tsconfig projects.
- Pre-commit hook (simple-git-hooks + lint-staged) runs `eslint --fix` on staged files.
- New dependencies: add the version to the `catalog:` in `pnpm-workspace.yaml`, then reference it as `"catalog:"` in the package's `package.json`.

## Testing

- Vitest, configured at the root (`vitest.config.ts`) with `projects: ['packages/*']`; each package has a minimal `vitest.config.ts` (`defineProject({})`).
- Tests live in `packages/<pkg>/tests/*.test.ts`. Coverage (v8) and typechecking of tests are enabled by default; benchmarks match `**/*.bench.ts`.
- Run everything: `pnpm test`. Single file: `pnpm vitest --run packages/pkg-placeholder/tests/some.test.ts`. Single test by name: add `-t 'test name'`.
- CI runs the test suite on Node 22 and 24 across ubuntu/windows/macos.

## Release

- Manual: trigger the `Release` workflow (`.github/workflows/release.yml`) via workflow_dispatch, choosing patch/minor/major. It runs `bumpp -r`, builds, publishes all `packages/*` to npm (needs the `NPM_TOKEN` repo secret), and generates a GitHub release via `changelogithub`.
- Docs deploy automatically to GitHub Pages on every push to `main` (`deploy-docs.yml`).
- Weekly `security-audit.yml` runs `pnpm audit --audit-level=moderate` (Sundays 21:00 UTC).

## Gotchas

- `shellEmulator: true` in `pnpm-workspace.yaml` means package.json scripts run through pnpm's shell emulator: glob arguments must stay quoted (e.g. `--filter='./packages/*'`), or the emulator expands them.
- Supply-chain hardening in `pnpm-workspace.yaml`: `minimumReleaseAge: 4320` (new releases ignored for 3 days), `trustPolicy: no-downgrade`, `blockExoticSubdeps`, `strictDepBuilds`. Dependency build scripts are blocked unless listed in `onlyBuiltDependencies` (currently empty; `esbuild` and `simple-git-hooks` are in `ignoredBuiltDependencies`).
- This is a template: placeholders (`pkg-placeholder`, `repo-placeholder`, `_description_`, `deviltea`) must be replaced globally before real use.
- Root `package.json` name is `monorepo` and it is private; only `packages/*` are published.
