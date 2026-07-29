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

在引导模式下，`--workspace <dir>` 是提供给 OpenClaw 的工作区；
只有在你批准该提议后，它才会被持久化。Baseline、经典模式和
非交互式 setup 会在全新安装时通过其正常流程持久化所提供的工作区。
如果现有的代理阵列会被重新映射，经典向导需要明确确认；
非交互式 setup 会保留当前的 fleet 工作区并打印警告。

引导式推理检测会在 macOS 或 Linux 的 Gateway 主机上运行。CLI
和 macOS 应用调用的是同一个由 Gateway 负责的检测器，它会检查已配置的
模型、受支持的 CLI 登录、API key 环境变量，以及已安装的 Ollama 或 LM Studio 模型。
本自动流程不会下载本地模型。检测到的本地运行时会在 CLI 和 API key 候选项之后自动测试；
当有多个本地模型可用时，OpenClaw 会优先选择最强的工具调用指令模型族。
被选中的候选项必须先完成一次真实补全，其提供方和模型配置才会被保存。
已安装的 Gemini、Antigravity、Pi 和 OpenCode CLI 也会被报告，
即使它们不能作为引导式设置可复用的推理路线。

`setup` 接受与 `openclaw onboard` 相同的 onboarding 标志，包括
auth（`--auth-choice`、`--token`、provider key flags）、Gateway
（`--gateway-port`、`--gateway-bind`、`--gateway-auth`、`--install-daemon`）、
Tailscale（`--tailscale`）、reset（`--reset`、`--reset-scope`）、flow
（`--flow quickstart|advanced|manual|import`），以及 skip 标志
（`--skip-channels`、`--skip-skills`、`--skip-bootstrap`、`--skip-search`、
`--skip-health`、`--skip-ui`、`--skip-hooks`）。传入 `--tui` 可使用与 `openclaw onboard --tui` 相同的终端入口。
完整的标志参考和非交互式示例请参见 [Onboard](/cli/onboard) 和
[CLI 自动化](/start/wizard-cli-automation)。`openclaw onboard --modern` 仍然是同一基于推理门控的 OpenClaw 助手的兼容入口。

<Note>
`openclaw setup` 适用于可变配置安装。在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，OpenClaw 会拒绝 setup 写入，因为配置文件由 Nix 管理。请使用官方的 [nix-openclaw 快速开始](https://github.com/openclaw/nix-openclaw#quick-start)，或者其他 Nix 包对应的源配置。
</Note>

## 选项

| 标志                       | 描述                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| `-m, --message <text>`     | 运行一次 OpenClaw 请求。                                                                         |
| `--yes`                    | 允许为一次 `--message` 请求写入持久化配置。                                                      |
| `--workspace <dir>`        | 工作区提议；现有舰队需要经典确认，并会在非交互模式下被保留。                                      |
| `--baseline`               | 在不进行引导的情况下创建基础配置/工作区/会话文件夹。                                             |
| `--wizard`                 | 强制交互式引导。                                                                                 |
| `--tui`                    | 使用终端界面而不是浏览器跳转。                                                                    |
| `--non-interactive`        | 在没有提示的情况下运行引导。                                                                      |
| `--accept-risk`            | 确认完整系统代理访问风险；与 `--non-interactive` 一起使用时必需。                                  |
| `--mode <mode>`            | 引导模式：`local` 或 `remote`。                                                                  |
| `--flow <flow>`            | 引导流程：`quickstart`、`advanced`、`manual` 或 `import`。                                       |
| `--reset`                  | 在引导前重置配置 + 凭据 + 会话（仅在 `--reset-scope full` 时重置工作区）。                         |
| `--reset-scope <scope>`    | 重置范围：`config`、`config+creds+sessions` 或 `full`。                                          |
| `--import-from <provider>` | 在引导期间运行的迁移提供方。                                                                      |
| `--import-source <path>`   | `--import-from` 的源代理主目录。                                                                  |
| `--import-secrets`         | 在引导迁移期间导入受支持的密钥。                                                                  |
| `--remote-url <url>`       | 远程 Gateway WebSocket URL。                                                                      |
| `--remote-token <token>`   | 远程 Gateway 令牌（可选）。                                                                       |
| `--json`                   | 已配置系统：OpenClaw 概览。引导路径：引导摘要。                                                    |

`--classic` 和 `--non-interactive` 互斥：classic 会打开带提示的
向导，而非交互式设置使用自动化路径。
在交互式引导中，`--remote-url` 和 `--remote-token` 会预填远程
Gateway 步骤，并在该次运行中优先于已存储的远程值。
更改 URL 不会复用已存储的凭据，除非你同时传入令牌。
令牌仍然会被遮蔽，并使用向导所选的明文或 SecretRef
存储模式。

### 基础模式

`openclaw setup --baseline` 保留了旧的仅基础模式行为：它会
创建配置、工作区和会话目录，然后退出，不会运行引导。它接受
`--workspace` 和无害的输出控制选项，但会拒绝显式引导、Gateway、认证、重置或守护进程选项，
而不是静默忽略它们。如果现有配置无效，基础设置会保留它，
并提示你先运行 `openclaw doctor`，然后再重试。

## 示例

```bash
openclaw setup
openclaw setup -m "状态"
openclaw setup -m "重启 gateway" --yes
openclaw setup --json
openclaw setup --wizard
openclaw setup --baseline
openclaw setup --workspace ~/.openclaw/workspace
openclaw setup --import-from hermes --import-source ~/.hermes
openclaw setup --non-interactive --accept-risk --mode remote --remote-url wss://gateway-host:18789 --remote-token <token>
```

## 说明

- 在 OpenClaw 聊天中，`configure skills` 和 `configure web search` 会运行托管的技能和网络搜索设置流程；当需要凭证时，`open search wizard` 会转交给屏蔽终端向导。请参阅 [`openclaw setup` operations](/cli/openclaw#operations-and-approval)。
- 完成基础设置后，运行 `openclaw onboard` 以获得完整的引导流程，运行 `openclaw configure` 进行有针对性的更改，或运行 `openclaw channels add` 添加频道账户。
- 如果检测到 Hermes 状态，交互式 onboarding 可以自动提供迁移。导入式 onboarding 需要全新的设置；在 onboarding 之外，请使用 [Migrate](/cli/migrate) 进行 dry-run 计划、备份和覆盖模式。

## 相关

- [CLI 参考](/cli)
- [入门](/cli/onboard)
- [入门（CLI）](/start/wizard)
- [快速开始](/start/getting-started)
- [安装概览](/install)
