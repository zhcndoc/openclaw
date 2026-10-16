---
summary: "FAQ：模型默认值、选择、别名、切换、故障转移和身份验证配置文件"
read_when:
  - "选择或切换模型，配置别名"
  - "调试模型故障转移 / “所有模型都失败”"
  - "理解认证配置文件以及如何管理它们"
title: "FAQ：模型和授权"
sidebarTitle: "模型 FAQ"
---

关于模型和认证配置文件的问答。有关设置、会话、网关、通道以及故障排查，请参阅主 [FAQ](/help/faq)。

## <a id="models%3A-defaults%2C-selection%2C-aliases%2C-switching"></a><a id="models-defaults-selection-aliases-switching"></a> 模型：默认值、选择、别名、切换

<AccordionGroup>
  <Accordion id="what-is-the-default-model" title='什么是“默认模型”？'>
    设置项：

    ```text
    agents.defaults.model.primary
    ```

    模型为 `provider/model` 参考（例如：`openai/gpt-5.5`、`anthropic/claude-sonnet-4-6`）。始终明确设置 `provider/model`。如果省略提供程序，OpenClaw 首先尝试别名匹配，然后尝试与该模型 ID 唯一的配置提供程序匹配，然后回退到配置的默认提供程序（已弃用的兼容性路径）。如果该提供程序不再具有配置的默认模型，则 OpenClaw 将回退到第一个配置的 provider/model，而不是过时的默认值。

  </Accordion>

  <Accordion id="what-model-do-you-recommend" title="您推荐什么模型？">
    使用提供商堆栈提供的最强大的最新一代模型，特别是对于支持工具或不受信任的输入代理 - 较弱或过度量化的模型更容易受到提示注入和不安全行为的影响（请参阅 [Security](/gateway/security)）。通过代理角色将更便宜的模型路由到 routine/low-stakes 聊天。

    为每个 agent 分配模型，并使用子 agent 并行处理较长任务（每个子 agent 都会消耗自己的 token）。参见[模型](/concepts/models)、[子 agent](/tools/subagents)、 [MiniMax](/providers/minimax)和[本地模型](/gateway/local-models)。

  </Accordion>

  <Accordion id="how-do-i-switch-models-without-wiping-my-config" title="如何在不擦除配置的情况下切换模型？">
    只修改模型字段——避免完整替换配置。

    - 聊天中的 `/model <model> -s`（仅限当前会话）
    - owner/admin `/model <model> -a`（当前会话和代理默认值）
    - owner/admin `/model <model> -g`（当前会话和全局默认值）
    - 使用 `openclaw models set ...`（仅更新模型配置）
    - 使用 `openclaw configure --section model`（交互式配置）
    - 直接在`~/.openclaw/openclaw.json`中编辑`agents.defaults.model`

    裸 `/model <model>` 仅更改当前会话，包括 owners/admins，除非您明确选择更广泛的 [ 模型选择范围 ](/gateway/config-agents/models#agentsdefaultsmodelselectionscope)。

    对于 RPC 编辑，先使用 `config.schema.lookup` 检查（标准化路径、浅层 schema 文档、 子项摘要），然后优先使用带部分对象的 `config.patch`，而不是 `config.apply`。 如果已经覆盖了配置，请从备份恢复，或运行 `openclaw doctor` 进行修复。

    文档：[模型](/concepts/models)、[配置](/cli/configure)、 [配置文件](/cli/config)、[Doctor](/gateway/doctor)。

  </Accordion>

  <Accordion id="can-i-use-self-hosted-models-llama-cpp-vllm-ollama" title="我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？">
    可以——Ollama 是最简单的方式。快速设置：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉一个本地模型，e.g. `ollama pull gemma4`
    3. 如果也要使用云模型，请运行 `ollama signin`
    4. 运行 `openclaw onboard`，选择 `Ollama`，然后选择 `Local` 或 `Cloud + Local`

    `Cloud + Local` 为您提供云模型以及本地 Ollama 模型； `kimi-k2.6:cloud` 等云模型不需要本地拉取。手动切换：`openclaw models list`，然后 `openclaw models set ollama/<model>`。

    [尔曼](/providers/llmman)当您想要从中提取模型时，是替代方案OCI注册表或Hugging Face， 未修改的上游`llama-server`， `vllm`， or `mlx-lm`引擎，或混合路由，在本地模型上保留小请求，例如`qwen3.8`并将大的溢出到托管模型。

    Smaller/heavily 量化模型更容易受到即时注入的影响。对任何具有工具访问权限的机器人使用大型模型；如果您无论如何都使用小型模型，请启用沙箱和严格的工具白名单。

    文档：[Ollama](/providers/ollama)、[llmman](/providers/llmman)、[本地模型](/gateway/local-models)、[模型提供商](/concepts/model-providers)、 [安全](/gateway/security)、[沙箱](/gateway/sandboxing)。

  </Accordion>

  <Accordion id="how-do-i-switch-models-on-the-fly-without-restarting" title="如何即时切换模型（无需重新启动）？">
    将 `/model <name> -s` 作为独立消息发送以仅切换此会话。如果没有范围标志，则适用可选的 [ 模型选择范围](/gateway/config-agents/models#agentsdefaultsmodelselectionscope)；未设置会保留当前会话中的更改，包括 owners/admins. 请参阅 [Slash 命令](/tools/slash-commands) 以获取完整命令列表，包括模型浏览（`/model`、`/models`、`/model list`）、`/model default -s` 仅清除会话模型覆盖，和 `/model status` 了解 endpoint/API-mode 详细信息。

    使用 `@profile` 为每个会话强制指定认证 profile：

    ```text
    /model opus@anthropic:default -s
    /model opus@anthropic:work -s
    ```

    不带 `@profile` 的模型选择会保留现有的兼容 profile 固定设置。 选择另一个明确的 `@profile` 后缀即可替换它。使用 `/model status` 查看当前使用的认证 profile。`/model default` 会保留兼容的认证固定设置， 并清除与已配置默认 provider 不匹配的固定设置。

  </Accordion>

  <Accordion id="if-two-providers-expose-the-same-model-id-which-one-does-model-use" title="如果两个提供程序公开相同的模型 ID，/model 使用哪一个？">
    `/model provider/model` 选择确切的提供商路由。例如，即使模型 ID 匹配，`qianfan/deepseek-v4-flash` 和 `deepseek/deepseek-v4-flash` 也是不同的引用 - OpenClaw 不会在裸 ID 匹配时默默地切换提供商。

    用户选择的 `/model` 引用对于回退是严格的：如果 provider/model 变得不可用，则回复明显失败，而不是回退到 `agents.defaults.model.fallbacks`。配置的回退链仍然适用于配置的默认值、主要 cron 作业和自动选择的回退状态。当允许非会话覆盖运行使用后备时，OpenClaw 首先尝试请求的 provider/model，然后配置后备，然后配置主配置 - 因此重复的裸模型 ID 永远不会直接跳回默认提供程序。

    参见[模型](/concepts/models)和[模型故障转移](/concepts/model-failover)。

  </Accordion>

  <Accordion id="can-i-use-gpt-5-5-for-daily-tasks-and-codex-5-5-for-coding" title="我可以使用 GPT 5.5 执行日常任务，使用 Codex 5.5 进行编码吗？">
    可以——模型选择和运行时选择是相互独立的：

    - **原生 Codex 编码 agent：** 将 `agents.defaults.model.primary` 设置为 `openai/gpt-5.5`。使用 `openclaw models auth login --provider openai` 登录，以使用 ChatGPT/Codex 订阅认证。
    - **agent 循环之外的直接 OpenAI API 任务：** 为图像、嵌入、语音、实时功能和其他非 agent OpenAI API 接口配置 `OPENAI_API_KEY`。
    - **OpenAI 代理 API-key auth：** `/model openai/gpt-5.5` 具有订购的 `openai` API-key 配置文件。
    - **子代理：**将编码任务路由到具有自己的`openai/gpt-5.5`模型的Codex-聚焦代理。

    参见[模型](/concepts/models)和[斜杠命令](/tools/slash-commands)。

  </Accordion>

  <Accordion id="how-do-i-configure-fast-mode-for-gpt-5-5" title="如何为 GPT 5.5 配置快速模式？">
    - **每个会话：** 在使用 `openai/gpt-5.5` 时发送 `/fast on`。
    - **每个模型的默认设置：** 将 `agents.defaults.models["openai/gpt-5.5"].params.fastMode` 设置为 `true`。
    - **自动截止：** `/fast auto` 或 `params.fastMode: "auto"` 会让新的模型调用在截止时间前以快速模式运行；之后的重试、故障转移、工具结果处理或继续调用则不使用快速模式。截止时间默认为 60 秒；可通过模型上的 `params.fastAutoOnSeconds` 覆盖。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: {
                fastMode: "auto",
                fastAutoOnSeconds: 30,
              },
            },
          },
        },
      },
    }
    ```

    快速模式会在原生 OpenAI Responses 请求中映射为 `service_tier = "priority"`；现有的 `service_tier` 值会被保留，快速模式不会改写 `reasoning` 或 `text.verbosity`。会话级 `/fast` 设置优先于配置默认值。

    参见 [思考和快速模式](/tools/thinking)，以及 [OpenAI](/providers/openai) provider 页面“高级配置”下的快速模式部分。

  </Accordion>

  <Accordion id="why-do-i-see-model-is-not-allowed-and-then-no-reply" title='为什么我看到“模型...不允许”，然后没有回复？'>
    如果 `agents.defaults.modelPolicy.allow` 非空，它就会成为 `/model`、会话覆盖和 `--model` 的**允许列表**。选择该列表之外的模型时，会返回以下信息，而不是正常回复：

    ```text
    Model override "provider/model" is not allowed by agents.defaults.modelPolicy.allow.
    ```

    修复：将确切的模型或提供者通配符（例如 `"provider/*"`）添加到命名的 `modelPolicy.allow` 列表、remove/empty 该列表中，或从 `/model list` 中选择一个模型。如果该命令还包含 `--runtime codex`，请先更新允许列表，然后重试相同的 `/model provider/model --runtime codex` 命令。

  </Accordion>

  <Accordion id="why-do-i-see-unknown-model-minimax-minimax-m3" title='为什么我会看到“未知模型：minimax/MiniMax-M3”？'>
    如果您使用的是较旧的 OpenClaw 版本，请先升级（或从源 `main` 运行）并重新启动网关 — `MiniMax-M3` 可能尚未出现在您安装的版本的目录中。否则，未配置 MiniMax 提供程序（未找到提供程序条目或身份验证配置文件），因此模型无法解析。请参阅 [MiniMax](/providers/minimax) 提供程序页面上的故障排除部分，了解完整的修复清单、provider/model id 表和配置块示例。

  </Accordion>

  <Accordion id="can-i-use-minimax-as-my-default-and-openai-for-complex-tasks" title="我可以使用 MiniMax 作为默认值并使用 OpenAI 来执行复杂任务吗？">
    可以。将 MiniMax 设为默认模型，并按会话切换模型——故障转移用于处理错误， 而不是处理“困难任务”，因此请使用 `/model` 或单独的 agent。

    **选项 A：按会话切换**

    ```json5
    {
      env: { vars: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." } },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M3" },
          models: {
            "minimax/MiniMax-M3": { alias: "minimax" },
            "openai/gpt-5.5": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然后运行 `/model gpt -s`。

    **选项 B：单独的 agent**——Agent A 默认使用 MiniMax，Agent B 默认使用 OpenAI； 按 agent 路由，或使用 `/agent` 进行切换。

    文档：[模型](/concepts/models)、[多代理Routing](/concepts/multi-agent)、[MiniMax](/providers/minimax)、[OpenAI](/providers/openai)。

  </Accordion>

  <Accordion id="are-opus-sonnet-gpt-built-in-shortcuts" title="opus / sonnet / gpt 是内置快捷方式吗？">
    是的——这些是内置简写，但仅当目标模型存在于 `agents.defaults.models` 中时才会生效：

    | 别名 | 解析为 |
    | --- | --- |
    | `opus` | `anthropic/claude-opus-5-5` |
    | `sonnet` | `anthropic/claude-sonnet-5-5` |
    | `gpt` | `openai/gpt-5.4` |
    | `gpt-mini` | `openai/gpt-5.4-mini` |
    | `gpt-nano` | `openai/gpt-5.4-nano` |
    | `gemini` | `google/gemini-4-argon` |
    | `gemini-flash` | `google/gemini-3.8-flash` |
    | `gemini-flash-lite` | `google/gemini-3.5-flash-lite` |

    你自定义的同名别名会覆盖内置别名。

  </Accordion>

  <Accordion id="how-do-i-define-override-model-shortcuts-aliases" title="如何设置 define/override 模型快捷方式（别名）？">
    别名位于 `agents.defaults.models.<modelId>.alias`：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
          },
        },
      },
    }
    ```

    然后，`/model sonnet -s` 仅为当前会话选择该模型 ID。 Owners/admins 还可以使用 `-a` 更新代理默认值或使用 `-g` 更新共享全局默认值。裸选遵循[模型选择范围](/gateway/config-agents/models#agentsdefaultsmodelselectionscope)。

  </Accordion>

  <Accordion id="how-do-i-add-models-from-other-providers-like-openrouter-or-z-ai" title="如何添加其他提供商（例如 OpenRouter 或 Z.AI）的模型？">
    OpenRouter（按 token 付费；支持很多模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { vars: { OPENROUTER_API_KEY: "sk-or-..." } },
    }
    ```

    Z.AI（GLM 模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5.1" },
          models: { "zai/glm-5.1": {} },
        },
      },
      env: { vars: { ZAI_API_KEY: "..." } },
    }
    ```

    引用的 provider/model 缺少提供程序密钥会引发运行时身份验证错误 （e.g. `No API key found for provider "zai"`）。

    **添加新 agent 后提示找不到 provider 的 API key**

    新代理可以读取共享的身份验证配置文件，而无需复制它们。它自己的配置文件位于 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite` 中并覆盖共享的通读库。请参阅 [Auth 凭证语义](/auth-credential-semantics#agent-copy-portability)。

    修复：当代理需要自己的凭据时，在网关主机上运行 `openclaw models auth login --provider <providerId> --agent <agentId>`。您还可以在使用 `openclaw agents add <id>` 创建代理时配置身份验证。对于OAuth，当代理需要自己的帐户时，请单独登录。有关完整的 `agentDir` 重用和凭证共享规则，请参阅 [Multi-Agent Routing](/concepts/multi-agent) — 切勿跨代理重用 `agentDir`。

  </Accordion>
</AccordionGroup>

## <a id="model-failover-and-%22all-models-failed%22"></a><a id="model-failover-and-all-models-failed"></a> 模型故障转移与“所有模型都失败”

<AccordionGroup>
  <Accordion id="how-does-failover-work" title="故障转移如何工作？">
    分为两个阶段：

    1. 同一 provider 内的 **认证配置文件轮换**。
    2. **模型回退**到`agents.defaults.model.fallbacks`中的下一个模型。

    失败配置文件会应用冷却时间（指数退避），因此当 provider 受到速率限制或暂时出现故障时，OpenClaw 仍能继续响应。

    速率限制类别涵盖的不仅仅是普通的 `429`：`Too many concurrent requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai ... quota limit exceeded`、`resource exhausted`，以及周期性使用窗口限制（`weekly/monthly limit reached`）都会被视为值得执行故障转移的速率限制。

    计费响应并不总是 `402`，并且某些 `402` 保留在 transient/rate-limit 存储桶中，而不是计费通道中。 `401`/`403` 上的显式计费文本仍然可以路由到计费；特定于提供商的文本匹配器 （e.g. OpenRouter `Key limit exceeded`） 的范围仅限于其自己的提供商。读起来像可重试使用窗口或 org/workspace 支出限制（`daily limit reached, resets tomorrow`、`organization spending limit exceeded`）的 `402` 被视为 `rate_limit`，而不是长期计费禁用。

    上下文溢出错误完全远离回退路径 - `request_too_large`、`input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、`input is too long for the model` 或 `ollama error: context length exceeded` 等签名会转到 compaction/retry，而不是推进模型回退。

    通用服务器错误文本的范围比“任何包含 unknown/error 的内容”更窄。以下 provider 范围内的临时错误形式会被视为故障转移信号：Anthropic 单独出现的 `An unknown error occurred`、OpenRouter 单独出现的 `Provider returned error`、类似 `Unhandled stop reason: error` 的停止原因错误、包含临时服务器错误文本的 JSON `api_error` 负载（`internal server error`、`unknown error, 520`、`upstream error`、`backend error`），以及 provider 繁忙错误 （当 provider 上下文匹配时的 `ModelNotReadyException`）。诸如 `LLM request failed with an unknown error.` 之类的通用内部回退文本保持保守处理，不会单独触发回退。

  </Accordion>

  <Accordion id="what-does-no-credentials-found-for-profile-anthropic-default-mean" title='“未找到配置文件 anthropic：default 的凭据”是什么意思？'>
    身份验证配置文件 ID `anthropic:default` 在预期的身份验证存储中没有凭据。

    **修复检查清单：**

    - 确认配置文件所在位置：共享和代理本地 SQLite 身份验证存储。如果较旧的安装仍然有 `auth-profiles.json`，请运行 `openclaw doctor --fix`；它是迁移源，而不是运行时存储。
    - 确认 Gateway 能加载你的环境变量。仅在 shell 中设置的 `ANTHROPIC_API_KEY` 无法传递给通过 systemd/launchd 运行的 Gateway——请将其放入 `~/.openclaw/.env`，或启用 `env.shellEnv`。
    - 确认您正在配置正确的代理 - 使用 `--agent <agentId>` 和 `openclaw models auth login` 来选择其本地存储。
    - 针对该代理的模型路由和身份验证状态运行 `openclaw models status --agent <agentId>`。仅存储的配置文件并不能证明已准备就绪；参见[正确读取状态](/cli/models#read-status-correctly)。

    **对于“No credentials found for profile anthropic”（没有 email 后缀）：**

    本次运行被固定到一个 Gateway 找不到的 Anthropic 配置文件。

    - 使用 Claude CLI：在 Gateway 主机上运行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - 更推荐使用 API 密钥：将 `ANTHROPIC_API_KEY` 放入 Gateway 主机上的 `~/.openclaw/.env`，然后清除任何强制使用缺失配置文件的固定顺序：

      ```bash
      openclaw models auth order clear --provider anthropic
      ```

    - 远程模式：认证配置文件位于 Gateway 机器上，而不是你的笔记本电脑上——请确认你是在 Gateway 机器上运行命令。

  </Accordion>

  <Accordion id="why-did-it-also-try-google-gemini-and-fail" title="为什么它也尝试了 Google Gemini 并失败？">
    如果您的模型配置包含 Google Gemini 作为后备（或者您切换到 Gemini 简写），则 OpenClaw 会在后备期间尝试它。没有配置 Google 凭据会给出 `No API key found for provider "google"`。修复：添加 Google 身份验证，或从 `agents.defaults.model.fallbacks`/aliases. 中删除 Google 模型

    **LLM 请求被拒绝：需要 thinking 签名（Google Antigravity）**

    原因：会话历史记录中有没有签名的思维块（通常来自 aborted/partial 流）； Google 反重力需要在思维块上签名。 OpenClaw 剥离 Google 反重力 Claude 的无符号思维块；如果仍然出现，请启动新会话或为该代理设置 `/thinking off`。

  </Accordion>
</AccordionGroup>

## <a id="auth-profiles%3A-what-they-are-and-how-to-manage-them"></a><a id="auth-profiles-what-they-are-and-how-to-manage-them"></a> 认证配置文件：它们是什么以及如何管理

相关内容：[/concepts/oauth](/concepts/oauth)（OAuth 流程、token 存储、多账号模式）

<AccordionGroup>
  <Accordion id="what-is-an-auth-profile" title="什么是身份验证配置文件？">
    与提供者绑定的命名凭证记录（API 密钥、令牌或 OAuth），存储在 SQLite 中。 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite` 中的代理本地配置文件会覆盖 `~/.openclaw/state/openclaw.sqlite` 中的共享通读库。较旧的安装将共享存储保留在主代理的数据库中，直到 `openclaw doctor --fix` 重新定位它。

    无需转储机密即可检查已保存的配置文件：`openclaw models auth list`（可选使用 `--provider <id>` 或 `--json`）。请参阅 [模型 CLI](/cli/models#auth-profiles)。

  </Accordion>

  <Accordion id="what-are-typical-profile-ids" title="什么是典型的配置文件 ID？">
    提供商前缀：`anthropic:default`（不存在电子邮件身份时常见）、OAuth 身份的 `anthropic:<email>` 或您选择的自定义 ID （e.g. `anthropic:work`）。

  </Accordion>

  <Accordion id="can-i-control-which-auth-profile-is-tried-first" title="我可以控制首先尝试哪个身份验证配置文件吗？">
    可以。`auth.order.<provider>` 配置用于设置每个提供商的轮换顺序（仅包含元数据，不存储机密）。

    OpenClaw 可以在短暂的 **cooldown**（速率限制、超时、身份验证失败）或较长的 **disabled** 状态（billing/insufficient 积分）下跳过配置文件。用`openclaw models status --json`检查并检查`auth.unusableProfiles`。速率限制冷却可以是模型范围内的——一个模型的配置文件冷却仍然可以为同一提供者上的同级模型提供服务； billing/disabled 窗户挡住了整个轮廓。

    设置每个代理的订单覆盖（存储在该代理的 `openclaw-agent.sqlite` 数据库中）：

    ```bash
    # Defaults to the configured default agent (omit --agent)
    openclaw models auth order get --provider anthropic

    # Lock rotation to a single profile
    openclaw models auth order set --provider anthropic anthropic:default

    # Or set an explicit order (fallback within provider)
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # Clear override (fall back to config auth.order / round-robin)
    openclaw models auth order clear --provider anthropic

    # Target a specific agent
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    使用 `openclaw models status --probe` 验证实际会尝试哪些配置文件。显式顺序中省略的已存储配置文件会报告 `excluded_by_auth_order`，而不是被静默地尝试。

  </Accordion>

  <Accordion id="oauth-vs-api-key-what-is-the-difference" title="OAuth vs API 钥匙 - 有什么区别？">
    - **OAuth / CLI 登录** 通常在提供商支持的情况下使用订阅访问。对于 Anthropic、OpenClaw 的 Claude CLI 后端使用 Claude Code `claude -p`，Anthropic 当前将其视为从订阅使用限制中提取的代理 SDK/programmatic 使用情况 — 请参阅[Anthropic](/providers/anthropic) 用于当前计费暂停状态和源链接。
    - **API 密钥**采用按 token 计费。

    该向导支持 Anthropic Claude CLI、OpenAI Codex OAuth 和 API 密钥。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

- [FAQ](/help/faq) — 主 FAQ
- [FAQ — 快速开始与首次运行设置](/help/faq-first-run)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
