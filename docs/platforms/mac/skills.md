---
summary: "macOS 技能设置界面和基于网关的状态"
read_when:
  - 更新 macOS 技能设置界面时
  - 更改技能准入或安装行为时
title: "技能 (macOS)"
---

macOS 应用通过网关展示 OpenClaw 技能；它不会在本地解析技能。

## 数据来源

- `skills.status`（网关）返回所有技能及其资格和缺失的要求
  （包括捆绑技能的白名单阻止）。
- 要求来源于每个 `SKILL.md` 文件中的 `metadata.openclaw.requires`。

## 安装操作

- `metadata.openclaw.install` 定义安装选项（brew/node/go/uv）。
- 应用调用 `skills.install` 在网关主机上运行安装程序。
- 内置的 dangerous-code `critical` 发现默认会阻止 `skills.install`；suspicious 发现仍只会发出警告。危险覆盖存在于网关请求中，但默认的应用流程保持 fail-closed。
- 如果所有安装选项都是 `download`，网关会展示所有下载
  选项。
- 否则，网关会根据当前
  安装偏好和主机二进制文件选择一个首选安装程序：当启用 `skills.install.preferBrew` 且存在 `brew` 时优先使用 Homebrew，然后是 `uv`，然后是
  `skills.install.nodeManager` 中配置的 node 管理器，随后是
  `go` 或 `download` 等后续
  回退方案。
- Node 安装标签会反映已配置的 node 管理器，包括 `yarn`。

## 环境变量/API 密钥

- 应用将密钥存储在 `~/.openclaw/openclaw.json` 的 `skills.entries.<skillKey>` 下。
- `skills.update` 用于更新 `enabled`、`apiKey` 和 `env`。

## 远程模式

- 安装 + 配置更新会在网关主机上发生（而不是本地 Mac 上）。

## 相关

- [Skills](/tools/skills)
- [macOS app](/platforms/macos)
