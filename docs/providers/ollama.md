summary: "使用 Ollama 运行 OpenClaw（云端和本地模型）"
read_when:
  - 你想通过 Ollama 使用云端或本地模型运行 OpenClaw
  - 你需要 Ollama 的设置和配置指导
  - 你想使用 Ollama 的视觉模型进行图像理解
title: "Ollama"
---

OpenClaw 通过 Ollama 的原生 API（`/api/chat`）进行通信，而不是使用 OpenAI 兼容的
`/v1` 端点。支持三种模式：

| 模式          | 使用内容                                                                         |
| ------------- | -------------------------------------------------------------------------------- |
| 云端 + 本地   | 可访问的 Ollama 主机，提供本地模型以及（如果已登录）`:cloud` 模型 |
| 仅云端        | 直接使用 `https://ollama.com`，不需要本地守护进程                             |
| 仅本地        | 可访问的 Ollama 主机，仅本地模型                                               |

有关使用专用 `ollama-cloud` provider id 的仅云端设置，请参阅
[Ollama Cloud](/providers/ollama-cloud)。当你希望云端路由与本地 `ollama` provider 保持分离时，请使用 `ollama-cloud/<model>` 引用。

<Warning>
不要使用 `/v1` 的 OpenAI 兼容 URL（`http://host:11434/v1`）。这会破坏工具调用，并且模型可能会将原始工具调用 JSON 作为纯文本输出。请使用原生 URL：`baseUrl: "http://host:11434"`（不带 `/v1`）。
</Warning>

标准配置键是 `baseUrl`。对于 OpenAI-SDK 风格的示例，也接受 `baseURL`，但新的配置应使用 `baseUrl`。

## 认证规则

<AccordionGroup>
  <Accordion title="本地和局域网主机">
    回环地址、私有网络、`.local` 和裸主机名的 Ollama URL 不需要真实的 bearer token。OpenClaw 为这些情况使用 `ollama-local` 标记。
  </Accordion>
  <Accordion title="远程和 Ollama Cloud 主机">
    公共远程主机和 `https://ollama.com` 需要真实凭证：`OLLAMA_API_KEY`、身份验证配置文件，或提供方的 `apiKey`。对于直接托管使用，建议优先使用 `ollama-cloud` 提供方。
  </Accordion>
  <Accordion title="Custom provider ids">
    A custom provider with `api: "ollama"` follows the same rules. For example, an `ollama-remote` provider pointed at a private LAN host can use `apiKey: "ollama-local"`; sub-agents resolve that marker through the Ollama provider hook instead of treating it as a missing credential. `memory.search.provider` can also point at a custom provider id so embeddings use that Ollama endpoint.
  </Accordion>
  <Accordion title="身份验证配置文件">
    `auth-profiles.json` 会为某个 provider id 存储凭证；将端点设置（`baseUrl`、`api`、模型、请求头、超时）放在 `models.providers.<id>` 中。较旧的扁平文件，例如 `{ "ollama-windows": { "apiKey": "ollama-local" } }`，不是运行时格式；`openclaw doctor --fix` 会将它们重写为带备份的规范 `ollama-windows:default` API 密钥配置文件。该旧文件中的 `baseUrl` 值只是冗余信息，应移动到提供方配置中。
  </Accordion>
  <Accordion title="内存嵌入范围">
    Ollama 内存嵌入的 bearer 认证仅作用于其声明时对应的主机：

    - A provider-level key is sent only to that provider's host.
    - `memory.search.remote.apiKey` and per-agent overrides are sent only to their remote embedding host.
    - A pure `OLLAMA_API_KEY` env value is treated as the Ollama Cloud convention and is not sent to local/self-hosted hosts by default.

  </Accordion>
</AccordionGroup>

## 快速开始

<Tabs>
  <Tab title="Onboarding (recommended)">
    <Steps>
      <Step title="运行引导">
        ```bash
        openclaw onboard
        ```

        Select **Ollama**, then pick a mode: **Cloud + Local**, **Cloud only**, or **Local only**.

        On a fresh guided setup, OpenClaw first checks the default or configured
        Ollama host. An installed model is offered automatically only when
        `/api/show` confirms tool support and a context window of at least 16K;
        missing or smaller context metadata stays on the manual setup path. The
        shared CLI/macOS setup ladder still verifies the selected route with a
        real completion before saving it. This automatic check never pulls a
        model; if no suitable installed model exists, onboarding continues to the
        normal Ollama picker.
      </Step>
      <Step title="选择模型">
        `Cloud only` 会提示输入 `OLLAMA_API_KEY` 并建议使用托管的云端默认模型。`Cloud + Local` 和 `Local only` 会提示输入 Ollama 基础 URL，发现可用模型，并在缺失时自动拉取所选的本地模型。像 `gemma4:latest` 这样的已安装 `:latest` 标签只会显示一次，而不会重复显示 `gemma4`。`Cloud + Local` 还会检查主机是否已登录以获取云端访问权限。
      </Step>
      <Step title="验证">
        ```bash
        openclaw models list --provider ollama
        ```
      </Step>
    </Steps>

    非交互式：

    ```bash
    openclaw onboard --non-interactive \
      --auth-choice ollama \
      --custom-base-url "http://ollama-host:11434" \
      --custom-model-id "qwen3.5:27b" \
      --accept-risk
    ```

    `--custom-base-url` 和 `--custom-model-id` 是可选的；省略它们将使用本地默认主机和 `gemma4` 建议模型。

  </Tab>

  <Tab title="手动设置">
    <Steps>
      <Step title="安装并启动 Ollama">
        从 [ollama.com/download](https://ollama.com/download) 获取，然后拉取一个模型：

        ```bash
        ollama pull gemma4
        ```

        对于混合云访问，请在同一主机上运行 `ollama signin`。
      </Step>
      <Step title="设置凭证">
        ```bash
        export OLLAMA_API_KEY="ollama-local"    # 本地/LAN 主机，任何值都可
        export OLLAMA_API_KEY="your-real-key"   # 仅 https://ollama.com
        ```

        或在配置中：`openclaw config set models.providers.ollama.apiKey "OLLAMA_API_KEY"`。
      </Step>
      <Step title="选择模型">
        ```bash
        openclaw models list
        openclaw models set ollama/gemma4
        ```

        或在配置中：

        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "ollama/gemma4" },
            },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## 通过本地主机使用云模型

`Cloud + Local` 会通过一个可访问的 Ollama 主机同时路由本地和 `:cloud` 模型——这就是 Ollama 的混合流程，也是当你想同时使用两者时在设置阶段应选择的模式。

OpenClaw 会提示输入基础 URL，发现本地模型，并检查 `ollama signin` 状态。登录后，它会建议托管默认模型（`kimi-k2.5:cloud`、`minimax-m2.7:cloud`、`glm-5.1:cloud`、`glm-5.2:cloud`）。如果未登录，在运行 `ollama signin` 之前，设置将保持仅本地模式。

如果需要在没有本地守护进程的情况下进行仅云端访问，请使用 `openclaw onboard --auth-choice ollama-cloud` 并查看 [Ollama Cloud](/providers/ollama-cloud) —— 该路径不需要 `ollama signin` 或正在运行的服务器：

```bash
openclaw onboard --auth-choice ollama-cloud
openclaw models set ollama-cloud/kimi-k2.5:cloud
```

在 `openclaw onboard` 期间显示的云模型列表会实时从 `https://ollama.com/api/tags` 填充，最多 500 项，因此选择器会反映当前的托管目录。如果在设置时 `ollama.com` 无法访问或未返回任何模型，OpenClaw 会回退到其硬编码的建议列表，以便引导仍能完成。

## 模型发现（隐式提供方）

当设置了 `OLLAMA_API_KEY`（或身份验证配置文件），且未定义
`models.providers.ollama` 或其他带有 `api: "ollama"` 的自定义提供方时，
OpenClaw 会从 `http://127.0.0.1:11434` 发现模型：

| 行为                 | 细节                                                                                                                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 目录查询             | `/api/tags`                                                                                                                                                                                                                                                                                   |
| 能力检测             | 尽力通过 `/api/show` 读取 `contextWindow`、`num_ctx` Modelfile 参数以及能力（视觉/工具/思考）                                                                                                                         |
| 视觉模型             | `/api/show` 中的 `vision` 能力会将模型标记为支持图像（`input: ["text", "image"]`）                                                                                                                                                                                                             |
| 推理检测             | 在可用时使用 `/api/show` 中的 `thinking` 能力；如果 Ollama 省略了能力，则回退到名称启发式（`r1`、`reason`、`reasoning`、`think`）。`glm-5.2:cloud` 和 `deepseek-v4-flash\|pro:cloud` 无论报告的能力如何，都会始终被视为推理模型。 |
| 令牌限制             | `maxTokens` 默认使用 OpenClaw 的 Ollama 最大令牌上限                                                                                                                                                                                                                                       |
| 成本                 | 所有成本均为 `0`                                                                                                                                                                                                                                                                             |

```bash
ollama list
openclaw models list
```

如果设置了 `models.providers.ollama` 并显式提供 `models` 数组，或者设置了
带有 `api: "ollama"` 且 `baseUrl` 不是回环地址的自定义提供方，则会禁用自动发现；
此时模型必须手动定义（见
[Configuration](#configuration)）。指向托管
`https://ollama.com` 的 `models.providers.ollama` 条目也会跳过发现，因为 Ollama Cloud 模型由提供方管理。
诸如 `http://127.0.0.2:11434` 之类的回环自定义提供方仍然被视为本地，并保留自动发现。

你可以直接使用完整引用，例如 `ollama/<pulled-model>:latest`，而无需手写
`models.json` 条目；OpenClaw 会实时解析它。对于已登录主机，选择一个未列出的
`ollama/<model>:cloud` 引用会通过 `/api/show` 验证该确切模型，并且只有在 Ollama 确认元数据时才会将其添加到运行时目录中——拼写错误仍会因未知模型而失败。

### 冒烟测试

对于跳过完整代理工具面的窄文本探测：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/llama3.2:latest \
    --prompt "准确回复：pong" \
    --json
```

添加带图片的 `--file` 可进行轻量级视觉模型探测（接受 PNG/JPEG/WebP；
在调用 Ollama 之前会拒绝非图像文件——音频请使用
`openclaw infer audio transcribe`）：

```bash
OLLAMA_API_KEY=ollama-local \
  openclaw infer model run \
    --local \
    --model ollama/qwen2.5vl:7b \
    --prompt "用一句话描述这张图片。" \
    --file ./photo.jpg \
    --json
```

这两种路径都不会加载聊天工具、记忆或会话上下文。如果它们成功，
而正常的代理回复失败，那么问题很可能出在模型的工具/代理能力上，
而不是端点本身。

使用 `/model ollama/<model>` 选择模型是一个精确的用户选择：如果配置的 `baseUrl`
不可达，下一次回复会直接以提供方错误失败，而不是静默回退到另一个已配置模型。

隔离的 cron 作业在启动代理轮次前会额外添加一个本地安全检查：
如果所选模型解析到本地/私有网络/`.local` 的 Ollama 提供方，并且 `/api/tags` 不可达，
OpenClaw 会将该次运行记录为 `skipped`，并在错误文本中包含该模型。
这个端点检查会按主机缓存 5 分钟，因此针对已停止守护进程的重复 cron 作业不会都发起失败请求。

实时验证：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=0 \
  pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

对于 Ollama Cloud，将相同的实时测试指向托管端点（默认跳过嵌入；如果云密钥可能未授权 `/api/embed`，可强制启用
`OPENCLAW_LIVE_OLLAMA_EMBEDDINGS=1`）：

```bash
export OLLAMA_API_KEY='<your-ollama-cloud-api-key>'
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA=1 \
OPENCLAW_LIVE_OLLAMA_BASE_URL=https://ollama.com \
OPENCLAW_LIVE_OLLAMA_MODEL=glm-5.1:cloud \
OPENCLAW_LIVE_OLLAMA_WEB_SEARCH=1 \
pnpm test:live -- extensions/ollama/ollama.live.test.ts
```

要添加模型，只需拉取它，系统就会自动发现：

```bash
ollama pull mistral
```

## 节点本地推理

代理可以将一个简短任务委派给配对桌面或服务器节点上的 Ollama 模型。提示词和响应会通过现有的已认证 Gateway/节点连接传输；请求在节点自身的回环 Ollama 端点（`http://127.0.0.1:11434`）上运行。

<Steps>
  <Step title="在节点上启动 Ollama">
    ```bash
    ollama pull qwen3:0.6b
    ollama list
    ```
  </Step>
  <Step title="连接节点主机">
    ```bash
    openclaw node run \
      --host <gateway-host> \
      --port 18789 \
      --display-name "本地推理"
    ```

    在 Gateway 主机上批准该设备及其节点命令，然后验证：

    ```bash
    openclaw devices list
    openclaw devices approve <deviceRequestId>
    openclaw nodes pending
    openclaw nodes approve <nodeRequestId>
    openclaw nodes status --connected
    ```

    首次连接，或者新增 Ollama 命令的升级，都可能触发节点命令审批。如果节点连接时没有声明 `ollama.models` 和 `ollama.chat`，请再次检查 `openclaw nodes pending`。

  </Step>
  <Step title="在代理中使用它">
    随附的 Ollama 插件提供 `node_inference` 工具。代理会先调用 `action: "discover"`，然后使用该结果中的节点和模型调用 `action: "run"`（如果恰好只有一个可用节点已连接，则 `run` 可以省略节点）。例如：“发现我节点上的 Ollama 模型，然后使用加载速度最快的模型总结这段文本。”
  </Step>
</Steps>

发现过程会读取 `/api/tags`，检查 `/api/show` 能力，并在可用时使用 `/api/ps` 优先对已加载模型排序。它只返回 Ollama 报告为可用于聊天的本地模型（`completion` 能力）——Ollama Cloud 行和仅支持嵌入的模型会被排除。每次运行都会禁用模型思考，并将输出默认设为 512 个 token（硬上限 8192），除非工具调用请求了不同的 `maxTokens`；某些模型（例如 GPT-OSS）不支持禁用思考，仍可能输出推理 token。

若要让 Ollama 在节点上持续运行，但不向代理暴露它：

```bash
openclaw config set plugins.entries.ollama.config.nodeInference.enabled false
```

重启节点（`openclaw node restart`，或者在前台会话中停止并重新运行 `openclaw node run`）。节点将停止声明 `ollama.models` 和 `ollama.chat`；Ollama 本身以及 Gateway 的 Ollama 提供器不受影响。将该值改回 `true` 并重启即可重新启用；如果命令面发生变化，重新连接后可能需要再次通过 `openclaw nodes pending` 批准。

直接验证节点命令，不经过代理轮次：

```bash
openclaw nodes invoke \
  --node "本地推理" \
  --command ollama.models \
  --params '{}' \
  --invoke-timeout 90000 \
  --timeout 100000

openclaw nodes invoke \
  --node "本地推理" \
  --command ollama.chat \
  --params '{"model":"qwen3:0.6b","prompt":"Reply with exactly: pong","maxTokens":32,"timeoutMs":120000}' \
  --invoke-timeout 130000 \
  --timeout 140000
```

`--invoke-timeout` 限制节点执行该命令的最长时间；`--timeout` 限制 Gateway 调用的总时长，应设置得更大。

节点本地推理始终使用节点自身的回环端点——它不会复用已配置的远程/云端 `models.providers.ollama.baseUrl`。这些节点命令在 macOS、Linux 和 Windows 节点主机上默认可用，并且仍受常规节点配对/命令策略约束。

## 视觉与图像描述

捆绑的 Ollama 插件将 Ollama 注册为具备图像能力的
媒体理解提供方，因此 OpenClaw 可以将显式的图像描述
请求以及已配置的图像模型默认值，通过本地或托管的 Ollama
视觉模型进行路由。

```bash
ollama pull qwen2.5vl:7b
export OLLAMA_API_KEY="ollama-local"
openclaw infer image describe --file ./photo.jpg --model ollama/qwen2.5vl:7b --json
```

`--model` 必须是完整的 `<provider/model>` 引用；设置后，`infer image
describe` 会优先尝试该模型，而不是在那些已经原生支持视觉的模型上
跳过描述。如果调用失败，OpenClaw 可以继续通过
`agents.defaults.imageModel.fallbacks`；文件/URL 准备错误会在尝试
回退之前直接失败。将 `infer image describe` 用于 OpenClaw 的
图像理解流程和已配置的 `imageModel`；将 `infer model run
--file` 用于带自定义提示词的原始多模态探测。

要让 Ollama 成为入站媒体的默认图像理解提供方：

```json5
{
  agents: {
    defaults: {
      imageModel: {
        primary: "ollama/qwen2.5vl:7b",
      },
    },
  },
}
```

优先使用完整的 `ollama/<model>` 引用。像
`qwen2.5vl:7b` 这样的裸 `imageModel` 引用，仅当该精确模型
被列在 `models.providers.ollama.models` 中并且其
`input: ["text", "image"]`，且没有其他已配置的图像提供方暴露
相同的裸 id 时，才会规范化为 `ollama/qwen2.5vl:7b`；否则请显式使用
提供方前缀。

较慢的本地视觉模型可能需要比云模型更长的图像理解超时时间，
并且如果 Ollama 尝试分配模型完整标称的视觉上下文，在受限硬件上
可能会崩溃。请设置能力超时并限制 `num_ctx`：

```json5
{
  models: {
    providers: {
      ollama: {
        models: [
          {
            id: "qwen2.5vl:7b",
            name: "qwen2.5vl:7b",
            input: ["text", "image"],
            params: { num_ctx: 2048, keep_alive: "1m" },
          },
        ],
      },
    },
  },
  tools: {
    media: {
      image: {
        timeoutSeconds: 180,
        models: [{ provider: "ollama", model: "qwen2.5vl:7b", timeoutSeconds: 300 }],
      },
    },
  },
}
```

此超时既适用于入站图像理解，也适用于显式的
`image` 工具。`models.providers.ollama.timeoutSeconds` 仍然控制
常规模型调用时底层 Ollama HTTP 请求的保护超时。

实时验证：

```bash
OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_OLLAMA_IMAGE=1 \
  pnpm test:live -- src/agents/tools/image-tool.ollama.live.test.ts
```

如果你手动定义 `models.providers.ollama.models`，请显式标记视觉模型：

```json5
{
  id: "qwen2.5vl:7b",
  name: "qwen2.5vl:7b",
  input: ["text", "image"],
  contextWindow: 128000,
  maxTokens: 8192,
}
```

OpenClaw 会拒绝对未标记为具备图像能力的模型发起图像描述请求。
在隐式发现的情况下，这一能力来自 `/api/show` 的视觉能力。

## 配置

<Tabs>
  <Tab title="基础（隐式发现）">
    ```bash
    export OLLAMA_API_KEY="ollama-local"
    ```

    <Tip>
    如果已设置 `OLLAMA_API_KEY`，则可以在 provider 条目中省略 `apiKey`；OpenClaw 会在可用性检查时自动填入。
    </Tip>

  </Tab>

  <Tab title="显式（手动模型）">
    对于托管云环境、非默认主机/端口、强制上下文窗口或完全手动的模型列表，请使用显式配置：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "https://ollama.com",
            apiKey: "OLLAMA_API_KEY",
            api: "ollama",
            models: [
              {
                id: "kimi-k2.5:cloud",
                name: "kimi-k2.5:cloud",
                reasoning: false,
                input: ["text", "image"],
                cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
                contextWindow: 128000,
                maxTokens: 8192
              }
            ]
          }
        }
      }
    }
    ```

  </Tab>

  <Tab title="自定义 base URL">
    显式配置会禁用自动发现，因此必须列出模型：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            apiKey: "ollama-local",
            baseUrl: "http://ollama-host:11434", // 无 /v1 - 原生 Ollama API URL
            api: "ollama", // 显式：保证原生工具调用行为
            timeoutSeconds: 300, // 可选：为冷启动的本地模型提供更长的连接/流式传输预算
            models: [
              {
                id: "qwen3:32b",
                name: "qwen3:32b",
                params: {
                  keep_alive: "15m", // 可选：让模型在轮次之间保持加载
                },
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    不要添加 `/v1`。该路径会选择 OpenAI 兼容模式，在这种模式下工具调用并不可靠。
    </Warning>

  </Tab>
</Tabs>

## 常见配方

将 model ID 替换为 `ollama list` 或
`openclaw models list --provider ollama` 中的精确名称。

<AccordionGroup>
  <Accordion title="带自动发现的本地模型">
    与 Gateway 运行在同一台机器上的 Ollama，会自动发现：

    ```bash
    ollama serve
    ollama pull gemma4
    export OLLAMA_API_KEY="ollama-local"
    openclaw models list --provider ollama
    openclaw models set ollama/gemma4
    ```

    除非你需要手动模型，否则不要添加 `models.providers.ollama` 块。

  </Accordion>

  <Accordion title="局域网中的 Ollama 主机，使用手动模型">
    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                reasoning: true,
                input: ["text"],
                params: {
                  num_ctx: 32768,
                  thinking: false,
                  keep_alive: "15m",
                },
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/qwen3.5:9b" },
        },
      },
    }
    ```

    `contextWindow` 是 OpenClaw 的上下文预算；`params.num_ctx` 会发送给
    Ollama。当硬件无法运行模型所宣称的完整上下文时，请保持两者一致。

  </Accordion>

  <Accordion title="仅 Ollama Cloud">
    没有本地守护进程，直接使用托管模型：

    ```bash
    export OLLAMA_API_KEY="your-ollama-api-key"
    ```

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "https://ollama.com",
            apiKey: "OLLAMA_API_KEY",
            api: "ollama",
            models: [
              {
                id: "kimi-k2.5:cloud",
                name: "kimi-k2.5:cloud",
                reasoning: false,
                input: ["text", "image"],
                contextWindow: 128000,
                maxTokens: 8192,
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "ollama/kimi-k2.5:cloud" },
        },
      },
    }
    ```

    若要使用专用的 `ollama-cloud` provider id 而不是这种结构，请参见
    [Ollama Cloud](/providers/ollama-cloud)。

  </Accordion>

  <Accordion title="通过已登录的守护进程同时使用云端和本地模型">
    ```bash
    ollama signin
    ollama pull gemma4
    ```

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 300,
            models: [
              { id: "gemma4", name: "gemma4", input: ["text"] },
              { id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text", "image"] },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama/gemma4",
            fallbacks: ["ollama/kimi-k2.5:cloud"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="多个 Ollama 主机">
    当运行多个 Ollama 服务器时，可使用自定义 provider ID；每个主机都有自己的
    host、models、auth 和 timeout。

    ```json5
    {
      models: {
        providers: {
          "ollama-fast": {
            baseUrl: "http://mini.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [{ id: "gemma4", name: "gemma4", input: ["text"] }],
          },
          "ollama-large": {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            api: "ollama",
            timeoutSeconds: 420,
            contextWindow: 131072,
            maxTokens: 16384,
            models: [{ id: "qwen3.5:27b", name: "qwen3.5:27b", input: ["text"] }],
          },
        },
      },
      agents: {
        defaults: {
          model: {
            primary: "ollama-fast/gemma4",
            fallbacks: ["ollama-large/qwen3.5:27b"],
          },
        },
      },
    }
    ```

    OpenClaw 在调用 Ollama 之前会去掉当前生效的 provider 前缀（若没有则回退为裸
    `ollama/` 前缀），因此 `ollama-large/qwen3.5:27b`
    传给 Ollama 时会变成 `qwen3.5:27b`。

  </Accordion>

  <Accordion title="精简本地模型配置">
    某些本地模型可以处理简单提示，但在完整的 agent 工具集上表现不佳。请在调整全局运行时设置之前，先限制工具和上下文：

    ```json5
    {
      agents: {
        list: [
          {
            id: "local",
            experimental: {
              localModelLean: true,
            },
            model: { primary: "ollama/gemma4" },
          },
        ],
      },
      models: {
        providers: {
          ollama: {
            baseUrl: "http://127.0.0.1:11434",
            apiKey: "ollama-local",
            api: "ollama",
            contextWindow: 32768,
            models: [
              {
                id: "gemma4",
                name: "gemma4",
                input: ["text"],
                params: { num_ctx: 32768 },
                compat: { supportsTools: false },
              },
            ],
          },
        },
      },
    }
    ```

    仅当模型或服务端在工具 schema 上稳定失败时，才使用 `compat.supportsTools: false`——它以 agent 能力换取稳定性。
    `localModelLean` 会从直接的 agent 表面移除重量级的浏览器、cron、消息、媒体生成、
    语音和 PDF 工具，除非明确需要，否则还会把更大的目录放到 Tool Search 后面。它不会改变 Ollama 的
    运行时上下文或 thinking 模式。对于容易循环或将预算花在隐藏推理上的小型 Qwen 风格 thinking 模型，请将它与 `params.num_ctx` 和
    `params.thinking: false` 配合使用。

  </Accordion>
</AccordionGroup>

### 模型选择

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}
```

自定义 provider id 也同样适用：对于使用当前生效 provider
前缀的引用，例如 `ollama-spark/qwen3:32b`，OpenClaw 会在调用 Ollama 之前去掉该前缀，
并将 `qwen3:32b` 发送给 Ollama。

对于较慢的本地模型，在提升整个
agent 运行时超时之前，优先进行 provider 级别的调优：

```json5
{
  models: {
    providers: {
      ollama: {
        timeoutSeconds: 300,
        models: [
          {
            id: "gemma4:26b",
            name: "gemma4:26b",
            params: { keep_alive: "15m" },
          },
        ],
      },
    },
  },
}
```

`timeoutSeconds` 覆盖模型的 HTTP 请求：连接建立、headers、
body 流式传输以及整个受保护的 fetch 中止。`params.keep_alive` 会作为顶层 `keep_alive`
在原生 `/api/chat` 请求中转发；当首次加载时间是瓶颈时，请按模型设置它。

### 快速验证

```bash
# 此机器可见的 Ollama 守护进程
curl http://127.0.0.1:11434/api/tags

# OpenClaw 目录和已选模型
openclaw models list --provider ollama
openclaw models status

# 直接模型冒烟测试
openclaw infer model run \
  --model ollama/gemma4 \
  --prompt "Reply with exactly: ok"
```

对于远程主机，请将 `127.0.0.1` 替换为 `baseUrl` 主机。如果 `curl`
可以工作但 OpenClaw 不行，请检查 Gateway 是否运行在不同的
机器、容器或服务账号下。

## Ollama 网页搜索

OpenClaw 将 **Ollama 网页搜索** 作为 `web_search` 提供程序捆绑提供。

| Property    | Detail                                                                                                                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host        | `models.providers.ollama.baseUrl`（如果已设置），否则为 `http://127.0.0.1:11434`；`https://ollama.com` 直接使用托管 API                          |
| Auth        | 本地已登录主机可免密；直接访问 `https://ollama.com` 搜索或受认证保护的主机则需要 `OLLAMA_API_KEY` 或已配置的提供程序认证           |
| Requirement | 本地/自托管主机必须运行中并通过 `ollama signin` 登录；直接使用托管搜索需要 `baseUrl: "https://ollama.com"` 外加有效的 API 密钥 |

可在 `openclaw onboard` 或 `openclaw configure --section web` 时选择它，或设置：

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

若要通过 Ollama Cloud 直接使用托管搜索：

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
        api: "ollama",
        models: [{ id: "kimi-k2.5:cloud", name: "kimi-k2.5:cloud", input: ["text"] }],
      },
    },
  },
  tools: {
    web: {
      search: { provider: "ollama" },
    },
  },
}
```

对于自托管主机，OpenClaw 会先尝试本地的 `/api/experimental/web_search`
代理，然后回退到同一主机上的托管 `/api/web_search` 路径；已登录的本地守护进程通常会通过本地代理响应。直接的
`https://ollama.com` 调用始终使用托管的 `/api/web_search` 端点。

<Note>
有关完整设置和行为，请参见 [Ollama Web Search](/tools/ollama-search)。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="旧版 OpenAI 兼容模式">
    <Warning>
    **此模式下工具调用不可靠。** 仅当代理需要 OpenAI 格式且你不依赖原生工具调用时才使用。
    </Warning>

    对位于 `/v1/chat/completions` 后面的代理，显式设置 `api: "openai-completions"`：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: true, // 默认：true
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

    此模式可能不支持流式传输与工具调用同时使用；你可能需要在模型上设置 `params: { streaming: false }`。

    OpenClaw 会在此模式下默认注入 `options.num_ctx`，以免 Ollama 悄悄回退到 4096 token 的上下文。如果你的代理会拒绝未知的 `options` 字段，请将其禁用：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434/v1",
            api: "openai-completions",
            injectNumCtxForOpenAICompat: false,
            apiKey: "ollama-local",
            models: [...]
          }
        }
      }
    }
    ```

  </Accordion>

  <Accordion title="Context windows">
    对于自动发现的模型，OpenClaw 会使用 `/api/show` 报告的上下文窗口，包括来自自定义 Modelfiles 的更大 `PARAMETER num_ctx` 值；否则会回退到 OpenClaw 的默认 Ollama 上下文窗口。

    提供方级别的 `contextWindow`、`contextTokens` 和 `maxTokens` 会为该提供方下的每个模型设置默认值，并可在单个模型上覆盖。`contextWindow` 是 OpenClaw 自身的提示词/压缩预算。原生 `/api/chat` 请求会保持 `options.num_ctx` 未设置，除非你显式设置了 `params.num_ctx`，因此 Ollama 会应用其自身的模型默认值、`OLLAMA_CONTEXT_LENGTH` 或基于 VRAM 的默认值；无效、为零、负数或非有限的 `params.num_ctx` 值会被忽略。如果旧配置仅使用 `contextWindow`/`maxTokens` 来强制原生请求上下文，请运行 `openclaw doctor --fix` 将这些值复制到 `params.num_ctx` 中。OpenAI 兼容适配器仍会根据已配置的 `params.num_ctx` 或 `contextWindow` 默认注入 `options.num_ctx`；如果上游拒绝 `options`，可通过 `injectNumCtxForOpenAICompat: false` 关闭。

    原生模型条目还可在 `params` 下接受常见的 Ollama 运行时选项，并作为原生 `/api/chat` 的 `options` 转发：`num_keep`、`seed`、`num_predict`、`top_k`、`top_p`、`min_p`、`typical_p`、`repeat_last_n`、`temperature`、`repeat_penalty`、`presence_penalty`、`frequency_penalty`、`stop`、`num_batch`、`num_gpu`、`main_gpu`、`use_mmap` 和 `num_thread`。少数键（`format`、`keep_alive`、`truncate`、`shift`）会作为顶层请求字段转发，而不是嵌套在 `options` 中。OpenClaw 只会转发这些 Ollama 请求键，因此仅运行时使用的参数（例如 `streaming`）绝不会发送给 Ollama。使用 `params.think`（或 `params.thinking`）来设置顶层 `think`；`false` 会为 Qwen 风格的思考模型禁用 API 级思考。

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            models: [
              {
                id: "llama3.3",
                contextWindow: 131072,
                maxTokens: 65536,
                params: {
                  num_ctx: 32768,
                  temperature: 0.7,
                  top_p: 0.9,
                  thinking: false,
                },
              }
            ]
          }
        }
      }
    }
    ```

    每个模型的 `agents.defaults.models["ollama/<model>"].params.num_ctx` 也同样可用；如果两者都设置了，则显式的提供方模型条目优先生效。

  </Accordion>

  <Accordion title="Thinking control">
    OpenClaw 会按 Ollama 的预期转发 thinking：顶层 `think`，而不是 `options.think`。自动发现且其 `/api/show` 报告具有 `thinking` 能力的模型，会暴露 `/think low`、`/think medium`、`/think high` 和 `/think max`；不支持 thinking 的模型只会暴露 `/think off`。

    ```bash
    openclaw agent --model ollama/gemma4 --thinking off
    openclaw agent --model ollama/gemma4 --thinking low
    ```

    或者设置模型默认值：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "ollama/gemma4": {
              thinking: "low",
            },
          },
        },
      },
    }
    ```

    单个模型的 `params.think`/`params.thinking` 可以为特定模型禁用或强制启用 API thinking。当前运行如果只具有隐式的 `off` 默认值，OpenClaw 会保留该显式配置；但像 `/think medium` 这样的非 off 运行时命令仍会覆盖它。对于显式标记为 `reasoning: false` 的模型，带有真值的 thinking 请求绝不会发送；而 `think: false` 请求无论如何都会发送。

  </Accordion>

  <Accordion title="Reasoning models">
    名为 `deepseek-r1`、`reasoning`、`reason` 或 `think` 的模型默认会被视为支持 reasoning——无需额外配置：

    ```bash
    ollama pull deepseek-r1:32b
    ```

  </Accordion>

  <Accordion title="Model costs">
    Ollama 在本地运行且免费，因此自动发现和手动定义的模型的所有成本都为 `0`。
  </Accordion>

  <Accordion title="Memory embeddings">
    内置的 Ollama 插件会为 [memory search](/concepts/memory) 注册一个 memory embedding 提供方。它使用已配置的 Ollama base URL 和 API key，调用 `/api/embed`，并在可能时将多个 memory chunk 批量合并为一次 `input` 请求。

    当 `proxy.enabled=true` 时，针对由已配置 `baseUrl` 派生出的完全主机本地 loopback origin 的 embedding 请求，会使用 OpenClaw 受保护的直连路径，而不是托管转发代理。已配置的主机名本身必须是 `localhost` 或 loopback IP 字面量——仅仅解析到 loopback 的 DNS 名称仍会使用托管代理路径。LAN、tailnet、私有网络和公共 Ollama 主机始终走托管代理路径，重定向到其他主机/端口不会继承信任。`proxy.loopbackMode: "proxy"` 会让 loopback 流量仍然通过代理路由；`proxy.loopbackMode: "block"` 会在连接前直接拒绝——参见 [Managed proxy](/security/network-proxy#gateway-loopback-mode)。

    | Property | Value |
    | --- | --- |
    | 默认模型 | `nomic-embed-text` |
    | 自动拉取 | 是，如果本地不存在 |
    | 默认 inline 并发 | 1（其他提供方默认更高；如果主机承受得住，可通过 `nonBatchConcurrency` 提高） |

    查询时的 embeddings 会对需要或推荐前缀的模型使用检索前缀：`nomic-embed-text`、`qwen3-embedding` 和 `mxbai-embed-large`。文档批次保持原始格式，因此现有索引无需格式迁移。

    ```json5
    {
      memory: {
        search: {
          provider: "ollama",
          remote: {
            // Default for Ollama. Raise on larger hosts if reindexing is too slow.
            nonBatchConcurrency: 1,
          },
        },
      },
    }
    ```

    对于远程嵌入主机，请将认证范围限定在该主机：

    ```json5
    {
      memory: {
        search: {
          provider: "ollama",
          model: "nomic-embed-text",
          remote: {
            baseUrl: "http://gpu-box.local:11434",
            apiKey: "ollama-local",
            nonBatchConcurrency: 2,
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Streaming configuration">
    Ollama 默认使用 **原生 API**（`/api/chat`），它支持流式传输与工具调用同时进行——无需特殊配置。

    对于原生请求，thinking 控制会直接转发：`/think off` 和 `openclaw agent --thinking off` 会发送顶层 `think: false`，除非显式配置了 `params.think`/`params.thinking`；`/think low|medium|high` 会发送对应的 effort 字符串；`/think max` 会映射到 Ollama 的最高 effort，即 `think: "high"`。

    <Tip>
    如果你想使用 OpenAI 兼容端点，请参见上方的“旧版 OpenAI 兼容模式”——在那里流式传输和工具调用可能无法同时工作。
    </Tip>

  </Accordion>
</AccordionGroup>

## 故障排除

<AccordionGroup>
  <Accordion title="WSL2 崩溃循环（反复重启）">
    在带有 NVIDIA/CUDA 的 WSL2 中，官方 Ollama Linux 安装程序会创建一个带有 `Restart=always` 的 `ollama.service` systemd 单元。如果该服务在 WSL2 启动时自动启动并加载 GPU 后端模型，Ollama 在加载过程中可能会锁定宿主机内存；Hyper-V 内存回收并不总能回收这些页面，因此 Windows 可能终止 WSL2 虚拟机，systemd 再次重启 Ollama，如此循环往复。

    证据：WSL2 反复重启/终止，WSL2 启动后 `app.slice` 或 `ollama.service` 中 CPU 占用很高，并且是来自 systemd 的 SIGTERM，而不是 Linux OOM killer。

    当 OpenClaw 检测到 WSL2、已启用 `ollama.service` 且 `Restart=always`，并且存在可见的 CUDA 标记时，会记录启动警告。

    缓解方法：

    ```bash
    sudo systemctl disable ollama
    ```

    在 Windows 端，将以下内容添加到 `%USERPROFILE%\.wslconfig`，然后运行 `wsl --shutdown`：

    ```ini
    [experimental]
    autoMemoryReclaim=disabled
    ```

    或者缩短 keep-alive / 仅在需要时手动启动 Ollama：

    ```bash
    export OLLAMA_KEEP_ALIVE=5m
    ollama serve
    ```

    参见 [ollama/ollama#11317](https://github.com/ollama/ollama/issues/11317)。

  </Accordion>

  <Accordion title="未检测到 Ollama">
    确认 Ollama 正在运行，已设置 `OLLAMA_API_KEY`（或认证配置文件），并且没有显式定义 `models.providers.ollama`：

    ```bash
    ollama serve
    curl http://localhost:11434/api/tags
    ```

  </Accordion>

  <Accordion title="没有可用模型">
    在本地拉取该模型，或在 `models.providers.ollama` 中显式定义它：

    ```bash
    ollama list  # 查看已安装内容
    ollama pull gemma4
    ollama pull gpt-oss:20b
    ollama pull llama3.3     # 或其他模型
    ```

  </Accordion>

  <Accordion title="连接被拒绝">
    ```bash
    # 检查 Ollama 是否正在运行
    ps aux | grep ollama

    # 或重启 Ollama
    ollama serve
    ```

  </Accordion>

  <Accordion title="远程主机在 curl 中可用，但 OpenClaw 不可用">
    请在运行 Gateway 的同一台机器和运行时中进行验证：

    ```bash
    openclaw gateway status --deep
    curl http://ollama-host:11434/api/tags
    ```

    常见原因：

    - `baseUrl` 指向 `localhost`，但 Gateway 运行在 Docker 中或另一台主机上。
    - URL 使用了 `/v1`，从而选择了 OpenAI 兼容行为而不是原生 Ollama。
    - 远程主机需要防火墙或 LAN 绑定设置调整。
    - 模型在你笔记本电脑的守护进程上，但不在远程主机上。

  </Accordion>

  <Accordion title="模型输出工具 JSON 作为文本">
    通常是提供方处于 OpenAI 兼容模式，或者模型无法处理工具 schema。优先使用原生模式：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            baseUrl: "http://ollama-host:11434",
            api: "ollama",
          },
        },
      },
    }
    ```

    如果某个小型本地模型仍然在工具 schema 上失败，请在该模型条目上设置 `compat.supportsTools: false` 并重新测试。

  </Accordion>

  <Accordion title="Kimi 或 GLM 返回乱码符号">
    对于托管的 Kimi/GLM 返回的较长、非语言性的符号串，会被视为提供方调用失败，而不是成功回复，因此会触发正常的重试/回退/错误处理，而不是将损坏的文本持久写入会话。

    如果问题反复出现，请捕获模型名称、当前会话文件，以及该次运行是否使用了 `Cloud + Local` 或 `Cloud only`，然后尝试新会话和一个回退模型：

    ```bash
    openclaw infer model run --model ollama/kimi-k2.5:cloud --prompt "Reply with exactly: ok" --json
    openclaw models set ollama/gemma4
    ```

  </Accordion>

  <Accordion title="冷启动本地模型超时">
    大型本地模型首次加载可能需要很长时间。将超时时间限定到 Ollama 提供方，并可选地在轮次之间保持模型加载：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            timeoutSeconds: 300,
            models: [
              {
                id: "gemma4:26b",
                name: "gemma4:26b",
                params: { keep_alive: "15m" },
              },
            ],
          },
        },
      },
    }
    ```

    如果主机本身接受连接很慢，`timeoutSeconds` 也会为该提供方延长受保护的连接超时时间。

  </Accordion>

  <Accordion title="大上下文模型太慢或内存不足">
    许多模型声明的上下文比你的硬件能舒适运行的还要大。原生 Ollama 会使用自己的运行时默认值，除非设置了 `params.num_ctx`。为了获得可预测的首 token 延迟，请同时限制 OpenClaw 的预算和 Ollama 的请求上下文：

    ```json5
    {
      models: {
        providers: {
          ollama: {
            contextWindow: 32768,
            maxTokens: 8192,
            models: [
              {
                id: "qwen3.5:9b",
                name: "qwen3.5:9b",
                params: { num_ctx: 32768, thinking: false },
              },
            ],
          },
        },
      },
    }
    ```

    如果 OpenClaw 发送的提示词过多，请降低 `contextWindow`。如果 Ollama 的运行时上下文对机器来说太大，请降低 `params.num_ctx`。如果生成时间过长，请降低 `maxTokens`。

  </Accordion>
</AccordionGroup>

<Note>
更多帮助： [Troubleshooting](/help/troubleshooting) 和 [FAQ](/help/faq)。
</Note>

## 相关内容

<CardGroup cols={2}>
  <Card title="Ollama Cloud" href="/providers/ollama-cloud" icon="cloud">
    仅云端设置，使用专用的 `ollama-cloud` 提供方。
  </Card>
  <Card title="Model providers" href="/concepts/model-providers" icon="layers">
    所有提供方、模型引用和故障切换行为的概览。
  </Card>
  <Card title="模型选择" href="/concepts/models" icon="brain">
    如何选择和配置模型。
  </Card>
  <Card title="Ollama Web Search" href="/tools/ollama-search" icon="magnifying-glass">
    基于 Ollama 的网页搜索的完整设置与行为细节。
  </Card>
  <Card title="配置" href="/gateway/configuration" icon="gear">
    完整配置参考。
  </Card>
</CardGroup>