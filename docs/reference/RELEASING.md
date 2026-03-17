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

- 稳定发布版本：`YYYY.M.D`
  - Git 标签：`vYYYY.M.D`
- Beta 预发布版本：`YYYY.M.D-beta.N`
  - Git 标签：`vYYYY.M.D-beta.N`
- 月份和日期不补零
- `latest` 表示当前稳定的 npm 版本
- `beta` 表示当前的预发布 npm 版本
- Beta 版本可能会先于 macOS 应用发布

## 发布节奏

- 发布先发布 beta 版本
- 只有在最新的 beta 版本验证通过后，才发布稳定版本
- 详细的发布流程、审批、凭证及恢复说明仅限维护者使用

## 公开参考资料

- [`.github/workflows/openclaw-npm-release.yml`](https://github.com/openclaw/openclaw/blob/main/.github/workflows/openclaw-npm-release.yml)
- [`scripts/openclaw-npm-release-check.ts`](https://github.com/openclaw/openclaw/blob/main/scripts/openclaw-npm-release-check.ts)

维护者使用私有发布文档
[`openclaw/maintainers/release/README.md`](https://github.com/openclaw/maintainers/blob/main/release/README.md)
作为实际的操作手册。
