---
summary: "CLI 参考：`openclaw setup`（带回退引导流程的系统代理聊天）"
read_when:
  - "你想与 OpenClaw 进行设置或修复对话"
  - "你正在使用首次运行设置向导"
  - "你想设置默认工作区路径"
  - "你需要用于脚本的仅基础配置设置标志"
title: "设置 CLI"
---

# `openclaw setup`

交互式设置提供可选的内存嵌入 provider/model 设置以及综合就绪检查。跳过它而不更改现有内存设置，或稍后使用 `openclaw configure --section memory` 进行配置。此步骤不会下载本地模型或重建索引。基线和非交互式设置不会提示嵌入。请参阅 [ 配置 ](/cli/configure#memory-section)。

`openclaw setup` 是系统代理入口点。在已配置的系统上，裸 `openclaw setup` 打开交互式 OpenClaw 聊天。在新的系统上，它会落到引导式的入门引导阶段。使用 `-m`/`--message` 进行一个请求，或使用 `--baseline` 来初始化 config/workspace 文件夹，而无需向导。

基线设置 （`--baseline`） 要求本地网关在创建代理状态时停止并拥有独占所有权。通过其服务所有者停止网关，等待其退出，然后重新运行该命令。

路由顺序：

1. 任何 onboarding 选项（`--wizard`、`--baseline`、workspace、reset、 non-interactive、flow、mode、Gateway、daemon、skip、import、remote 或 auth 选项）都会像 `openclaw onboard` 一样运行 onboarding。
2. `-m`/`--message` 或 `--yes` 运行系统代理。
3. 如果没有路由选项，已配置的交互式系统会打开 OpenClaw。全新系统会运行 onboarding。在已配置的系统上，即使没有 TTY，`--json` 也会打印系统概览；onboarding 选项则会保留 onboarding 的 JSON 摘要。

在引导模式下，`--workspace <dir>` 是提供给 OpenClaw 的工作区； 只有在你批准该提议后，它才会被持久化。Baseline、经典模式和非交互式 setup 会在全新安装时通过其正常流程持久化所提供的工作区。 如果现有的代理阵列会被重新映射，经典向导需要明确确认； 非交互式 setup 会保留当前的 fleet 工作区并打印警告。

引导推理检测在 macOS 或 Linux 上的网关主机上运行。 CLI 和 macOS 应用程序调用相同的网关拥有的检测器，该检测器检查已配置的模型、支持的 CLI 登录、API-key 环境变量以及已安装的 Ollama 或 LM Studio 模型。此发现过程永远不会下载本地模型。 CLI 入门和 macOS 应用程序都会等待您在测试之前选择连接。失败或取消的尝试永远不会自动选择另一个提供商。安装程序保存凭据，然后使用内存中的候选设置发送一轮免工具确认。仅在该轮次成功后，它才会保存提供程序和模型配置。连接失败会保留凭据并保持配置不变。选择已保存的登录信息进行重试，无需再次登录。网关运行时，自定义端点设置仍可重试；重启后，再次输入端点设置。

初始 Claude Code 和 Codex 检测会检查可执行版本，而无需运行 auth-status 命令或启动应用程序服务器。可读的 Codex 凭证被报告为存储的证据；检测期间活动登录仍未得到验证。存储的凭据不会收到高于环境 API 密钥的验证订阅优先级。

在Control UI中，模型设置还可以通过共享模型选择器从已安装的本机代理中选择模型。 **Use** 保存该模型及其运行时间，而不运行设置测试；身份验证和工具保留在本机代理中。提供商**测试和使用**仍然需要经过验证的免工具回复。 Gemini CLI 和反重力不作为检测到的设置路线提供。

`setup` 接受与 `openclaw onboard` 相同的 onboarding 标志，包括 auth（`--auth-choice`、`--token`、provider key flags）、Gateway （`--gateway-port`、`--gateway-bind`、`--gateway-auth`、`--install-daemon`）、 Tailscale（`--tailscale`）、reset（`--reset`、`--reset-scope`）、flow （`--flow quickstart|advanced|manual|import`），以及 skip 标志 （`--skip-channels`、`--skip-skills`、`--skip-bootstrap`、`--skip-search`、 `--skip-health`、`--skip-ui`、`--skip-hooks`）。传入 `--tui` 可使用与 `openclaw onboard --tui` 相同的终端入口。 完整的标志参考和非交互式示例请参见 [Onboard](/cli/onboard) 和 [CLI 自动化](/start/wizard-cli-automation)。`openclaw onboard --modern` 仍然是同一基于推理门控的 OpenClaw 助手的兼容入口。

本地加入默认以令牌模式生成网关密钥，而不要求您选择令牌或密码。现有的密码模式配置将被保留。使用`--gateway-auth password`或`--gateway-password <value>`明确选择密码； Tailscale 漏斗仍然需要密码模式。

使用 `setup --team` 进行与 `onboard --team` 相同的小团队入门引导培训。 `--agent-name <name>` 指定第一个代理，或者 `--team` 指定协调员。

<Note>
`openclaw setup` 用于可变配置安装。在 Nix 模式下 （`OPENCLAW_NIX_MODE=1`） OpenClaw 拒绝安装写入，因为配置文件由 Nix 管理。使用第一方 [nix-openclaw Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) 或另一个 Nix 软件包的等效源配置。
</Note>

## <a id="options"></a> 选项

| 标志                           | 描述                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `-m, --message <text>`         | 运行一次 OpenClaw 请求。                                                                            |
| `--yes`                        | 允许为一次 `--message` 请求写入持久化配置。                                        |
| `--workspace <dir>`            | 工作区提议；现有舰队需要经典确认，并会在非交互模式下被保留。 |
| `--baseline`                   | 无需登录即可创建基线 config/workspace/session 文件夹。                                 |
| `--wizard`                     | 强制交互式引导。                                                                        |
| `--classic`                    | 运行经典的多步骤入门向导；不适用于 `--non-interactive`。                    |
| `--agent-name <name>`          | 第一个代理的名称（默认值：`main`）。                                                          |
| `--tui`                        | 使用终端界面而不是浏览器跳转。                                               |
| `--non-interactive`            | 在没有提示的情况下运行引导。                                                                      |
| `--accept-risk`                | 确认完整系统代理访问风险；与 `--non-interactive` 一起使用时必需。                        |
| `--mode <mode>`                | 引导模式：`local` 或 `remote`。                                                                |
| `--flow <flow>`                | 引导流程：`quickstart`、`advanced`、`manual` 或 `import`。                                       |
| `--reset`                      | 在引导前重置配置 + 凭据 + 会话（仅在 `--reset-scope full` 时重置工作区）。  |
| `--reset-scope <scope>`        | 重置范围：`config`、`config+creds+sessions` 或 `full`。                                           |
| `--import-from <provider>`     | 在引导期间运行的迁移提供方。                                                         |
| `--import-source <path>`       | `--import-from` 的源代理主目录。                                                               |
| `--import-secrets`             | 在引导迁移期间导入受支持的密钥。                                                |
| `--remote-url <url>`           | 远程 Gateway WebSocket URL。                                                                        |
| `--remote-token <token>`       | 远程 Gateway 令牌（可选）。                                                                     |
| `--remote-password <password>` | 远程网关密码（可选）。                                                                  |
| `--json`                       | 已配置系统：OpenClaw 概览。引导路径：引导摘要。                          |

`--classic` 和 `--non-interactive` 是互斥的：经典打开提示向导，而非交互式设置使用自动化路径。在交互式载入中，`--remote-url`、`--remote-token` 和 `--remote-password` 预填充远程网关步骤，并优先于该运行所存储的远程值。传递令牌或密码，而不是两者都传递。更改 URL 不会重复使用存储的凭据，除非您还提供了新的令牌或密码。交互步骤请求一个 **Gateway Secret** 并将其存储为 `gateway.remote.token`；网关接受任一字段。凭证保持屏蔽状态并使用向导选择的纯文本或 SecretRef 存储模式。 `--gateway-token`、`--gateway-token-ref-env`、`--gateway-password` 配置本地网关，在远程模式下无效。对于远程令牌 SecretRefs，设置 `OPENCLAW_GATEWAY_TOKEN` 并将 `--remote-token` 与 `--secret-input-mode ref` 一起使用。

### <a id="baseline-mode"></a> 基础模式

`openclaw setup --baseline` 保留了旧的仅基线行为：它创建配置、工作区和会话目录，然后退出而不运行载入。它接受 `--workspace`、`--skip-bootstrap` 和无害的输出控制，但拒绝显式的加入、网关、身份验证、重置或守护程序选项，而不是默默地忽略它们。如果现有配置无效，基线设置会保留它，并要求您在重试之前运行 `openclaw doctor --fix` 以应用支持的修复。

使用 `openclaw setup --baseline --skip-bootstrap` 创建目录而不生成工作区引导文件。这会将 `agents.defaults.skipBootstrap: true` 保留为本地配置覆盖，保留现有工作区文件和包含的配置文件，并在以后省略该标志的基线运行中保持启用状态。如果 `skipBootstrap` 值本身来自 `$include`，请直接编辑该包含文件，而不是通过基线设置替换其指针。当还更改 `--workspace` 时，请首先更新包含的每个代理工作区或确切的工作区文件；基线设置在写入配置或工作区文件之前拒绝组合更改。

## <a id="examples"></a> 示例

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
openclaw setup --non-interactive --accept-risk --mode remote --remote-url wss://gateway-host:18789 --remote-password <password>
```

## <a id="notes"></a> 说明

- 在交互式 OpenClaw 聊天中，`configure skills`、`configure web search` 和 `configure gateway` 会运行托管式设置流程。`open search wizard` 和 `open gateway wizard` 会将凭据输入交给带掩码的终端向导。Gateway 设置仅限本地且仅修改配置；之后请在聊天中使用 `restart gateway`，或在终端中使用 `openclaw gateway restart` 进行重启。请参阅 [`openclaw setup` 操作](/cli/openclaw#operations-and-approval)。
- `import memory` 会将检测到的本地记忆复制到现有的默认代理工作区，但不会导入配置、凭据或技能。请先完成入门流程；聊天会报告部分复制和复制失败的情况，而不会默认认为操作成功。
- 完成基础设置后，运行 `openclaw onboard` 以进行完整的引导式流程，运行 `openclaw configure` 进行针对性更改，或运行 `openclaw channels add` 添加频道账户。
- 如果检测到 Hermes 状态，交互式入门流程可以自动提供迁移选项。导入入门要求全新设置；如需在入门流程之外执行试运行计划、备份和覆盖模式，请使用[迁移](/cli/migrate)。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [入门](/cli/onboard)
- [入门引导 （CLI）](/start/wizard)
- [入门](/start/getting-started)
- [安装概览](/install)
