---
summary: "Configure Moonshot Kimi models vs Kimi Coding (separate providers + keys)"
read_when:
  - You want Moonshot Kimi K3/K2 (Moonshot Open Platform) vs Kimi Coding setup
  - You need to understand separate endpoints, keys, and model refs
  - You want copy/paste config for either provider
title: "Moonshot AI"
---

Moonshot provides the Kimi API with OpenAI-compatible endpoints. Fresh Moonshot
onboarding selects `moonshot/kimi-k3`; use `kimi/kimi-for-coding` for the
separate Kimi Coding provider.

<Warning>
Moonshot 和 Kimi Coding 是**独立的提供方**，并且各自作为单独的外部插件提供。密钥不能互换，端点也不同，模型引用也不同（`moonshot/...` vs `kimi/...`）。
</Warning>

## 内置模型目录

[//]: # "moonshot-kimi-k2-ids:start"

| Model ref                           | Name                     | Reasoning        | Input              | Context   | Max output |
| ----------------------------------- | ------------------------ | ---------------- | ------------------ | --------- | ---------- |
| `moonshot/kimi-k3`                  | Kimi K3                  | low / high / max | text, image, video | 1,048,576 | 1,048,576  |
| `moonshot/kimi-k2.7-code`           | Kimi K2.7 Code           | Always on        | text, image, video | 262,144   | 262,144    |
| `moonshot/kimi-k2.7-code-highspeed` | Kimi K2.7 Code HighSpeed | Always on        | text, image, video | 262,144   | 262,144    |

[//]: # "moonshot-kimi-k2-ids:end"

Catalog cost estimates use Moonshot's published pay-as-you-go rates. Check the
live vendor pages for [Kimi K3](https://platform.kimi.ai/docs/pricing/chat-k3)
and [Kimi K2.7 Code](https://platform.kimi.ai/docs/pricing/chat-k27-code)
before making cost decisions.

Kimi K3 always reasons and accepts `reasoning_effort` values `low`, `high`,
and `max` (the default). OpenClaw exposes those exact levels and maps `/think
xhigh` to `max`; it omits the K2-only `thinking` field and removes sampling
overrides (`temperature`, `top_p`, `n`, `presence_penalty`, and
`frequency_penalty`) that K3 fixes to provider defaults. Kimi K2.7 Code also
always uses native thinking but requires both `thinking` and
`reasoning_effort` to be omitted; the HighSpeed variant uses the same contract.
Kimi K3 is the onboarding default.
See Moonshot's [Kimi K3 quickstart](https://platform.kimi.ai/docs/guide/kimi-k3-quickstart).

## 开始使用

Moonshot 和 Kimi Coding 都是外部插件 - 请先安装其中一个再进行
引导。

<Tabs>
  <Tab title="Moonshot API">
    **Best for:** Kimi K3 and K2 models via the Moonshot Open Platform.

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
      <Step title="Confirm the Kimi K3 default">
        Fresh onboarding selects Kimi K3. Existing installations can switch explicitly:

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

        The JSON response should report `provider: "moonshot"` and
        `model: "kimi-k3"`. The assistant transcript entry stores normalized
        token usage plus estimated cost under `usage.cost` when Moonshot returns
        usage metadata.
      </Step>
    </Steps>

    ### 配置示例

    ```json5
    {
      env: { MOONSHOT_API_KEY: "sk-..." },
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
    Kimi Coding uses a different API key and provider prefix (`kimi/...`) than Moonshot (`moonshot/...`). Current refs are `kimi/k3` for up to 1M context (tier-gated), `kimi/k3-256k` for 256K context with lower quota use, `kimi/kimi-for-coding`, and `kimi/kimi-for-coding-highspeed`. Legacy refs `kimi/kimi-code` and `kimi/k2p5` normalize to `kimi/kimi-for-coding`; legacy `kimi/k3[1m]` normalizes to `kimi/k3`.
    </Note>

    The coding service accepts both OpenAI-compatible
    `https://api.kimi.com/coding/v1` and Anthropic-compatible
    `https://api.kimi.com/coding/` clients. This plugin uses Anthropic Messages.
    Create membership keys in the
    [Kimi Code Console](https://www.kimi.com/code/console); current membership
    pricing lives on [Kimi's pricing page](https://www.kimi.com/membership/pricing).

    | Model ref | Name | Reasoning | Input | Context | Max output |
    | --- | --- | --- | --- | --- | --- |
    | `kimi/k3` | Kimi K3 | adaptive; low / high / max effort | text, image | 1,048,576 | 131,072 |
    | `kimi/k3-256k` | Kimi K3 (256k) | adaptive; low / high / max effort | text, image | 262,144 | 131,072 |

    The K3 catalog estimates $3/MTok input, $15/MTok output, $0.30/MTok
    cache reads, and $0/MTok cache writes. The catalog reports K3's maximum
    context; your Kimi membership may enforce a lower live limit.

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

    Kimi Code K3 always uses adaptive thinking when reasoning is enabled and
    defaults to high effort. `/think minimal|low` maps to low effort,
    `/think medium|high|adaptive` maps to high effort, and `/think xhigh|max`
    maps to max effort. `/think off` sends `thinking.type: "disabled"`.

    See the official [Kimi Code model table](https://www.kimi.com/code/docs/en/kimi-code/models.html) for current plan availability.

    ### Config example

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
  <Accordion title="Native thinking mode">
    Moonshot API Kimi K3 always reasons at maximum effort. OpenClaw exposes only
    `/think max`, sends `reasoning_effort: "max"`, and ignores stale lower or
    `off` settings.

    Kimi Code K3 exposes `/think off|minimal|low|medium|high|adaptive|xhigh|max`.
    Its Anthropic-compatible endpoint receives `thinking.type: "disabled"` for
    off. Every enabled level uses adaptive thinking; minimal/low maps to low
    effort, medium/high/adaptive maps to high effort, and xhigh/max maps to max
    effort. This applies to both `kimi/k3` and `kimi/k3-256k`. Legacy
    `kimi/k3[1m]` normalizes to `kimi/k3`.
    Moonshot API K3 supports `auto`, `none`, `required`, and pinned tool choices,
    so OpenClaw preserves the requested `tool_choice`. For multi-turn tool use,
    OpenClaw preserves the assistant reasoning content required by Moonshot's
    replay contract.

    Kimi K2.7 Code always uses native thinking. Moonshot requires clients to
    omit the `thinking` field for this model, so OpenClaw exposes only `on` and
    ignores stale `off` settings. K2.7 also fixes `temperature`, `top_p`, `n`,
    `presence_penalty`, and `frequency_penalty`; OpenClaw omits configured
    overrides for those fields.

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
    When Moonshot K2 thinking is enabled, `tool_choice` must be `auto` or `none`. A pinned tool choice (`type: "tool"` or `type: "function"`) forces thinking back to `disabled` instead, so the requested tool still runs; `tool_choice: "required"` is normalized to `auto` instead. Kimi K2.7 Code cannot disable thinking, so its incompatible `tool_choice` is normalized to `auto`. Kimi K3 uses its separate reasoning-effort contract and preserves supported tool choices.
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

  <Accordion title="Tool call id sanitization">
    Moonshot Kimi 提供的原生 tool_call id 形如 `functions.<name>:<index>`。OpenClaw 会保留每个原生 Kimi id 的首次出现，并将后续重复项重写为确定性的 OpenAI 风格 `call_*` id。匹配的工具结果会使用相同的 id 重新映射，因此重放时仍保持唯一性，而不会剥离 Kimi 的首个原生 id。此行为已集成到捆绑的 Moonshot provider 中，不是用户可配置的设置。
  </Accordion>

  <Accordion title="Streaming usage compatibility">
    原生 Moonshot 端点（`https://api.moonshot.ai/v1` 和
    `https://api.moonshot.cn/v1`）声明支持流式 usage 兼容性。
    OpenClaw 是根据端点 host 而不是 provider id 来判断的，因此指向相同原生 Moonshot host 的自定义 provider id 也会继承相同的流式 usage 行为。

    With the catalog K3 pricing, streamed usage that includes input, output,
    and cache-read tokens is also converted into local estimated USD cost for
    `/status`, `/usage full`, `/usage cost`, and transcript-backed session
    accounting.

  </Accordion>

  <Accordion title="Endpoint and model ref reference">
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
