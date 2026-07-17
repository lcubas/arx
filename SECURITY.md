# Security Policy

arx is an authorization library — a vulnerability here can affect who gets access to what in every application that depends on it. If you find one, please report it privately rather than opening a public issue.

## Reporting a vulnerability

Use [GitHub Security Advisories](https://github.com/lcubas/arxjs/security/advisories/new) to report privately. This creates a private discussion with the maintainer and lets us coordinate a fix and disclosure timeline before the details become public.

Please include:
- Which package(s) are affected (`@arxjs/core`, `@arxjs/prisma`, `@arxjs/drizzle`, `@arxjs/typeorm`, `@arxjs/nestjs`) and version
- Steps to reproduce, or a minimal example
- What you'd expect to happen vs. what actually happens
- Impact, if you've assessed it (e.g. does it grant access that should be denied, bypass a check, leak data)

This is a solo-maintained project — there's no guaranteed response SLA, but security reports get priority over everything else. Expect an initial response within a few days.

## Supported versions

Pre-1.0, only the latest published version of each package is supported. Once v1.0 ships, this section will be updated with a support policy tied to semver.

## Scope

In scope: the packages published from this repository. Vulnerabilities in dependencies (Prisma, Drizzle, TypeORM, NestJS, etc.) should be reported to those projects directly, unless arx's usage of them introduces the issue.
