---
summary: "配置 Moonshot Kimi 模型与 Kimi Coding（独立的提供方和密钥）"
read_when:
  - "你想要设置 Moonshot Kimi K3/K2（Moonshot Open Platform）或 Kimi Coding"
  - "你需要了解独立的端点、密钥和模型引用"
  - "您想要任一提供商的 copy/paste 配置"
title: "Moonshot AI"
---

Moonshot 为 Kimi API 提供 OpenAI- 兼容端点。新鲜Moonshot入门引导选择`moonshot/kimi-k3`；使用 `kimi/kimi-for-coding` 作为单独的 Kimi 编码提供程序。

<Warning>
Moonshot 和 Kimi Coding 是**独立的提供方**，并且各自作为单独的外部插件提供。密钥不能互换，端点也不同，模型引用也不同（`moonshot/...` vs `kimi/...`）。
</Warning>

## <a id="built-in-model-catalog"></a> 内置模型目录

Moonshot 和 Kimi 编码设置会保存连接设置和别名，而无需将生成的目录行复制到您的配置中。显式 `models.mode: "replace"` 保持目录播种启用；自定义模型行保持不变。

[//]： # "moonshot-kimi-k2-ids：start"

| 模型引用                           | 名称                     | 推理        | 输入              | 上下文   | 最大输出 |
| ----------------------------------- | ------------------------ | ---------------- | ------------------ | --------- | ---------- |
| `moonshot/kimi-k3`                  | Kimi K3                  | 低 / 高 / 最大 | 文本、图像、视频 | 1,048,576 | 1,048,576  |
| `moonshot/kimi-k2.7-code`           | Kimi K2.7 代码           | 始终开启        | 文本、图像、视频 | 262,144   | 262,144    |
| `moonshot/kimi-k2.7-code-highspeed` | Kimi K2.7 代码 HighSpeed | 始终开启        | 文本、图像、视频 | 262,144   | 262,144    |

[//]： # "moonshot-kimi-k2-ids：end"

目录成本估算使用 Moonshot 发布的按需付费费率。在做出成本决策前，请查看 [Kimi K3](https://platform.kimi.ai/docs/pricing/chat-k3) 和 [Kimi K2.7 Code](https://platform.kimi.ai/docs/pricing/chat-k27-code) 的实时供应商页面。

Kimi K3 始终推理并接受 `reasoning_effort` 值 `low`、`high` 和 `max`（默认值）。在直接 Moonshot 路由上，OpenClaw 仅公开 `/think max` 并始终发送 `reasoning_effort: "max"`。它省略了 K2-only `thinking` 字段，并删除了 K3 修复为提供程序默认值的采样覆盖（`temperature`、`top_p`、`n`、`presence_penalty` 和 `frequency_penalty`）。 Kimi K2.7 代码也始终使用本机思维，但需要省略 `thinking` 和 `reasoning_effort` ； HighSpeed 变体使用相同的合约。 Kimi K3 是载入默认值。请参阅 Moonshot 的 [Kimi K3 快速入门](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart)。

## <a id="getting-started"></a> 入门

Moonshot 和 Kimi Coding 都是外部插件 - 请先安装其中一个再进行引导。

<Tabs>
  <Tab title="Moonshot API">
    **最适合：通过 Moonshot 开放平台的** Kimi K3 和 K2 模型。

    <Steps>
      <Step id="install-the-plugin" title="安装插件">
        ```bash
        openclaw plugins install @openclaw/moonshot-provider
        ```

        安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。
      </Step>
      <Step id="choose-your-endpoint-region" title="选择您的端点区域">
        | 认证选项            | 端点                       | 区域        |
        | ---------------------- | ------------------------------ | ------------- |
        | `moonshot-api-key`     | `https://api.moonshot.ai/v1`   | 国际 |
        | `moonshot-api-key-cn`  | `https://api.moonshot.cn/v1`   | 中国         |
      </Step>
      <Step id="run-onboarding" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice moonshot-api-key
        ```

        或者对于中国端点：

        ```bash
        openclaw onboard --auth-choice moonshot-api-key-cn
        ```
      </Step>
      <Step id="confirm-the-kimi-k3-default" title="确认 Kimi 默认 K3">
        全新引导会选择 Kimi K3。现有安装可以显式切换：

        ```bash
        openclaw models set moonshot/kimi-k3
        ```
      </Step>
      <Step id="verify-models-are-available" title="验证模型是否可用">
        ```bash
        openclaw models list --provider moonshot
        ```
      </Step>
      <Step id="run-a-live-smoke-test" title="进行现场冒烟测试">
        当你想在不影响正常会话的情况下验证模型访问和成本跟踪时，请使用隔离的状态目录：

        ```bash
        OPENCLAW_CONFIG_PATH=/tmp/openclaw-kimi/openclaw.json \
        OPENCLAW_STATE_DIR=/tmp/openclaw-kimi \
        openclaw agent --local \
          --session-id live-kimi-cost \
          --message 'Reply exactly: KIMI_LIVE_OK' \
          --thinking max \
          --json
        ```

        JSON 响应应报告 `provider: "moonshot"` 和 `model: "kimi-k3"`。当 Moonshot 返回使用量元数据时，助手会话记录条目会在 `usage.cost` 下存储标准化的令牌使用量以及预估成本。
      </Step>
    </Steps>

    ### <a id="config-example"></a> 配置示例

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
                cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3 },
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

  <Tab id="kimi-coding" title="Kimi 编码">
    **最适合：** 通过 Kimi Coding 端点进行以代码为中心的任务。

    <Note>
    Kimi 编码使用与 Moonshot （`moonshot/...`） 不同的 API 密钥和提供商前缀 （`kimi/...`）。当前参考为 `kimi/k3`（最多 1M 上下文）（分层门控）、`kimi/k3-256k`（适用于 256K 上下文且配额使用较低）、`kimi/kimi-for-coding` 和 `kimi/kimi-for-coding-highspeed`。旧参考 `kimi/kimi-code` 和 `kimi/k2p5` 标准化为 `kimi/kimi-for-coding`；旧版 `kimi/k3[1m]` 标准化为 `kimi/k3`。
    </Note>

    编码服务接受 OpenAI- 兼容的 `https://api.kimi.com/coding/v1` 和 Anthropic- 兼容的 `https://api.kimi.com/coding/` 客户端。该插件使用 Anthropic 消息。在[Kimi代码Console](https://www.kimi.com/code/console)中创建会员密钥；当前的会员定价位于 [Kimi 的定价页面](https://www.kimi.com/membership/pricing)。

    | 模型引用 | 名称 | 推理 | 输入 | 上下文 | 最大输出 |
    | --- | --- | --- | --- | --- | --- |
    | `kimi/k3` | Kimi K3 | 自适应；低／高／最大努力程度 | 文本、图像 | 1,048,576 | 131,072 |
    | `kimi/k3-256k` | Kimi K3 (256k) | 自适应；低／高／最大努力程度 | 文本、图像 | 262,144 | 131,072 |

    K3 目录预估输入价格为 3 美元／MTok，输出价格为 15 美元／MTok， 缓存读取价格为 0.30 美元／MTok，缓存写入价格为 0 美元／MTok。该目录报告的是 K3 的最大上下文；你的 Kimi 会员资格可能会强制执行更低的实时限制。

    <Steps>
      <Step id="install-the-plugin-1" title="安装插件">
        ```bash
        openclaw plugins install @openclaw/kimi-provider
        ```

        安装自动应用于正在运行的网关；否则下次启动时生效。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。
      </Step>
      <Step id="run-onboarding-1" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice kimi-code-api-key
        ```
      </Step>
      <Step id="set-a-default-model" title="设置默认模型">
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
      <Step id="verify-the-model-is-available" title="验证模型是否可用">
        ```bash
        openclaw models list --provider kimi
        ```
      </Step>
    </Steps>

    Kimi 编码当推理启用时，K3 始终使用自适应思维，并且默认为高度努力。 `/think minimal|low` 映射到低努力，`/think medium|high|adaptive` 映射到高努力，`/think xhigh|max` 映射到最大努力。 `/think off` 发送 `thinking.type: "disabled"`。

    当前方案可用性请参阅官方的 [Kimi Code 模型表](https://www.kimi.com/code/docs/en/kimi-code/models.html)。

    ### <a id="config-example-1"></a><a id="config-example-2"></a> 配置示例

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

## <a id="kimi-web-search"></a> Kimi 网页搜索

Moonshot 插件还会将 **Kimi** 注册为 `web_search` 提供方，由 Moonshot 网页搜索提供支持。

<Steps>
  <Step id="run-interactive-web-search-setup" title="运行交互式网络搜索设置">
    ```bash
    openclaw configure --section web
    ```

    在网页搜索部分选择 **Kimi**，以保存 `plugins.entries.moonshot.config.webSearch.*`。

  </Step>
  <Step id="configure-the-web-search-region-and-model" title="配置网络搜索区域和模型">
    交互式设置会提示：

    | 设置             | 选项                                                              |
    | ------------------- | -------------------------------------------------------------------- |
    | API 区域          | `https://api.moonshot.ai/v1`（国际）或 `https://api.moonshot.cn/v1`（中国） |
    | 网页搜索模型    | 默认值为 `kimi-k2.6`                                             |

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
            apiKey: "sk-...", // or use KIMI_API_KEY / MOONSHOT_API_KEY
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

## <a id="advanced-configuration"></a> 高级配置

Moonshot 自动缓存匹配的提示符前缀。 Kimi K3 默认使用五分钟缓存，并分别报告缓存写入和缓存读取。 OpenClaw 的默认成本估算将这些写入定价为每百万代币 3 美元，缓存读取定价为每百万代币 0.30 美元。请参阅 [Kimi 上下文缓存](https://platform.kimi.ai/docs/guide/context-caching)。

<AccordionGroup>
  <Accordion id="native-thinking-mode" title="原生思维模式">
    Moonshot API Kimi K3 始终以最大努力进行推理。OpenClaw 仅公开 `/think max`，发送 `reasoning_effort: "max"`，并忽略过时的较低级别或 `off` 设置。

    Kimi 编码 K3 暴露 `/think off|minimal|low|medium|high|adaptive|xhigh|max`。其 Anthropic- 兼容端点接收 `thinking.type: "disabled"` 表示关闭。每个启用的级别都使用适应性思维； minimal/low 映射到低努力，medium/high/adaptive 映射到高努力，xhigh/max 映射到最大努力。这适用于 `kimi/k3` 和 `kimi/k3-256k`。旧版 `kimi/k3[1m]` 标准化为 `kimi/k3`。

    模型为 ID `kimi-k3` 或 `Kimi-K3` 和 `api: "openai-completions"` 的 `kimi` 下的自托管 K3 注册暴露了相同的思维选择。它们默认处于关闭状态，包括没有明确思维偏好的现有配置。启用级别使用上面的映射并发送顶级`reasoning_effort`； off 毫不费力地发送 `thinking: { type: "disabled" }`。显式模型映射和 `params.extra_body` 覆盖仍然有效。配置的 `params.chat_template_kwargs.reasoning_effort` 不会受到生成的顶级工作的影响。自托管端点是否支持禁用取决于其服务配置；这不会更改托管 Moonshot API 的始终在线策略。

    Moonshot API K3 支持 `auto`、`none`、`required` 和固定刀具选择，因此 OpenClaw 保留请求的 `tool_choice`。对于多回合工具使用，OpenClaw 保留了 Moonshot 重播合约所需的辅助推理内容。

    Kimi K2.7 Code 始终使用原生思考。Moonshot 要求客户端对此模型省略 `thinking` 字段，因此 OpenClaw 仅公开 `on`，并忽略过时的 `off` 设置。 K2.7 还会固定 `temperature`、`top_p`、`n`、`presence_penalty` 和 `frequency_penalty`；OpenClaw 会省略这些字段中已配置的覆盖值。

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

    | `/think` 级别       | Moonshot 行为          |
    | -------------------- | -------------------------- |
    | `/think off`         | `thinking.type=disabled`   |
    | 任何非 off 级别    | `thinking.type=enabled`    |

    <Warning>
    启用 Moonshot K2 思考时，`tool_choice` 必须是 `auto` 或 `none`。固定的工具选择（`type: "tool"` 或 `type: "function"`）会强制将思考恢复为 `disabled`，以便请求的工具仍然运行；`tool_choice: "required"` 则会被规范化为 `auto`。Kimi K2.7 Code 无法禁用思考，因此其不兼容的 `tool_choice` 会被规范化为 `auto`。Kimi K3 使用独立的推理努力程度协议，并保留受支持的工具选择。
    </Warning>

    Kimi K2.6 还接受一个可选的 `thinking.keep` 字段，用于控制 `reasoning_content` 的多轮保留。将其设为 `"all"` 可在轮次之间保留完整推理；省略它（或将其设为 `null`）则使用服务器默认策略。 OpenClaw 只会将 `thinking.keep` 转发给 `moonshot/kimi-k2.6`，并从其他模型中移除它。Kimi K2.7 Code 默认保留完整推理历史，而 OpenClaw 会省略整个 `thinking` 字段。

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

  <Accordion id="tool-schema-compatibility" title="工具架构兼容性">
    On Moonshot-家庭OpenAI-兼容的路线，OpenClaw添加缺失的`type`字段到`anyOf`和`oneOf`当工具模式的字面值或约束标识单一类型时，工具模式会分支。这可以防止Moonshot从拒绝共同MCP具有无类型分支的模式。显式类型和不明确的分支保持不变；其他提供商不会收到此重写。
  </Accordion>

  <Accordion id="tool-call-id-sanitization" title="工具来电显示清理">
    Moonshot Kimi 提供形状像 `functions.<name>:<index>` 的原生 tool_call id。 OpenClaw 保留每个本机 Kimi id 的第一次出现，并将以后的重复项重写为稳定的 OpenAI-style `call_*` id。匹配工具结果使用相同的 ID 重新映射，因此重放保持唯一，而不会剥离 Kimi 的第一个本机 ID。此行为已连接到捆绑的 Moonshot 提供程序中，并且不是用户可配置的设置。
  </Accordion>

  <Accordion id="streaming-usage-compatibility" title="流媒体使用兼容性">
    原生 Moonshot 端点（`https://api.moonshot.ai/v1` 和 `https://api.moonshot.cn/v1`）声明支持流式 usage 兼容性。 OpenClaw 是根据端点 host 而不是 provider id 来判断的，因此指向相同原生 Moonshot host 的自定义 provider id 也会继承相同的流式 usage 行为。

    通过目录 K3 定价，包括输入、输出和缓存读取令牌的流式使用也会转换为 `/status`、`/usage full`、`/usage cost` 和转录支持的会话记帐的本地估计 USD 成本。

  </Accordion>

  <Accordion id="endpoint-and-model-ref-reference" title="端点和模型参考参考">
    | 提供者   | 模型参考前缀 | 端点                      | 认证环境变量        |
    | ---------- | ---------------- | ------------------------------ | ------------------- |
    | Moonshot   | `moonshot/`      | `https://api.moonshot.ai/v1`  | `MOONSHOT_API_KEY`  |
    | Moonshot CN| `moonshot/`      | `https://api.moonshot.cn/v1`  | `MOONSHOT_API_KEY`  |
    | Kimi 编码| `kimi/`          | Kimi 编码端点           | `KIMI_API_KEY`      |
    | 网页搜索 | N/A              | 与 Moonshot API 区域相同    | `KIMI_API_KEY` 或 `MOONSHOT_API_KEY` |

    - Kimi 网页搜索使用 `KIMI_API_KEY` 或 `MOONSHOT_API_KEY` 与 `POST /tools/search`，默认为 `https://api.moonshot.ai/v1`。它返回结构化结果，无需聊天模型； `plugins.entries.moonshot.config.webSearch.model` 已弃用并被忽略。参见[Kimi搜索](/tools/kimi-search)。
    - 如有需要，可在 `models.providers` 中覆盖定价和上下文元数据。
    - 如果 Moonshot 为某个模型发布了不同的上下文限制，请相应调整 `contextWindow`。

  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="网页搜索" href="/tools/web" icon="magnifying-glass">
    配置包括 Kimi 在内的网页搜索提供商。
  </Card>
  <Card title="配置参考" href="/gateway/configuration-reference" icon="gear">
    提供程序、模型和插件的完整配置架构。
  </Card>
  <Card title="Fireworks" href="/providers/fireworks" icon="server">
    Kimi 在 Fireworks 上建模，包括他们的思考行为。
  </Card>
  <Card title="Moonshot开放平台" href="https://platform.moonshot.ai" icon="globe">
    Moonshot API 密钥管理和文档。
  </Card>
</CardGroup>
