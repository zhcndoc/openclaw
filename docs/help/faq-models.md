---
summary: "常见问题：模型默认值、选择、别名、切换、故障转移和认证配置文件"
read_when:
  - 选择或切换模型、配置别名
  - 调试模型故障转移 / "所有模型都失败"
  - 理解认证配置文件以及如何管理它们
title: "常见问题：模型和认证"
sidebarTitle: "模型常见问题"
---

模型和认证配置文件问答。有关设置、会话、网关、通道和
故障排查，请参阅主 [常见问题](/help/faq)。

## 模型：默认值、选择、别名、切换

<AccordionGroup>
  <Accordion title='什么是“默认模型”？'>
    OpenClaw 的默认模型就是你设置为：

    ```
    agents.defaults.model.primary
    ```

    模型以 `provider/model` 形式引用（例如：`openai/gpt-5.4` 或 `openai-codex/gpt-5.5`）。如果你省略 provider，OpenClaw 会先尝试别名，然后尝试与该精确模型 id 匹配的唯一已配置 provider，只有在此之后才回退到已配置的默认 provider 作为已弃用的兼容路径。如果该 provider 不再公开已配置的默认模型，OpenClaw 会回退到第一个已配置的 provider/model，而不是暴露一个已失效、被移除的 provider 默认值。你仍然应该**显式**设置 `provider/model`。

  </Accordion>

  <Accordion title="你推荐使用什么模型？">
    **推荐默认值：** 使用你的 provider 栈中可用的最强最新一代模型。
    **对于启用工具或输入不受信任的代理：** 优先考虑模型强度而不是成本。
    **对于日常/低风险聊天：** 使用更便宜的回退模型，并按代理角色进行路由。

    MiniMax 有自己的文档：[MiniMax](/providers/minimax) 和
    [本地模型](/gateway/local-models)。

    经验法则：对于高风险工作，使用**你能负担得起的最佳模型**；对于日常聊天或摘要，使用更便宜的模型。你可以按代理路由模型，并使用子代理并行处理长任务（每个子代理都会消耗 token）。参见 [模型](/concepts/models) 和
    [子代理](/tools/subagents)。

    强烈警告：较弱或过度量化的模型更容易受到提示
    注入和不安全行为的影响。参见 [安全性](/gateway/security)。

    更多背景：[模型](/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清空配置的情况下切换模型？">
    使用**模型命令**，或者只编辑**model** 字段。避免整体替换配置。

    安全选项：

    - `/model` 在聊天中（快速、按会话）
    - `openclaw models set ...`（只更新模型配置）
    - `openclaw configure --section model`（交互式）
    - 编辑 `~/.openclaw/openclaw.json` 中的 `agents.defaults.model`

    避免使用带有部分对象的 `config.apply`，除非你打算替换整个配置。
    对于 RPC 编辑，先用 `config.schema.lookup` 检查，并优先使用 `config.patch`。lookup 载荷会提供规范化路径、浅层 schema 文档/约束，以及直接子项摘要。
    用于部分更新。
    如果你确实覆盖了配置，请从备份恢复，或重新运行 `openclaw doctor` 进行修复。

    文档：[模型](/concepts/models)、[配置](/cli/configure)、[配置](/cli/config)、[Doctor](/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？">
    可以。Ollama 是本地模型最简单的路径。

    最快设置方式：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉取一个本地模型，例如 `ollama pull gemma4`
    3. 如果你还想使用云模型，运行 `ollama signin`
    4. 运行 `openclaw onboard` 并选择 `Ollama`
    5. 选择 `Local` 或 `Cloud + Local`

    注意：

    - `Cloud + Local` 会同时提供云模型和你的本地 Ollama 模型
    - 像 `kimi-k2.5:cloud` 这样的云模型不需要本地拉取
    - 手动切换时，使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全提示：较小或高度量化的模型更容易受到提示
    注入的影响。对于任何能够使用工具的机器人，我们强烈建议使用**大模型**。
    如果你仍然想使用小模型，请启用沙箱和严格的工具白名单。

    文档：[Ollama](/providers/ollama)、[本地模型](/gateway/local-models)、
    [模型提供商](/concepts/model-providers)、[安全性](/gateway/security)、
    [沙箱](/gateway/sandboxing)。

  </Accordion>

  <Accordion title="OpenClaw、Flawd 和 Krill 使用什么模型？">
    - 这些部署可能不同，并且会随时间变化；没有固定的 provider 推荐。
    - 使用 `openclaw models status` 检查每个 gateway 当前的运行时设置。
    - 对于安全敏感/启用工具的代理，请使用可用的最强最新一代模型。
  </Accordion>

  <Accordion title="如何在运行时切换模型（无需重启）？">
    将 `/model` 命令作为单独消息使用：

    ```
    /model sonnet
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    /model gemini-flash-lite
    ```

    这些都是内置别名。自定义别名可以通过 `agents.defaults.models` 添加。

    你可以使用 `/model`、`/model list` 或 `/model status` 列出可用模型。

    `/model`（以及 `/model list`）会显示一个简洁的带编号选择器。通过编号选择：

    ```
    /model 3
    ```

    你也可以为该 provider 强制使用特定认证配置文件（按会话）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 会显示当前激活的 agent、正在使用的 `auth-profiles.json` 文件，以及接下来将尝试的认证配置文件。
    当可用时，它还会显示已配置的 provider 端点（`baseUrl`）和 API 模式（`api`）。

    **如何取消我用 @profile 设置的固定配置文件？**

    重新运行 `/model`，**不要**带 `@profile` 后缀：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果你想恢复默认值，从 `/model` 中选择它（或发送 `/model <默认 provider/model>`）。
    使用 `/model status` 确认当前激活的是哪个认证配置文件。

  </Accordion>

  <Accordion title="我可以日常任务用 GPT 5.5、编码用 Codex 5.5 吗？">
    可以。将其中一个设为默认，并按需切换：

    - **快速切换（按会话）：** 当前直接 OpenAI API-key 任务使用 `/model openai/gpt-5.4`，或 GPT-5.5 Codex OAuth 任务使用 `/model openai-codex/gpt-5.5`。
    - **默认值：** 将 `agents.defaults.model.primary` 设为 `openai/gpt-5.4` 用于 API-key，或设为 `openai-codex/gpt-5.5` 用于 GPT-5.5 Codex OAuth。
    - **子代理：** 将编码任务路由给使用不同默认模型的子代理。

    `openai/gpt-5.5` 的直接 API-key 访问在 OpenAI 启用公共 API 上的
    GPT-5.5 后即可支持。在此之前，GPT-5.5 仅限订阅/OAuth。

    参见 [模型](/concepts/models) 和 [斜杠命令](/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何为 GPT 5.5 配置快速模式？">
    使用会话开关或配置默认值：

    - **按会话：** 当会话正在使用 `openai/gpt-5.4` 或 `openai-codex/gpt-5.5` 时发送 `/fast on`。
    - **按模型默认值：** 将 `agents.defaults.models["openai/gpt-5.4"].params.fastMode` 或 `agents.defaults.models["openai-codex/gpt-5.5"].params.fastMode` 设置为 `true`。

    示例：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.4": {
              params: {
                fastMode: true,
              },
            },
          },
        },
      },
    }
    ```

    对于 OpenAI，fast mode 在受支持的原生 Responses 请求上会映射为 `service_tier = "priority"`。会话中的 `/fast` 会覆盖配置默认值。

    参见 [思考和快速模式](/tools/thinking) 和 [OpenAI 快速模式](/providers/openai#fast-mode)。

  </Accordion>

  <Accordion title='为什么我看到“Model ... is not allowed”，然后没有回复？'>
    如果设置了 `agents.defaults.models`，它就会成为 `/model` 和任何
    会话覆盖的**允许列表**。选择不在该列表中的模型会返回：

    ```
    模型 "provider/model" 不被允许。请使用 /model 列出可用模型。
    ```

    该错误会**代替**正常回复返回。修复方法：将该模型添加到
    `agents.defaults.models`，移除允许列表，或从 `/model list` 中选择一个模型。

  </Accordion>

  <Accordion title='为什么我看到“Unknown model: minimax/MiniMax-M2.7”？'>
    这意味着**provider 未配置**（未找到 MiniMax provider 配置或认证
    配置文件），因此无法解析该模型。

    修复检查清单：

    1. 升级到当前的 OpenClaw 版本（或从源码 `main` 运行），然后重启 gateway。
    2. 确保已配置 MiniMax（向导或 JSON），或者 MiniMax 认证
       存在于 env/认证配置文件中，这样就能注入匹配的 provider
       （`minimax` 使用 `MINIMAX_API_KEY`，`minimax-portal` 使用 `MINIMAX_OAUTH_TOKEN` 或已存储的 MiniMax OAuth）。
    3. 对你的认证路径使用精确的模型 id（区分大小写）：
       `minimax/MiniMax-M2.7` 或 `minimax/MiniMax-M2.7-highspeed` 用于 API-key
       设置，或 `minimax-portal/MiniMax-M2.7` /
       `minimax-portal/MiniMax-M2.7-highspeed` 用于 OAuth 设置。
    4. 运行：

       ```bash
       openclaw models list
       ```

       并从列表中选择（或在聊天中使用 `/model list`）。

    参见 [MiniMax](/providers/minimax) 和 [模型](/concepts/models)。

  </Accordion>

  <Accordion title="我可以把 MiniMax 设为默认，并在复杂任务中使用 OpenAI 吗？">
    可以。将 **MiniMax 设为默认**，并在需要时**按会话**切换模型。
    回退是针对**错误**的，不是“高难任务”，所以请使用 `/model` 或单独的代理。

    **方案 A：按会话切换**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.4": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然后：

    ```
    /model gpt
    ```

    **方案 B：分离代理**

    - 代理 A 默认值：MiniMax
    - 代理 B 默认值：OpenAI
    - 按代理路由，或使用 `/agent` 切换

    文档：[模型](/concepts/models)、[多代理路由](/concepts/multi-agent)、[MiniMax](/providers/minimax)、[OpenAI](/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是内置快捷方式吗？">
    是的。OpenClaw 提供了一些默认简写（仅当模型存在于 `agents.defaults.models` 中时才应用）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`（用于 API-key 设置），或在配置为 Codex OAuth 时为 `openai-codex/gpt-5.5`
    - `gpt-mini` → `openai/gpt-5.4-mini`
    - `gpt-nano` → `openai/gpt-5.4-nano`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果你设置了同名自定义别名，你的值优先生效。

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
            "anthropic/claude-haiku-4-5": { alias: "haiku" },
          },
        },
      },
    }
    ```

    然后 `/model sonnet`（或在支持时使用 `/<alias>`）会解析为该模型 ID。

  </Accordion>

  <Accordion title="如何添加来自其他 provider 的模型，比如 OpenRouter 或 Z.AI？">
    OpenRouter（按 token 计费；支持许多模型）：

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

    如果你引用了某个 provider/model，但缺少所需的 provider key，你会收到运行时认证错误（例如 `No API key found for provider "zai"`）。

    **添加新 agent 后提示未找到该 provider 的 API key**

    这通常意味着**新 agent** 的认证存储是空的。认证是按 agent 存储的，并保存在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修复选项：

    - 运行 `openclaw agents add <id>`，并在向导中配置认证。
    - 或将主 agent 的 `agentDir` 中的 `auth-profiles.json` 复制到新 agent 的 `agentDir`。

    不要在多个 agent 之间重用 `agentDir`；这会导致认证/会话冲突。

  </Accordion>
</AccordionGroup>

## 模型故障转移和“所有模型都失败”

<AccordionGroup>
  <Accordion title="故障转移如何工作？">
    故障转移分为两个阶段：

    1. 在同一 provider 内轮换**认证配置文件**。
    2. **模型回退**到 `agents.defaults.model.fallbacks` 中的下一个模型。

    失败配置文件会应用冷却时间（指数退避），因此即使 provider 受到速率限制或暂时失败，OpenClaw 也能继续响应。

    速率限制桶包括的不只是普通的 `429` 响应。OpenClaw
    也会将诸如 `Too many concurrent requests`、
    `ThrottlingException`、`concurrency limit reached`、
    `workers_ai ... quota limit exceeded`、`resource exhausted` 以及周期性
    使用窗口限制（`weekly/monthly limit reached`）视为值得进行故障转移的
    速率限制。

    某些看起来像计费错误的响应不是 `402`，某些 HTTP `402`
    响应也仍然会保留在这个临时桶中。如果 provider 在 `401` 或 `403` 上返回
    明确的计费文本，OpenClaw 仍然可以将其保留在
    计费通道中，但 provider 特定的文本匹配器仍然只作用于拥有它们的
    provider（例如 OpenRouter 的 `Key limit exceeded`）。如果某个 `402`
    消息看起来更像可重试的使用窗口或
    组织/工作区支出限制（`daily limit reached, resets tomorrow`、
    `organization spending limit exceeded`），OpenClaw 会将其视为
    `rate_limit`，而不是长期计费禁用。

    上下文溢出错误是不同的：例如
    `request_too_large`、`input exceeds the maximum number of tokens`、
    `input token count exceeds the maximum number of input tokens`、
    `input is too long for the model`，或 `ollama error: context length
    exceeded` 这类错误会留在压缩/重试路径上，而不会推进到模型
    回退。

    通用服务器错误文本的范围故意比“任何包含
    unknown/error 的内容”更窄。OpenClaw 确实会把 provider 作用域内的临时形态
    视为值得故障转移的超时/过载信号，例如 Anthropic 的裸 `An unknown error occurred`、OpenRouter 裸
    `Provider returned error`、类似 `Unhandled stop reason:
    error` 的 stop-reason 错误、带有临时服务器文本的 JSON `api_error` 负载
    （`internal server error`、`unknown error, 520`、`upstream error`、`backend
    error`），以及诸如 `ModelNotReadyException` 之类的 provider 忙碌错误，只要 provider 上下文
    匹配。
    通用的内部回退文本如 `LLM request failed with an unknown
    error.` 会保持保守，不会单独触发模型回退。

  </Accordion>

  <Accordion title='“No credentials found for profile anthropic:default” 是什么意思？'>
    这意味着系统尝试使用认证配置文件 ID `anthropic:default`，但在预期的认证存储中找不到它的凭据。

    **修复检查清单：**

    - **确认认证配置文件存放位置**（新路径与旧路径）
      - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 旧路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）
    - **确认你的环境变量已被 Gateway 加载**
      - 如果你在 shell 中设置了 `ANTHROPIC_API_KEY`，但通过 systemd/launchd 运行 Gateway，它可能不会继承该变量。将其放入 `~/.openclaw/.env`，或启用 `env.shellEnv`。
    - **确保你正在编辑正确的 agent**
      - 多 agent 设置意味着可能存在多个 `auth-profiles.json` 文件。
    - **检查模型/认证状态是否正常**
      - 使用 `openclaw models status` 查看已配置模型以及 provider 是否已认证。

    **“No credentials found for profile anthropic” 的修复检查清单**

    这意味着运行被固定到了 Anthropic 认证配置文件，但 Gateway
    无法在其认证存储中找到它。

    - **使用 Claude CLI**
      - 在 gateway 主机上运行 `openclaw models auth login --provider anthropic --method cli --set-default`。
    - **如果你想改用 API key**
      - 将 `ANTHROPIC_API_KEY` 放到 gateway 主机上的 `~/.openclaw/.env` 中。
      - 清除任何强制使用缺失配置文件的固定顺序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **确认你是在 gateway 主机上运行命令**
      - 在远程模式下，认证配置文件存放在 gateway 机器上，而不是你的笔记本电脑上。

  </Accordion>

  <Accordion title="为什么它还尝试了 Google Gemini 并失败了？">
    如果你的模型配置中把 Google Gemini 作为回退（或者你切换到了 Gemini 简写），OpenClaw 会在模型回退期间尝试它。如果你还没有配置 Google 凭据，你会看到 `No API key found for provider "google"`。

    修复：要么提供 Google 认证，要么从 `agents.defaults.model.fallbacks` / 别名中移除或避免使用 Google 模型，这样回退就不会路由到那里。

    **LLM request rejected: thinking signature required（Google Antigravity）**

    原因：会话历史中包含**没有签名的 thinking 块**（通常来自
    一个中止/部分流）。Google Antigravity 要求 thinking 块带签名。

    修复：OpenClaw 现在会为 Google Antigravity Claude 移除未签名的 thinking 块。如果它仍然出现，请开启一个**新会话**，或对该 agent 设置 `/thinking off`。

  </Accordion>
</AccordionGroup>

## 认证配置文件：它们是什么以及如何管理

相关：[/concepts/oauth](/concepts/oauth)（OAuth 流程、令牌存储、多账户模式）

<AccordionGroup>
  <Accordion title="什么是认证配置文件？">
    认证配置文件是绑定到 provider 的命名凭据记录（OAuth 或 API key）。配置文件存放在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="典型的配置文件 ID 是什么？">
    OpenClaw 使用带 provider 前缀的 ID，例如：

    - `anthropic:default`（通常在没有 email 身份时使用）
    - `anthropic:<email>` 用于 OAuth 身份
    - 你自己选择的自定义 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制先尝试哪个认证配置文件吗？">
    可以。配置支持可选的配置文件元数据以及按 provider 的顺序（`auth.order.<provider>`）。这**不会**存储密钥；它将 ID 映射到 provider/mode，并设置轮换顺序。

    如果某个配置文件处于较短的**冷却**状态（速率限制/超时/认证失败）或较长的**禁用**状态（计费/信用不足），OpenClaw 可能会暂时跳过它。要检查这一点，运行 `openclaw models status --json` 并查看 `auth.unusableProfiles`。调优项：`auth.cooldowns.billingBackoffHours*`。

    速率限制冷却可以按模型范围生效。某个配置文件在某个模型上冷却时，
    仍可能可用于同一 provider 上的兄弟模型，
    而计费/禁用窗口仍会阻止整个配置文件。

    你还可以通过 CLI 设置**按 agent** 的顺序覆盖（存储在该 agent 的 `auth-state.json` 中）：

    ```bash
    # 默认为已配置的默认 agent（省略 --agent）
    openclaw models auth order get --provider anthropic

    # 将轮换锁定到单个配置文件（只尝试这个）
    openclaw models auth order set --provider anthropic anthropic:default

    # 或设置显式顺序（provider 内部回退）
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

    如果存储的配置文件未包含在显式顺序中，probe 会为该配置文件报告
    `excluded_by_auth_order`，而不是静默尝试它。

  </Accordion>

  <Accordion title="OAuth 和 API key 有什么区别？">
    OpenClaw 同时支持两者：

    - **OAuth** 通常利用订阅访问权限（在适用时）。
    - **API key** 使用按 token 计费。

    向导明确支持 Anthropic Claude CLI、OpenAI Codex OAuth 和 API key。

  </Accordion>
</AccordionGroup>

## 相关内容

- [常见问题](/help/faq) — 主常见问题
- [常见问题 — 快速开始与首次运行设置](/help/faq-first-run)
- [模型选择](/concepts/model-providers)
- [模型故障转移](/concepts/model-failover)
