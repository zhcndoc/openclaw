---
summary: "配置 Moonshot K2 与 Kimi Coding（分离的提供方 + 密钥）"
read_when:
  - 你想了解 Moonshot K2（Moonshot Open Platform）与 Kimi Coding 的设置
  - 你需要理解独立的端点、密钥和模型引用
  - 你想要可直接复制粘贴的任一提供方配置
title: "Moonshot AI"
---

Moonshot 提供了与 OpenAI 兼容端点的 Kimi API。配置
提供方并将默认模型设置为 `moonshot/kimi-k2.6`，或者使用
`kimi/kimi-code` 的 Kimi Coding。

<Warning>
Moonshot 和 Kimi Coding 是**不同的提供方**。密钥不能互换，端点不同，模型引用也不同（`moonshot/...` vs `kimi/...`）。
</Warning>

## 内置模型目录

[//]: # "moonshot-kimi-k2-ids:start"

| 模型引用                          | 名称                     | 推理 | 输入        | 上下文 | 最大输出 |
| --------------------------------- | ------------------------ | ---- | ----------- | ------ | -------- |
| `moonshot/kimi-k2.6`              | Kimi K2.6                | 否   | text, image | 262,144 | 262,144    |
| `moonshot/kimi-k2.5`              | Kimi K2.5                | 否   | text, image | 262,144 | 262,144    |
| `moonshot/kimi-k2-thinking`       | Kimi K2 Thinking         | 是   | text        | 262,144 | 262,144    |
| `moonshot/kimi-k2-thinking-turbo` | Kimi K2 Thinking Turbo   | 是   | text        | 262,144 | 262,144    |
| `moonshot/kimi-k2-turbo`          | Kimi K2 Turbo            | 否   | text        | 256,000 | 16,384     |

[//]: # "moonshot-kimi-k2-ids:end"

当前 Moonshot 托管的 K2 模型的打包成本估算使用 Moonshot
公布的按量付费费率：Kimi K2.6 为 $0.16/MTok cache hit，
$0.95/MTok input，和 $4.00/MTok output；Kimi K2.5 为 $0.10/MTok cache hit，
$0.60/MTok input，和 $3.00/MTok output。其他旧目录条目仍保持
零成本占位符，除非你在配置中覆盖它们。

## 开始使用

选择你的提供方并按照设置步骤操作。

<Tabs>
  <Tab title="Moonshot API">
    **最适合：** 通过 Moonshot Open Platform 使用 Kimi K2 模型。

    <Steps>
      <Step title="选择你的端点区域">
        | 认证选择               | 端点                         | 区域          |
        | ---------------------- | ---------------------------- | ------------- |
        | `moonshot-api-key`     | `https://api.moonshot.ai/v1` | 国际          |
        | `moonshot-api-key-cn`  | `https://api.moonshot.cn/v1` | 中国          |
      </Step>
      <Step title="运行初始化">
        ```bash
        openclaw onboard --auth-choice moonshot-api-key
        ```

        或者对于中国端点：

        ```bash
        openclaw onboard --auth-choice moonshot-api-key-cn
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "moonshot/kimi-k2.6" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider moonshot
        ```
      </Step>
      <Step title="运行一次实时冒烟测试">
        当你想在不影响正常会话的情况下验证模型访问和成本
        跟踪时，请使用隔离的状态目录：

        ```bash
        OPENCLAW_CONFIG_PATH=/tmp/openclaw-kimi/openclaw.json \
        OPENCLAW_STATE_DIR=/tmp/openclaw-kimi \
        openclaw agent --local \
          --session-id live-kimi-cost \
          --message '精确回复：KIMI_LIVE_OK' \
          --thinking off \
          --json
        ```

        JSON 响应应报告 `provider: "moonshot"` 和
        `model: "kimi-k2.6"`。助手的转录条目会在 Moonshot 返回
        usage 元数据时，将归一化后的 token 使用量以及估算成本存储在
        `usage.cost` 下。
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k2.6" },
          models: {
            // moonshot-kimi-k2-aliases:start
            "moonshot/kimi-k2.6": { alias: "Kimi K2.6" },
            "moonshot/kimi-k2.5": { alias: "Kimi K2.5" },
            "moonshot/kimi-k2-thinking": { alias: "Kimi K2 Thinking" },
            "moonshot/kimi-k2-thinking-turbo": { alias: "Kimi K2 Thinking Turbo" },
            "moonshot/kimi-k2-turbo": { alias: "Kimi K2 Turbo" },
            // moonshot-kimi-k2-aliases:end
          },
        },
      },
      models: {
        mode: "merge",
        providers: {
          moonshot: {
            baseUrl: "https://api.moonshot.ai/v1",
            apiKey: "${MOONSHOT_API_KEY}",
            api: "openai-completions",
            models: [
              // moonshot-kimi-k2-models:start
              {
                id: "kimi-k2.6",
                name: "Kimi K2.6",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.16, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2.5",
                name: "Kimi K2.5",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0.6, output: 3, cacheRead: 0.1, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-thinking",
                name: "Kimi K2 Thinking",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-thinking-turbo",
                name: "Kimi K2 Thinking Turbo",
                reasoning: true,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2-turbo",
                name: "Kimi K2 Turbo",
                reasoning: false,
                input: ["text"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 256000,
                maxTokens: 16384,
              },
              // moonshot-kimi-k2-models:end
            ],
          },
        },
      },
    }
    ```

  </Tab>

  <Tab title="Kimi Coding">
    **最适合：** 通过 Kimi Coding 端点处理代码相关任务。

    <Note>
    Kimi Coding 使用不同的 API 密钥和提供方前缀（`kimi/...`），不同于 Moonshot（`moonshot/...`）。旧模型引用 `kimi/k2p5` 仍被接受为兼容 id。
    </Note>

    <Steps>
      <Step title="运行初始化">
        ```bash
        openclaw onboard --auth-choice kimi-code-api-key
        ```
      </Step>
      <Step title="设置默认模型">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "kimi/kimi-code" },
            },
          },
        }
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider kimi
        ```
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { KIMI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "kimi/kimi-code" },
          models: {
            "kimi/kimi-code": { alias: "Kimi" },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

## Kimi 网页搜索

OpenClaw 还提供了作为 `web_search` 提供方的 **Kimi**，由 Moonshot 网页
搜索支持。

<Steps>
  <Step title="运行交互式网页搜索设置">
    ```bash
    openclaw configure --section web
    ```

    在网页搜索部分选择 **Kimi**，以保存
    `plugins.entries.moonshot.config.webSearch.*`。

  </Step>
  <Step title="配置网页搜索区域和模型">
    交互式设置会提示：

    | 设置                | 选项                                                                 |
    | ------------------- | -------------------------------------------------------------------- |
    | API 区域            | `https://api.moonshot.ai/v1`（国际）或 `https://api.moonshot.cn/v1`（中国） |
    | 网页搜索模型        | 默认值为 `kimi-k2.6`                                                |

  </Step>
</Steps>

配置位于 `plugins.entries.moonshot.config.webSearch` 下：

```json5
{
  plugins: {
    entries: {
      moonshot: {
        config: {
          webSearch: {
            apiKey: "sk-...", // 或使用 KIMI_API_KEY / MOONSHOT_API_KEY
            baseUrl: "https://api.moonshot.ai/v1",
            model: "kimi-k2.6",
          },
        },
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "kimi",
      },
    },
  },
}
```

## 高级配置

<AccordionGroup>
  <Accordion title="原生思考模式">
    Moonshot Kimi 支持二进制原生思考：

    - `thinking: { type: "enabled" }`
    - `thinking: { type: "disabled" }`

    通过 `agents.defaults.models.<provider/model>.params` 按模型配置：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.6": {
              params: {
                thinking: { type: "disabled" },
              },
            },
          },
        },
      },
    }
    ```

    OpenClaw 还会将运行时的 `/think` 级别映射为 Moonshot 的行为：

    | `/think` 级别        | Moonshot 行为             |
    | -------------------- | -------------------------- |
    | `/think off`         | `thinking.type=disabled`   |
    | 任何非 off 级别      | `thinking.type=enabled`    |

    <Warning>
    当启用 Moonshot thinking 时，`tool_choice` 必须是 `auto` 或 `none`。为了兼容性，OpenClaw 会将不兼容的 `tool_choice` 值规范化为 `auto`。
    </Warning>

    Kimi K2.6 还接受可选的 `thinking.keep` 字段，用于控制
    `reasoning_content` 的多轮保留。将其设置为 `"all"` 可在多轮对话中保留完整
    推理；省略它（或将其保留为 `null`）则使用服务器
    默认策略。OpenClaw 只会为
    `moonshot/kimi-k2.6` 转发 `thinking.keep`，并会从其他模型中移除它。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "moonshot/kimi-k2.6": {
              params: {
                thinking: { type: "enabled", keep: "all" },
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="工具调用 id 清理">
    Moonshot Kimi 返回的 tool_call id 形如 `functions.<name>:<index>`。OpenClaw 会原样保留它们，以便多轮工具调用持续工作。

    若要在自定义的 OpenAI 兼容提供方上强制严格清理，请设置 `sanitizeToolCallIds: true`：

    ```json5
    {
      models: {
        providers: {
          "my-kimi-proxy": {
            api: "openai-completions",
            sanitizeToolCallIds: true,
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="流式 usage 兼容性">
    原生 Moonshot 端点（`https://api.moonshot.ai/v1` 和
    `https://api.moonshot.cn/v1`）在共享的 `openai-completions` 传输上声明了流式 usage 兼容性。OpenClaw 根据端点
    能力进行判断，因此指向相同原生 Moonshot 主机的兼容自定义提供方 id
    会继承相同的流式 usage 行为。

    使用内置的 K2.6 定价时，包含输入、输出和
    cache-read token 的流式 usage 也会被转换为本地估算的 USD 成本，用于
    `/status`、`/usage full`、`/usage cost` 以及基于转录的会话
    计费。

  </Accordion>

  <Accordion title="端点和模型引用参考">
    | 提供方     | 模型引用前缀     | 端点                         | 认证环境变量        |
    | ---------- | ---------------- | ---------------------------- | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi Coding| `kimi/`          | Kimi Coding 端点             | `KIMI_API_KEY`      |
    | 网页搜索   | N/A              | 与 Moonshot API 区域相同      | `KIMI_API_KEY` 或 `MOONSHOT_API_KEY` |

    - Kimi 网页搜索使用 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`，并默认使用 `https://api.moonshot.ai/v1` 和模型 `kimi-k2.6`。
    - 如有需要，可在 `models.providers` 中覆盖定价和上下文元数据。
    - 如果 Moonshot 为某个模型发布了不同的上下文限制，请相应调整 `contextWindow`。

  </Accordion>
</AccordionGroup>

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供商、模型引用和故障转移行为。
  </Card>
  <Card title="网页搜索" href="/tools/web" icon="magnifying-glass">
    配置包括 Kimi 在内的网页搜索提供商。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    提供商、模型和插件的完整配置 schema。
  </Card>
  <Card title="Moonshot 开放平台" href="https://platform.moonshot.ai" icon="globe">
    Moonshot API 密钥管理和文档。
  </Card>
</CardGroup>
