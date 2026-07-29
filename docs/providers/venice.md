---
summary: "在 OpenClaw 中使用 Venice AI 的隐私优先模型"
read_when:
  - 你想在 OpenClaw 中进行隐私优先推理
  - 你想了解 Venice AI 的设置指南
title: "Venice AI"
---

[Venice AI](https://venice.ai) 提供注重隐私的推理：开放模型在运行时
不记录日志，并且可匿名代理访问 Claude、GPT、Gemini 和 Grok。
所有端点都与 OpenAI 兼容（`/v1`）。

## 隐私模式

| Mode           | Behavior                                                         | Models                                                          |
| -------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| **Private**    | Prompts/responses are never stored or logged. Ephemeral.         | GLM, Gemma, Grok, Qwen, DeepSeek, Kimi, Venice Uncensored, etc. |
| **Anonymized** | Proxied through Venice with metadata stripped before forwarding. | Claude, GPT, and selected Qwen models                           |

<Warning>
匿名化模型并非完全私密。Venice 会在转发前剥离元数据，但底层提供商（OpenAI、Anthropic、Google、xAI）仍会处理该请求。若需要完全隐私，请使用私有模型。
</Warning>

## 快速开始

<Steps>
  <Step title="安装插件">
    ```bash
    openclaw plugins install @openclaw/venice-provider
    ```
  </Step>
  <Step title="获取你的 API 密钥">
    1. 在 [venice.ai](https://venice.ai) 注册
    2. 前往 **Settings > API Keys > Create new key**
    3. 复制你的 API 密钥（格式：`vapi_xxxxxxxxxxxx`）
  </Step>
  <Step title="配置 OpenClaw">
    <Tabs>
      <Tab title="交互式（推荐）">
        ```bash
        openclaw onboard --auth-choice venice-api-key
        ```

        提示输入 API 密钥（或重用现有的 `VENICE_API_KEY`），列出可用的 Venice 模型，并设置你的默认模型。
      </Tab>
      <Tab title="环境变量">
        ```bash
        export VENICE_API_KEY="vapi_xxxxxxxxxxxx"
        ```
      </Tab>
      <Tab title="非交互式">
        ```bash
        openclaw onboard --non-interactive \
          --auth-choice venice-api-key \
          --venice-api-key "vapi_xxxxxxxxxxxx"
        ```
      </Tab>
    </Tabs>

  </Step>
  <Step title="验证设置">
    ```bash
    openclaw agent --model venice/zai-org-glm-4.7 --message "Hello, are you working?"
    ```
  </Step>
</Steps>

## 模型选择

- **Default**: `venice/zai-org-glm-4.7` (private reasoning).
- **Strongest anonymized option**: `venice/claude-opus-5`.

```bash
openclaw models set venice/zai-org-glm-4.7
openclaw models list --all --provider venice
```

你也可以运行 `openclaw configure`，然后选择 **Model/auth provider > Venice AI**。

<Tip>
| Use case              | Model                                        | Why                                    |
| --------------------- | -------------------------------------------- | -------------------------------------- |
| General chat (default) | `zai-org-glm-4.7`                             | Venice live default trait              |
| Best overall quality   | `claude-opus-5`                              | Current promoted anonymized Opus model |
| Privacy + coding       | `qwen3-coder-480b-a35b-instruct-turbo`       | Private coding model with large context |
| Fast + cheap           | `google-gemma-4-31b-it`                      | Low-cost promoted private vision model |
| Complex private tasks  | `deepseek-v3.2`                              | Promoted private reasoning model       |
| Uncensored             | `venice-uncensored-1-2`                      | Current uncensored Venice model        |
</Tip>

## Built-in catalog (16 visible models)

<AccordionGroup>
  <Accordion title="Private models (10) — fully private, no logging">
    | Model ID                               | Name                        | Context | Notes                       |
    | -------------------------------------- | --------------------------- | ------- | --------------------------- |
    | `zai-org-glm-5-2`                      | GLM 5.2                     | 1M      | Recommended, coding         |
    | `zai-org-glm-4.7`                      | GLM 4.7                     | 198k    | Private reasoning           |
    | `venice-uncensored-1-2`                | Venice Uncensored 1.2       | 128k    | Most uncensored, vision     |
    | `google-gemma-4-31b-it`                | Google Gemma 4 31B Instruct | 256k    | Recommended, vision         |
    | `kimi-k2-6`                            | Kimi K2.6                   | 256k    | Recommended, coding, vision |
    | `deepseek-v3.2`                        | DeepSeek V3.2               | 160k    | Recommended, reasoning      |
    | `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking         | 128k    | Default reasoning           |
    | `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo      | 256k    | Default coding              |
    | `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B               | 128k    | Default vision              |
    | `grok-4-5`                             | Grok 4.5                    | 500k    | Recommended, coding, vision |
  </Accordion>

  <Accordion title="Anonymized models (6) — via Venice proxy">
    | Model ID            | Name                             | Context | Notes                       |
    | ------------------- | -------------------------------- | ------- | --------------------------- |
    | `qwen-3-7-max`      | Qwen 3.7 Max (via Venice)        | 1M      | Recommended, coding, vision |
    | `qwen-3-7-plus`     | Qwen 3.7 Plus (via Venice)       | 1M      | Recommended, coding, vision |
    | `claude-fable-5`    | Claude Fable 5 (via Venice)      | 1M      | Recommended, coding, vision |
    | `claude-opus-5`     | Claude Opus 5 (via Venice)       | 1M      | Recommended, coding, vision |
    | `claude-sonnet-4-6` | Claude Sonnet 4.6 (via Venice)   | 1M      | Recommended, coding, vision |
    | `openai-gpt-56-sol` | GPT-5.6 Sol (via Venice)         | 1M      | Recommended, vision         |
  </Accordion>

  <Accordion title="Deprecated compatibility rows (3) — hidden from pickers">
    | Model ID                | Replacement                 |
    | ----------------------- | --------------------------- |
    | `zai-org-glm-4.6`       | `zai-org-glm-4.7`           |
    | `google-gemma-3-27b-it` | `google-gemma-4-31b-it`     |
    | `kimi-k2-5`             | `kimi-k2-6`                 |
  </Accordion>
</AccordionGroup>

Grok-backed Venice models (`grok-4-3` and similar) get the same tool-schema
compat patch as the native xAI provider, since they share the same upstream
tool-call format.

## 模型发现

上面的内置目录是一个由清单支持的种子列表。在运行时，OpenClaw 会从 Venice 的 `/models` API 刷新它，并在 API 无法访问时回退到种子列表。`/models` 端点是公开的（列出时不需要认证），但推理需要有效的 API 密钥。

Venice may continue accepting retired model IDs as provider-owned aliases. The
OpenClaw catalog advertises only the canonical model IDs returned by `/models`.

## DeepSeek V4 replay behavior

如果 Venice 暴露了 DeepSeek V4 模型，例如 `deepseek-v4-pro` 或
`deepseek-v4-flash`，当 Venice 省略时，OpenClaw 会在助手消息上填充所需的 `reasoning_content` 回放
字段，并从请求负载中移除 `thinking`/
`reasoning`/`reasoning_effort`（Venice 会拒绝
这些模型上 DeepSeek 原生的 `thinking` 控制）。此回放修复
与原生 DeepSeek 提供方自身的 thinking 控制是分开的。

## 流式传输与工具支持

| Feature          | Support                                                |
| ---------------- | ------------------------------------------------------ |
| Streaming        | All models                                             |
| Function calling | All visible seed models; live rows follow API metadata |
| Vision/Images    | Models marked "Vision" above                           |
| JSON mode        | Via `response_format`                                  |

## 定价

Venice 使用基于积分的系统。匿名化模型的成本大致与直接 API 定价相同，外加少量 Venice 费用。当前费率请参见
[venice.ai/pricing](https://venice.ai/pricing)。

## 使用示例

```bash
# Default private model
openclaw agent --model venice/zai-org-glm-4.7 --message "Quick health check"

# Claude Opus via Venice (anonymized)
openclaw agent --model venice/claude-opus-5 --message "Summarize this task"

# Uncensored model
openclaw agent --model venice/venice-uncensored-1-2 --message "Draft options"

# 带图片的视觉模型
openclaw agent --model venice/qwen3-vl-235b-a22b --message "Review attached image"

# Coding model
openclaw agent --model venice/qwen3-coder-480b-a35b-instruct-turbo --message "Refactor this function"
```

## 故障排查

<AccordionGroup>
  <Accordion title="API 密钥未识别">
    ```bash
    echo $VENICE_API_KEY
    openclaw models list | grep venice
    ```

    确认密钥以 `vapi_` 开头。

  </Accordion>

  <Accordion title="模型不可用">
    运行 `openclaw models list --all --provider venice` 查看当前
    可用的模型；随着 Venice 新增或下线模型，目录会发生变化。
  </Accordion>

  <Accordion title="连接问题">
    Venice API 位于 `https://api.venice.ai/api/v1`。请确认你的网络允许通过 HTTPS 连接到该主机。
  </Accordion>
</AccordionGroup>

<Note>
更多帮助：[故障排查](/help/troubleshooting) 和 [常见问题](/help/faq)。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="配置文件示例">
    ```json5
    {
      env: { VENICE_API_KEY: "vapi_..." },
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
                cost: { input: 0.55, output: 2.65, cacheRead: 0.11, cacheWrite: 0 },
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

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障切换行为。
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
