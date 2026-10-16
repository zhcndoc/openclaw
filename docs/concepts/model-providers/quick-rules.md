---
summary: "模型参考、CLI 帮助器、主要模型保存规则和 OpenAI provider/runtime 分割。"
read_when:
  - "您需要 model-ref 和 CLI-helper 基础知识"
  - "您正在添加提供商身份验证并希望保留您的主要模型"
  - "您需要 OpenAI provider/runtime 或 CLI-runtime 拆分"
title: "快速规则"
---

## <a id="quick-rules"></a> 快速规则

<AccordionGroup>
  <Accordion id="model-refs-and-cli-helpers" title="模型参考和 CLI 帮助程序">
    - 模型引用使用 `provider/model`（示例：`opencode/claude-opus-4-6`）。
    - `agents.defaults.models` 存储别名和按模型设置；`agents.defaults.modelPolicy.allow` 是可选的显式覆盖白名单。
    - CLI 辅助工具：`openclaw onboard`、`openclaw models list`、`openclaw models set <provider/model>`。
    - `models.providers.*.maxTokens` 设置提供者级别的输出令牌默认值。在每个 `models.providers.*.models[]` 条目上，`contextWindow` 声明本机窗口，`contextTokens` 限制活动输入，`maxTokens` 覆盖该模型的输出容量。配置的输出限制在已知时被限制到最终的本机上下文窗口：每个模型 `contextWindow`，否则为发现的窗口。
    - 回退规则、冷却检查和会话覆盖持久性：[模型故障转移](/concepts/model-failover)。

  </Accordion>
  <Accordion id="adding-provider-auth-does-not-change-your-primary-model" title="添加提供商身份验证不会更改您的主要模型">
    `openclaw configure` 在你添加或重新认证某个提供商时，会保留现有的 `agents.defaults.model.primary`。`openclaw models auth login` 也会这样做，除非你传入 `--set-default`。提供商插件仍可能在其认证配置补丁中返回一个推荐的默认模型，但当主模型已存在时，OpenClaw 会把这理解为“让该模型可用”，而不是“替换当前主模型”。

    若要有意切换默认模型，请使用 `openclaw models set <provider/model>` 或 `openclaw models auth login --provider <id> --set-default`。

  </Accordion>
  <Accordion id="openai-provider-runtime-split" title="OpenAI provider/runtime 分体式">
    OpenAI 模型引用和代理运行时是分开的：

    - `openai/<model>` 选择标准 OpenAI 提供商和模型。单独的前缀永远不会选择 Codex。
    - 在未设置 provider/model 运行时策略或 `auto` 的情况下，OpenAI 可能仅针对确切的官方 HTTPS 平台响应或 ChatGPT 响应路由隐式选择 Codex，而无需重写提供者请求。有效的模型范围的快速模式控件不计为创作的请求参数。
    - 手动指定的 Completions 适配器、自定义端点，以及带有手动指定请求行为的路由，都会继续使用 OpenClaw。纯文本官方 HTTP 端点会被拒绝。
    - 旧版 Codex 模型引用属于旧版配置，doctor 会将其重写为 `openai/<model>`。
    - Provider/model `agentRuntime.id: "openclaw"` 在 OpenClaw 上显式保留其他符合条件的路由。 `agentRuntime.id: "codex"` 需要 Codex，并且当有效路由与 Codex- 不兼容时拒绝执行。

    请参阅 [OpenAI 隐式代理运行时](/providers/openai/runtimes#implicit-agent-runtime) 和 [Codex 工具 ](/plugins/codex-harness)。如果 provider/runtime 拆分令人困惑，请先阅读 [Agent 运行时](/concepts/agent-runtimes)。

    插件自动启用遵循相同的边界：隐式 Codex- 兼容的有效路径可以启用 Codex 插件，而显式 provider/model `agentRuntime.id: "codex"` 或旧版 `codex/<model>` 参考则需要它。 `openai/*` 前缀本身则不会。

    新的 OpenAI API-key 和 ChatGPT/Codex OAuth 设置选择标准 `openai/gpt-6-astra` 参考。裸直接 API `openai/gpt-5.6` 别名仍然受支持并解析为 Sol。添加或刷新 OpenAI 身份验证时，将保留现有的显式主项（包括 `openai/gpt-5.5`）。 GPT-5.5 通过任一运行时仍然可用，作为没有 GPT-5.6 访问权限的帐户的显式恢复选择。

  </Accordion>
  <Accordion id="cli-runtimes" title="CLI 运行时">
    CLI 运行时使用相同的拆分：选择标准模型引用，例如 `anthropic/claude-*` 或 `google/gemini-*`，然后当您需要本地 CLI 后端时，将 provider/model 运行时策略设置为 `claude-cli` 或 `google-gemini-cli`。

    旧版 `claude-cli/*` 和 `google-gemini-cli/*` 引用迁移回标准提供程序引用，并单独记录运行时。旧版 `codex-cli/*` 引用迁移到 `openai/*` 并使用 Codex 应用程序服务器路由； OpenClaw 不再保留捆绑的 Codex CLI 后端。

  </Accordion>
</AccordionGroup>
