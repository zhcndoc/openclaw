---
summary: "配置 Moonshot Kimi 模型与 Kimi Coding（独立的提供方和密钥）"
read_when:
  - 你想要设置 Moonshot Kimi K3/K2（Moonshot Open Platform）或 Kimi Coding
  - 你需要了解独立的端点、密钥和模型引用
  - 你想要获取任一提供方的可复制粘贴配置
title: "Moonshot AI"
---

Moonshot 通过与 OpenAI 兼容的端点提供 Kimi API。全新的 Moonshot
引导流程会选择 `moonshot/kimi-k3`；对于独立的 Kimi Coding 提供方，请使用
`kimi/kimi-for-coding`。

<Warning>
Moonshot 和 Kimi Coding 是**独立的提供方**，并且各自作为单独的外部插件提供。密钥不能互换，端点也不同，模型引用也不同（`moonshot/...` vs `kimi/...`）。
</Warning>

## 内置模型目录

[//]: # "moonshot-kimi-k2-ids:start"

| 模型引用                           | 名称                     | 推理             | 输入              | 上下文    | 最大输出   |
| ----------------------------------- | ------------------------ | ---------------- | ------------------ | --------- | ---------- |
| `moonshot/kimi-k3`                  | Kimi K3                  | 低 / 高 / 最大    | 文本、图像、视频   | 1,048,576 | 1,048,576  |
| `moonshot/kimi-k2.7-code`           | Kimi K2.7 Code           | 始终开启         | 文本、图像、视频   | 262,144   | 262,144    |
| `moonshot/kimi-k2.7-code-highspeed` | Kimi K2.7 Code HighSpeed | 始终开启         | 文本、图像、视频   | 262,144   | 262,144    |

[//]: # "moonshot-kimi-k2-ids:end"

目录成本估算使用 Moonshot 发布的按需付费费率。在做出成本决策前，请查看 [Kimi K3](https://platform.kimi.ai/docs/pricing/chat-k3) 和 [Kimi K2.7 Code](https://platform.kimi.ai/docs/pricing/chat-k27-code) 的实时供应商页面。

Kimi K3 始终进行推理，并接受 `reasoning_effort` 值 `low`、`high` 和 `max`（默认值）。OpenClaw 暴露这些确切级别，并将 `/think xhigh` 映射为 `max`；它会省略 K2 专用的 `thinking` 字段，并移除采样覆盖项（`temperature`、`top_p`、`n`、`presence_penalty` 和 `frequency_penalty`），因为 K3 将这些参数固定为供应商默认值。Kimi K2.7 Code 同样始终使用原生思考，但要求省略 `thinking` 和 `reasoning_effort`；HighSpeed 变体使用相同的契约。Kimi K3 是引导流程中的默认模型。
请参阅 Moonshot 的 [Kimi K3 快速入门](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart)。

## 开始使用

Moonshot 和 Kimi Coding 都是外部插件 - 请先安装其中一个再进行
引导。

<Tabs>
  <Tab title="Moonshot API">
    **最适合：** 通过 Moonshot Open Platform 使用 Kimi K3 和 K2 模型。

    <Steps>
      <Step title="安装插件">
        ```bash
        openclaw plugins install @openclaw/moonshot-provider
        openclaw gateway restart
        ```
      </Step>
      <Step title="选择你的端点区域">
        | Auth choice            | Endpoint                       | Region        |
        | ---------------------- | ------------------------------ | ------------- |
        | `moonshot-api-key`     | `https://api.moonshot.ai/v1`   | 国际          |
        | `moonshot-api-key-cn`  | `https://api.moonshot.cn/v1`   | 中国          |
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
      <Step title="确认 Kimi K3 默认设置">
        全新引导会选择 Kimi K3。现有安装可以显式切换：

        ```bash
        openclaw models set moonshot/kimi-k3
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
          --message 'Reply exactly: KIMI_LIVE_OK' \
          --thinking max \
          --json
        ```

        JSON 响应应报告 `provider: "moonshot"` 和
        `model: "kimi-k3"`。当 Moonshot 返回使用量元数据时，助手会话记录条目会在
        `usage.cost` 下存储标准化的令牌使用量以及预估成本。
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { vars: { MOONSHOT_API_KEY: "sk-..." } },
      agents: {
        defaults: {
          model: { primary: "moonshot/kimi-k3" },
          models: {
            // moonshot-kimi-k2-aliases:start
            "moonshot/kimi-k3": { alias: "Kimi K3" },
            "moonshot/kimi-k2.7-code": { alias: "Kimi K2.7 Code" },
            "moonshot/kimi-k2.7-code-highspeed": { alias: "Kimi K2.7 Code HighSpeed" },
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
                id: "kimi-k3",
                name: "Kimi K3",
                reasoning: true,
                thinkingLevelMap: {
                  off: null,
                  minimal: null,
                  low: "low",
                  medium: null,
                  high: "high",
                  xhigh: "max",
                  max: "max",
                },
                input: ["text", "image", "video"],
                cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 0 },
                contextWindow: 1048576,
                maxTokens: 1048576,
              },
              {
                id: "kimi-k2.7-code",
                name: "Kimi K2.7 Code",
                reasoning: true,
                input: ["text", "image", "video"],
                cost: { input: 0.95, output: 4, cacheRead: 0.19, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
              },
              {
                id: "kimi-k2.7-code-highspeed",
                name: "Kimi K2.7 Code HighSpeed",
                reasoning: true,
                input: ["text", "image", "video"],
                cost: { input: 1.9, output: 8, cacheRead: 0.38, cacheWrite: 0 },
                contextWindow: 262144,
                maxTokens: 262144,
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
    **最适合：** 通过 Kimi Coding 端点进行以代码为中心的任务。

    <Note>
    Kimi Coding 使用与 Moonshot（`moonshot/...`）不同的 API 密钥和 provider 前缀（`kimi/...`）。当前引用为 `kimi/k3`（最多 1M 上下文，受层级限制）、`kimi/k3-256k`（256K 上下文，配额使用量较低）、`kimi/kimi-for-coding` 和 `kimi/kimi-for-coding-highspeed`。旧版引用 `kimi/kimi-code` 和 `kimi/k2p5` 会规范化为 `kimi/kimi-for-coding`；旧版 `kimi/k3[1m]` 会规范化为 `kimi/k3`。
    </Note>

    该编码服务同时接受兼容 OpenAI 的
    `https://api.kimi.com/coding/v1` 客户端和兼容 Anthropic 的
    `https://api.kimi.com/coding/` 客户端。此插件使用 Anthropic Messages。
    请在
    [Kimi Code Console](https://www.kimi.com/code/console) 中创建会员密钥；当前会员
    定价位于 [Kimi 的定价页面](https://www.kimi.com/membership/pricing)。

    | 模型引用 | 名称 | 推理 | 输入 | 上下文 | 最大输出 |
    | --- | --- | --- | --- | --- | --- |
    | `kimi/k3` | Kimi K3 | 自适应；低／高／最大努力程度 | 文本、图像 | 1,048,576 | 131,072 |
    | `kimi/k3-256k` | Kimi K3（256k） | 自适应；低／高／最大努力程度 | 文本、图像 | 262,144 | 131,072 |

    K3 目录预估输入价格为 3 美元／MTok，输出价格为 15 美元／MTok，
    缓存读取价格为 0.30 美元／MTok，缓存写入价格为 0 美元／MTok。该目录报告的是 K3 的最大
    上下文；你的 Kimi 会员资格可能会强制执行更低的实时限制。

    <Steps>
      <Step title="安装插件">
        ```bash
        openclaw plugins install @openclaw/kimi-provider
        openclaw gateway restart
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

    启用推理后，Kimi Code K3 始终使用自适应思考，默认努力程度为高。`/think minimal|low` 会映射为低努力程度，
    `/think medium|high|adaptive` 会映射为高努力程度，而 `/think xhigh|max`
    会映射为最大努力程度。`/think off` 会发送 `thinking.type: "disabled"`。

    当前方案可用性请参阅官方的 [Kimi Code 模型表](https://www.kimi.com/code/docs/en/kimi-code/models.html)。

    ### 配置示例

    ```json5
    {
      env: { vars: { KIMI_API_KEY: "sk-..." } },
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
    Moonshot API Kimi K3 始终以最大努力进行推理。OpenClaw 仅公开
    `/think max`，发送 `reasoning_effort: "max"`，并忽略过时的较低级别或
    `off` 设置。

    Kimi Code K3 公开 `/think off|minimal|low|medium|high|adaptive|xhigh|max`。
    其兼容 Anthropic 的端点会针对 off 接收 `thinking.type: "disabled"`。
    每个启用的级别都会使用自适应思考；minimal/low 映射到低努力程度，
    medium/high/adaptive 映射到高努力程度，而 xhigh/max 映射到最大努力程度。
    这同时适用于 `kimi/k3` 和 `kimi/k3-256k`。旧版 `kimi/k3[1m]`
    会规范化为 `kimi/k3`。
    Moonshot API K3 支持 `auto`、`none`、`required` 以及固定的工具选择，
    因此 OpenClaw 会保留请求的 `tool_choice`。对于多轮工具使用，
    OpenClaw 会保留 Moonshot 重放协议所需的 assistant 推理内容。

    Kimi K2.7 Code 始终使用原生思考。Moonshot 要求客户端对此模型省略
    `thinking` 字段，因此 OpenClaw 仅公开 `on`，并忽略过时的 `off` 设置。
    K2.7 还会固定 `temperature`、`top_p`、`n`、`presence_penalty` 和
    `frequency_penalty`；OpenClaw 会省略这些字段中已配置的覆盖值。

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
    启用 Moonshot K2 思考时，`tool_choice` 必须是 `auto` 或 `none`。固定的工具选择（`type: "tool"` 或 `type: "function"`）会强制将思考恢复为 `disabled`，以便请求的工具仍然运行；`tool_choice: "required"` 则会被规范化为 `auto`。Kimi K2.7 Code 无法禁用思考，因此其不兼容的 `tool_choice` 会被规范化为 `auto`。Kimi K3 使用独立的推理努力程度协议，并保留受支持的工具选择。
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

  <Accordion title="工具调用 ID 清理">
    Moonshot Kimi 提供的原生 tool_call ID 形如 `functions.<name>:<index>`。OpenClaw 会保留每个原生 Kimi ID 的首次出现，并将后续重复项重写为确定性的 OpenAI 风格 `call_*` ID。匹配的工具结果会使用相同的 ID 重新映射，因此重放时仍保持唯一性，而不会剥离 Kimi 的首个原生 ID。此行为已集成到捆绑的 Moonshot provider 中，不是用户可配置的设置。
  </Accordion>

  <Accordion title="流式用量兼容性">
    原生 Moonshot 端点（`https://api.moonshot.ai/v1` 和
    `https://api.moonshot.cn/v1`）声明支持流式 usage 兼容性。
    OpenClaw 是根据端点 host 而不是 provider id 来判断的，因此指向相同原生 Moonshot host 的自定义 provider id 也会继承相同的流式 usage 行为。

    使用目录中的 K3 定价时，包含输入、输出和缓存读取 token 的流式用量
    也会转换为本地估算的美元成本，用于 `/status`、`/usage full`、
    `/usage cost` 以及基于 transcript 的会话计费。

  </Accordion>

  <Accordion title="端点和模型引用参考">
    | Provider   | Model ref prefix | Endpoint                      | Auth env var        |
    | ---------- | ---------------- | ------------------------------ | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi Coding| `kimi/`          | Kimi Coding endpoint           | `KIMI_API_KEY`      |
    | Web search | N/A              | Same as Moonshot API region    | `KIMI_API_KEY` or `MOONSHOT_API_KEY` |

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
