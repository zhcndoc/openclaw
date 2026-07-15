---
summary: "CLI 参考：`openclaw setup`（与入门向导同义，支持通过标志进行基础设置）"
read_when:
  - 你正在使用 CLI 入门向导进行首次运行设置
  - 你想设置默认工作区路径
  - 你需要用于脚本的仅基础设置标志
title: "设置"
---

# `openclaw setup`

`openclaw setup` 运行与 `openclaw onboard` 相同的引导式入门流程：
它会先验证并持久化推理，然后启动 Crestodian 来配置
工作区、Gateway、频道、技能和健康状态。在只需要初始化配置/工作区文件夹而不需要向导时，请使用 `--baseline`。

在引导模式下，`--workspace <dir>` 是向 Crestodian 提议的工作区；
只有在你批准该提议后，它才会被持久化。Baseline、classic 和
noninteractive setup 会通过其正常流程持久化所提供的工作区。

`setup` 接受与 `openclaw onboard` 相同的入门标志，包括
auth（`--auth-choice`、`--token`、提供商密钥标志）、Gateway
（`--gateway-port`、`--gateway-bind`、`--gateway-auth`、`--install-daemon`）、
Tailscale（`--tailscale`）、reset（`--reset`、`--reset-scope`）、flow
（`--flow quickstart|advanced|manual|import`）以及 skip 标志
（`--skip-channels`、`--skip-skills`、`--skip-bootstrap`、`--skip-search`、
`--skip-health`、`--skip-ui`、`--skip-hooks`）。完整的标志参考和
非交互示例请参见 [Onboard](/cli/onboard) 和
[CLI automation](/start/wizard-cli-automation)。`openclaw onboard --modern` 是与推理门控的 Crestodian 助手兼容的别名，并且没有 `setup` 对应项。

<Note>
`openclaw setup` 适用于可变配置安装。在 Nix 模式（`OPENCLAW_NIX_MODE=1`）下，OpenClaw 会拒绝 setup 写入，因为配置文件由 Nix 管理。请使用官方的 [nix-openclaw 快速开始](https://github.com/openclaw/nix-openclaw#quick-start)，或者其他 Nix 包对应的源配置。
</Note>

## 选项

| Flag                       | Description                                                                                           |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `--workspace <dir>`        | 引导模式下的工作区提议；由 baseline、classic 和 noninteractive 设置直接持久化。 |
| `--baseline`               | 在不进行引导的情况下创建基础配置/工作区/会话文件夹。                                  |
| `--wizard`                | 为兼容性而接受；设置默认运行引导。                                         |
| `--non-interactive`        | 无提示运行引导。                                                                       |
| `--accept-risk`            | 确认完整系统代理访问风险；与 `--non-interactive` 一起使用时必需。                         |
| `--mode <mode>`               | 引导模式：`local` 或 `remote`。                                                                 |
| `--flow <flow>`             | 引导流程：`quickstart`、`advanced`、`manual` 或 `import`。                                        |
| `--reset`                  | 在引导前重置 config + credentials + sessions（仅当 `--reset-scope full` 时重置 workspace）。   |
| `--reset-scope <scope>`    | 重置范围：`config`、`config+creds+sessions` 或 `full`。                                            |
| `--import-from <provider>` | 在引导期间运行的迁移提供方。                                                          |
| `--import-source <path>`   | `--import-from` 的源 agent home。                                                                |
| `--import-secrets`         | 在引导迁移期间导入支持的 secrets。                                                 |
| `--remote-url <url>`       | 远程 Gateway WebSocket URL。                                                                         |
| `--remote-token <token>`   | 远程 Gateway token（可选）。                                                                      |
| `--json`                   | 输出 JSON 摘要。                                                                                |

`--classic` 和 `--non-interactive` 互斥：classic 会打开带提示的
向导，而 noninteractive 设置使用自动化路径。

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
