---
summary: "CLI 参考：`openclaw setup`（初始化配置和工作区，可选运行引导）"
read_when:
  - 你正在进行首次设置，但不需要完整的 CLI 引导
  - 你想设置默认工作区路径
  - 你需要了解每个标志，以及 setup 如何在基础模式和向导模式之间做出决定
title: "设置"
---

# `openclaw setup`

初始化基础配置和代理工作区。只要存在任何引导标志，也会运行向导。

<Note>
`openclaw setup` 适用于可变配置安装。在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，OpenClaw 会拒绝 setup 写入，因为配置文件由 Nix 管理。请使用官方的 [nix-openclaw 快速开始](https://github.com/openclaw/nix-openclaw#quick-start)，或者其他 Nix 包对应的源配置。
</Note>

## 选项

| Flag                       | Description                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `--workspace <dir>`        | 代理工作区目录（默认 `~/.openclaw/workspace`；存储为 `agents.defaults.workspace`）。 |
| `--wizard`                 | 运行交互式入门引导。                                                                         |
| `--non-interactive`        | 无提示运行入门引导。                                                                     |
| `--accept-risk`            | 确认完整系统代理访问风险；与 `--non-interactive` 一起使用时必需。                       |
| `--mode <mode>`            | 入门引导模式：`local` 或 `remote`。                                                               |
| `--import-from <provider>` | 在引导期间运行的迁移提供方。                                                        |
| `--import-source <path>`   | `--import-from` 的源代理主目录。                                               |
| `--import-secrets`         | 在引导迁移期间导入受支持的密钥。                                               |
| `--remote-url <url>`       | 远程 Gateway WebSocket URL。                                                                       |
| `--remote-token <token>`   | 远程 Gateway 令牌（可选）。                                                                    |

### 向导自动触发

当以下任一标志被显式传入时，即使没有 `--wizard`，`openclaw setup` 也会运行向导：

`--wizard`, `--non-interactive`, `--accept-risk`, `--mode`, `--import-from`, `--import-source`, `--import-secrets`, `--remote-url`, `--remote-token`.

## 示例

```bash
openclaw setup
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --wizard
openclaw setup --wizard --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --accept-risk --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## Notes

- 直接运行 `openclaw setup` 会初始化配置和工作区，但不会执行完整的引导流程。
- 在基础设置之后，运行 `openclaw onboard` 可进行完整的引导流程，运行 `openclaw configure` 可进行有针对性的更改，或运行 `openclaw channels add` 添加频道账户。
- 如果检测到 Hermes 状态，交互式引导可自动提供迁移。导入引导需要全新的设置；在引导之外，请使用 [Migrate](/cli/migrate) 来进行 dry-run 计划、备份以及覆盖模式。  

## 相关

- [CLI reference](/cli)
- [Onboarding (CLI)](/start/wizard)
- [Getting started](/start/getting-started)
- [Install overview](/install)
