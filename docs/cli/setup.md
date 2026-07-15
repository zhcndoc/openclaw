---
summary: "CLI 参考：`openclaw setup`（带回退引导流程的系统代理聊天）"
read_when:
  - 你想与 OpenClaw 进行设置或修复对话
  - 你正在使用首次运行设置向导
  - 你想设置默认工作区路径
  - 你需要用于脚本的仅基础配置设置标志
title: "设置"
---

# `openclaw setup`

`openclaw setup` 是系统代理的入口点。在已配置的系统上，直接运行
`openclaw setup` 会打开一个交互式 OpenClaw 对话。在全新系统上，它
会转入引导式 onboarding。使用 `-m`/`--message` 发起一次请求，或使用
`--baseline` 在不运行向导的情况下初始化配置/工作区文件夹。

路由顺序：

1. 任何 onboarding 选项（`--wizard`、`--baseline`、workspace、reset、
   non-interactive、flow、mode、Gateway、daemon、skip、import、remote 或 auth
   选项）都会像 `openclaw onboard` 一样运行 onboarding。
2. `-m`/`--message` 或 `--yes` 运行系统代理。
3. 如果没有路由选项，已配置的交互式系统会打开 OpenClaw。全新系统会运行 onboarding。在已配置的系统上，即使没有 TTY，`--json` 也会打印系统概览；onboarding 选项则会保留 onboarding 的 JSON 摘要。

在引导模式下，`--workspace <dir>` 是提供给 OpenClaw 的工作区；只有在你批准该提议后，它才会被持久化保存。基础、经典和非交互式 setup 会通过各自的正常流程持久化所提供的工作区。

`setup` 接受与 `openclaw onboard` 相同的 onboarding 标志，包括 auth（`--auth-choice`、`--token`、provider key 标志）、Gateway（`--gateway-port`、`--gateway-bind`、`--gateway-auth`、`--install-daemon`）、Tailscale（`--tailscale`）、reset（`--reset`、`--reset-scope`）、flow（`--flow quickstart|advanced|manual|import`），以及 skip 标志（`--skip-channels`、`--skip-skills`、`--skip-bootstrap`、`--skip-search`、`--skip-health`、`--skip-ui`、`--skip-hooks`）。有关完整的标志参考和非交互式示例，请参见 [Onboard](/cli/onboard) 和 [CLI 自动化](/start/wizard-cli-automation)。`openclaw onboard --modern` 仍然是同一推理门控 OpenClaw 助手的兼容入口。

<Note>
`openclaw setup` 适用于可变配置安装。在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，OpenClaw 会拒绝 setup 写入，因为配置文件由 Nix 管理。请使用官方的 [nix-openclaw 快速开始](https://github.com/openclaw/nix-openclaw#quick-start)，或者其他 Nix 包对应的源配置。
</Note>

## 选项

| Flag                       | 描述                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `-m, --message <text>`     | 运行一次 OpenClaw 请求。                                                                             |
| `--yes`                    | 为一次 `--message` 请求批准持久配置写入。                                         |
| `--workspace <dir>`        | 引导模式中的工作区建议；由 baseline、classic 和非交互式设置直接持久化。 |
| `--baseline`               | 在不进行引导的情况下创建基础配置/工作区/会话文件夹。                                  |
| `--wizard`                 | 强制交互式引导。                                                                         |
| `--non-interactive`        | 在没有提示的情况下运行引导。                                                                       |
| `--accept-risk`            | 确认完整系统代理访问风险；与 `--non-interactive` 一起使用时为必需。                         |
| `--mode <mode>`            | 引导模式：`local` 或 `remote`。                                                                 |
| `--flow <flow>`            | 引导流程：`quickstart`、`advanced`、`manual` 或 `import`。                                        |
| `--reset`                  | 在引导前重置配置 + 凭据 + 会话（仅在 `--reset-scope full` 时连同工作区一起重置）。   |
| `--reset-scope <scope>`    | 重置范围：`config`、`config+creds+sessions` 或 `full`。                                            |
| `--import-from <provider>` | 在引导期间运行的迁移提供方。                                                          |
| `--import-source <path>`   | `--import-from` 的源代理主目录。                                                                |
| `--import-secrets`         | 在引导迁移期间导入受支持的密钥。                                                 |
| `--remote-url <url>`       | 远程网关 WebSocket URL。                                                                         |
| `--remote-token <token>`   | 远程网关令牌（可选）。                                                                      |
| `--json`                   | 已配置系统：OpenClaw 概览。引导路线：引导摘要。                           |

`--classic` 和 `--non-interactive` 互斥：classic 会打开带提示的
向导，而 noninteractive 设置使用自动化路径。

### 基础模式

`openclaw setup --baseline` 保留了旧的仅基础模式行为：它会
创建配置、工作区和会话目录，然后退出，不会
运行引导。

## 示例

```bash
openclaw setup
openclaw setup -m "status"
openclaw setup -m "restart gateway" --yes
openclaw setup --json
openclaw setup --wizard
openclaw setup --baseline
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --accept-risk --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 说明

- 在完成基础设置后，运行 `openclaw onboard` 以进行完整的引导流程，运行 `openclaw configure` 进行针对性更改，或运行 `openclaw channels add` 添加渠道账户。
- 如果检测到 Hermes 状态，交互式引导可以自动提供迁移。导入式引导需要全新设置；在引导之外，请使用 [迁移](/cli/migrate) 进行 dry-run 计划、备份和覆盖模式。

## 相关

- [CLI 参考](/cli)
- [入门](/cli/onboard)
- [入门（CLI）](/start/wizard)
- [快速开始](/start/getting-started)
- [安装概览](/install)
