# AGENTS.md

## Project Overview

Starter template for a TypeScript pnpm monorepo publishing packages to npm, with a VitePress docs site. Ships one runtime-neutral placeholder package (`@deviltea/pkg-placeholder`). Initialize a generated repository with `pnpm init:template`; do not globally replace `deviltea`, because the toolchain intentionally depends on `@deviltea/eslint-config` and `@deviltea/tsconfig`. Requires Node >=24, TypeScript 6, and pnpm 10.34.4 (pinned via `packageManager`). All dependency versions are managed centrally through the `catalog:` in `pnpm-workspace.yaml`; packages declare dependencies as `"catalog:"`.

**Repository structure:**

```text
pnpm-workspace.yaml           # Workspace globs, version catalog, supply-chain security settings
packages/
└── pkg-placeholder/          # Runtime-neutral dual-format package template
    ├── README.md             # Package-local npm documentation
    ├── LICENSE               # Package-local license included in npm tarballs
    ├── src/index.ts          # Source
    ├── tests/                # Vitest tests
    └── tsdown.config.ts      # Runtime target and ESM-only or dual-format build config
docs/                         # VitePress docs site (deployed to GitHub Pages)
scripts/init-template.ts      # Interactive repository initializer
scripts/newpkg.ts             # Interactive package scaffold
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
pnpm install
pnpm init:template
pnpm newpkg
pnpm build
pnpm test
pnpm test:coverage
pnpm test:watch
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm typecheck:build
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
pnpm publint
pnpm package:smoke
```

## Code Style

- TypeScript and ESM-first. New packages default to platform-neutral ESM-only output.
- Runtime profiles are independent of module format: `neutral`, `browser`, or `node`; and `esm` or `dual`.
- TypeScript 6 runtime profiles must align tsdown and `@deviltea/tsconfig` v1: neutral uses `neutral`; browser uses `browser`; bundled Node.js packages use `node-bundler`, target `node22`, and declare `engines.node >=22`; tests, repository scripts, and tool configuration use `tooling`. Composite project references keep package source and tests separate.
- Select dual ESM/CommonJS output only for an explicit CommonJS compatibility requirement. Dual builds must use fixed extensions so package exports remain deterministic.
- Every publishable package must declare `sideEffects`, exports, description, repository metadata, a package-local README, and a package-local LICENSE. Node engines are required only for Node-targeted packages.
- ESLint via `@deviltea/eslint-config` (flat config in `eslint.config.js`); tabs for indentation, single quotes, no semicolons.
- `pnpm lint` is a read-only CI gate. Use `pnpm lint:fix` or the pre-commit hook to modify files.
- Pre-commit hook (simple-git-hooks + lint-staged) runs `eslint --fix` on staged files.
- New dependencies: add the version to the `catalog:` in `pnpm-workspace.yaml`, then reference it as `"catalog:"` in the package's `package.json`.
- File-system automation must use Node APIs rather than POSIX-only shell commands. Never overwrite an existing package directory implicitly.

## Testing

- Vitest is configured at the root with package projects under `packages/*` and a Node project for `scripts/**/*.test.ts`.
- Package tests live in `packages/<pkg>/tests/*.test.ts`; script integration tests use temporary directories and must cover destructive or metadata-changing behavior.
- Coverage is opt-in through `pnpm test:coverage`, so ordinary tests and watch mode do not pay the instrumentation cost.
- `pnpm package:smoke` loads built packages through Node ESM and CJS where supported, then typechecks consumers using TypeScript `Bundler` and `NodeNext` resolution.
- Scaffold tests must cover Node.js, browser, and platform-neutral runtime profiles plus ESM-only and dual-format manifests, TypeScript environments, and build configuration.
- CI runs build and tests on Node 24 across Ubuntu, Windows, and macOS, plus the stricter package and documentation checks on Ubuntu.

## Release

- The repository uses a fixed version across the root, private docs workspace, and public packages. Keep all manifests aligned before release.
- Run `Prepare Release` from `main` with a patch, minor, or major bump. It executes the full quality gate, uses `bumpp -r` to create and push one version commit and `v*` tag, verifies the remote tag, and uploads release metadata.
- `Release` runs from the successful `Prepare Release` workflow via `workflow_run`. It downloads the metadata, checks out and verifies the immutable tag, repeats the full quality gate, publishes missing package versions with npm trusted publishing, and creates GitHub release notes with `gh release create`.
- Configure npm trusted publishing for workflow filename `release.yml`, environment `release`, and allowed action `npm publish`. Do not add an `NPM_TOKEN`.
- Publishing is resumable: versions already present on npm and existing GitHub releases are skipped. For recovery, manually run `Release` with the existing tag. Do not rerun `Prepare Release` to retry a publish.
- Docs deploy automatically to GitHub Pages on every push to `main` (`deploy-docs.yml`).
- Weekly `security-audit.yml` runs `pnpm audit --audit-level=moderate` (Sundays 21:00 UTC).

## Gotchas

- `shellEmulator: true` in `pnpm-workspace.yaml` means package.json scripts run through pnpm's shell emulator: glob arguments must stay quoted (for example `--filter='./packages/*'`).
- Supply-chain hardening in `pnpm-workspace.yaml`: `minimumReleaseAge: 4320`, `trustPolicy: no-downgrade`, `blockExoticSubdeps`, and `strictDepBuilds`. Any `trustPolicyExclude` entry must be exact-version, documented, and justified by a reviewed upstream dependency.
- Use `pnpm init:template` once in a generated repository. It preserves the `@deviltea/*` toolchain dependencies while replacing project metadata, package runtime, package format, license, and placeholders.
- Root `package.json` is private; only `packages/*` are published.
