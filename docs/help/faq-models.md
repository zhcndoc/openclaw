---
summary: "常见问题：模型默认值、选择、别名、切换、故障转移和认证配置文件"
read_when:
  - 选择或切换模型，配置别名
  - 调试模型故障转移 / “所有模型都失败”
  - 理解认证配置文件以及如何管理它们
title: "常见问题：模型与认证"
sidebarTitle: "模型常见问题"
---

关于模型和认证配置文件的问答。有关设置、会话、网关、通道以及
故障排查，请参阅主 [FAQ](/help/faq)。

## 模型：默认值、选择、别名、切换

<AccordionGroup>
  <Accordion title='什么是“默认模型”？'>
    设置项：

    ```text
    agents.defaults.model.primary
    ```

    模型是 `provider/model` 引用（例如：`openai/gpt-5.5`、
    `anthropic/claude-sonnet-4-6`）。始终明确设置 `provider/model`。如果
    省略 provider，OpenClaw 会先尝试匹配别名，然后尝试使用已配置 provider
    中该模型 ID 的唯一匹配项，最后回退到已配置的默认 provider（已弃用的兼容路径）。
    如果该 provider 不再拥有已配置的默认模型，OpenClaw 会回退到第一个已配置的
    provider/model，而不是使用过时的默认值。

  </Accordion>

  <Accordion title="你推荐使用什么模型？">
    使用你的 provider 技术栈所提供的最新一代最强模型，尤其是对于启用工具或处理
    不可信输入的 agent——较弱或过度量化的模型更容易受到提示词注入和不安全行为的影响
    （参见[安全性](/gateway/security)）。根据 agent 角色，将更便宜的模型用于
    常规或低风险聊天。

    为每个 agent 分配模型，并使用子 agent 并行处理较长任务（每个子 agent 都会消耗
    自己的 token）。参见[模型](/concepts/models)、[子 agent](/tools/subagents)、
    [MiniMax](/providers/minimax)和[本地模型](/gateway/local-models)。

  </Accordion>

  <Accordion title="如何在不清空配置的情况下切换模型？">
    只修改模型字段——避免完整替换配置。

    - 在聊天中使用 `/model <model> -s`（仅当前会话；参见[斜杠命令](/tools/slash-commands)）
    - 直接使用 owner/admin `/model <model>`（当前会话，同时尽力请求更新已配置的默认值）
    - 使用 `openclaw models set ...`（仅更新模型配置）
    - 使用 `openclaw configure --section model`（交互式配置）
    - 直接编辑 `~/.openclaw/openclaw.json` 中的 `agents.defaults.model`

    对于 RPC 编辑，先使用 `config.schema.lookup` 检查（标准化路径、浅层 schema 文档、
    子项摘要），然后优先使用带部分对象的 `config.patch`，而不是 `config.apply`。
    如果已经覆盖了配置，请从备份恢复，或运行 `openclaw doctor` 进行修复。

    文档：[模型](/concepts/models)、[配置](/cli/configure)、
    [配置文件](/cli/config)、[Doctor](/gateway/doctor)。

  </Accordion>

  <Accordion title="可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？">
    可以——Ollama 是最简单的方式。快速设置：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉取本地模型，例如 `ollama pull gemma4`
    3. 如果也要使用云模型，请运行 `ollama signin`
    4. 运行 `openclaw onboard`，选择 `Ollama`，然后选择 `Local` 或 `Cloud + Local`

    `Cloud + Local` 会同时提供云模型和本地 Ollama 模型；
    `kimi-k2.5:cloud` 等云模型无需本地拉取。手动切换：运行
    `openclaw models list`，然后运行 `openclaw models set ollama/<model>`。

    更小或高度量化的模型更容易受到提示词注入。对于任何具有工具访问权限的 bot，
    都应使用大型模型；如果仍然使用小型模型，请启用沙箱和严格的工具允许列表。

    文档：[Ollama](/providers/ollama)、[本地模型](/gateway/local-models)、
    [模型 provider](/concepts/model-providers)、[安全性](/gateway/security)、
    [沙箱](/gateway/sandboxing)。

  </Accordion>

  <Accordion title="如何即时切换模型（无需重启）？">
    发送单独的消息 `/model <name> -s` 以临时切换模型。
    直接使用不带 `-s` 的 owner/admin `/model <name>` 也会请求尽力更新
    已配置的默认值。完整命令列表请参见[斜杠命令](/tools/slash-commands)，
    包括编号选择器（`/model`、`/model list`、`/model 3`）、用于清除会话模型覆盖的
    `/model default`，以及用于查看 endpoint/API 模式详细信息的 `/model status`。

    使用 `@profile` 为每个会话强制指定认证 profile：

    ```text
    /model opus@anthropic:default -s
    /model opus@anthropic:work -s
    ```

    不带 `@profile` 的模型选择会保留现有的兼容 profile 固定设置。
    选择另一个明确的 `@profile` 后缀即可替换它。使用 `/model status`
    查看当前使用的认证 profile。`/model default` 会保留兼容的认证固定设置，
    并清除与已配置默认 provider 不匹配的固定设置。

  </Accordion>

  <Accordion title="如果两个 provider 提供相同的模型 ID，/model 会使用哪一个？">
    `/model provider/model` 会选择确切的 provider 路由。例如，
    `qianfan/deepseek-v4-flash` 和 `deepseek/deepseek-v4-flash` 是不同的引用，
    即使模型 ID 相同——OpenClaw 不会因为裸 ID 匹配而静默切换 provider。

    用户选择的 `/model` 引用对故障转移是严格的：如果该 provider/model 变得不可用，
    回复会明确失败，而不是回退到 `agents.defaults.model.fallbacks`。
    已配置的故障转移链仍适用于已配置的默认值、cron 任务主模型和自动选择的故障转移状态。
    当允许非会话覆盖的运行使用故障转移时，OpenClaw 会先尝试请求的 provider/model，
    然后尝试已配置的故障转移模型，最后尝试已配置的主模型——因此重复的裸模型 ID
    不会直接跳回默认 provider。

    参见[模型](/concepts/models)和[模型故障转移](/concepts/model-failover)。

  </Accordion>

  <Accordion title="可以使用 GPT 5.5 执行日常任务、使用 Codex 5.5 进行编码吗？">
    可以——模型选择和运行时选择是相互独立的：

    - **原生 Codex 编码 agent：** 将 `agents.defaults.model.primary` 设置为
      `openai/gpt-5.5`。使用 `openclaw models auth login --provider
      openai` 登录，以使用 ChatGPT/Codex 订阅认证。
    - **agent 循环之外的直接 OpenAI API 任务：** 为图像、嵌入、语音、实时功能和其他
      非 agent OpenAI API 接口配置 `OPENAI_API_KEY`。
    - **OpenAI agent API 密钥认证：** 使用带有有序 `openai` API 密钥 profile 的
      `/model openai/gpt-5.5`。
    - **子 agent：** 将编码任务路由到专注于 Codex 的 agent，并为其单独配置
      `openai/gpt-5.5` 模型。

    参见[模型](/concepts/models)和[斜杠命令](/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何为 GPT 5.5 配置快速模式？">
    - **每个会话：** 使用 `openai/gpt-5.5` 时发送 `/fast on`。
    - **每个模型的默认设置：** 将
      `agents.defaults.models["openai/gpt-5.5"].params.fastMode` 设置为 `true`。
    - **自动截止：** `/fast auto` 或 `params.fastMode: "auto"` 会让新的模型调用在
      截止时间前以快速模式运行；之后的重试、故障转移、工具结果处理或继续调用则不使用
      快速模式。截止时间默认为 60 秒；可通过模型上的 `params.fastAutoOnSeconds`
      覆盖。

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

    快速模式会在原生 OpenAI Responses 请求中映射为
    `service_tier = "priority"`；现有的 `service_tier` 值会被保留，快速模式不会改写
    `reasoning` 或 `text.verbosity`。会话级 `/fast` 设置优先于配置默认值。

    参见 [思考和快速模式](/tools/thinking)，以及 [OpenAI](/providers/openai)
    provider 页面“高级配置”下的快速模式部分。

  </Accordion>

  <Accordion title='为什么我会看到“Model ... is not allowed”，然后没有回复？'>
    如果 `agents.defaults.modelPolicy.allow` 非空，它就会成为 `/model`、会话覆盖和
    `--model` 的**允许列表**。选择该列表之外的模型时，会返回以下信息，而不是正常回复：

    ```text
    Model override "provider/model" is not allowed by agents.defaults.modelPolicy.allow.
    ```

    修复方法：将确切的模型或类似 `"provider/*"` 的 provider 通配符添加到指定的
    `modelPolicy.allow` 列表中，移除或清空该列表，或者从 `/model list` 中选择模型。
    如果命令还包含 `--runtime codex`，请先更新允许列表，然后重试相同的
    `/model provider/model --runtime codex` 命令。

  </Accordion>

  <Accordion title='为什么我会看到“Unknown model: minimax/MiniMax-M3”？'>
    如果使用的是较旧版本的 OpenClaw，请先升级（或从源码的 `main` 分支运行），
    然后重启 gateway——`MiniMax-M3` 可能尚未包含在已安装版本的模型目录中。
    否则，说明 MiniMax provider 尚未配置（没有 provider 条目或认证 profile），
    因此无法解析该模型。完整的修复检查清单、provider/model ID 表和配置块示例，
    请参见 [MiniMax](/providers/minimax) provider 页面的故障排除部分。

  </Accordion>

  <Accordion title="可以将 MiniMax 用作默认模型，并使用 OpenAI 处理复杂任务吗？">
    可以。将 MiniMax 设为默认模型，并按会话切换模型——故障转移用于处理错误，
    而不是处理“困难任务”，因此请使用 `/model` 或单独的 agent。

    **选项 A：按会话切换**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
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

    **选项 B：单独的 agent**——Agent A 默认使用 MiniMax，Agent B 默认使用 OpenAI；
    按 agent 路由，或使用 `/agent` 进行切换。

    文档：[模型](/concepts/models)、[多 Agent 路由](/concepts/multi-agent)、
    [MiniMax](/providers/minimax)、[OpenAI](/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是内置快捷方式吗？">
    是的——这些是内置简写，但仅当目标模型存在于 `agents.defaults.models` 中时才会生效：

    | 别名 | 解析为 |
    | --- | --- |
    | `opus` | `anthropic/claude-opus-5` |
    | `sonnet` | `anthropic/claude-sonnet-5` |
    | `gpt` | `openai/gpt-5.4` |
    | `gpt-mini` | `openai/gpt-5.4-mini` |
    | `gpt-nano` | `openai/gpt-5.4-nano` |
    | `gemini` | `google/gemini-3.1-pro-preview` |
    | `gemini-flash` | `google/gemini-3-flash-preview` |
    | `gemini-flash-lite` | `google/gemini-3.1-flash-lite` |

    你自定义的同名别名会覆盖内置别名。

  </Accordion>

  <Accordion title="如何定义/覆盖模型快捷方式（别名）？">
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

    然后，`/model sonnet -s` 会将其解析为当前会话使用的模型 ID。
    只有当 owner/admin 还希望请求更新已配置的默认值时，才省略 `-s`。

  </Accordion>

  <Accordion title="如何添加来自 OpenRouter 或 Z.AI 等其他 provider 的模型？">
    OpenRouter（按 token 付费；支持很多模型）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
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
      env: { ZAI_API_KEY: "..." },
    }
    ```

    被引用的 provider/model 缺少 provider 密钥时，会引发运行时认证错误
    （例如：`No API key found for provider "zai"`）。

    **添加新 agent 后提示找不到 provider 的 API key**

    新 agent 的认证存储为空——认证按 agent 独立存储，位置为：

    ```text
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修复方法：运行 `openclaw agents add <id>`，并在向导中配置认证；或者仅从主
    agent 的存储中复制可移植的静态 `api_key`/`token` profile。对于 OAuth，
    请在新 agent 需要使用自己的账户时，从该 agent 登录。有关完整的 `agentDir`
    复用和凭据共享规则，请参见[多 Agent 路由](/concepts/multi-agent)——切勿在
    agent 之间复用 `agentDir`。

  </Accordion>
</AccordionGroup>

## 模型故障转移与“所有模型都失败”

<AccordionGroup>
  <Accordion title="故障转移是如何工作的？">
    分为两个阶段：

    1. 同一 provider 内的 **认证配置文件轮换**。
    2. **模型回退** 到 `agents.defaults.model.fallbacks` 中的下一个模型。

    失败配置文件会应用冷却时间（指数退避），因此当 provider
    受到速率限制或暂时出现故障时，OpenClaw
    仍能继续响应。

    速率限制类别涵盖的不仅仅是普通的 `429`：`Too many concurrent
    requests`、`ThrottlingException`、`concurrency limit reached`、`workers_ai
    ... quota limit exceeded`、`resource exhausted`，以及周期性
    使用窗口限制（`weekly/monthly limit reached`）都会被视为值得执行故障转移的速率限制。

    计费响应并不总是 `402`，而且某些 `402` 会停留在
    临时错误/速率限制类别中，而不是计费类别。`401`/`403` 中明确的计费文本
    仍可能被路由到计费类别；provider 专属的文本匹配器（例如 OpenRouter 的
    `Key limit exceeded`）仍仅适用于其所属的 provider。读起来像可重试的
    使用窗口或组织/工作区支出限制的 `402`（`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`）会被视为 `rate_limit`，而不是
    长时间禁用计费。

    上下文溢出错误完全不会进入回退路径——类似 `request_too_large`、
    `input exceeds the maximum number of tokens`、`input token count exceeds the maximum number of input tokens`、
    `input is too long for the model` 或 `ollama error: context length exceeded` 的特征
    会进入压缩/重试流程，而不会推进模型回退。

    通用服务器错误文本的范围比“任何包含 unknown/error 的内容”更窄。以下 provider 范围内的临时错误形式
    会被视为故障转移信号：Anthropic 单独出现的 `An unknown error occurred`、OpenRouter 单独出现的
    `Provider returned error`、类似 `Unhandled stop reason:
    error` 的停止原因错误、包含临时服务器错误文本的 JSON `api_error` 负载（`internal
    server error`、`unknown error, 520`、`upstream error`、`backend error`），以及 provider 繁忙错误
    （当 provider 上下文匹配时的 `ModelNotReadyException`）。诸如 `LLM request failed
    with an unknown error.` 之类的通用内部回退文本保持保守处理，不会单独触发回退。

  </Accordion>

  <Accordion title='“No credentials found for profile anthropic:default”是什么意思？'>
    认证配置文件 ID `anthropic:default` 在预期的认证存储中没有凭据。

    **修复检查清单：**

    - 确认配置文件的位置——当前路径：
      `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`；旧版路径：
      `~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。
    - 确认 Gateway 能加载你的环境变量。仅在 shell 中设置的 `ANTHROPIC_API_KEY`
      无法传递给通过 systemd/launchd 运行的 Gateway——请将其放入
      `~/.openclaw/.env`，或启用 `env.shellEnv`。
    - 确认你编辑的是正确的 agent——多 agent 配置中有多个
      `auth-profiles.json` 文件。
    - 运行 `openclaw models status`，查看已配置的模型和 provider
      认证状态。

    **对于“No credentials found for profile anthropic”（没有 email 后缀）：**

    本次运行被固定到一个 Gateway 找不到的 Anthropic 配置文件。

    - 使用 Claude CLI：在 Gateway 主机上运行
      `openclaw models auth login --provider anthropic
      --method cli --set-default`。
    - 更推荐使用 API 密钥：将 `ANTHROPIC_API_KEY` 放入
      Gateway 主机上的 `~/.openclaw/.env`，然后清除任何强制使用缺失配置文件的固定顺序：

      ```bash
      openclaw models auth order clear --provider anthropic
      ```

    - 远程模式：认证配置文件位于 Gateway 机器上，而不是你的
      笔记本电脑上——请确认你是在 Gateway 机器上运行命令。

  </Accordion>

  <Accordion title="为什么它还尝试了 Google Gemini 并失败？">
    如果你的模型配置将 Google Gemini 设为回退模型（或者你
    切换到了 Gemini 简写名称），OpenClaw 会在回退过程中尝试它。未配置 Google 凭据会产生
    `No API key found for provider
    "google"`。修复方法：添加 Google 认证，或从
    `agents.defaults.model.fallbacks`/别名中移除 Google 模型。

    **LLM 请求被拒绝：需要 thinking 签名（Google Antigravity）**

    原因：会话历史包含没有签名的 thinking 块（通常
    来自中止或不完整的流）；Google Antigravity 要求 thinking 块必须带有签名。OpenClaw 会为 Google
    Antigravity Claude 移除未签名的 thinking 块；如果该问题仍然出现，请开始新会话，或为该 agent 设置
    `/thinking off`。

  </Accordion>
</AccordionGroup>

## 认证配置文件：它们是什么以及如何管理

相关内容：[/concepts/oauth](/concepts/oauth)（OAuth 流程、token 存储、多账号模式）

<AccordionGroup>
  <Accordion title="什么是认证配置文件？">
    一个与提供商关联的命名凭据记录（OAuth 或 API 密钥），存储于：

    ```text
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    无需转储机密即可检查已保存的配置文件：`openclaw models auth
    list`（可选使用 `--provider <id>` 或 `--json`）。请参阅
    [模型 CLI](/cli/models#auth-profiles)。

  </Accordion>

  <Accordion title="常见的配置文件 ID 是什么？">
    以提供商为前缀：`anthropic:default`（不存在电子邮件身份时的常见形式）、用于 OAuth 身份的
    `anthropic:<email>`，或自定义 ID（例如 `anthropic:work`）。

  </Accordion>

  <Accordion title="我可以控制首先尝试哪个认证配置文件吗？">
    可以。`auth.order.<provider>` 配置用于设置每个提供商的轮换顺序（仅包含元数据，不存储机密）。

    OpenClaw 可能会在短暂的**冷却**期间（速率限制、超时、认证失败）跳过某个配置文件，或在较长的**禁用**状态期间（计费/余额不足）跳过它。使用
    `openclaw models status
    --json` 检查，并查看 `auth.unusableProfiles`。速率限制导致的冷却可能按模型区分——针对某个模型处于冷却状态的配置文件，仍可为同一提供商上的兄弟模型提供服务；计费/禁用时间窗口则会阻止整个配置文件。

    设置按代理覆盖的顺序（存储在该代理的 `auth-state.json` 中）：

    ```bash
    # 默认使用已配置的默认 agent（省略 --agent）
    openclaw models auth order get --provider anthropic

    # 将轮换锁定到单个配置文件
    openclaw models auth order set --provider anthropic anthropic:default

    # 或设置显式顺序（在 provider 内部回退）
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # 清除覆盖（回退到 config auth.order / 轮询）
    openclaw models auth order clear --provider anthropic

    # 指定特定 agent
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    使用 `openclaw models status --probe` 验证实际会尝试哪些配置文件。显式顺序中省略的已存储配置文件会报告
    `excluded_by_auth_order`，而不是被静默地尝试。

  </Accordion>

  <Accordion title="OAuth 与 API 密钥有什么区别？">
    - **OAuth / CLI 登录**通常使用订阅访问权限（如果提供商支持）。对于 Anthropic，OpenClaw 的 Claude CLI 后端使用 Claude Code 的 `claude -p`，Anthropic 目前将其视为使用订阅用量上限的 Agent SDK/程序化用量——有关当前计费暂停状态和来源链接，请参阅[Anthropic](/providers/anthropic)。
    - **API 密钥**采用按 token 计费。

    该向导支持 Anthropic Claude CLI、OpenAI Codex OAuth 和 API 密钥。

  </Accordion>
</AccordionGroup>

## 相关内容

- [FAQ](/help/faq) — 主 FAQ
- [FAQ — 快速开始与首次运行设置](/help/faq-first-run)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
