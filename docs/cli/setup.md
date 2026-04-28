---
summary: "`openclaw setup` 的命令行参考（初始化配置 + 工作区）"
read_when:
  - 你正在进行首次设置，但没有完整的 CLI 引导
  - 你想设置默认工作区路径
title: "Setup"
---

# `openclaw setup`

初始化 `~/.openclaw/openclaw.json` 及代理工作区。

相关内容：

- 入门指南：[入门指南](/start/getting-started)
- CLI 引导：[引导（CLI）](/start/wizard)

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
- `--wizard`: 运行引导
- `--non-interactive`: 无提示运行引导
- `--mode <local|remote>`: 引导模式
- `--import-from <provider>`: 在引导期间运行的迁移提供方
- `--import-source <path>`: `--import-from` 的源代理主目录
- `--import-secrets`: 在引导迁移期间导入受支持的密钥
- `--remote-url <url>`: 远程 Gateway WebSocket URL
- `--remote-token <token>`: 远程 Gateway 令牌

要通过 setup 运行引导：

```bash
openclaw setup --wizard
```

注意：

- 纯 `openclaw setup` 只会初始化配置 + 工作区，不会执行完整的引导流程。
- 当存在任何引导标志（`--wizard`、`--non-interactive`、`--mode`、`--import-from`、`--import-source`、`--import-secrets`、`--remote-url`、`--remote-token`）时，会自动运行引导。
- 如果检测到 Hermes 状态，交互式引导可以自动提供迁移。导入式引导需要全新设置；在引导之外，可使用 [迁移](/cli/migrate) 进行 dry-run 计划、备份和覆盖模式。

## 相关

- [CLI 参考](/cli)
- [安装概览](/install)
