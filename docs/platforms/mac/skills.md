---
summary: "macOS Skills 设置界面和网关支持的状态"
read_when:
  - 更新 macOS Skills 设置界面时
  - 更改 skills 的 gating 或安装行为时
title: "Skills（macOS）"
---

macOS 应用通过网关展示 OpenClaw skills；它不会在本地解析 skills。

## 数据源

- `skills.status`（网关）返回所有 skills，以及资格和缺失的要求
  （包括内置 skills 的 allowlist 阻止）。
- 要求由每个 `SKILL.md` 中的 `metadata.openclaw.requires` 派生。

## 安装操作

- `metadata.openclaw.install` 定义安装选项（brew/node/go/uv）。
- 应用调用 `skills.install` 在网关主机上运行安装器。
- 由操作者拥有的 `security.installPolicy` 可以在安装器元数据运行前
  阻止由网关支持的 skill 安装。安装时的内置危险代码阻止不属于 skill 安装流程。
- 如果每个安装选项都是 `download`，网关会展示所有下载选项。
- 否则，网关会使用当前安装偏好和主机二进制文件选择一个首选安装器：
  当启用 `skills.install.preferBrew` 且 `brew` 存在时优先使用 Homebrew，
  然后是 `uv`，再然后是 `skills.install.nodeManager` 中配置的 node 管理器，
  最后才是 `go` 或 `download` 等后备选项。
- Node 安装标签会反映配置的 node 管理器，包括 `yarn`。

## 环境/API 密钥

- 应用将密钥存储在 `~/.openclaw/openclaw.json` 的 `skills.entries.<skillKey>` 下。
- `skills.update` 会补丁更新 `enabled`、`apiKey` 和 `env`。

## 远程模式

- 安装 + 配置更新都发生在网关主机上（不是本地 Mac 上）。

## 相关内容

- [Skills](/tools/skills)
- [macOS app](/platforms/macos)
