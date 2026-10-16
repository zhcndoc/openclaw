---
summary: "在 OpenClaw 中使用 Venice AI 注重隐私的模型"
read_when:
  - "你想在 OpenClaw 中进行隐私优先推理"
  - "你想了解 Venice AI 的设置指南"
title: "Venice AI"
---

[Venice AI](https://venice.ai) 提供以隐私为中心的推理：无需日志记录即可运行的开放模型，以及对 Claude、GPT、Gemini 和 Grok 的匿名代理访问。所有端点均与 OpenAI- 兼容 （`/v1`）。

## <a id="privacy-modes"></a> 隐私模式

| 模式           | 行为                                                         | 模型                                                          |
| -------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| **私人**    | Prompts/responses 永远不会被存储或记录。短暂的。         | GLM、Gemma、Grok、Qwen、DeepSeek、Kimi、Venice 未经审查等 |
| **匿名化** | 通过 Venice 代理，并在转发前剥离元数据。 | Claude、GPT 和精选的 Qwen 模型                           |

<Warning>
匿名化模型并非完全私密。Venice 会在转发前剥离元数据，但底层提供商（OpenAI、Anthropic、Google、xAI）仍会处理该请求。若需要完全隐私，请使用私有模型。
</Warning>

## <a id="getting-started"></a> 入门

<Steps>
  <Step id="install-the-plugin" title="安装插件">
    ```bash
    openclaw plugins install @openclaw/venice-provider
    ```
  </Step>
  <Step id="get-your-api-key" title="获取您的 API 密钥">
    1. 在 [venice.ai](https://venice.ai) 注册
    2. Go 至 **设置 > API 密钥 > 创建新密钥**
    3. 复制你的 API 密钥（格式：`vapi_xxxxxxxxxxxx`）
  </Step>
  <Step id="configure-openclaw" title="配置OpenClaw">
    <Tabs>
      <Tab id="interactive-recommended" title="互动（推荐）">
        ```bash
        openclaw onboard --auth-choice venice-api-key
        ```

        提示输入 API 密钥（或重用现有的 `VENICE_API_KEY`），列出可用的 Venice 模型，并设置你的默认模型。
      </Tab>
      <Tab id="environment-variable" title="环境变量">
        ```bash
        export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
        ```
      </Tab>
      <Tab id="non-interactive" title="非交互式">
        ```bash
        openclaw onboard --non-interactive --accept-risk --skip-health \
          --auth-choice venice-api-key \
          --venice-api-key "vapi_xxxxxxxxxxxx"
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step id="verify-setup" title="验证设置">
    ```bash
    openclaw agent --model venice/zai-org-glm-4.7 --message "Hello, are you working?"
    ```
  </Step>
</Steps>

## <a id="model-selection"></a> 模型选择

- **默认**：`venice/zai-org-glm-4.7`（私有推理）。
- **最强的匿名化选项**：`venice/claude-opus-5`。

```bash
openclaw models set venice/zai-org-glm-4.7
openclaw models list --all --provider venice
```

您还可以运行 `openclaw configure` 并选择 **Model/auth 提供程序 > Venice AI**。

<Tip>
| 使用场景              | 模型                                        | 原因                                    |
| --------------------- | -------------------------------------------- | -------------------------------------- |
| 通用聊天（默认） | `zai-org-glm-4.7`                             | Venice 当前的默认特性              |
| 综合质量最佳   | `claude-opus-5`                              | 当前推荐的匿名化 Opus 模型 |
| 隐私保护＋编码       | `qwen3-coder-480b-a35b-instruct-turbo`       | 具有大上下文的私有编码模型 |
| 快速且经济           | `google-gemma-4-31b-it`                      | 低成本的推荐私有视觉模型 |
| 复杂私有任务  | `deepseek-v3.2`                              | 推荐的私有推理模型       |
| 不受审查             | `venice-uncensored-1-2`                      | Venice 当前的不受审查模型        |
</Tip>

## <a id="built-in-catalog-(16-visible-models)"></a><a id="built-in-catalog-16-visible-models"></a> 内置目录（16 个可见模型）

<AccordionGroup>
  <Accordion id="private-models-10-fully-private-no-logging" title="私有模型 （10） — 完全私有，无日志记录">
    | 模型 ID                               | 名称                        | 上下文 | 笔记                       |
    | -------------------------------------- | --------------------------- | ------- | --------------------------- |
    | `zai-org-glm-5-2`                      | GLM 5.2                     | 1M      | 推荐，编码         |
    | `zai-org-glm-4.7`                      | GLM 4.7                     | 198k    | 私有推理           |
    | `venice-uncensored-1-2`                | Venice 未经审查 1.2       | 128k    | 审查限制最少，视觉     |
    | `google-gemma-4-31b-it`                | Google Gemma 4 31B 指示 | 256k    | 推荐，视觉         |
    | `kimi-k2-6`                            | Kimi K2.6                   | 256k    | 推荐，编码，视觉 |
    | `deepseek-v3.2`                        | DeepSeek V3.2               | 160k    | 推荐，推理      |
    | `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B思维         | 128k    | 默认推理           |
    | `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 编码器 480B 涡轮      | 256k    | 默认编码              |
    | `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B               | 128k    | 默认视觉              |
    | `grok-4-5`                             | Grok 4.5                    | 500k    | 推荐，编码，视觉 |
  </Accordion>

  <Accordion id="anonymized-models-6-via-venice-proxy" title="匿名模型 （6） — 通过 Venice 代理">
    | 模型 ID            | 名称                             | 上下文 | 笔记                       |
    | ------------------- | -------------------------------- | ------- | --------------------------- |
    | `qwen-3-7-max`      | Qwen 3.7 最大（通过 Venice）        | 1M      | 推荐，编码，视觉 |
    | `qwen-3-7-plus`     | Qwen 3.7 Plus（通过 Venice）       | 1M      | 推荐，编码，视觉 |
    | `claude-fable-5`    | Claude 《神鬼寓言 5》（来自 Venice）      | 1M      | 推荐，编码，视觉 |
    | `claude-opus-5`     | Claude Opus 5（通过 Venice）       | 1M      | 推荐，编码，视觉 |
    | `claude-sonnet-4-6` | Claude Sonnet 4.6（通过 Venice）   | 1M      | 推荐，编码，视觉 |
    | `openai-gpt-56-sol` | GPT-5.6 索尔（通过 Venice）         | 1M      | 推荐，视觉         |
  </Accordion>

  <Accordion id="deprecated-compatibility-rows-3-hidden-from-pickers" title="已弃用的兼容性行 （3） — 对选择器隐藏">
    | 模型 ID                | 替代方案                 |
    | ----------------------- | --------------------------- |
    | `zai-org-glm-4.6`       | `zai-org-glm-4.7`           |
    | `google-gemma-3-27b-it` | `google-gemma-4-31b-it`     |
    | `kimi-k2-5`             | `kimi-k2-6`                 |
  </Accordion>
</AccordionGroup>

Grok- 支持的 Venice 模型（`grok-4-5` 和类似模型）获得与本机 xAI 提供程序相同的工具架构兼容补丁，因为它们共享相同的上游工具调用格式。

## <a id="model-discovery"></a> 模型发现

上面的内置目录是清单支持的种子目录。在运行时，OpenClaw 从 Venice `/models` API 刷新它，如果 API 无法访问，则回退到种子目录。 `/models` 端点是公共的（列出不需要身份验证），但推理需要有效的 API 密钥。

Venice 可能会继续接受已停用的模型 ID 作为提供商拥有的别名。 OpenClaw 目录仅通告 `/models` 返回的模型 ID。

## <a id="deepseek-v4-replay-behavior"></a> DeepSeek V4 回放行为

如果 Venice 公开 DeepSeek V4 模型，例如 `deepseek-v4-pro` 或 `deepseek-v4-flash`，则当 Venice 省略时，OpenClaw 会填充助理消息上所需的 `reasoning_content` 重播字段，并删除它来自请求负载的 `thinking`/ `reasoning`/`reasoning_effort`（Venice 拒绝 DeepSeek 对这些模型的本机 `thinking` 控制）。此重播修复与本机 DeepSeek 提供商自己的思维控制分开。

## <a id="streaming-and-tool-support"></a> 流式传输与工具支持

| 功能          | 支持                                                |
| ---------------- | ------------------------------------------------------ |
| 流媒体        | 所有模型                                             |
| 函数调用 | 所有可见的 seed 模型；实时行遵循 API 元数据 |
| Vision/Images    | 上面标有“Vision”的模型                           |
| JSON模式        | 通过 `response_format`                                  |

## <a id="prompt-caching"></a> 提示词缓存

对于本机 `https://api.venice.ai/api/v1` 端点，OpenClaw 为相关请求发送稳定的 `prompt_cache_key`，以提高缓存亲和性。显式请求缓存密钥优先于会话 ID。设置 `cacheRetention: "none"` 会抑制此路由提示；它不会禁用 Venice 的自动缓存。自定义端点保留其配置的行为。 Venice 管理特定于提供程序的缓存，包括 Claude 缓存标记。请参阅 [Venice 提示缓存](https://docs.venice.ai/guides/features/prompt-caching)。

## <a id="pricing"></a> 定价

Venice 使用基于积分的系统。匿名化模型的成本大致与直接 API 定价相同，外加少量 Venice 费用。当前费率请参见 [venice.ai/pricing](https://venice.ai/pricing)。

OpenClaw 在模型发现期间从 Venice 的公开 [`GET /api/v1/models`](https://docs.venice.ai/api-reference/endpoint/models/list) 响应中读取实时价格。相同的插件解析器提供托管目录发布者。已知和新发现的模型使用 API 每百万代币 USD 的完整时间表；种子目录价格是线下后备价格。缺失或无效的实时价格保留已知模型的完整种子目录时间表。没有有效定价的未知模型保持零估计；这并不意味着该模型是免费的。显式 API 零利率有效。

当 API 提供扩展定价时，仅当总提示输入 **超过** `context_token_threshold` 时，其费率才适用于整个请求。提示输入包括未缓存输入、缓存读、缓存写；输出令牌不选择层。恰好达到阈值的请求仍使用基本费率。基本费率和扩展费率始终来自同一个时间表。无效的延长时间表不会与种子目录或其他来源价格合并。

显式 `models.providers.venice.models[].cost` 条目会覆盖目录估计值，包括零。省略 `cost` 或 `{}` 继承目录计划。部分固定费率继承缺失的基本费率并删除继承的等级；显式 `tieredPricing` 获胜，`tieredPricing: []` 选择统一定价。代理本地根 `models.json` 价格保留最高优先级。

`models.mode: "merge"` 中的新功能将生成的目录行排除在配置之外，因此它们无法成为价格引脚。重新加入会保留现有的模型条目、别名和模型选择。在 `models.mode: "replace"` 中，载入会保留显式种子目录行，因为该模式会禁用发现。现有的序列化成本永远不会自动删除或迁移，即使它们与旧的种子目录条目匹配。启用合并模式后，备份您的配置并仅删除不需要的 `cost` 字段以恢复目录定价；保持有意的覆盖。

Discovery 重用其现有的提取行和缓存。使用情况显示不会提出价格请求，并且正在运行的网关不会立即采用每个上游价格变化。网关准备好替换一代后，托管目录行和价格会一起激活，无需重新启动；参见[托管模型目录](/concepts/models#hosted-catalog-updates)。在源配置中进行仅调整大小的编辑，而不将生成的模型行复制回其中：从运行时快照替换整个模型数组可以将继承的成本保留为显式覆盖。保留历史记录成本；当前定价仅填充缺失的成本或未知价格零占位符。请参阅 [ 代币使用和成本](/reference/token-use)。

## <a id="usage-examples"></a> 使用示例

```bash
# Default private model
openclaw agent --model venice/zai-org-glm-4.7 --message "Quick health check"

# Claude Opus via Venice (anonymized)
openclaw agent --model venice/claude-opus-5 --message "Summarize this task"

# Uncensored model
openclaw agent --model venice/venice-uncensored-1-2 --message "Draft options"

# Vision model with image
openclaw agent --model venice/qwen3-vl-235b-a22b --message "Review attached image"

# Coding model
openclaw agent --model venice/qwen3-coder-480b-a35b-instruct-turbo --message "Refactor this function"
```

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="api-key-not-recognized" title="API 密钥无法识别">
    ```bash
    openclaw models list --provider venice
    ```

    确认API密钥已配置并以`vapi_`开头；不要打印或分享其价值。

  </Accordion>

  <Accordion id="model-not-available" title="模型不可用">
    运行 `openclaw models list --all --provider venice` 查看当前可用的模型；随着 Venice 新增或下线模型，目录会发生变化。
  </Accordion>

  <Accordion id="connection-issues" title="连接问题">
    Venice API 位于 `https://api.venice.ai/api/v1`。请确认你的网络允许通过 HTTPS 连接到该主机。
  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排除](/help/troubleshooting)和[FAQ](/help/faq)。
</Note>

## <a id="advanced-configuration"></a> 高级配置

<AccordionGroup>
  <Accordion id="config-file-example" title="配置文件示例">
    ```json5
    {
      env: { vars: { VENICE_API_KEY: "vapi_..." } },
      agents: { defaults: { model: { primary: "venice/zai-org-glm-4.7" } } },
      models: {
        mode: "merge",
        providers: {
          venice: {
            baseUrl: "https://api.venice.ai/api/v1",
            apiKey: "${VENICE_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "zai-org-glm-4.7",
                name: "GLM 4.7",
                reasoning: true,
                input: ["text"],
                contextWindow: 198000,
                maxTokens: 16384,
              },
            ],
          },
        },
      },
    }
    ```
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="Venice AI" href="https://venice.ai" icon="globe">
    Venice AI 主页和账号注册。
  </Card>
  <Card title="API 文档" href="https://docs.venice.ai" icon="book">
    Venice API 参考与开发者文档。
  </Card>
  <Card title="定价" href="https://venice.ai/pricing" icon="credit-card">
    当前 Venice credit 费率和计划。
  </Card>
</CardGroup>
