---
summary: "`openclaw onboard` 的 CLI 参考（交互式入门）"
read_when:
  - "你想先建立推理，再使用 OpenClaw 完成设置"
title: "引导"
---

# `openclaw onboard`

首先建立推理的引导式设置：它检测现有的 AI 访问，等待您的提供商选择，验证该连接，仅保留工作路由，然后启动 OpenClaw 配置其余部分。 `openclaw setup` 在新系统上或只要存在入门引导选项即可达到此流程；配置的系统使用裸 `openclaw setup` 进行系统代理聊天。 `openclaw setup --baseline` 只写入基线 config/workspace.

<CardGroup cols={2}>
  <Card title="CLI 入门中心" href="/start/wizard" icon="rocket">
    交互式 CLI 流程演练。
  </Card>
  <Card title="入门概览" href="/start/onboarding-overview" icon="map">
    OpenClaw 引导流程如何协同工作。
  </Card>
  <Card title="CLI 设置参考" href="/start/wizard-cli-reference" icon="book">
    输出、内部机制以及逐步行为。
  </Card>
  <Card title="CLI 自动化" href="/start/wizard-cli-automation" icon="terminal">
    非交互式标志和脚本化设置。
  </Card>
  <Card title="macOS 应用上手" href="/start/onboarding" icon="apple">
    macOS 菜单栏应用的引导流程。
  </Card>
</CardGroup>

## <a id="examples"></a> 示例

```bash
openclaw onboard
openclaw onboard --tui
openclaw onboard --classic
openclaw onboard --modern
openclaw onboard --flow quickstart
openclaw onboard --agent-name robby
openclaw onboard --flow manual
openclaw onboard --flow import
openclaw onboard --import-from hermes --import-source ~/.hermes
openclaw onboard --skip-bootstrap
openclaw onboard recommendations --json
openclaw onboard recommendations --agent writer --json
openclaw onboard recommendations --agent writer acknowledge
openclaw onboard recommendations acknowledge --agent writer
openclaw onboard recommendations refresh --agent writer
openclaw onboard recommendations acknowledge
openclaw onboard recommendations acknowledge --retry "<failed-id>"
openclaw onboard recommendations refresh
openclaw onboard --mode remote --remote-url wss://gateway-host:18789
```

`openclaw onboard recommendations` 读取入门引导期间存储的待处理应用程序推荐匹配。添加 `--json` 作为首次运行引导程序使用的机器可读列表。该命令不会重新扫描已安装的应用程序或调用模型。其输出仅包含经过验证的安装 ID、源和层；它故意省略了不受信任的市场散文、模型原因和本地应用程序标签。回答推荐提议后，该命令将返回一个空列表，并且将来的入门引导运行完全跳过该步骤。 `openclaw onboard recommendations refresh` 清除存储的优惠，以便下一次引导运行重新扫描已安装的应用程序并创建新优惠。

通过 `--agent <id>` 选择已配置的读取代理：`acknowledge`、`acknowledge --retry` 或 `refresh`。将其放在子命令之前或之后；子命令上的显式值优先于父值。这些操作仅使用该代理的工作区建议。如果没有选择器，该命令将保留其现有的默认代理行为，并在所有者不明确时要求您选择代理。空白或未知的座席 ID 会失败，但不会更改存储的建议；使用 `openclaw agents list` 查找配置的 ID。

新的工作空间将推荐选择推迟到引导对话。该对话处理完用户的选择后，`openclaw onboard recommendations acknowledge` 将存储的报价标记为已应答。重复确认没有额外效果。如果选择的安装失败，则将每个失败的不透明 ID 传递给 `--retry <id...>`；成功和拒绝的匹配都会被消耗，而失败的匹配则仍待稍后的登录运行。未知 ID 会失败，但不会更改存储的报价。中断 ClawHub 技能安装后，仅当 `openclaw skills verify "@owner/slug"` 对于同一发布者合格的推荐 ID 成功且其 JSON 输出报告 `openclaw.resolution.source: "installed"` 时，现有目标才算成功。单独的注册表验证并不能证明本地安装。否则，将 ID 与 `--retry` 一起保留，并且不要覆盖现有技能。

## <a id="flags"></a> 标志

- `--classic`：打开完整的逐步向导。它不能与 `--non-interactive` 组合使用；自动化设置时请省略 `--classic`。
- `--agent-name <name>`：当不存在花名册时命名第一个代理。交互式入门引导询问 **我们应该如何称呼您的第一个代理？** 并建议 `main`；除非提供此标志，否则非交互式载入将保留 `main`。 ID `main` 不是保留的：如果您稍后在指定代理旁边重新创建它，请在创建报告遗留会话或共享身份验证所有权仍附加到旧 `main` 安装时首先运行 `openclaw doctor --fix`。
- `--flow quickstart`：以最少的提示打开经典向导，默认使用生成的网关密钥，而不要求您选择令牌或密码。现有密码和可信代理配置将被保留。显式本地网关标志（例如 `--gateway-port`、`--gateway-bind`、`--gateway-auth` 和 `--tailscale`）会覆盖相应的存储或默认快速启动值；省略的选项保留其当前值。
- `--flow manual`（别名 `advanced`）：打开经典向导的 **手动设置** 流程，并提供端口、绑定和秘密存储的完整提示。它默认生成网关密钥；使用 `--gateway-auth password` 或 `--gateway-password <value>` 选择您自己的密码。 Tailscale 漏斗仍然需要密码模式。 mode选择配置的secret；客户端可以使用 `auth.token` 或 `auth.password` 发送。
- `--flow import`：针对全新设置运行检测到的迁移提供程序（例如通过 `--import-from hermes` 的 Hermes）。确认后，入门引导阶段会将配置、凭据、工作区文件、内存和技能存放在私有临时目标下；在提升工作区和代理状态并提交配置之前，导入的推理必须通过实时完成。促销前的失败或取消不会影响实时目标。无法回滚的外部激活步骤（例如 Codex 插件安装）将在之后运行并在迁移报告中保持可重试状态。迁移导入选项（`--flow import`、`--import-from`、`--import-source` 和 `--import-secrets`）不能与 `--reset` 组合使用；在没有 `--reset` 的情况下运行导入。使用 [`openclaw migrate`](/cli/migrate) 进行试运行计划、覆盖模式、验证备份、报告和精确映射。
- `--remote-url`、`--remote-token` 和 `--remote-password`：预填充经典远程网关步骤并覆盖本次运行存储的远程值。传递令牌或密码，而不是两者都传递。更改 URL 不会重复使用存储的凭据，除非您还提供了新的令牌或密码。交互步骤要求一个 **Gateway 秘密**，无论远程网关将其称为令牌还是密码，并将其存储为 `gateway.remote.token`。凭证保持屏蔽并遵循明文或 SecretRef 存储选择。将机密留空并确认保留现有凭据。要在没有共享密钥的情况下进行连接，请将其留空，拒绝保留现有凭据（如果提供），然后明确确认 **在没有网关密钥的情况下继续吗？**。参考存储在请求参考之前提供相同的确认。
- `--modern` 是 OpenClaw 会话设置助手的兼容性别名。它使用与 `openclaw setup` 相同的实时推理门，并且仅接受 `--workspace`、`--agent-name`、`--accept-risk`、`--non-interactive` 和 `--json`。其他设置标志会被拒绝，而不是被默默地忽略。

## <a id="guided-flow"></a> 引导流程

普通 `openclaw onboard` 启动引导流程。它会显示安全通知，在不存在花名册时询问第一个代理的姓名，然后预先询问一个发现问题：**完全访问**（推荐 - 安装程序自动查找AI应用程序、密钥和本地运行时）或**ask first**（安装程序询问一次在环顾四周之前，或者让您手动配置）。选择仍然为 `wizard.accessMode`。在允许发现的情况下，载入会检测到已通过配置的模型、API-key 环境变量和支持的本地 CLI 进行可用的 AI 访问。检测仅提供选择；它不运行实时推理、安装插件、选择模型或保留凭据。标记为 **Setup 和 utility** 的提供程序（例如 Apple Foundation Models）经过验证并保存为 `utilityModel`，无需替换主模型。在全新安装时，它为 OpenClaw 设置助手提供支持；在打开常规代理聊天之前选择一个单独的主要模型。添加实用新型时，现有的主要模型和凭证保持不变。

在共享选择器中选择检测到的连接或任何受支持的提供商。所选连接运行真正完成。如果失败，则会显示错误，选择器等待您的下一个选择。取消会停止尝试，而无需尝试其他提供商。

提供商选择器包括已安装和可安装的官方提供商。选择 **更多…** 用于其他提供商组；然后，区域、计划和验证方法将出现在第二个菜单中。支持的浏览器或设备登录以及屏蔽的 API-key 或令牌方法使用相同的实时完成路径。 OpenClaw 测试成功后仅保留验证过的模型路由及其凭证；失败的候选者不会替换配置的模型或保存尝试的凭据。在本地入门引导中，**暂时跳过** 准备指定代理的工作区和本地网关配置，然后退出而不启动网关或 AI 聊天。当准备好连接 AI 时，重新运行 `openclaw onboard`；中断的基线设置将在其现有的入门引导所有者下恢复。

在引导模式下，`--workspace <dir>` 提供 OpenClaw 的建议工作空间和隔离的推理上下文。在您批准 OpenClaw 设置提案之前，它不会保留。经典和非交互式入门引导培训通过正常的设置流程保留其工作空间。工作空间必须是目录或目录下的新路径；文件、非目录祖先、悬空符号链接或符号链接循环在设置或重置之前被拒绝，并指定失败路径。其他检查失败（例如权限错误）将被报告，而不是被视为丢失目录。允许对现有目录的符号链接，包括它们下面的新路径。在使用现有代理名册重新运行时，加入会保留配置的队列工作区：经典向导会显示两条路径，并在移动之前需要明确确认，而非交互式设置会发出警告并保留当前值。对于显式管理的多代理队列，提供程序设置会更新已配置的系统代理的模型和别名，而不替换队列范围的模型默认值或其他代理的模型。

在推理通过后，onboarding 会检查受支持本地 AI 工具中的记忆： Claude Code 自动记忆、Codex 合并记忆和 Hermes 记忆文件。找到任何内容时，会提供一个页面，将它们复制到 agent 工作区中的 `memory/imports/` 以便索引回忆。未经确认不会导入任何内容，先前已导入的文件会被跳过， 并且你始终可以稍后从 Control UI 的[记忆导入页面](/web/control-ui)导入， 它提供相同的仅记忆范围。（完整的 [`openclaw migrate`](/cli/migrate) 运行范围更广： 它还可以导入配置、技能和凭据。）经典向导在准备好工作区后也会显示相同的页面。

推理通过（以及内存导入提议）后，引导引导会自动应用标准设置 - 工作区、网关和会话，对话式 `openclaw setup` 聊天在“是”时应用相同的计划 - 然后从已安装的应用程序提供插件和技能建议；应用程序名称通过您配置的模型和 ClawHub 搜索进行匹配，并且可以使用 [`wizard.appRecommendations`](/gateway/config-runtime#wizard) 禁用该步骤。当平台具有受支持的浏览器打开程序时，它会打开经过身份验证的 Control UI 仪表板，并等待最多 60 秒以等待浏览器客户端连接。短暂的切换为精确签名的浏览器提供了持久的管理员凭据。这包括安装 `wslview` 时无显示的 WSL。在无头 Linux、没有开启器的 WSL 上，或在没有显示器的 SSH 上，它会打印一个突出的可复制粘贴仪表板 URL，包括用于环回网关的 SSH 端口转发命令，并等待最多五分钟。成功的连接会在浏览器中继续；无法访问的网关或超时会退回到与之前相同的终端舱口。通过 `--tui` 跳过浏览器切换并强制终端孵化。如果推理成功后应用设置失败，则状态会标识工作区、网关或一般设置失败，而不是 AI 检查失败。详细的错误保留其恢复指导，并且引导回退到对话式 OpenClaw 聊天以交互方式完成。通道、代理、插件和其他可选功能仍然是 OpenClaw 聊天领域：运行 `openclaw` 并使用 `open channel wizard for <channel>` 将通道凭据收集移交给屏蔽终端向导。要更改模型提供者或其身份验证，请退出 OpenClaw 并运行 `openclaw onboard`； OpenClaw 不打开引导或经典提供商流程。

在配置的安装中，再次运行 `openclaw onboard` 会在检测到的连接组中提供当前默认模型。选择它作为验证通过，不会重新应用设置、重新安装或重新启动网关服务。如果检查失败，配置的模型将保持不变，选择器等待您的下一个选择。检查在工作区之外运行，因此工作区插件提供的模型可能会在代理中工作时在此失败。使用 `openclaw onboard --classic` 进行特定于提供商的身份验证、通道、技能、远程网关设置、导入或完整的网关控制。对于对话式非推理设置和修复，运行 `openclaw setup`； `openclaw onboard --modern` 是通过相同推理门的兼容性别名。经典向导可以选择通过实时完成来验证默认模型，但 OpenClaw 在其自己的实时推理检查通过之前不会启动。

在交互式终端中，直接执行 `openclaw`（不带子命令）会根据配置状态进行路由：

- 如果当前配置文件缺失或没有已编写的设置（为空或仅含元数据），则会启动引导式 onboarding。
- 如果配置文件存在但验证失败，则会启动经典 onboarding 路径，并提供 `openclaw doctor` 指引。OpenClaw 需要可工作的推理能力，不会用于修复这一推理前状态。
- 如果配置文件有效，则打开正常代理TUI。具有代理和模型的可到达的已配置网关会直接连接到 UI，无需加入或 OpenClaw。在配置的安装中，通过 TUI 或 `openclaw setup` 内的 `/openclaw` 到达 OpenClaw。

远程设置重复使用所选网关的设备配对，包括通过环回转发的已配置远程连接。其准备情况检查不会创建新的设备配对。设置聊天可以在回复中保持稳定的经过身份验证的呼叫者，包括环回连接。

当交互式远程设置激活推理并且网关需要重新启动时，在打开设置聊天之前，登录会等待最多 45 秒以等待新的网关启动和成功的推理检查。与旧网关的健康连接不算在内。如果重新启动等待到期或启动标识丢失，载入会报告设置已保存并停止，而不是尝试其他提供商。检查远程网关，然后在连接的终端中重新运行裸`openclaw`。如果错误表明网关未提供启动标识，请先更新并重新启动该网关。

环回、私有 IP 文字、`.local` 和 Tailnet `*.ts.net` 网关 URL 接受明文 `ws://`。对于其他受信任的私有 DNS 名称，请在入门引导流程环境中设置 `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1`。

## <a id="reset"></a> 重置

```bash
openclaw onboard --reset
openclaw onboard --reset --reset-scope full
```

`--reset` 是一个破坏性的预调度标志，不是经典向导的 **设置模式** 菜单中的选项。 `--reset-scope` 控制删除的数量：`config`（仅配置）、`config+creds+sessions`（在没有作用域的情况下传递 `--reset` 时的默认值）或 `full`（也重置工作区）。在将状态移至垃圾箱之前，载入会验证 TTY 可用性、重置范围、身份验证和网关选项、迁移导入选项以及完全重置的工作区目标。迁移导入选项不能与 `--reset` 组合使用；在没有 `--reset` 的情况下运行导入。非交互式设置在复位前还需要 `--accept-risk`。交互式经典设置在显示其风险确认之前会执行重置，因此调用 `--reset` 可以在拒绝该提示之前将状态移至垃圾箱。重置后，该命令根据其他标志运行引导式、经典式或非交互式入门。

会话重置通过与 [`openclaw reset`](/cli/reset) 相同的清理操作永久删除存储的 SQLite 历史记录及其拥有的存档文件。它保留身份验证配置文件和不相关的数据库状态。首先停止任何正在运行的网关；当另一个进程拥有状态目录时，登录拒绝会话清理。

## <a id="locale"></a> 区域设置

交互式引导会使用 CLI 向导语言环境来显示固定的设置文案。它按以下顺序使用第一个非空值：

1. `OPENCLAW_LOCALE`
2. `LC_ALL`
3. `LC_MESSAGES`
4. `LANG`
5. 英文回退

支持的向导区域设置为 `en`、`zh-CN` 和 `zh-TW`。区域设置值可以使用下划线或 POSIX 后缀形式，例如 `zh_CN.UTF-8`。产品名称、命令名称、配置密钥、URL、提供商 ID、模型 ID 和 plugin/channel 标签保持原义。

Control UI 的固定加入欢迎和设置选项使用连接到网关时报告的 UI 语言。中文 UI 语言环境使用相同的源维护设置翻译； `yes` 和 `talk to agent` 等命令回复保持不变。

```bash
OPENCLAW_LOCALE=zh-CN openclaw onboard
OPENCLAW_LOCALE=en openclaw onboard # Explicit English override
```

## <a id="non-interactive-setup"></a> 非交互式设置

`--non-interactive` 需要 `--accept-risk`（表示理解代理功能非常强大，且拥有完整系统访问权限存在风险）。`--mode` 默认为 `local`。

替换现有的提供者凭证会将其保存为非活动状态并打印 `models auth activate` 命令；安装程序不会自动切换您的工作连接或继续进行守护程序安装。临时凭证暂存文件在数据库关闭后将被删除。如果删除仍然被阻止，安装程序会发出剩余目录路径的警告，而不隐藏提供程序结果或激活说明。锁定清除后，手动删除该目录。

### <a id="required-external-plugins"></a> 需要的外部插件

`--accept-risk` 不认可插件功能。如果本地设置需要外部提供商或运行时插件，则当该插件需要功能审查时，非交互式入门会停止。检查并预安装所需的插件，然后重新运行相同的入门命令。对于 OpenAI 设置使用的官方 Codex 运行时：

```bash
# After reviewing the plugin and its declared capabilities:
openclaw plugins install codex --accept-capabilities
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice openai-api-key \
  --secret-input-mode ref
```

在运行此示例之前设置 `OPENAI_API_KEY`。 `codex`选择器使用OpenClaw的官方插件目录。如果所需的插件已安装但需要批准才能启用，请改用 `openclaw plugins enable <plugin-id> --accept-capabilities`。该标志仅批准该插件操作；它不是全局旁路。相同的预安装和重新运行流程适用于 `openclaw channels add` 所需的外部插件。捆绑插件不需要此审查。请参阅 [ 能力同意书 ](/plugins/manage-plugins#capability-consent) 和 [ 自动化指南 ](/start/wizard-cli-automation#review-required-plugins)。

### <a id="provider-setup-examples"></a> Provider 设置示例

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --agent-name robby \
  --auth-choice custom-api-key \
  --custom-base-url "https://llm.example.com/v1" \
  --custom-model-id "foo-large" \
  --custom-api-key "$CUSTOM_API_KEY" \
  --secret-input-mode plaintext \
  --custom-compatibility openai \
  --custom-image-input
```

`--custom-api-key`为可选；如果省略，则载入检查环境中的 `CUSTOM_API_KEY`。 OpenClaw 将常见视觉模型 ID（GPT-4o/4.1/5.x、Claude 3/4、Gemini、Qwen-VL、LLaVA、Pixtral 等）自动标记为具有图像功能。传递 `--custom-image-input` 表示未知的自定义视觉 ID，或传递 `--custom-text-input` 强制使用纯文本元数据。将 `--custom-compatibility openai-responses` 用于支持 `/v1/responses` 但不支持 `/v1/chat/completions` 的 OpenAI- 兼容端点；有效值为 `openai`（默认）、`openai-responses`、`anthropic`。

LM Studio 还提供了一个供应商特定的密钥标志：

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice lmstudio \
  --custom-base-url "http://localhost:1234/v1" \
  --custom-model-id "qwen/qwen3.5-9b" \
  --lmstudio-api-key "$LM_API_TOKEN"
```

非交互式 Ollama：

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice ollama \
  --custom-base-url "http://ollama-host:11434" \
  --custom-model-id "qwen3.5:27b"
```

`--custom-base-url` 默认为 `http://127.0.0.1:11434`。 `--custom-model-id`为可选；如果省略，入门将使用 Ollama 的建议默认值。 `kimi-k2.6:cloud` 等云模型 ID 也适用于此。

针对现有 `llama-server` 的非交互式 llama.cpp：

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice llama-cpp-existing-server \
  --custom-base-url "http://127.0.0.1:8080/v1" \
  --custom-model-id "my-model" \
  --llama-server-api-key "$LLAMA_SERVER_API_KEY"
```

`--auth-choice llama-cpp` 选择托管本地服务器。 `--llama-server-api-key`为可选；如果省略，则载入检查环境中的 `LLAMA_SERVER_API_KEY`。有关端点替换和身份验证配置文件行为，请参阅 [llama.cpp](/plugins/llama-cpp)。

将提供方密钥存储为引用而不是明文：

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice openai-api-key \
  --secret-input-mode ref
```

使用 `--secret-input-mode ref`，登录将新凭证存储为引用而不是纯文本：身份验证配置文件使用 `keyRef: { source: "env", provider: "default", id: <envVar> }`，自定义提供程序使用 `models.providers.<id>.apiKey`（例如 `{ source: "env", provider: "default", id: "CUSTOM_API_KEY" }`）。添加新凭证时设置提供者环境变量；没有匹配的环境变量的内联键标志会很快失败。现有的可解析命名身份验证配置文件及其 `env`、`file`、`exec` 或 `store` 引用将按原样重用，无需新的 `apiKey` 或 `keyRef` 写入或其他提供程序环境变量。现有的纯文本配置文件凭证不会迁移；运行 `openclaw secrets configure --apply`，然后运行 ​​`openclaw secrets audit --check`。请参见 [ 机密管理](/gateway/secrets)。

### <a id="gateway-auth-(non-interactive)"></a><a id="gateway-auth-non-interactive"></a> 网关认证（非交互式）

除非您明确选择其他身份验证模式，否则现有的 [ 可信代理身份验证](/gateway/trusted-proxy-auth) 及其代理策略在重新运行时保持不变。选择 Tailscale 漏斗同时保留可信代理身份验证将被拒绝；使用 `--gateway-auth password` 明确切换或保持 Tailscale 曝光关闭。同主机完成使用配置的本地密码（包括 SecretRefs）或 `OPENCLAW_GATEWAY_PASSWORD`，通过网关的环回侦听器。设置后运行状况检查保留在配置的本地网关端口上，忽略环境网关 URL 和端口覆盖。

- 在没有身份验证标志或现有凭证的情况下，加入会生成网关密钥并将其存储为 `gateway.auth.token` 和 `gateway.auth.mode: "token"`。 Quickstart 保留其现有的明文存储默认值； `--secret-input-mode ref` 明确请求参考。运行`openclaw dashboard`打开Control UI。
- `--gateway-auth token --gateway-token <token>` 存储提供的明文秘密。
- `--gateway-password <value>` 选择密码模式，无授权选择提示； `--gateway-auth password` 还明确选择密码模式。现有密码模式配置在重新运行时保持密码模式。
- `--gateway-auth token --gateway-token-ref-env <name>` 会将 `gateway.auth.token` 作为环境 SecretRef 存储。要求在引导进程环境中存在同名且非空的环境变量。
- `--gateway-token` 和 `--gateway-token-ref-env` 互斥。
- 远程加入使用 `--remote-token <token>` 或 `--remote-password <password>` 作为 `gateway.remote` 凭证。 `--gateway-token`、`--gateway-token-ref-env`、`--gateway-password`配置本地网关认证，在远程模式下无效。对于远程令牌 SecretRefs，设置 `OPENCLAW_GATEWAY_TOKEN` 并将 `--remote-token` 与 `--secret-input-mode ref` 一起使用。
- 与`--secret-input-mode ref`配合，非交互式`--gateway-password`和`--remote-password`需要匹配的`OPENCLAW_GATEWAY_PASSWORD`，`--remote-token`需要匹配的`OPENCLAW_GATEWAY_TOKEN`； onboarding 存储环境 SecretRef 并在更改状态之前拒绝丢失或不匹配的值。交互式安装还可以选择配置文件、执行或存储引用。
- 使用 `--install-daemon`：SecretRef 管理的 `gateway.auth.token` 已验证，但不会在主管服务环境元数据中作为已解析明文保留；如果参考未解决，安装将停止并提供修复指导。如果 `gateway.auth.token` 和 `gateway.auth.password` 均已配置且 `gateway.auth.mode` 未设置，则安装块，直到显式设置模式为止。
- 本地引导会将 `gateway.mode="local"` 写入配置。后续若配置文件缺少 `gateway.mode`，说明配置损坏或手动编辑不完整，而不是一个有效的本地模式快捷方式。
- Local onboarding 检查所选安装路径所需的插件是否可用（例如 Codex 或 Copilot 运行时）。非交互式设置无法批准新功能； [检查并预安装所需的外部插件](#required-external-plugins)，然后重新运行入门。远程登录仅写入远程网关的连接信息 - 它从不安装本地插件包。
- `--allow-unconfigured` 是 `openclaw gateway run` 的一个独立逃生通道；它不会让引导跳过 `gateway.mode`。

```bash
export OPENAI_API_KEY="your-provider-key"
export OPENCLAW_GATEWAY_TOKEN="your-token"
openclaw onboard --non-interactive --accept-risk --skip-health \
  --mode local \
  --auth-choice openai-api-key \
  --secret-input-mode ref \
  --gateway-auth token \
  --gateway-token-ref-env OPENCLAW_GATEWAY_TOKEN
```

### <a id="local-gateway-health"></a> 本地网关健康检查

- 除非你传入 `--skip-health`，否则引导在成功退出前会等待本地网关可达。
- `--install-daemon` 首先启动托管网关安装路径。如果没有守护进程标志，则本地网关必须已在运行（例如 `openclaw gateway run`）。
- 显式 `--skip-daemon` 或 `--no-install-daemon` 执行一项可达性检查，而无需等待网关启动。如果没有人在监听，安装程序会报告网关未启动并成功退出；可达但不健康的网关仍然无法通过健康检查。
- 如果您只想自动写入 config/workspace/bootstrap，则 `--skip-health` 会跳过等待。
- `--skip-bootstrap` 会设置 `agents.defaults.skipBootstrap: true`，并跳过创建 `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md` 和 `BOOTSTRAP.md`。
- 在原生 Windows 上，`--install-daemon` 会先尝试计划任务；如果创建任务被拒绝，则回退到按用户的 Startup 文件夹登录项。

### <a id="interactive-ref-mode"></a> 交互式引用模式

- 在提示时选择 **使用密钥引用**，然后选择 **环境变量** 或已配置的密钥提供方（`file` 或 `exec`）。
- 引导会在保存引用前执行快速预检验证，并允许你在失败时重试。

### <a id="z.ai-endpoint-choices"></a><a id="z-ai-endpoint-choices"></a> Z.AI 端点选项

<Note>
`--auth-choice zai-api-key` 自动检测您的密钥的最佳 Z.AI 端点和模型：编码计划端点更喜欢 `zai/glm-5.3`，当密钥未公开它们时，回退到 `glm-5.1`，然后回退到 `glm-4.7`；一般 API 端点使用 Z.AI 提供程序默认值 `zai/glm-5.2`。要强制使用编码计划端点，请直接选择 `zai-coding-global` 或 `zai-coding-cn`。
</Note>

```bash
# Promptless endpoint selection
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice zai-coding-global \
  --zai-api-key "$ZAI_API_KEY"

# Other Z.AI endpoint choices: zai-coding-cn, zai-global, zai-cn
```

Mistral:

```bash
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice mistral-api-key \
  --mistral-api-key "$MISTRAL_API_KEY"
```

Arcee AI。 `arcee` 提供程序插件提供了这两种选择及其标志，因此请在以非交互方式运行入门之前安装它：

```bash
# Direct (chat.arcee.ai)
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice arceeai-api-key \
  --arceeai-api-key "$ARCEEAI_API_KEY"

# Via OpenRouter
openclaw onboard --non-interactive --accept-risk --skip-health \
  --auth-choice arceeai-openrouter \
  --openrouter-api-key "$OPENROUTER_API_KEY"
```

### <a id="additional-non-interactive-flags"></a> 附加非交互式标志

基于 Token 的模型认证（与 `--auth-choice token` 一起使用）：

| 标志                            | 描述                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `--token-provider <id>`         | 发行令牌的令牌提供商 ID                                                                                         |
| `--token <token>`               | 用于模型认证的 token 值                                                                                        |
| `--token-profile-id <id>`       | 身份验证配置文件 ID（默认 `<provider>:manual`；某些提供商拥有的流使用自己的默认值，例如 `anthropic:default`） |
| `--token-expires-in <duration>` | 可选令牌到期时间（e.g. `365d`、`12h`）                                                                         |

Cloudflare AI 网关：`--cloudflare-ai-gateway-account-id <id>`、`--cloudflare-ai-gateway-gateway-id <id>`。

守护进程安装控制：`--no-install-daemon` / `--skip-daemon`（别名；跳过网关服务安装）、`--daemon-runtime <node|bun>`（默认值：`node`）。 Bun 1.4.3+ 和 WAL- 重置安全 `node:sqlite` 是显式选择加入； Node 仍然推荐。

技能：`--node-manager <npm|pnpm|bun>`（默认 `npm`）、`--skip-skills`。

UI 和挂钩设置：`--skip-ui`（跳过 Control UI/TUI 提示）、`--skip-hooks`（跳过 webhook/hook 设置）、`--skip-channels`、`--skip-search`。

输出：`--suppress-gateway-token-output` 禁用引导引导中的自动 Control UI 切换。经典加入永远不会打印可重用的网关令牌值或令牌化 URL；它仍然打印安全恢复命令。

<Note>
`--json` 并不意味着引导或经典入门中的非交互模式。如果没有交互式终端，两种引导模式都会返回结构化 JSON 错误；添加 `--non-interactive --accept-risk` 以实现自动化。对于 `--modern`，JSON 是一次性 OpenClaw 概览，并在获得单一结果后退出。对于其他脚本，请使用 `--non-interactive`。无效的现有配置也会返回一个 JSON 失败；修复指南保留在 stderr 上。非交互式提供程序设置失败（包括无法访问本地模型服务器或缺少凭据）会在标准输出上返回 JSON 错误和非零退出状态。如果没有 `--json`，相同的恢复指南将打印为可读文本。
</Note>

## <a id="provider-prefiltering"></a> 提供方预筛选

当身份验证选择意味着首选提供商时，加入会预过滤该提供商模型的默认模型和白名单选择器。该过滤器还与同一插件拥有的其他提供程序相匹配，其中涵盖编码计划变体，例如 `volcengine`/`volcengine-plan` 和 `byteplus`/`byteplus-plan`. 如果首选提供程序过滤器未生成任何加载的模型，则载入将回退到未过滤的目录，而不是将选择器留空。

## <a id="web-search-follow-ups"></a> Web-search 后续步骤

某些 Web-search 提供商会在入门流程中触发提供商特定的后续提示：

- **Grok** 可以提供可选的 `x_search` 设置，使用相同的 xAI 认证以及 `x_search` 模型选择。
- **Kimi** 可以请求 Moonshot API 区域（`api.moonshot.ai` 与 `api.moonshot.cn`）和默认的 Kimi Web 搜索模型。

## <a id="other-behaviors"></a> 其他行为

- 本地引导 DM 作用域行为：[CLI 设置参考](/start/wizard-cli-reference#outputs-and-internals)。
- 最快的首次聊天：`openclaw dashboard`（Control UI，无频道设置）。
- 自定义提供程序：连接任何 OpenAI 或 Anthropic- 兼容端点，包括未列出的托管提供程序。使用 **Unknown** 兼容性通过实时检查自动检测。
- 如果检测到 Hermes 状态，引导会提供迁移流程（参见上面的 `--flow import`）。

## <a id="common-follow-up-commands"></a> 常见后续命令

稍后使用 `openclaw configure` 进行有针对性的非推理更改，使用 `openclaw channels add` 进行仅通道设置。对于模型提供商或认证路径更改，请改为运行 `openclaw onboard`。

```bash
openclaw channels add
openclaw configure
openclaw agents add <name>
```

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [`openclaw setup`](/cli/setup) — 系统代理入口点；裸 `setup` 是交互式的，并且会在新系统上引导引导
