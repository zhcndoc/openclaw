---
summary: "配置 Moonshot K2 与 Kimi Coding（分离的提供方 + 密钥）"
read_when:
  - 你想了解 Moonshot K2（Moonshot Open Platform）与 Kimi Coding 的设置
  - 你需要理解独立的端点、密钥和模型引用
  - 你想要可直接复制粘贴的任一提供方配置
title: "Moonshot AI"
---

Moonshot 提供与 OpenAI 兼容端点的 Kimi API。配置该
提供方并将默认模型设置为 `moonshot/kimi-k2.6`，或者使用
`kimi/kimi-for-coding` 的 Kimi Coding。

<Warning>
Moonshot 和 Kimi Coding 是**不同的提供方**。密钥不能互换，端点不同，模型引用也不同（`moonshot/...` vs `kimi/...`）。
</Warning>

## 内置模型目录

[//]: # "moonshot-kimi-k2-ids:start"

| Model ref                         | 名称                   | 推理 | 输入        | 上下文   | 最大输出   |
| --------------------------------- | ---------------------- | ---- | ----------- | -------- | ---------- |
| `moonshot/kimi-k2.6`              | Kimi K2.6              | 否   | text, image | 262,144  | 262,144    |
| `moonshot/kimi-k2.7-code`         | Kimi K2.7 Code         | 始终开启 | text, image | 262,144 | 262,144    |
| `moonshot/kimi-k2.5`              | Kimi K2.5              | 否   | text, image | 262,144  | 262,144    |
| `moonshot/kimi-k2-thinking`       | Kimi K2 Thinking       | 是   | text        | 262,144  | 262,144    |
| `moonshot/kimi-k2-thinking-turbo` | Kimi K2 Thinking Turbo | 是   | text        | 262,144  | 262,144    |
| `moonshot/kimi-k2-turbo`          | Kimi K2 Turbo          | 否   | text        | 256,000  | 16,384     |

[//]: # "moonshot-kimi-k2-ids:end"

当前 Moonshot 托管的 K2 模型目录成本估算使用 Moonshot 公布的按量付费费率：Kimi K2.7 Code 为 $0.19/MTok 缓存命中、$0.95/MTok 输入、$4.00/MTok 输出；Kimi K2.6 为 $0.16/MTok 缓存命中、$0.95/MTok 输入、$4.00/MTok 输出；Kimi K2.5 为 $0.10/MTok 缓存命中、$0.60/MTok 输入、$3.00/MTok 输出。其他旧版目录条目保持零成本占位符，除非你在配置中覆盖它们。

Kimi K2.7 Code 始终使用原生思考。OpenClaw 对该模型仅暴露 `on` 思考状态，并省略外发的 `thinking` 和 `reasoning_effort` 控制，这是 Moonshot 的要求。OpenClaw 也省略了 K2.7 固定为提供方默认值的采样覆盖项。Kimi K2.6 仍是入门默认值。

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
            "moonshot/kimi-k2.7-code": { alias: "Kimi K2.7 Code" },
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
                id: "kimi-k2.7-code",
                name: "Kimi K2.7 Code",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.95, output: 4, cacheRead: 0.19, cacheWrite: 0 },
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
    安装官方插件，然后重启 Gateway：

    ```bash
    openclaw plugins install @openclaw/kimi-provider
    openclaw gateway restart
    ```
    **最适合：** 通过 Kimi Coding 端点处理面向代码的任务。

    <Note>
    Kimi Coding 使用与 Moonshot（`moonshot/...`）不同的 API 密钥和提供方前缀（`kimi/...`）。稳定的 API 模型引用是 `kimi/kimi-for-coding`；旧版引用 `kimi/kimi-code` 和 `kimi/k2p5` 仍然被接受，并会规范化为该 API 模型 id。
    </Note>

    <Steps>
      <Step title="安装插件">
        ```bash
        openclaw plugins install @openclaw/kimi-provider
        ```
      </Step>
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
              model: { primary: "kimi/kimi-for-coding" },
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
          model: { primary: "kimi/kimi-for-coding" },
          models: {
            "kimi/kimi-for-coding": { alias: "Kimi" },
          },
        },
      },
    }
    ```

  </Tab>
</Tabs>

## Kimi 网页搜索

Moonshot 插件还会将 **Kimi** 注册为 `web_search` 提供方，由 Moonshot 网页搜索提供支持。

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
    Kimi K2.7 Code 始终使用原生思考。Moonshot 要求客户端为该模型
    省略 `thinking` 字段，因此 OpenClaw 只暴露 `on`，并忽略过时的
    `off` 设置。K2.7 还固定了 `temperature`、`top_p`、`n`、
    `presence_penalty` 和 `frequency_penalty`；OpenClaw 会忽略这些字段
    的已配置覆盖项。

    其他 Moonshot Kimi 模型支持二进制原生思考：

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

    OpenClaw 会将这些模型的运行时 `/think` 级别映射如下：

    | `/think` 级别        | Moonshot 行为             |
    | -------------------- | -------------------------- |
    | `/think off`         | `thinking.type=disabled`   |
    | 任何非 off 级别      | `thinking.type=enabled`    |

    <Warning>
    当启用 Moonshot 思考时，`tool_choice` 必须是 `auto` 或 `none`。OpenClaw 会将不兼容的值规范化为 `auto`。这包括 Kimi K2.7 Code，因为为了保留固定的工具选择，它的思考模式不能被禁用。
    </Warning>

    Kimi K2.6 还接受一个可选的 `thinking.keep` 字段，用于控制
    `reasoning_content` 的多轮保留。将其设为 `"all"` 可在轮次之间保留
    完整推理；省略它（或将其设为 `null`）则使用服务器默认策略。
    OpenClaw 只会将 `thinking.keep` 转发给
    `moonshot/kimi-k2.6`，并从其他模型中移除它。Kimi K2.7 Code
    默认保留完整推理历史，而 OpenClaw 会省略整个
    `thinking` 字段。

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
    Moonshot Kimi 提供原生的 tool_call id，格式为 `functions.<name>:<index>`。对于 OpenAI-completions 传输，OpenClaw 会保留每个原生 Kimi id 的首次出现，并将后续重复项重写为确定性的 OpenAI 风格 `call_*` id。匹配的工具结果也会使用相同的 id 重新映射，因此回放保持唯一性，而不会删除 Kimi 的第一个原生 id。

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

    使用目录中 K2.6 的定价，包含输入、输出和缓存读取 token 的流式 usage
    也会转换为本地估算美元成本，用于 `/status`、`/usage full`、`/usage cost`
    以及基于转录的会话记账。

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
