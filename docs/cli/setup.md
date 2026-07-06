---
summary: "CLI 参考：`openclaw setup`（与入门向导同义，支持通过标志进行基础设置）"
read_when:
  - 你正在使用 CLI 入门向导进行首次运行设置
  - 你想设置默认工作区路径
  - 你需要用于脚本的仅基础设置标志
title: "设置"
---

# `openclaw setup`

`openclaw setup` 会运行与 `openclaw onboard` 相同的引导式入门流程
（auth、workspace、Gateway、channels、skills、health）。当你
只需要初始化 config/workspace 文件夹而不使用向导时，请使用 `--baseline`。

`setup` 接受与 `openclaw onboard` 相同的入门标志，包括
auth（`--auth-choice`、`--token`、provider key 标志）、Gateway
（`--gateway-port`、`--gateway-bind`、`--gateway-auth`、`--install-daemon`）、
Tailscale（`--tailscale`）、reset（`--reset`、`--reset-scope`）、flow
（`--flow quickstart|advanced|manual|import`），以及 skip 标志
（`--skip-channels`、`--skip-skills`、`--skip-bootstrap`、`--skip-search`、
`--skip-health`、`--skip-ui`、`--skip-hooks`）。有关完整的标志参考和
非交互示例，请参见 [Onboard](/cli/onboard) 和
[CLI automation](/start/wizard-cli-automation)；`openclaw onboard --modern`（Crestodian
对话式助手）没有对应的 `setup` 版本。

<Note>
`openclaw setup` 适用于可变配置安装。在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，OpenClaw 会拒绝 setup 写入，因为配置文件由 Nix 管理。请使用官方的 [nix-openclaw 快速开始](https://github.com/openclaw/nix-openclaw#quick-start)，或者其他 Nix 包对应的源配置。
</Note>

## 选项

| Flag                       | Description                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `--workspace <dir>`        | 代理工作区目录（默认 `~/.openclaw/workspace`；存储为 `agents.defaults.workspace`）。 |
| `--baseline`               | 在不进行引导的情况下创建基础配置/工作区/会话文件夹。                                |
| `--wizard`                 | 为兼容性而接受；设置默认会运行引导。                                       |
| `--non-interactive`        | 无提示地运行引导。                                                                     |
| `--accept-risk`            | 确认完整系统的代理访问风险；与 `--non-interactive` 一起使用时必需。                       |
| `--mode <mode>`            | 引导模式：`local` 或 `remote`。                                                               |
| `--flow <flow>`            | 引导流程：`quickstart`、`advanced`、`manual` 或 `import`。                                      |
| `--reset`                  | 在引导前重置配置 + 凭据 + 会话（仅在 `--reset-scope full` 时重置工作区）。 |
| `--reset-scope <scope>`    | 重置范围：`config`、`config+creds+sessions` 或 `full`。                                          |
| `--import-from <provider>` | 在引导期间运行的迁移提供方。                                                        |
| `--import-source <path>`   | `--import-from` 的源代理主目录。                                                              |
| `--import-secrets`         | 在引导迁移期间导入受支持的密钥。                                               |
| `--remote-url <url>`       | 远程 Gateway WebSocket URL。                                                                       |
| `--remote-token <token>`   | 远程 Gateway 令牌（可选）。                                                                    |
| `--json`                   | 输出 JSON 摘要。                                                                              |

### 基础模式

`openclaw setup --baseline` 保留了旧的仅基础模式行为：它会
创建配置、工作区和会话目录，然后退出，不会
运行引导。

## 示例

```bash
openclaw setup
openclaw setup --baseline
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --accept-risk --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 说明

- 在完成基础设置后，运行 `openclaw setup` 或 `openclaw onboard` 以获得完整的引导流程，运行 `openclaw configure` 进行有针对性的更改，或运行 `openclaw channels add` 来添加频道账户。
- 如果检测到 Hermes 状态，交互式入门可自动提供迁移。导入式入门需要全新设置；在入门流程之外，请使用 [迁移](/cli/migrate) 获取试运行计划、备份和覆盖模式。

## 相关

- [CLI 参考](/cli)
- [入门](/cli/onboard)
- [入门（CLI）](/start/wizard)
- [快速开始](/start/getting-started)
- [安装概览](/install)
