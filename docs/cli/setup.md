---
summary: "CLI reference for `openclaw setup` (初始化配置 + 工作区)"
read_when:
  - 你正在进行首次运行设置，但没有完整的 CLI 引导流程
  - 你想设置默认的工作区路径
title: "设置"
---

# `openclaw setup`

初始化 `~/.openclaw/openclaw.json` 和代理工作区。

相关：

- 入门： [Getting started](/start/getting-started)
- CLI 引导： [Onboarding (CLI)](/start/wizard)

## 示例

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 选项

- `--workspace <dir>`: 代理工作区目录（存储为 `agents.defaults.workspace`）
- `--wizard`: 运行引导流程
- `--non-interactive`: 无提示运行引导流程
- `--mode <local|remote>`: 引导模式
- `--import-from <provider>`: 在引导期间运行的迁移提供方
- `--import-source <path>`: `--import-from` 的源代理主目录
- `--import-secrets`: 在引导迁移期间导入受支持的密钥
- `--remote-url <url>`: 远程 Gateway WebSocket URL
- `--remote-token <token>`: 远程 Gateway 令牌

通过 setup 运行引导流程：

```bash
openclaw setup --wizard
```

说明：

- 直接运行 `openclaw setup` 会初始化配置 + 工作区，而不会执行完整的引导流程。
- 当存在任何引导标志时，会自动运行引导流程（`--wizard`、`--non-interactive`、`--mode`、`--import-from`、`--import-source`、`--import-secrets`、`--remote-url`、`--remote-token`）。
- 如果检测到 Hermes 状态，交互式引导可以自动提供迁移。导入引导需要全新设置；在引导之外，请使用 [Migrate](/cli/migrate) 进行 dry-run 计划、备份和覆盖模式。

## 相关

- [CLI reference](/cli)
- [安装概览](/install)
