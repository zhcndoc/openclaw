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
openclaw setup --non-interactive --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 选项

- `--workspace <dir>`: 代理工作区目录（存储为 `agents.defaults.workspace`）
- `--wizard`: 运行引导
- `--non-interactive`: 无需提示运行引导
- `--mode <local|remote>`: 引导模式
- `--remote-url <url>`: 远程 Gateway WebSocket URL
- `--remote-token <token>`: 远程 Gateway 令牌

要通过 setup 运行引导：

```bash
openclaw setup --wizard
```

注意：

- 纯粹的 `openclaw setup` 会初始化配置 + 工作区，但不会执行完整的入门流程。
- 当存在任何入门相关标志时，会自动运行入门流程（`--wizard`、`--non-interactive`、`--mode`、`--remote-url`、`--remote-token`）。

## 相关

- [CLI 参考](/cli)
- [安装概览](/install)
