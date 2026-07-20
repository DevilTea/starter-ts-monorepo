# AGENTS.md

## Project Overview

Starter template for a TypeScript pnpm monorepo publishing packages to npm, with a VitePress docs site. Ships one placeholder package (`@deviltea/pkg-placeholder`). Initialize a generated repository with `pnpm init:template`; do not globally replace `deviltea`, because the toolchain intentionally depends on `@deviltea/eslint-config` and `@deviltea/tsconfig`. Requires Node >=24 and pnpm 10.34.4 (pinned via `packageManager`). All dependency versions are managed centrally through the `catalog:` in `pnpm-workspace.yaml` — packages declare dependencies as `"catalog:"`.

**Repository structure:**

```text
pnpm-workspace.yaml       # Workspace globs, version catalog, supply-chain security settings
packages/
└── pkg-placeholder/      # @deviltea/pkg-placeholder — initial package template
    ├── src/index.ts      # Source (tsdown builds ESM + CJS + declarations to dist/)
    ├── tests/            # Vitest tests
    └── tsdown.config.ts  # Build config
docs/                     # VitePress docs site (deployed to GitHub Pages)
scripts/init-template.ts  # Interactive repository initializer
scripts/newpkg.ts         # Interactive scaffold for another package
scripts/template.ts       # Tested file-system and metadata operations used by both CLIs
vitest.config.ts          # Package projects plus script integration tests
eslint.config.js          # @deviltea/eslint-config
tsconfig.json             # Root of the TypeScript project-reference graph
.github/workflows/        # ci, release, deploy-docs, security-audit
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

# Run all tests once
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
- File-system automation must use Node APIs rather than POSIX-only shell commands. Never overwrite an existing package directory implicitly.

## Testing

- Vitest is configured at the root with package projects under `packages/*` and a Node project for `scripts/**/*.test.ts`.
- Package tests live in `packages/<pkg>/tests/*.test.ts`; script integration tests use temporary directories and must cover destructive or metadata-changing behavior.
- Coverage (v8) and typechecking are enabled by default; benchmarks match `**/*.bench.ts`.
- Run everything: `pnpm test`. Single package test: `pnpm vitest --run packages/pkg-placeholder/tests/some.test.ts`.
- CI runs the test suite on Node 22 and 24 across Ubuntu, Windows, and macOS.

## Release

- Releases run in CI: trigger the `Release` workflow (`workflow_dispatch`) with a `bump_type` (patch/minor/major). It validates (`pnpm build && pnpm publint && pnpm typecheck && pnpm test`), bumps all packages with `bumpp -r`, publishes `packages/*` to npm via trusted publishing (OIDC), then generates GitHub release notes with `changelogithub`.
- Docs deploy automatically to GitHub Pages on every push to `main` (`deploy-docs.yml`).
- Weekly `security-audit.yml` runs `pnpm audit --audit-level=moderate` (Sundays 21:00 UTC).

## Gotchas

- `shellEmulator: true` in `pnpm-workspace.yaml` means package.json scripts run through pnpm's shell emulator: glob arguments must stay quoted (for example `--filter='./packages/*'`).
- Supply-chain hardening in `pnpm-workspace.yaml`: `minimumReleaseAge: 4320`, `trustPolicy: no-downgrade`, `blockExoticSubdeps`, and `strictDepBuilds`.
- Use `pnpm init:template` once in a generated repository. It preserves the `@deviltea/*` toolchain dependencies while replacing only project metadata and placeholders.
- Root `package.json` is private; only `packages/*` are published.
