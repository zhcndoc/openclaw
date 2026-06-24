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
    OpenClaw 的默认模型就是你设置为以下项的模型：

    ```
    agents.defaults.model.primary
    ```

    模型引用格式为 `provider/model`（例如：`openai/gpt-5.5` 或 `anthropic/claude-sonnet-4-6`）。如果你省略 provider，OpenClaw 会先尝试别名，然后尝试与该精确模型 ID 唯一匹配的已配置 provider，只有在这之后才会退回到已配置的默认 provider，作为一种已弃用的兼容路径。如果该 provider 不再暴露已配置的默认模型，OpenClaw 会回退到第一个已配置的 provider/model，而不是暴露一个陈旧、已移除 provider 的默认值。你仍应当**显式**设置 `provider/model`。

  </Accordion>

  <Accordion title="你推荐使用什么模型？">
    **推荐默认值：** 使用你的 provider 栈中可用的最强最新一代模型。
    **对于启用工具或不可信输入的 agent：** 优先考虑模型能力而不是成本。
    **对于日常/低风险聊天：** 使用更便宜的回退模型，并按 agent 角色进行路由。

    MiniMax 有自己的文档：[MiniMax](/providers/minimax) 和
    [本地模型](/gateway/local-models)。

    经验法则：高风险工作使用你**负担得起的最佳模型**，日常聊天或摘要则使用更便宜的
    模型。你可以按 agent 路由模型，并使用子 agent 来并行处理长任务（每个子 agent 都会消耗 token）。参见 [模型](/concepts/models) 和
    [子 agent](/tools/subagents)。

    强烈警告：较弱或过度量化的模型更容易受到提示注入和不安全行为的影响。参见 [安全性](/gateway/security)。

    更多上下文：[模型](/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清空配置的情况下切换模型？">
    使用 **模型命令**，或者只编辑 **model** 字段。避免整体替换配置。

    安全选项：

    - 在聊天中使用 `/model`（快速、按会话）
    - `openclaw models set ...`（仅更新模型配置）
    - `openclaw configure --section model`（交互式）
    - 编辑 `~/.openclaw/openclaw.json` 中的 `agents.defaults.model`

    除非你确实想替换整个配置，否则不要对部分对象使用 `config.apply`。
    对于 RPC 编辑，先用 `config.schema.lookup` 检查，并优先使用 `config.patch`。lookup 载荷会给出规范化路径、浅层 schema 文档/约束，以及即时子项摘要。
    用于部分更新。
    如果你确实覆盖了配置，请从备份恢复，或重新运行 `openclaw doctor` 进行修复。

    文档：[模型](/concepts/models)、[配置](/cli/configure)、[Config](/cli/config)、[Doctor](/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？">
    可以。Ollama 是本地模型最简单的路径。

    最快的设置方式：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉取一个本地模型，例如 `ollama pull gemma4`
    3. 如果你也想使用云模型，运行 `ollama signin`
    4. 运行 `openclaw onboard` 并选择 `Ollama`
    5. 选择 `Local` 或 `Cloud + Local`

    注意：

    - `Cloud + Local` 会同时提供云模型和你的本地 Ollama 模型
    - 如 `kimi-k2.5:cloud` 之类的云模型不需要本地拉取
    - 手动切换时，使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全提示：较小或高度量化的模型更容易受到提示
    注入攻击。我们强烈建议任何可使用工具的 bot 都使用**大模型**。
    如果你仍然想用小模型，请启用沙箱和严格的工具白名单。

    文档：[Ollama](/providers/ollama)、[本地模型](/gateway/local-models)、
    [模型 provider](/concepts/model-providers)、[安全性](/gateway/security)、
    [沙箱](/gateway/sandboxing)。

  </Accordion>

  <Accordion title="OpenClaw、Flawd 和 Krill 使用什么模型？">
    - 这些部署可能不同，并且会随着时间变化；没有固定的 provider 推荐。
    - 使用 `openclaw models status` 检查每个 gateway 当前的运行时设置。
    - 对于安全敏感/启用工具的 agent，请使用可用的最强最新一代模型。

  </Accordion>

  <Accordion title="如何在运行时切换模型（无需重启）？">
    将 `/model` 命令作为独立消息使用：

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    这些是内置别名。可以通过 `agents.defaults.models` 添加自定义别名。

    你可以使用 `/model`、`/model list` 或 `/model status` 列出可用模型。

    `/model`（以及 `/model list`）会显示一个紧凑的带编号选择器。可按数字选择：

    ```
    /model 3
    ```

    你也可以为 provider 强制指定某个认证配置文件（按会话）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 会显示当前激活的 agent、正在使用的 `auth-profiles.json` 文件，以及下一次将尝试的认证配置文件。
    它还会在可用时显示已配置的 provider 端点（`baseUrl`）和 API 模式（`api`）。

    **如何取消我通过 @profile 固定的配置文件？**

    重新运行不带 `@profile` 后缀的 `/model`：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果你想恢复到默认值，请从 `/model` 中选择它（或发送 `/model <default provider/model>`）。
    使用 `/model status` 确认当前激活的是哪个认证配置文件。

  </Accordion>

  <Accordion title="如果两个 provider 暴露相同的 model id，/model 会使用哪一个？">
    `/model provider/model` 会为该会话选择那个精确的 provider 路由。

    例如，`qianfan/deepseek-v4-flash` 和 `deepseek/deepseek-v4-flash` 是不同的模型引用，尽管二者都包含 `deepseek-v4-flash`。仅因为裸露的 model id 匹配，OpenClaw 不应在两个 provider 之间悄悄切换。

    用户选择的 `/model` 引用对于回退策略同样是严格的。如果所选 provider/model 不可用，回复会明显失败，而不是从 `agents.defaults.model.fallbacks` 中回答。配置的回退链仍然适用于已配置的默认值、cron 任务主模型，以及自动选择的回退状态。

    如果一个从非会话覆盖开始的运行允许使用回退，OpenClaw 会先尝试请求的 provider/model，然后尝试已配置回退，最后才是已配置主模型。这可以防止重复的裸 model id 直接跳回默认 provider。

    参见 [模型](/concepts/models) 和 [模型故障转移](/concepts/model-failover)。

  </Accordion>

  <Accordion title="我可以日常任务使用 GPT 5.5，而编码使用 Codex 5.5 吗？">
    可以。将模型选择和运行时选择分开看待：

    - **原生 Codex 编码 agent：** 将 `agents.defaults.model.primary` 设置为 `openai/gpt-5.5`。当你想使用 ChatGPT/Codex 订阅认证时，使用 `openclaw models auth login --provider openai` 登录。
    - **agent 循环之外的直接 OpenAI API 任务：** 为图像、嵌入、语音、实时和其他非 agent OpenAI API 接口配置 `OPENAI_API_KEY`。
    - **OpenAI agent API key 认证：** 使用带有有序 `openai` API key 配置文件的 `/model openai/gpt-5.5`。
    - **子 agent：** 将编码任务路由到一个专注 Codex 的 agent，并使用其自己的 `openai/gpt-5.5` 模型。

    参见 [模型](/concepts/models) 和 [斜杠命令](/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何为 GPT 5.5 配置快速模式？">
    使用会话切换或配置默认值中的任意一种：

    - **每个会话：** 当会话正在使用 `openai/gpt-5.5` 时发送 `/fast on`。
    - **每个模型默认值：** 将 `agents.defaults.models["openai/gpt-5.5"].params.fastMode` 设为 `true`。
    - **自动截止：** 使用 `/fast auto` 或 `params.fastMode: "auto"` 让新的模型调用在自动截止前以快速模式启动，然后让后续的重试、回退、工具结果或续写调用不使用快速模式。截止时间默认为 60 秒；可在当前模型上设置 `params.fastAutoOnSeconds` 来更改。

    示例：

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

    对于 OpenAI，快速模式会在支持的原生 Responses 请求中映射为 `service_tier = "priority"`。会话级 `/fast` 的优先级高于配置默认值。Codex app-server 的轮次只能在轮次开始时接收该层级，因此 `auto` 会在下一次由 OpenClaw 启动的模型轮次生效，而不是在已经运行中的 app-server 轮次内生效。

    参见 [思考与快速模式](/tools/thinking) 和 [OpenAI 快速模式](/providers/openai#fast-mode)。

  </Accordion>

  <Accordion title='为什么我会看到“Model ... is not allowed”，然后没有回复？'>
    如果设置了 `agents.defaults.models`，它就会成为 `/model` 以及任何
    会话覆盖的 **允许列表**。选择一个不在该列表中的模型会返回：

    ```
    Model "provider/model" is not allowed. Use /models to list providers, or /models <provider> to list models.
    Add it with: openclaw config set agents.defaults.models '{"provider/model":{}}' --strict-json --merge
    ```

    该错误会**代替**正常回复返回。修复方法：将精确模型添加到
    `agents.defaults.models`，为动态 provider 目录添加类似 `"provider/*": {}` 的 provider 通配符，移除允许列表，或者从 `/model list` 中选择一个模型。
    如果命令还包含 `--runtime codex`，请先更新允许列表，然后重新尝试
    同一个 `/model provider/model --runtime codex` 命令。

  </Accordion>

  <Accordion title='为什么我会看到“Unknown model: minimax/MiniMax-M3”？'>
    这意味着**provider 未配置**（未找到 MiniMax provider 配置或认证
    配置文件），因此无法解析该模型。

    修复检查清单：

    1. 升级到当前的 OpenClaw 版本（或从源代码 `main` 运行），然后重启 gateway。
    2. 确保 MiniMax 已配置（向导或 JSON），或者 MiniMax 认证
       存在于 env/auth 配置文件中，以便可以注入匹配的 provider
       (`MINIMAX_API_KEY` 用于 `minimax`，`MINIMAX_OAUTH_TOKEN` 或已保存的 MiniMax
       OAuth 用于 `minimax-portal`)。
    3. 对你的认证路径使用准确的模型 ID（区分大小写）：
       `minimax/MiniMax-M3`、`minimax/MiniMax-M2.7`，或
       `minimax/MiniMax-M2.7-highspeed` 用于 API key 设置；或
       `minimax-portal/MiniMax-M3`、`minimax-portal/MiniMax-M2.7`，或
       `minimax-portal/MiniMax-M2.7-highspeed` 用于 OAuth 设置。
    4. 运行：

       ```bash
       openclaw models list
       ```

       并从列表中选择（或在聊天中使用 `/model list`）。

    参见 [MiniMax](/providers/minimax) 和 [模型](/concepts/models)。

  </Accordion>

  <Accordion title="我可以把 MiniMax 作为默认值，并在复杂任务中使用 OpenAI 吗？">
    可以。将 **MiniMax 设为默认值**，并在需要时**按会话**切换模型。
    回退是用于**错误**，不是用于“高难度任务”，所以请使用 `/model` 或单独的 agent。

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

    然后：

    ```
    /model gpt
    ```

    **选项 B：独立 agent**

    - Agent A 默认值：MiniMax
    - Agent B 默认值：OpenAI
    - 按 agent 路由，或使用 `/agent` 切换

    文档：[模型](/concepts/models)、[多 agent 路由](/concepts/multi-agent)、[MiniMax](/providers/minimax)、[OpenAI](/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是内置快捷方式吗？">
    是的。OpenClaw 提供了一些默认的简写（仅在模型存在于 `agents.defaults.models` 中时生效）：

    - `opus` → `anthropic/claude-opus-4-8`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite`

    如果你自己设置了同名别名，你的值会优先生效。

  </Accordion>

  <Accordion title="如何定义/覆盖模型快捷方式（别名）？">
    别名来自 `agents.defaults.models.<modelId>.alias`。示例：

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

    然后 `/model sonnet`（或在支持时使用 `/<alias>`）会解析到该模型 ID。

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
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    如果你引用了某个 provider/model，但缺少所需的 provider key，你会得到运行时认证错误（例如 `No API key found for provider "zai"`）。

    **添加新 agent 后提示找不到 provider 的 API key**

    这通常意味着**新 agent** 的认证存储为空。认证是按 agent 保存的，存储在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修复选项：

    - 运行 `openclaw agents add <id>` 并在向导中配置认证。
    - 或者只将主 agent 认证存储中的可移植静态 `api_key` / `token` 配置文件复制到新 agent 的认证存储中。
    - 对于 OAuth 配置文件，当新 agent 需要使用自己的账号时，请从新 agent 登录；否则 OpenClaw 可以直接使用默认/主 agent 的配置，而无需克隆 refresh token。

    不要在多个 agent 之间复用 `agentDir`；这会导致认证/会话冲突。

  </Accordion>
</AccordionGroup>

## 模型故障转移与“所有模型都失败”

<AccordionGroup>
  <Accordion title="故障转移是如何工作的？">
    故障转移分两个阶段：

    1. 同一 provider 内的 **认证配置文件轮换**。
    2. **模型回退** 到 `agents.defaults.model.fallbacks` 中的下一个模型。

    对失败配置文件会应用冷却时间（指数退避），因此即使 provider 受到速率限制或暂时失败，OpenClaw 也能继续响应。

    速率限制桶包含的不只是普通的 `429` 响应。OpenClaw
    还会把类似 `Too many concurrent requests`、
    `ThrottlingException`、`concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、`resource exhausted` 以及周期性
    使用窗口限制（`weekly/monthly limit reached`）视为值得故障转移的
    速率限制。

    一些看起来像计费问题的响应并不是 `402`，某些 HTTP `402`
    响应也会保留在这个临时桶中。如果 provider 在 `401` 或 `403` 上返回
    明确的计费文本，OpenClaw 仍然可以把它保留在
    计费通道中，但 provider 特定的文本匹配器仍只作用于其所属的
    provider（例如 OpenRouter 的 `Key limit exceeded`）。如果某个 `402`
    消息看起来像可重试的使用窗口或
    组织/工作区消费限制（`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`），OpenClaw 会将其视为
    `rate_limit`，而不是长期计费禁用。

    上下文溢出错误不同：诸如
    `request_too_large`、`input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model`，或 `ollama error: context length
    exceeded` 这类签名会留在压缩/重试路径上，而不会推进模型
    回退。

    通用服务器错误文本被刻意限定得比“任何包含
    unknown/error 的内容”更窄。OpenClaw 确实会将 provider 范围内的临时形态
    视为值得故障转移，例如 Anthropic 裸露的 `An unknown error occurred`、OpenRouter 裸露的
    `Provider returned error`、诸如 `Unhandled stop reason:
    error` 这类 stop-reason 错误、带有临时服务器文本的 JSON `api_error`
    载荷（`internal server error`、`unknown error, 520`、`upstream error`、`backend
    error`），以及如 `ModelNotReadyException` 这样的 provider 忙碌错误，
    前提是 provider 上下文匹配。
    像 `LLM request failed with an unknown
    error.` 这样的通用内部回退文本会保持保守，不会单独触发模型回退。

  </Accordion>

  <Accordion title='“No credentials found for profile anthropic:default” 是什么意思？'>
    这意味着系统尝试使用认证配置文件 ID `anthropic:default`，但在预期的认证存储中找不到它的凭据。

    **修复检查清单：**

    - **确认认证配置文件存放位置**（新路径 vs 旧路径）
      - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 旧版：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）
    - **确认你的环境变量已被 Gateway 加载**
      - 如果你在 shell 中设置了 `ANTHROPIC_API_KEY`，但通过 systemd/launchd 运行 Gateway，它可能不会继承。将其放入 `~/.openclaw/.env`，或启用 `env.shellEnv`。
    - **确保你正在编辑正确的 agent**
      - 多 agent 设置意味着可能存在多个 `auth-profiles.json` 文件。
    - **检查模型/认证状态**
      - 使用 `openclaw models status` 查看已配置的模型以及 provider 是否已认证。

    **“No credentials found for profile anthropic” 的修复清单**

    这意味着运行被固定到了一个 Anthropic 认证配置文件，但 Gateway
    无法在其认证存储中找到它。

    - **使用 Claude CLI**
      - 在 gateway 主机上运行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果你想改用 API key**
      - 将 `ANTHROPIC_API_KEY` 放到 **gateway 主机**上的 `~/.openclaw/.env` 中。
      - 清除任何强制使用缺失配置文件的固定顺序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **确认你是在 gateway 主机上运行命令**
      - 在远程模式下，认证配置文件保存在 gateway 机器上，而不是你的笔记本电脑上。

  </Accordion>

  <Accordion title="为什么它还尝试了 Google Gemini 并失败？">
    如果你的模型配置将 Google Gemini 作为回退（或者你切换到了 Gemini 简写），OpenClaw 会在模型回退期间尝试它。如果你没有配置 Google 凭据，你会看到 `No API key found for provider "google"`。

    修复方法：要么提供 Google 认证，要么从 `agents.defaults.model.fallbacks` / 别名中移除或避免使用 Google 模型，这样回退就不会路由到那里。

    **LLM request rejected: thinking signature required（Google Antigravity）**

    原因：会话历史包含**没有签名的 thinking blocks**（通常来自
    被中止/部分流）。Google Antigravity 要求 thinking blocks 必须带签名。

    修复：OpenClaw 现在会为 Google Antigravity Claude 移除未签名的 thinking blocks。如果问题仍然出现，请开始一个**新会话**，或为该 agent 设置 `/thinking off`。

  </Accordion>
</AccordionGroup>

## 认证配置文件：它们是什么以及如何管理

相关内容：[/concepts/oauth](/concepts/oauth)（OAuth 流程、token 存储、多账号模式）

<AccordionGroup>
  <Accordion title="什么是认证配置文件？">
    认证配置文件是绑定到某个 provider 的已命名凭据记录（OAuth 或 API key）。配置文件位于：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    如需查看已保存的配置文件而不泄露密钥，请运行 `openclaw models auth list`（可选 `--provider <id>` 或 `--json`）。详情参见 [Models CLI](/cli/models#auth-profiles)。

  </Accordion>

  <Accordion title="常见的配置文件 ID 是什么？">
    OpenClaw 使用带 provider 前缀的 ID，例如：

    - `anthropic:default`（通常在没有 email 身份时使用）
    - `anthropic:<email>` 用于 OAuth 身份
    - 你自己选择的自定义 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制首先尝试哪个认证配置文件吗？">
    可以。配置支持为配置文件提供可选元数据，并支持每个 provider 的顺序（`auth.order.<provider>`）。这**不会**存储密钥；它只是将 ID 映射到 provider/mode，并设置轮换顺序。

    如果某个配置文件处于短暂的 **冷却** 状态（速率限制/超时/认证失败）或更长的 **禁用** 状态（计费/余额不足），OpenClaw 可能会临时跳过它。要检查这一点，请运行 `openclaw models status --json` 并查看 `auth.unusableProfiles`。调优项：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷却可以按模型范围生效。某个配置文件即使针对一个模型正在冷却，
    对同一 provider 下的兄弟模型仍然可能可用，
    而计费/禁用窗口仍会阻止整个配置文件。

    你也可以通过 CLI 设置**按 agent**的顺序覆盖（存储在该 agent 的 `auth-state.json` 中）：

    ```bash
    # 默认使用已配置的默认 agent（省略 --agent）
    openclaw models auth order get --provider anthropic

    # 将轮换锁定到单个配置文件（只尝试这个）
    openclaw models auth order set --provider anthropic anthropic:default

    # 或设置显式顺序（在 provider 内部回退）
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # 清除覆盖（回退到 config auth.order / 轮询）
    openclaw models auth order clear --provider anthropic
    ```

    要针对特定 agent：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

    要验证实际会尝试什么，请使用：

    ```bash
    openclaw models status --probe
    ```

    如果某个已存储配置文件被省略在显式顺序之外，探测会把该配置文件报告为
    `excluded_by_auth_order`，而不是静默尝试它。

  </Accordion>

  <Accordion title="OAuth 和 API key 有什么区别？">
    OpenClaw 支持两者：

    - **OAuth / CLI 登录**通常利用订阅访问（如果 provider 支持）。对于 Anthropic，OpenClaw 的 Claude CLI 后端使用 Claude Code `claude -p`；Anthropic 目前将其视为 Agent SDK / 程序化使用，并自 2026 年 6 月 15 日起提供单独的每月 Agent SDK credit。
    - **API keys** 使用按 token 计费。

    向导明确支持 Anthropic Claude CLI、OpenAI Codex OAuth 和 API keys。

  </Accordion>
</AccordionGroup>

## 相关内容

- [FAQ](/help/faq) — 主 FAQ
- [FAQ — 快速开始与首次运行设置](/help/faq-first-run)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
