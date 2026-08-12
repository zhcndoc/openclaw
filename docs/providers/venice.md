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

| 模式           | 行为                                                         | 模型                                                          |
| -------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| **私有**    | 提示词和响应从不存储或记录。临时性的。         | GLM、Gemma、Grok、Qwen、DeepSeek、Kimi、Venice Uncensored 等。 |
| **匿名化** | 通过 Venice 代理，并在转发前剥离元数据。 | Claude、GPT 和精选的 Qwen 模型                           |

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
        openclaw onboard --non-interactive --accept-risk --skip-health \
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

- **默认**：`venice/zai-org-glm-4.7`（私有推理）。
- **最强的匿名化选项**：`venice/claude-opus-5`。

```bash
openclaw models set venice/zai-org-glm-4.7
openclaw models list --all --provider venice
```

你也可以运行 `openclaw configure`，然后选择 **模型／身份验证提供商 > Venice AI**。

<Tip>
| 使用场景              | 模型                                        | 原因                                    |
| --------------------- | -------------------------------------------- | --------------------------------------- |
| 通用聊天（默认）      | `zai-org-glm-4.7`                             | Venice 当前的默认特性                  |
| 综合质量最佳          | `claude-opus-5`                              | 当前推荐的匿名化 Opus 模型             |
| 隐私保护＋编码        | `qwen3-coder-480b-a35b-instruct-turbo`       | 具有大上下文的私有编码模型             |
| 快速且经济            | `google-gemma-4-31b-it`                      | 低成本的推荐私有视觉模型               |
| 复杂私有任务          | `deepseek-v3.2`                              | 推荐的私有推理模型                     |
| 不受审查              | `venice-uncensored-1-2`                      | Venice 当前的不受审查模型              |
</Tip>

## 内置目录（16 个可见模型）

<AccordionGroup>
  <Accordion title="私有模型（10 个）——完全私有，不记录日志">
    | Model ID                               | Name                        | Context | Notes                       |
    | -------------------------------------- | --------------------------- | ------- | --------------------------- |
    | `zai-org-glm-5-2`                      | GLM 5.2                     | 1M      | 推荐，编码         |
    | `zai-org-glm-4.7`                      | GLM 4.7                     | 198k    | 私有推理           |
    | `venice-uncensored-1-2`                | Venice Uncensored 1.2       | 128k    | 审查限制最少，视觉     |
    | `google-gemma-4-31b-it`                | Google Gemma 4 31B Instruct | 256k    | 推荐，视觉         |
    | `kimi-k2-6`                            | Kimi K2.6                   | 256k    | 推荐，编码，视觉 |
    | `deepseek-v3.2`                        | DeepSeek V3.2               | 160k    | 推荐，推理      |
    | `qwen3-235b-a22b-thinking-2507`        | Qwen3 235B Thinking         | 128k    | 默认推理           |
    | `qwen3-coder-480b-a35b-instruct-turbo` | Qwen3 Coder 480B Turbo      | 256k    | 默认编码              |
    | `qwen3-vl-235b-a22b`                   | Qwen3 VL 235B               | 128k    | 默认视觉              |
    | `grok-4-5`                             | Grok 4.5                    | 500k    | 推荐，编码，视觉 |
  </Accordion>

  <Accordion title="匿名化模型（6 个）——通过 Venice 代理">
    | Model ID            | Name                             | Context | Notes                       |
    | ------------------- | -------------------------------- | ------- | --------------------------- |
    | `qwen-3-7-max`      | Qwen 3.7 Max (via Venice)        | 1M      | 推荐，编码，视觉 |
    | `qwen-3-7-plus`     | Qwen 3.7 Plus (via Venice)       | 1M      | 推荐，编码，视觉 |
    | `claude-fable-5`    | Claude Fable 5 (via Venice)      | 1M      | 推荐，编码，视觉 |
    | `claude-opus-5`     | Claude Opus 5 (via Venice)       | 1M      | 推荐，编码，视觉 |
    | `claude-sonnet-4-6` | Claude Sonnet 4.6 (via Venice)   | 1M      | 推荐，编码，视觉 |
    | `openai-gpt-56-sol` | GPT-5.6 Sol (via Venice)         | 1M      | 推荐，视觉         |
  </Accordion>

  <Accordion title="已弃用的兼容性行（3 个）——从选择器中隐藏">
    | Model ID                | Replacement                 |
    | ----------------------- | --------------------------- |
    | `zai-org-glm-4.6`       | `zai-org-glm-4.7`           |
    | `google-gemma-3-27b-it` | `google-gemma-4-31b-it`     |
    | `kimi-k2-5`             | `kimi-k2-6`                 |
  </Accordion>
</AccordionGroup>

由 Grok 驱动的 Venice 模型（`grok-4-3` 及类似模型）会获得与原生 xAI 提供商相同的工具架构兼容补丁，因为它们共享相同的上游工具调用格式。

## 模型发现

上面的内置目录是一个由清单支持的种子列表。在运行时，OpenClaw 会从 Venice 的 `/models` API 刷新它，并在 API 无法访问时回退到种子列表。`/models` 端点是公开的（列出时不需要认证），但推理需要有效的 API 密钥。

Venice 可能会继续接受已退役的模型 ID 作为由提供商拥有的别名。OpenClaw 目录只公布 `/models` 返回的规范模型 ID。

## DeepSeek V4 回放行为

如果 Venice 暴露了 DeepSeek V4 模型，例如 `deepseek-v4-pro` 或
`deepseek-v4-flash`，当 Venice 省略时，OpenClaw 会在助手消息上填充所需的 `reasoning_content` 回放
字段，并从请求负载中移除 `thinking`/
`reasoning`/`reasoning_effort`（Venice 会拒绝
这些模型上 DeepSeek 原生的 `thinking` 控制）。此回放修复
与原生 DeepSeek 提供方自身的 thinking 控制是分开的。

## 流式传输与工具支持

| 功能             | 支持                                                   |
| ---------------- | ------------------------------------------------------ |
| 流式传输         | 所有模型                                             |
| 函数调用         | 所有可见的 seed 模型；实时行遵循 API 元数据          |
| 视觉／图像       | 上方标记为“Vision”的模型                             |
| JSON 模式        | 通过 response_format                                  |

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
