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

| 模式             | 行为                                                               | 模型                                                          |
| ---------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| **私有**         | 提示词/响应绝不会被存储或记录。临时性的。                            | Llama、Qwen、DeepSeek、Kimi、MiniMax、Venice Uncensored 等。 |
| **匿名化**       | 通过 Venice 代理，在转发前移除元数据。                               | Claude、GPT、Gemini、Grok                                      |

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
    openclaw agent --model venice/kimi-k2-5 --message "你好，你在工作吗？"
    ```
  </Step>
</Steps>

## 模型选择

- **默认**: `venice/kimi-k2-5`（私有、推理、视觉）。
- **最强匿名选项**: `venice/claude-opus-4-6`。

```bash
openclaw models set venice/kimi-k2-5
openclaw models list --all --provider venice
```

你也可以运行 `openclaw configure`，然后选择 **Model/auth provider > Venice AI**。

<Tip>
| 用例                     | 模型                               | 原因                                       |
| ------------------------ | ---------------------------------- | ------------------------------------------ |
| 通用聊天（默认）         | `kimi-k2-5`                        | 强大的私有推理能力，并支持视觉             |
| 最佳整体质量             | `claude-opus-4-6`                  | Venice 可用的最强匿名选项                  |
| 隐私 + 编码              | `qwen3-coder-480b-a35b-instruct`   | 具有大上下文的私有编码模型                 |
| 快速 + 便宜              | `qwen3-4b`                         | 轻量级推理模型                             |
| 复杂私有任务             | `deepseek-v3.2`                    | 强推理；禁用工具调用                       |
| 不受审查                 | `venice-uncensored`                | 无内容限制                                 |
</Tip>

## 内置目录（38 个模型）

<AccordionGroup>
  <Accordion title="私有模型（26）— 完全私有，无日志">
    | 模型 ID                               | 名称                                 | 上下文 | 备注                        |
    | -------------------------------------- | ------------------------------------- | ------ | --------------------------- |
    | `kimi-k2-5`                            | Kimi K2.5                             | 256k   | 默认、推理、视觉             |
    | `kimi-k2-thinking`                     | Kimi K2 Thinking                      | 256k   | 推理                        |
    | `llama-3.3-70b`                        | Llama 3.3 70B                         | 128k   | 通用                        |
    | `llama-3.2-3b`                         | Llama 3.2 3B                          | 128k   | 通用                        |
    | `hermes-3-llama-3.1-405b`              | Hermes 3 Llama 3.1 405B               | 128k   | 通用，工具已禁用             |
    | `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking                   | 128k   | 推理                        |
    | `qwen3-235b-a22b-instruct-2507`        | Qwen3 235B Instruct                   | 128k   | 通用                        |
    | `qwen3-coder-480b-a35b-instruct`       | Qwen3 Coder 480B                      | 256k   | 编码                        |
    | `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo                | 256k   | 编码                        |
    | `qwen3-5-35b-a3b`                      | Qwen3.5 35B A3B                       | 256k   | 推理、视觉                  |
    | `qwen3-next-80b`                       | Qwen3 Next 80B                        | 256k   | 通用                        |
    | `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B（视觉）                | 256k   | 视觉                        |
    | `qwen3-4b`                             | Venice Small（Qwen3 4B）               | 32k    | 快速、推理                   |
    | `deepseek-v3.2`                        | DeepSeek V3.2                         | 160k   | 推理、工具已禁用             |
    | `venice-uncensored`                    | Venice Uncensored（Dolphin-Mistral）   | 32k    | 无审查、工具已禁用           |
    | `mistral-31-24b`                       | Venice Medium（Mistral）               | 128k   | 视觉                        |
    | `google-gemma-3-27b-it`                | Google Gemma 3 27B Instruct           | 198k   | 视觉                        |
    | `openai-gpt-oss-120b`                  | OpenAI GPT OSS 120B                   | 128k   | 通用                        |
    | `nvidia-nemotron-3-nano-30b-a3b`       | NVIDIA Nemotron 3 Nano 30B            | 128k   | 通用                        |
    | `olafangensan-glm-4.7-flash-heretic`   | GLM 4.7 Flash Heretic                 | 128k   | 推理                        |
    | `zai-org-glm-4.6`                      | GLM 4.6                               | 198k   | 通用                        |
    | `zai-org-glm-4.7`                      | GLM 4.7                               | 198k   | 推理                        |
    | `zai-org-glm-4.7-flash`                | GLM 4.7 Flash                         | 128k   | 推理                        |
    | `zai-org-glm-5`                        | GLM 5                                 | 198k   | 推理                        |
    | `minimax-m21`                          | MiniMax M2.1                          | 198k   | 推理                        |
    | `minimax-m25`                          | MiniMax M2.5                          | 198k   | 推理                        |
  </Accordion>

  <Accordion title="匿名模型（12）— 通过 Venice 代理">
    | 模型 ID                        | 名称                           | 上下文 | 备注                        |
    | -------------------------------- | -------------------------------- | ------ | ---------------------------- |
    | `claude-opus-4-6`               | Claude Opus 4.6（通过 Venice）    | 1M     | 推理、视觉                   |
    | `claude-sonnet-4-6`             | Claude Sonnet 4.6（通过 Venice）  | 1M     | 推理、视觉                   |
    | `openai-gpt-54`                 | GPT-5.4（通过 Venice）            | 1M     | 推理、视觉                   |
    | `openai-gpt-53-codex`           | GPT-5.3 Codex（通过 Venice）      | 400k   | 推理、视觉、编码             |
    | `openai-gpt-52`                 | GPT-5.2（通过 Venice）            | 256k   | 推理                        |
    | `openai-gpt-52-codex`           | GPT-5.2 Codex（通过 Venice）      | 256k   | 推理、视觉、编码             |
    | `openai-gpt-4o-2024-11-20`      | GPT-4o（通过 Venice）             | 128k   | 视觉                        |
    | `openai-gpt-4o-mini-2024-07-18` | GPT-4o Mini（通过 Venice）        | 128k   | 视觉                        |
    | `gemini-3-1-pro-preview`        | Gemini 3.1 Pro（通过 Venice）     | 1M     | 推理、视觉                   |
    | `gemini-3-pro-preview`          | Gemini 3 Pro（通过 Venice）       | 198k   | 推理、视觉                   |
    | `gemini-3-flash-preview`        | Gemini 3 Flash（通过 Venice）     | 256k   | 推理、视觉                   |
    | `grok-41-fast`                  | Grok 4.1 Fast（通过 Venice）      | 1M     | 推理、视觉                   |
  </Accordion>
</AccordionGroup>

Grok 支持的 Venice 模型（`grok-41-fast` 及类似模型）会获得与原生 xAI 提供方相同的工具 schema
兼容补丁，因为它们共享相同的上游
工具调用格式。

## 模型发现

上面的内置目录是一个由清单支持的种子列表。在运行时，OpenClaw 会从 Venice 的 `/models` API 刷新它，并在 API 无法访问时回退到种子列表。`/models` 端点是公开的（列出时不需要认证），但推理需要有效的 API 密钥。

## DeepSeek V4 回放行为

如果 Venice 暴露了 DeepSeek V4 模型，例如 `deepseek-v4-pro` 或
`deepseek-v4-flash`，当 Venice 省略时，OpenClaw 会在助手消息上填充所需的 `reasoning_content` 回放
字段，并从请求负载中移除 `thinking`/
`reasoning`/`reasoning_effort`（Venice 会拒绝
这些模型上 DeepSeek 原生的 `thinking` 控制）。此回放修复
与原生 DeepSeek 提供方自身的 thinking 控制是分开的。

## 流式传输与工具支持

| 功能             | 支持                                              |
| ---------------- | ------------------------------------------------- |
| 流式传输         | 所有模型                                          |
| 函数调用         | 大多数模型；如上所述，在部分模型中已禁用         |
| 视觉/图像        | 上方标注为“Vision”的模型                          |
| JSON 模式        | 通过 `response_format`                             |

## 定价

Venice 使用基于积分的系统。匿名化模型的成本大致与直接 API 定价相同，外加少量 Venice 费用。当前费率请参见
[venice.ai/pricing](https://venice.ai/pricing)。

## 使用示例

```bash
# 默认私有模型
openclaw agent --model venice/kimi-k2-5 --message "Quick health check"

# 通过 Venice 使用 Claude Opus（匿名化）
openclaw agent --model venice/claude-opus-4-6 --message "Summarize this task"

# 无审查模型
openclaw agent --model venice/venice-uncensored --message "Draft options"

# 带图片的视觉模型
openclaw agent --model venice/qwen3-vl-235b-a22b --message "Review attached image"

# 编码模型
openclaw agent --model venice/qwen3-coder-480b-a35b-instruct --message "Refactor this function"
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
      agents: { defaults: { model: { primary: "venice/kimi-k2-5" } } },
      models: {
        mode: "merge",
        providers: {
          venice: {
            baseUrl: "https://api.venice.ai/api/v1",
            apiKey: "${VENICE_API_KEY}",
            api: "openai-completions",
            models: [
              {
                id: "kimi-k2-5",
                name: "Kimi K2.5",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 256000,
                maxTokens: 65536,
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
