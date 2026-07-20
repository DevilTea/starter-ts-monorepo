# AGENTS.md

## Project Overview

Starter template for a TypeScript pnpm monorepo publishing packages to npm, with a VitePress docs site. Ships one placeholder package (`@deviltea/pkg-placeholder`). Initialize a generated repository with `pnpm init:template`; do not globally replace `deviltea`, because the toolchain intentionally depends on `@deviltea/eslint-config` and `@deviltea/tsconfig`. Requires Node >=24 and pnpm 10.34.4 (pinned via `packageManager`). All dependency versions are managed centrally through the `catalog:` in `pnpm-workspace.yaml` — packages declare dependencies as `"catalog:"`.

**Repository structure:**

```text
pnpm-workspace.yaml           # Workspace globs, version catalog, supply-chain security settings
packages/
└── pkg-placeholder/          # @deviltea/pkg-placeholder — initial package template
    ├── src/index.ts          # Source (tsdown builds ESM + CJS + declarations to dist/)
    ├── tests/                # Vitest tests
    └── tsdown.config.ts      # Build config
docs/                         # VitePress docs site (deployed to GitHub Pages)
scripts/init-template.ts      # Interactive repository initializer
scripts/newpkg.ts             # Interactive scaffold for another package
scripts/template.ts           # Tested file-system and metadata operations used by both CLIs
scripts/validate-packages.ts  # Runtime and TypeScript consumer validation for built packages
scripts/release.ts            # Tested release package discovery and registry-result classification
scripts/publish-packages.ts   # Resumable npm trusted-publishing runner
vitest.config.ts              # Package projects plus script integration tests
eslint.config.js              # @deviltea/eslint-config
tsconfig.json                 # Root of the TypeScript project-reference graph
.github/workflows/            # CI, release preparation/publishing, docs, security audit
```

## Setup Commands

```bash
# Install dependencies
pnpm install

# Initialize a newly generated repository from this template
pnpm init:template

# Build all packages
pnpm build

# Scaffold another package under packages/
pnpm newpkg

# Run all tests once / with coverage / in watch mode
pnpm test
pnpm test:coverage
pnpm test:watch

# Validate formatting and lint rules without modifying files
pnpm lint

# Apply lint fixes locally
pnpm lint:fix

# Type check workspaces and the root project-reference graph
pnpm typecheck
pnpm typecheck:build

# Docs: dev server / build / preview
pnpm docs:dev
pnpm docs:build
pnpm docs:preview

# Validate packed metadata and built package consumers
pnpm publint
pnpm package:smoke
```

## Code Style

- TypeScript, ESM-first (`"type": "module"`, `sideEffects: false`); tsdown emits both ESM and CJS with type declarations.
- ESLint via `@deviltea/eslint-config` (flat config in `eslint.config.js`); tabs for indentation, single quotes, no semicolons.
- `pnpm lint` is a read-only CI gate. Use `pnpm lint:fix` or the pre-commit hook to modify files.
- tsconfigs extend `@deviltea/tsconfig/base` and use composite project references; each package typechecks `src` and `tests` with separate tsconfig projects.
- Pre-commit hook (simple-git-hooks + lint-staged) runs `eslint --fix` on staged files.
- New dependencies: add the version to the `catalog:` in `pnpm-workspace.yaml`, then reference it as `"catalog:"` in the package's `package.json`.
- File-system automation must use Node APIs rather than POSIX-only shell commands. Never overwrite an existing package directory implicitly.

## Testing

- Vitest is configured at the root with package projects under `packages/*` and a Node project for `scripts/**/*.test.ts`.
- Package tests live in `packages/<pkg>/tests/*.test.ts`; script integration tests use temporary directories and must cover destructive or metadata-changing behavior.
- Coverage is opt-in through `pnpm test:coverage`, so ordinary tests and watch mode do not pay the instrumentation cost.
- `pnpm package:smoke` loads built packages through Node ESM and CJS where supported, then typechecks consumers using TypeScript `Bundler` and `NodeNext` resolution.
- CI runs build and tests on Node 22 and 24 across Ubuntu, Windows, and macOS, plus the stricter package and documentation checks on Ubuntu.

## Release

- Run `Prepare Release` from `main` with a patch, minor, or major bump. It executes the full quality gate, uses `bumpp -r` to create and push one version commit and `v*` tag, verifies the remote tag, and uploads release metadata.
- `Release` runs from the successful `Prepare Release` workflow via `workflow_run`. It downloads the metadata, checks out and verifies the immutable tag, repeats the full quality gate, publishes missing package versions with npm trusted publishing, and creates GitHub release notes with `gh release create`.
- Configure npm trusted publishing for workflow filename `release.yml`, environment `release`, and allowed action `npm publish`. Do not add an `NPM_TOKEN`.
- Publishing is resumable: versions already present on npm and existing GitHub releases are skipped. For recovery, manually run `Release` with the existing tag. Do not rerun `Prepare Release` to retry a publish.
- Docs deploy automatically to GitHub Pages on every push to `main` (`deploy-docs.yml`).
- Weekly `security-audit.yml` runs `pnpm audit --audit-level=moderate` (Sundays 21:00 UTC).

## Gotchas

- `shellEmulator: true` in `pnpm-workspace.yaml` means package.json scripts run through pnpm's shell emulator: glob arguments must stay quoted (for example `--filter='./packages/*'`).
- Supply-chain hardening in `pnpm-workspace.yaml`: `minimumReleaseAge: 4320`, `trustPolicy: no-downgrade`, `blockExoticSubdeps`, and `strictDepBuilds`.
- Use `pnpm init:template` once in a generated repository. It preserves the `@deviltea/*` toolchain dependencies while replacing only project metadata and placeholders.
- Root `package.json` is private; only `packages/*` are published.
