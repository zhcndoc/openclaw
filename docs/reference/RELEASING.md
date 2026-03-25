---
title: "发布政策"
summary: "公开发布渠道、版本命名及发布节奏"
read_when:
  - 查找公开发布渠道定义
  - 查找版本命名和发布节奏
---

# 发布政策

OpenClaw 有三个公开发布通道：

- stable：带标签的发布，发布到 npm 的 `latest`
- beta：预发布标签，发布到 npm 的 `beta`
- dev：`main` 分支的最新代码

## 版本命名

- Stable release version: `YYYY.M.D`
  - Git tag: `vYYYY.M.D`
- Stable correction release version: `YYYY.M.D-N`
  - Git tag: `vYYYY.M.D-N`
- Beta prerelease version: `YYYY.M.D-beta.N`
  - Git tag: `vYYYY.M.D-beta.N`
- Do not zero-pad month or day
- `latest` means the current stable npm release
- `beta` means the current prerelease npm release
- Stable correction releases also publish to npm `latest`
- Every OpenClaw release ships the npm package and macOS app together

## 发布节奏

- 发布先发布 beta 版本
- 只有在最新的 beta 版本验证通过后，才发布稳定版本
- 详细的发布流程、审批、凭证及恢复说明仅限维护者使用

## Release preflight

- Run `pnpm build` before `pnpm release:check` so the expected `dist/*` release
  artifacts exist for the pack validation step
- Run `pnpm release:check` before every tagged release
- Run `RELEASE_TAG=vYYYY.M.D node --import tsx scripts/openclaw-npm-release-check.ts`
  (or the matching beta/correction tag) before approval
- npm release preflight fails closed unless the tarball includes both
  `dist/control-ui/index.html` and a non-empty `dist/control-ui/assets/` payload
  so we do not ship an empty browser dashboard again
- Stable macOS release readiness also includes the updater surfaces:
  - the GitHub release must end up with the packaged `.zip`, `.dmg`, and `.dSYM.zip`
  - `appcast.xml` on `main` must point at the new stable zip after publish
  - the packaged app must keep a non-debug bundle id, a non-empty Sparkle feed
    URL, and a `CFBundleVersion` at or above the canonical Sparkle build floor
    for that release version

## Public references

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)
- [`scripts/package-mac-dist.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-dist.sh)
- [`scripts/make_appcast.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/make_appcast.sh)

维护者使用私有发布文档
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
作为实际的操作手册。
