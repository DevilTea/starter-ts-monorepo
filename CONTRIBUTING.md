# Contributing

## Before you start

- Search existing issues and pull requests before opening a duplicate.
- Use an issue for behavior changes that need design discussion.
- Keep pull requests focused on one concern.

## Development

```bash
corepack enable
pnpm install
pnpm lint
pnpm typecheck
pnpm typecheck:build
pnpm test:coverage
pnpm build
pnpm publint
pnpm package:smoke
pnpm docs:build
```

Use `pnpm lint:fix` locally when formatting changes are required. CI validation commands must not modify tracked files.

## Pull requests

- Add or update tests for observable behavior changes.
- Update package and documentation content together when public APIs change.
- Do not edit generated `dist` files.
- Do not publish versions or create release tags from a pull request branch.
- Use Conventional Commit-style pull request titles, such as `fix:`, `feat:`, `docs:`, or `chore:`.

By contributing, you agree that your contribution is licensed under the repository's MIT License.
