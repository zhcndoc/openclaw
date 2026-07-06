---
summary: "macOS Skills 设置界面和网关支持的状态"
read_when:
  - 更新 macOS Skills 设置界面时
  - 更改 skills 的 gating 或安装行为时
title: "Skills（macOS）"
---

macOS 应用通过网关展示 OpenClaw skills；它不会在本地解析 skills。

## 数据源

- `skills.status`（gateway）返回所有技能以及资格和缺失的要求，包括捆绑技能的允许名单阻止。
- 要求来自每个 `SKILL.md` 中的 `metadata.openclaw.requires`。

## 安装操作

- `metadata.openclaw.install` 定义安装选项（brew/node/go/uv/download）。
- 应用调用 `skills.install` 在网关主机上运行安装程序。
- 由操作者拥有的 `security.installPolicy`（`enabled`、`targets`、`exec`）可以在安装器元数据运行之前，阻止基于网关的技能安装。内置的危险代码扫描（用于插件安装）未接入技能安装流程。
- 如果所有安装选项都是 `download`，网关会展示所有下载选项。
- 否则，网关会使用当前安装偏好（`skills.install.preferBrew`、`skills.install.nodeManager`）和主机二进制程序选择一个首选安装器：当启用 `preferBrew` 且存在 `brew` 时，先选择 Homebrew，然后是 `uv`，再是配置的 node manager，然后如果可用则再次选择 Homebrew（即使未启用 `preferBrew`），接着是 `go`，最后是 `download`。
- Node 安装标签会反映所配置的 node manager，包括 `yarn`。

## 环境/API 密钥

- 应用将密钥存储在 `~/.openclaw/openclaw.json` 的 `skills.entries.<skillKey>` 下。
- `skills.update` 会补丁更新 `enabled`、`apiKey` 和 `env`。

## 远程模式

- 安装和配置更新发生在网关主机上，而不是本地 Mac。

## 相关内容

- [技能](/tools/skills)
- [macOS 应用](/platforms/macos)
