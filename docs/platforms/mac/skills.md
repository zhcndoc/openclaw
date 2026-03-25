---
summary: "macOS 技能设置界面和基于网关的状态"
read_when:
  - Updating the macOS Skills settings UI
  - Changing skills gating or install behavior
title: "Skills (macOS)"
---

# 技能 (macOS)

macOS 应用通过网关展示 OpenClaw 技能；它不会在本地解析技能。

## 数据来源

- `skills.status`（网关）返回所有技能及其资格和缺失的要求
  （包括捆绑技能的白名单阻止）。
- 要求来源于每个 `SKILL.md` 文件中的 `metadata.openclaw.requires`。

## 安装操作

- `metadata.openclaw.install` 定义安装选项（brew/node/go/uv）。
- 应用调用 `skills.install` 在网关主机上运行安装程序。
- 当提供多个安装程序时，网关只展示一个首选安装程序
  （有 brew 则使用 brew，否则使用 `skills.install` 中的 node 管理器，默认 npm）。

## 环境变量/API 密钥

- 应用将密钥存储在 `~/.openclaw/openclaw.json` 的 `skills.entries.<skillKey>` 下。
- `skills.update` 用于更新 `enabled`、`apiKey` 和 `env`。

## 远程模式

- 安装和配置更新发生在网关主机上（而非本地 Mac）。
