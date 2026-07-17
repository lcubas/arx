# Contributing to arx

Thanks for considering a contribution. This is a pnpm + Turborepo monorepo.

## Setup

```bash
pnpm install
```

Requires Node >= 22.13 and pnpm >= 9 (see `packageManager` in the root `package.json`).

## Common commands

Run from the repo root — Turborepo fans these out to every package:

```bash
pnpm build       # build all packages
pnpm test        # run all test suites
pnpm typecheck   # tsc --noEmit in every package
pnpm lint        # biome check .
pnpm format      # biome format --write .
```

To work on a single package, `cd packages/<name>` and run its local `pnpm test` / `pnpm typecheck` script, or use Turborepo filtering from the root: `pnpm turbo run test --filter=@arxjs/drizzle`.

## Commit messages

Commits are linted with commitlint (`commit-msg` git hook via simple-git-hooks) and must follow [Conventional Commits](https://www.conventionalcommits.org/): `fix: ...`, `feat: ...`, `chore: ...`, `docs: ...`, etc. `simple-git-hooks` installs this automatically after `pnpm install` (via the `prepare` script), along with a `pre-commit` hook that runs `lint-staged`.

## Adding a StorageAdapter method or changing the contract

If you touch `packages/core/src/adapter.ts`, update every adapter package (`prisma`, `drizzle`, `typeorm`) to match, and add or update tests in each affected package.

## Changesets

If your change affects the published behavior of any package, add a changeset before opening your PR:

```bash
pnpm changeset
```

Pick the affected package(s) and bump type (patch/minor/major), and describe the change from the consumer's point of view. CI does not publish automatically — releases are cut manually via `pnpm release`.

## Pull requests

- Keep PRs focused — one concern per PR.
- Make sure `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` all pass locally before pushing.
- CI runs the same checks on every PR; it must be green before merge.
