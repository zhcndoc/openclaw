---
summary: "通过 API 密钥或 Codex 订阅在 OpenClaw 中使用 OpenAI"
read_when:
  - 你想在 OpenClaw 中使用 OpenAI 模型
  - 你想使用 Codex 订阅认证而不是 API 密钥
  - 你需要更严格的 GPT-5 代理执行行为
title: "OpenAI"
---

OpenAI 为 GPT 模型提供开发者 API，Codex 也可以通过 OpenAI 的 Codex 客户端作为
ChatGPT 方案的编码代理使用。OpenClaw 会将这些接口分开，以便配置保持可预测。

OpenClaw 使用 `openai/*` 作为 OpenAI 的规范模型路由。嵌入式代理转为
OpenAI 模型时，默认通过原生 Codex 应用服务器运行时；对于图像、嵌入、语音和实时等
非代理 OpenAI 界面，仍可直接使用 OpenAI API 密钥认证。

- **代理模型** - 通过 Codex 运行时使用 `openai/*` 模型；使用
  `openai-codex` 认证登录以便通过 ChatGPT/Codex 订阅使用，或者在你明确想要 API 密钥认证时配置
  `openai-codex` API 密钥配置文件。
- **非代理 OpenAI API** - 通过 `OPENAI_API_KEY` 或 OpenAI API 密钥引导，直接访问 OpenAI Platform，并按用量计费。
- **旧版配置** - `openai-codex/*` 模型引用会被
  `openclaw doctor --fix` 修复为 `openai/*` 加 Codex 运行时。

OpenAI 明确支持在 OpenClaw 之类的外部工具和工作流中使用订阅 OAuth。

提供方、模型、运行时和通道是分开的层。如果这些标签
混在一起了，请在更改配置前先阅读 [代理运行时](/concepts/agent-runtimes)。

## 快速选择

| Goal                                                 | Use                                                     | Notes                                                                 |
| ---------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| ChatGPT/Codex subscription with native Codex runtime | `openai/gpt-5.5`                                        | 默认 OpenAI 代理设置。使用 `openai-codex` 认证登录。         |
| Direct API-key billing for agent models              | `openai/gpt-5.5` plus an `openai-codex` API-key profile | 使用 `auth.order.openai-codex` 来优先选择该配置文件。                 |
| Direct API-key billing through explicit PI           | `openai/gpt-5.5` plus provider/model runtime `pi`       | 选择一个普通的 `openai` API 密钥配置文件。                             |
| Latest ChatGPT Instant API alias                     | `openai/chat-latest`                                    | 仅支持直接 API 密钥。用于实验的移动别名，不是默认值。   |
| ChatGPT/Codex subscription auth through explicit PI  | `openai/gpt-5.5` plus provider/model runtime `pi`       | 选择一个 `openai-codex` 认证配置文件以使用兼容路由。    |
| Image generation or editing                          | `openai/gpt-image-2`                                    | 可与 `OPENAI_API_KEY` 或 OpenAI Codex OAuth 一起使用。             |
| Transparent-background images                        | `openai/gpt-image-1.5`                                  | 使用 `outputFormat=png` 或 `webp` 以及 `openai.background=transparent`。 |

## 命名映射

这些名称相似，但不能互换：

| Name you see                            | Layer               | Meaning                                                                                           |
| --------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------- |
| `openai`                                | Provider prefix     | 规范的 OpenAI 模型路由；代理转为使用 Codex 运行时。                                  |
| `openai-codex`                          | Auth/profile prefix | OpenAI Codex OAuth/订阅认证配置文件提供方。                                            |
| `codex` plugin                          | Plugin              | 捆绑的 OpenClaw 插件，提供原生 Codex 应用服务器运行时和 `/codex` 聊天控制。 |
| provider/model `agentRuntime.id: codex` | Agent runtime       | 强制匹配的嵌入式回合使用原生 Codex 应用服务器执行环境。                            |
| `/codex ...`                            | Chat command set    | 从对话中绑定/控制 Codex 应用服务器线程。                                        |
| `runtime: "acp", agentId: "codex"`      | ACP session route   | 通过 ACP/acpx 运行 Codex 的显式回退路径。                                          |

这意味着一个配置中可以故意同时包含 `openai/*` 模型引用和
`openai-codex` 认证配置文件。`openclaw doctor --fix` 会把旧的
`openai-codex/*` 模型引用重写为规范的 OpenAI 模型路由。

<Note>
GPT-5.5 可通过直接 OpenAI Platform API 密钥访问以及
订阅/OAuth 路由获取。对于 ChatGPT/Codex 订阅加原生 Codex
执行，请使用 `openai/gpt-5.5`；未设置运行时配置时会为 OpenAI 代理回合选择 Codex
执行环境。仅当你想为 OpenAI 代理模型使用直接 API 密钥认证时，才使用 OpenAI API 密钥配置文件。
</Note>

<Note>
OpenAI 代理模型回合需要捆绑的 Codex 应用服务器插件。显式
PI 运行时配置仍可作为可选的兼容路由。若明确选择 PI
并使用 `openai-codex` 认证配置文件，OpenClaw 会保留
公开模型引用为 `openai/*`，并在内部通过旧版
Codex 认证传输路由到 PI。运行 `openclaw doctor --fix` 可修复陈旧的
`openai-codex/*` 模型引用或不来自
显式运行时配置的旧 PI 会话固定项。
</Note>

## OpenClaw 功能覆盖

| OpenAI capability         | OpenClaw surface                                                                 | Status                                                 |
| ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Chat / Responses          | `openai/<model>` model provider                                                  | Yes                                                    |
| Codex subscription models | `openai/<model>` with `openai-codex` OAuth                                       | Yes                                                    |
| Legacy Codex model refs   | `openai-codex/<model>`                                                           | Repaired by doctor to `openai/<model>`                 |
| Codex app-server harness  | `openai/<model>` with omitted runtime or provider/model `agentRuntime.id: codex` | Yes                                                    |
| Server-side web search    | Native OpenAI Responses tool                                                     | Yes, when web search is enabled and no provider pinned |
| Images                    | `image_generate`                                                                 | Yes                                                    |
| Videos                    | `video_generate`                                                                 | Yes                                                    |
| Text-to-speech            | `messages.tts.provider: "openai"` / `tts`                                        | Yes                                                    |
| Batch speech-to-text      | `tools.media.audio` / media understanding                                        | Yes                                                    |
| Streaming speech-to-text  | Voice Call `streaming.provider: "openai"`                                        | Yes                                                    |
| Realtime voice            | Voice Call `realtime.provider: "openai"` / Control UI Talk                       | Yes                                                    |
| Embeddings                | memory embedding provider                                                        | Yes                                                    |

## 内存嵌入

OpenClaw 可以使用 OpenAI，或 OpenAI 兼容的嵌入端点，来进行
`memory_search` 索引和查询嵌入：

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "openai",
        model: "text-embedding-3-small",
      },
    },
  },
}
```

对于需要非对称嵌入标签的 OpenAI 兼容端点，请在 `memorySearch` 下设置
`queryInputType` 和 `documentInputType`。OpenClaw 会将这些作为特定提供方的 `input_type` 请求字段转发：查询嵌入使用
`queryInputType`；已索引的内存块和批量索引使用
`documentInputType`。完整示例请参见 [内存配置参考](/reference/memory-config#provider-specific-config)。

## 快速开始

选择你偏好的认证方式并按照设置步骤操作。

<Tabs>
  <Tab title="API 密钥（OpenAI Platform）">
    **最适合：** 直接 API 访问和按使用量计费。

    <Steps>
      <Step title="获取你的 API 密钥">
        从 [OpenAI Platform 控制台](https://platform.openai.com/api-keys) 创建或复制一个 API 密钥。
      </Step>
      <Step title="运行引导">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step title="验证模型可用">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### 路由摘要

    | Model ref              | Runtime config             | Route                       | Auth             |
    | ---------------------- | -------------------------- | --------------------------- | ---------------- |
    | `openai/gpt-5.5`      | omitted / provider/model `agentRuntime.id: "codex"` | Codex app-server harness | `openai-codex` profile |
    | `openai/gpt-5.4-mini` | omitted / provider/model `agentRuntime.id: "codex"` | Codex app-server harness | `openai-codex` profile |
    | `openai/gpt-5.5`      | provider/model `agentRuntime.id: "pi"`              | PI embedded runtime      | `openai` profile or selected `openai-codex` profile |

    <Note>
    `openai/*` 代理模型使用 Codex 应用服务器执行环境。若要为代理模型使用 API 密钥
    认证，请创建一个 `openai-codex` API 密钥配置文件，并用
    `auth.order.openai-codex` 指定其优先级；`OPENAI_API_KEY` 仍是非代理 OpenAI API 界面的直接
    回退方案。
    </Note>

    ### 配置示例

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/gpt-5.5" } } },
    }
    ```

    要通过 OpenAI API 尝试 ChatGPT 当前的 Instant 模型，请将模型
    设置为 `openai/chat-latest`：

    ```json5
    {
      env: { OPENAI_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest` 是一个移动别名。OpenAI 将其描述为 ChatGPT 中使用的最新 Instant
    模型，并建议在生产 API 用途中使用 `gpt-5.5`，因此
    除非你明确需要该别名行为，否则请将 `openai/gpt-5.5` 作为稳定默认值。该别名当前只接受
    `medium` 文本冗长度，因此 OpenClaw 会为此模型规范化不兼容的 OpenAI 文本冗长度覆盖。

    <Warning>
    OpenClaw **不**公开 `openai/gpt-5.3-codex-spark`。在线 OpenAI API 请求会拒绝该模型，当前的 Codex 目录也未公开它。
    </Warning>

  </Tab>

  <Tab title="Codex subscription">
    **最适合：** 使用你的 ChatGPT/Codex 订阅并采用原生 Codex 应用服务器执行，而不是单独的 API 密钥。Codex 云端需要 ChatGPT 登录。

    <Steps>
      <Step title="运行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai-codex
        ```

        或直接运行 OAuth：

        ```bash
        openclaw models auth login --provider openai-codex
        ```

        对于无头或回调受限的环境，添加 `--device-code`，使用 ChatGPT 设备码流程登录，而不是本地主机浏览器回调：

        ```bash
        openclaw models auth login --provider openai-codex --device-code
        ```
      </Step>
      <Step title="使用规范的 OpenAI 模型路由">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.5
        ```

        默认路径不需要运行时配置。OpenAI 代理回合会
        自动选择原生 Codex 应用服务器运行时，而 OpenClaw 在选择此路由时会
        安装或修复捆绑的 Codex 插件。
      </Step>
      <Step title="验证 Codex 认证是否可用">
        ```bash
        openclaw models list --provider openai-codex
        ```

        网关运行后，在聊天中发送 `/codex status` 或 `/codex models`
        以验证原生应用服务器运行时。
      </Step>
    </Steps>

    ### 路由摘要

    | Model ref | Runtime config | Route | Auth |
    |-----------|----------------|-------|------|
    | `openai/gpt-5.5` | omitted / provider/model `agentRuntime.id: "codex"` | Native Codex app-server harness | Codex sign-in or selected `openai-codex` profile |
    | `openai/gpt-5.5` | provider/model `agentRuntime.id: "pi"` | PI embedded runtime with internal Codex-auth transport | Selected `openai-codex` profile |
    | `openai-codex/gpt-5.5` | repaired by doctor | Legacy route rewritten to `openai/gpt-5.5` | Existing `openai-codex` profile |

    <Warning>
    不要配置较旧的 `openai-codex/gpt-5.1*`、`openai-codex/gpt-5.2*` 或
    `openai-codex/gpt-5.3*` 模型引用。ChatGPT/Codex OAuth 账户现在会拒绝
    这些模型。请使用 `openai/gpt-5.5`；OpenAI 代理回合现在默认选择 Codex
    运行时。
    </Warning>

    <Note>
    认证/配置文件命令仍请使用 `openai-codex` 提供方 id。`openai-codex/*` 模型前缀是已由 doctor 修复的旧版配置。对于常见的订阅加原生运行时设置，请使用 `openai-codex` 登录，但将模型引用保持为 `openai/gpt-5.5`。
    </Note>

    ### 配置示例

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.5" },
        },
      },
    }
    ```

    <Note>
    引导过程不再从 `~/.codex` 导入 OAuth 材料。请使用浏览器 OAuth（默认）或上面的设备码流程登录——OpenClaw 会在其自己的代理认证存储中管理生成的凭据。
    </Note>

    ### 检查并恢复 Codex OAuth 路由

    使用这些命令查看默认
    代理正在使用哪个模型、运行时和认证路由：

    ```bash
    openclaw models status
    openclaw models auth list --provider openai-codex
    openclaw config get agents.defaults.model --json
    openclaw config get models.providers.openai.agentRuntime --json
    ```

    对于特定代理，添加 `--agent <id>`：

    ```bash
    openclaw models status --agent <id>
    openclaw models auth list --agent <id> --provider openai-codex
    ```

    如果旧配置中仍有 `openai-codex/gpt-*` 或没有显式运行时配置的过期 OpenAI PI
    会话固定项，请修复它：

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    如果 `models auth list --provider openai-codex` 显示没有可用配置文件，请重新登录：

    ```bash
    openclaw models auth login --provider openai-codex
    openclaw models status --probe --probe-provider openai-codex
    ```

    `openai-codex` 仍然是认证/配置文件提供方 id。`openai/*` 是
    通过 Codex 运行的 OpenAI 代理回合的模型路由。

    ### 状态指示器

    聊天中的 `/status` 会显示当前会话正在使用的模型运行时。
    对于 OpenAI 代理模型回合，捆绑的 Codex 应用服务器执行环境会显示为 `Runtime: OpenAI Codex`。过期的 PI 会话固定项会被修复为 Codex，除非
    配置中明确固定为 PI。

    ### Doctor 警告

    如果配置或
    会话状态中仍存在 `openai-codex/*` 路由或过期的 OpenAI PI 固定项，
    `openclaw doctor --fix` 会将它们重写为带有
    Codex 运行时的 `openai/*`，除非明确配置了 PI。

    ### 上下文窗口上限

    OpenClaw 将模型元数据与运行时上下文上限视为两个独立值。

    对于通过 Codex OAuth 目录的 `openai/gpt-5.5`：

    - 原生 `contextWindow`: `1000000`
    - 默认运行时 `contextTokens` 上限: `272000`

    较小的默认上限在实际使用中具有更好的延迟和质量特性。可使用 `contextTokens` 覆盖它：

    ```json5
    {
      models: {
        providers: {
          "openai-codex": {
            models: [{ id: "gpt-5.5", contextTokens: 160000 }],
          },
        },
      },
    }
    ```

    <Note>
    使用 `contextWindow` 声明原生模型元数据。使用 `contextTokens` 限制运行时上下文预算。
    </Note>

    ### 目录恢复

    当上游 Codex 目录中存在 `gpt-5.5` 时，OpenClaw 会使用其元数据。如果
    账户已认证但实时 Codex 发现未包含 `gpt-5.5` 条目，
    OpenClaw 会合成该 OAuth 模型条目，以便 cron、子代理和配置的默认模型运行不会因
    `Unknown model` 而失败。

  </Tab>
</Tabs>

## 原生 Codex app-server 认证

原生 Codex app-server harness 使用 `openai/*` 模型引用，并省略
运行时配置或 provider/model `agentRuntime.id: "codex"`，但其认证仍然
是基于账户的。OpenClaw 按以下顺序选择认证方式：

1. 显式绑定到 agent 的 OpenClaw `openai-codex` 认证配置文件。
2. app-server 现有的账户，例如本地 Codex CLI 的 ChatGPT 登录。
3. 仅对于本地 stdio 启动的 app-server：当 app-server 报告没有账户但仍需要 OpenAI 认证时，先使用 `CODEX_API_KEY`，再使用
   `OPENAI_API_KEY`。

这意味着，本地 ChatGPT/Codex 订阅登录并不会因为网关进程也拥有用于直接 OpenAI 模型或 embeddings 的 `OPENAI_API_KEY` 就被替换掉。环境变量 API key 回退仅适用于本地 stdio 的无账户路径；它不会发送到 WebSocket app-server 连接。当选择了订阅式 Codex 配置文件时，OpenClaw 也会将 `CODEX_API_KEY` 和 `OPENAI_API_KEY` 排除在启动的 stdio app-server 子进程之外，并通过 app-server 登录 RPC 发送所选凭据。

## 图像生成

捆绑的 `openai` 插件通过 `image_generate` 工具注册图像生成。
它通过同一个 `openai/gpt-image-2` 模型引用，支持 OpenAI API key 图像生成和 Codex OAuth 图像
生成。

| 能力                     | OpenAI API key                      | Codex OAuth                          |
| ------------------------ | ----------------------------------- | ------------------------------------ |
| 模型引用                 | `openai/gpt-image-2`               | `openai/gpt-image-2`                 |
| 认证                     | `OPENAI_API_KEY`                   | OpenAI Codex OAuth 登录              |
| 传输方式                 | OpenAI Images API                  | Codex Responses 后端                |
| 每次请求最大图像数       | 4                                  | 4                                    |
| 编辑模式                 | 已启用（最多 5 张参考图像）        | 已启用（最多 5 张参考图像）          |
| 尺寸覆盖                 | 支持，包括 2K/4K 尺寸              | 支持，包括 2K/4K 尺寸                |
| 宽高比 / 分辨率          | 不转发到 OpenAI Images API        | 在安全时映射为受支持的尺寸           |

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "openai/gpt-image-2" },
    },
  },
}
```

<Note>
有关共享工具参数、提供方选择和故障转移行为，请参见 [图像生成](/tools/image-generation)。
</Note>

`gpt-image-2` 是 OpenAI 文本生成图像和图像编辑的默认模型。`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 仍然可以作为显式模型覆盖使用。要输出透明背景的 PNG/WebP，请使用 `openai/gpt-image-1.5`；当前的 `gpt-image-2` API 会拒绝
`background: "transparent"`。

对于透明背景请求，agent 应调用 `image_generate`，并设置
`model: "openai/gpt-image-1.5"`、`outputFormat: "png"` 或 `"webp"`，以及
`background: "transparent"`；旧的 `openai.background` 提供方选项
仍然被接受。OpenClaw 也会通过将默认的 `openai/gpt-image-2` 透明
请求重写为 `gpt-image-1.5` 来保护公共 OpenAI 和
OpenAI Codex OAuth 路由；Azure 和自定义 OpenAI 兼容端点则保留
其已配置的部署/模型名称。

相同设置也可用于无头 CLI 运行：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "一张放在透明背景上的简洁红色圆形贴纸" \
  --json
```

当从输入文件开始进行编辑时，请在
`openclaw infer image edit` 中使用相同的 `--output-format` 和 `--background` 标志。
`--openai-background` 仍然可作为 OpenAI 专用别名使用。

对于 Codex OAuth 安装，请保持相同的 `openai/gpt-image-2` 引用。当配置了
`openai-codex` OAuth 配置文件时，OpenClaw 会解析该存储的 OAuth
访问令牌，并通过 Codex Responses 后端发送图像请求。它不会先尝试
`OPENAI_API_KEY`，也不会在该请求中静默回退到 API key。若想直接使用 OpenAI Images API
路径，请显式将 `models.providers.openai` 配置为 API key、
自定义 base URL 或 Azure 端点。
如果该自定义图像端点位于受信任的 LAN/私有地址上，还要设置
`browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；除非启用此选项，OpenClaw 会继续阻止私有/内部的 OpenAI 兼容图像端点。

生成：

```
/tool image_generate model=openai/gpt-image-2 prompt="OpenClaw 在 macOS 上的精致发布海报" size=3840x2160 count=1
```

生成透明 PNG：

```
/tool image_generate model=openai/gpt-image-1.5 prompt="一个放在透明背景上的简洁红色圆形贴纸" outputFormat=png background=transparent
```

编辑：

```
/tool image_generate model=openai/gpt-image-2 prompt="保留物体形状，将材质改为半透明玻璃" image=/path/to/reference.png size=1024x1536
```

## 视频生成

捆绑的 `openai` 插件通过 `video_generate` 工具注册视频生成。

| 能力             | 值                                                                                |
| ---------------- | --------------------------------------------------------------------------------- |
| 默认模型         | `openai/sora-2`                                                                   |
| 模式             | 文本生成视频、图像生成视频、单视频编辑                                              |
| 参考输入         | 1 张图像或 1 段视频                                                               |
| 尺寸覆盖         | 支持                                                                         |
| 其他覆盖         | `aspectRatio`、`resolution`、`audio`、`watermark` 会被忽略，并给出工具警告 |

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "openai/sora-2" },
    },
  },
}
```

<Note>
有关共享工具参数、提供方选择和故障转移行为，请参见 [视频生成](/tools/video-generation)。
</Note>

## GPT-5 提示贡献

OpenClaw 为跨 provider 的 GPT-5 系列运行添加了共享的 GPT-5 提示贡献。它按模型 id 应用，因此 `openai/gpt-5.5`、修复前的旧引用如 `openai-codex/gpt-5.5`、`openrouter/openai/gpt-5.5`、`opencode/gpt-5.5` 以及其他兼容的 GPT-5 引用都会收到相同的叠加层。较旧的 GPT-4.x 模型不会。

捆绑的原生 Codex harness 通过 Codex app-server 开发者指令使用相同的 GPT-5 行为和 heartbeat 叠加层，因此通过 Codex 路由的 `openai/gpt-5.x` 会话即使其余 harness 提示由 Codex 控制，也仍保留相同的跟进与主动 heartbeat 指导。

GPT-5 贡献增加了一个带标签的行为契约，涵盖人格持久性、执行安全、工具纪律、输出形态、完成检查和验证。与频道相关的回复和静默消息行为仍保留在共享的 OpenClaw 系统提示和出站投递策略中。GPT-5 指导始终对匹配模型启用。友好交互风格层是独立的，并且可配置。

| 值                   | 效果                               |
| -------------------- | ---------------------------------- |
| `"friendly"`（默认） | 启用友好交互风格层                 |
| `"on"`               | `"friendly"` 的别名                |
| `"off"`              | 仅禁用友好风格层                   |

<Tabs>
  <Tab title="Config">
    ```json5
    {
      agents: {
        defaults: {
          promptOverlays: {
            gpt5: { personality: "friendly" },
          },
        },
      },
    }
    ```
  </Tab>
  <Tab title="CLI">
    ```bash
    openclaw config set agents.defaults.promptOverlays.gpt5.personality off
    ```
  </Tab>
</Tabs>

<Tip>
运行时值不区分大小写，因此 `"Off"` 和 `"off"` 都会禁用友好风格层。
</Tip>

<Note>
当共享的 `agents.defaults.promptOverlays.gpt5.personality` 设置未配置时，旧版 `plugins.entries.openai.config.personality` 仍会作为兼容性回退被读取。
</Note>

## 语音与音频

<AccordionGroup>
  <Accordion title="语音合成（TTS）">
    捆绑的 `openai` 插件为 `messages.tts` 表面注册语音合成。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `messages.tts.providers.openai.model` | `gpt-4o-mini-tts` |
    | 声音 | `messages.tts.providers.openai.voice` | `coral` |
    | 速度 | `messages.tts.providers.openai.speed` | （未设置） |
    | 指令 | `messages.tts.providers.openai.instructions` | （未设置，仅 `gpt-4o-mini-tts`） |
    | 格式 | `messages.tts.providers.openai.responseFormat` | 语音备注为 `opus`，文件为 `mp3` |
    | API key | `messages.tts.providers.openai.apiKey` | 回退到 `OPENAI_API_KEY` |
    | Base URL | `messages.tts.providers.openai.baseUrl` | `https://api.openai.com/v1` |
    | Extra body | `messages.tts.providers.openai.extraBody` / `extra_body` | （未设置） |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用声音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

    `extraBody` 会在 OpenClaw 生成字段之后合并到 `/audio/speech` 请求 JSON 中，因此可用于需要额外键（如 `lang`）的 OpenAI 兼容端点。原型键会被忽略。

    ```json5
    {
      messages: {
        tts: {
          providers: {
            openai: { model: "gpt-4o-mini-tts", voice: "coral" },
          },
        },
      },
    }
    ```

    <Note>
    设置 `OPENAI_TTS_BASE_URL` 可覆盖 TTS base URL，而不影响 chat API 端点。
    </Note>

  </Accordion>

  <Accordion title="语音转文本">
    捆绑的 `openai` 插件通过 OpenClaw 的媒体理解转录表面注册批量语音转文本。

    - 默认模型：`gpt-4o-transcribe`
    - 端点：OpenAI REST `/v1/audio/transcriptions`
    - 输入路径：multipart 音频文件上传
    - 由 OpenClaw 在所有入站音频转录使用 `tools.media.audio` 的地方支持，包括 Discord 语音频道片段和频道音频附件

    要强制入站音频转录使用 OpenAI：

    ```json5
    {
      tools: {
        media: {
          audio: {
            models: [
              {
                type: "provider",
                provider: "openai",
                model: "gpt-4o-transcribe",
              },
            ],
          },
        },
      },
    }
    ```

    当共享的音频媒体配置或单次转录请求提供语言和提示提示时，它们会被转发给 OpenAI。

  </Accordion>

  <Accordion title="实时转录">
    捆绑的 `openai` 插件为 Voice Call 插件注册实时转录。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | 模型 | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 语言 | `...openai.language` | （未设置） |
    | 提示 | `...openai.prompt` | （未设置） |
    | 静音时长 | `...openai.silenceDurationMs` | `800` |
    | VAD 阈值 | `...openai.vadThreshold` | `0.5` |
    | API key | `...openai.apiKey` | 回退到 `OPENAI_API_KEY` |

    <Note>
    使用到 `wss://api.openai.com/v1/realtime` 的 WebSocket 连接，并使用 G.711 u-law（`g711_ulaw` / `audio/pcmu`）音频。此流式提供方仅用于 Voice Call 的实时转录路径；Discord 语音当前会录制短片段并使用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="实时语音">
    捆绑的 `openai` 插件为 Voice Call 插件注册实时语音。

    | 设置 | 配置路径 | 默认值 |
    |---------|------------|---------|
    | Model | `plugins.entries.voice-call.config.realtime.providers.openai.model` | `gpt-realtime-2` |
    | Voice | `...openai.voice` | `alloy` |
    | Temperature (Azure deployment bridge) | `...openai.temperature` | `0.8` |
    | VAD threshold | `...openai.vadThreshold` | `0.5` |
    | Silence duration | `...openai.silenceDurationMs` | `500` |
    | API key | `...openai.apiKey` | 回退到 `OPENAI_API_KEY` |

    `gpt-realtime-2` 可用的内置 Realtime 声音：`alloy`、`ash`、
    `ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、`marin`、`cedar`。
    OpenAI 推荐使用 `marin` 和 `cedar` 以获得最佳 Realtime 质量。这
    与上面的文本转语音声音是不同的一组；不要假设类似 `fable`、
    `nova` 或 `onyx` 的 TTS 声音也可用于 Realtime 会话。

    <Note>
    后端 OpenAI realtime 桥接使用 GA Realtime WebSocket 会话形态，不接受 `session.temperature`。Azure OpenAI 部署仍可通过 `azureEndpoint` 和 `azureDeployment` 使用，并保持与部署兼容的会话形态。支持双向工具调用和 G.711 u-law 音频。
    </Note>

    <Note>
    Realtime 声音在会话创建时选定。OpenAI 允许大多数
    会话字段在之后更改，但一旦模型在该会话中发出过音频，就不能再
    更改声音。OpenClaw 当前将内置 Realtime 声音 id 作为字符串暴露。
    </Note>

    <Note>
    Control UI Talk 使用 OpenAI browser realtime 会话，借助 Gateway 签发的
    临时 client secret，并通过浏览器 WebRTC SDP 直接与
    OpenAI Realtime API 交换。维护者可通过以下命令进行实时验证：
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`；
    OpenAI 路径会在不记录密钥的情况下验证后端 WebSocket 桥接和浏览器
    WebRTC SDP 交换。
    </Note>

  </Accordion>
</AccordionGroup>

## Azure OpenAI 端点

捆绑的 `openai` 提供程序可以通过覆盖基础 URL，将 Azure OpenAI 资源用于图像
生成。在图像生成路径上，OpenClaw 会在 `models.providers.openai.baseUrl` 上检测
Azure 主机名，并自动切换为 Azure 的请求格式。

<Note>
实时语音使用单独的配置路径
（`plugins.entries.voice-call.config.realtime.providers.openai.azureEndpoint`），
不受 `models.providers.openai.baseUrl` 影响。有关其 Azure 设置，请参见
[Voice and speech](#voice-and-speech) 下的 **Realtime voice** 折叠面板。
</Note>

在以下情况下使用 Azure OpenAI：

- 你已经拥有 Azure OpenAI 订阅、配额或企业协议
- 你需要 Azure 提供的区域性数据驻留或合规控制
- 你希望将流量保留在现有的 Azure 租户内

### 配置

对于通过捆绑的 `openai` 提供程序进行的 Azure 图像生成，请将
`models.providers.openai.baseUrl` 指向你的 Azure 资源，并将 `apiKey` 设置为
Azure OpenAI 密钥（不是 OpenAI Platform 密钥）：

```json5
{
  models: {
    providers: {
      openai: {
        baseUrl: "https://<your-resource>.openai.azure.com",
        apiKey: "<azure-openai-api-key>",
      },
    },
  },
}
```

OpenClaw 会识别以下 Azure 主机后缀，以用于 Azure 图像生成
路由：

- `*.openai.azure.com`
- `*.services.ai.azure.com`
- `*.cognitiveservices.azure.com`

对于在已识别的 Azure 主机上的图像生成请求，OpenClaw：

- 发送 `api-key` 请求头，而不是 `Authorization: Bearer`
- 使用部署范围路径（`/openai/deployments/{deployment}/...`）
- 为每个请求追加 `?api-version=...`
- 对 Azure 图像生成调用使用默认 600 秒请求超时。
  单次调用的 `timeoutMs` 仍然会覆盖此默认值。

其他基础 URL（公共 OpenAI、OpenAI 兼容代理）会保持标准的
OpenAI 图像请求格式。

<Note>
`openai` 提供程序图像生成路径的 Azure 路由要求
OpenClaw 2026.4.22 或更高版本。较早版本会将任何自定义的
`openai.baseUrl` 当作公共 OpenAI 端点处理，并在 Azure 图像部署上失败。
</Note>

### API 版本

设置 `AZURE_OPENAI_API_VERSION` 以为 Azure 图像生成路径固定一个特定的 Azure 预览版或 GA 版本：

```bash
export AZURE_OPENAI_API_VERSION="2024-12-01-preview"
```

当该变量未设置时，默认值为 `2024-12-01-preview`。

### 模型名称是部署名称

Azure OpenAI 将模型绑定到部署。对于通过捆绑的 `openai` 提供程序路由的 Azure 图像生成请求，
OpenClaw 中的 `model` 字段必须是你在 Azure 门户中配置的 **Azure 部署名称**，
而不是公共 OpenAI 模型 id。

如果你创建了一个名为 `gpt-image-2-prod` 的部署，用于提供 `gpt-image-2`：

```
/tool image_generate model=openai/gpt-image-2-prod prompt="A clean poster" size=1024x1024 count=1
```

相同的部署名称规则也适用于通过捆绑的 `openai` 提供程序路由的图像生成调用。

### 区域可用性

Azure 图像生成目前仅在部分区域可用
（例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、
`uaenorth`）。在创建部署之前，请查看 Microsoft 的当前区域列表，并确认
特定模型在你的区域中可用。

### 参数差异

Azure OpenAI 和公共 OpenAI 并不总是接受相同的图像参数。
Azure 可能会拒绝公共 OpenAI 允许的选项（例如 `gpt-image-2` 上的某些
`background` 值），或者仅在特定模型版本上提供这些选项。这些差异来自 Azure
及其底层模型，而不是 OpenClaw。如果 Azure 请求因验证错误而失败，请在
Azure 门户中检查你的特定部署和 API 版本所支持的参数集合。

<Note>
Azure OpenAI 使用原生传输和兼容行为，但不会接收
OpenClaw 的隐藏归因请求头——请参见 [Advanced configuration](#advanced-configuration)
下的 **Native vs OpenAI-compatible routes** 折叠面板。

对于 Azure 上的聊天或 Responses 流量（不只是图像生成），请使用
入门流程或专用的 Azure 提供程序配置——仅 `openai.baseUrl` 并不会自动使用 Azure 的 API/身份验证格式。
另有一个单独的 `azure-openai-responses/*` 提供程序；请参见下面的服务器端压缩折叠面板。
</Note>

## 高级配置

<AccordionGroup>
  <Accordion title="传输（WebSocket vs SSE）">
    OpenClaw 对 `openai/*` 默认采用 WebSocket 优先，并在失败时回退到 SSE（`"auto"`）。

    在 `"auto"` 模式下，OpenClaw：
    - 在回退到 SSE 之前，会重试一次早期的 WebSocket 失败
    - 失败后，会将 WebSocket 标记为约降级 60 秒，并在冷却期间使用 SSE
    - 为重试和重新连接附加稳定的会话和轮次身份请求头
    - 在不同传输变体之间规范化用量计数器（`input_tokens` / `prompt_tokens`）

    | 值 | 行为 |
    |-------|----------|
    | `"auto"`（默认） | WebSocket 优先，SSE 回退 |
    | `"sse"` | 仅强制使用 SSE |
    | `"websocket"` | 仅强制使用 WebSocket |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              params: { transport: "auto" },
            },
          },
        },
      },
    }
    ```

    相关 OpenAI 文档：
    - [使用 WebSocket 的 Realtime API](https://platform.openai.com/docs/guides/realtime-websocket)
    - [流式 API 响应（SSE）](https://platform.openai.com/docs/guides/streaming-responses)

  </Accordion>

  <Accordion title="Fast mode">
    OpenClaw 为 `openai/*` 提供一个共享的快速模式开关：

    - **聊天/UI：** `/fast status|on|off`
    - **配置：** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    启用后，OpenClaw 会将快速模式映射为 OpenAI 的优先处理（`service_tier = "priority"`）。现有的 `service_tier` 值会被保留，并且快速模式不会重写 `reasoning` 或 `text.verbosity`。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { fastMode: true } },
          },
        },
      },
    }
    ```

    <Note>
    会话覆盖优先于配置。在 Sessions UI 中清除会话覆盖后，会使该会话恢复为配置的默认值。
    </Note>

  </Accordion>

  <Accordion title="优先处理（service_tier）">
    OpenAI 的 API 通过 `service_tier` 暴露优先处理功能。在 OpenClaw 中按模型设置：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { serviceTier: "priority" } },
          },
        },
      },
    }
    ```

    支持的值：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `serviceTier` 只会转发到原生 OpenAI 端点（`api.openai.com`）和原生 Codex 端点（`chatgpt.com/backend-api`）。如果你通过代理路由任一提供程序，OpenClaw 会保留 `service_tier` 不变。
    </Warning>

  </Accordion>

  <Accordion title="服务器端压缩（Responses API）">
    对于直接的 OpenAI Responses 模型（`api.openai.com` 上的 `openai/*`），OpenAI 插件的 Pi-harness 流包装器会自动启用服务器端压缩：

    - 强制 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 默认 `compact_threshold`：`contextWindow` 的 70%（如果不可用则为 `80000`）

    此设置适用于内置的 Pi harness 路径，以及嵌入式运行所使用的 OpenAI 提供程序钩子。原生 Codex 应用服务器 harness 通过 Codex 管理自己的上下文，并由 OpenAI 的默认代理路由或提供程序/模型运行时策略进行配置。

    <Tabs>
      <Tab title="显式启用">
        适用于兼容端点，例如 Azure OpenAI Responses：

        ```json5
        {
          agents: {
            defaults: {
              models: {
                "azure-openai-responses/gpt-5.5": {
                  params: { responsesServerCompaction: true },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="自定义阈值">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: {
                    responsesServerCompaction: true,
                    responsesCompactThreshold: 120000,
                  },
                },
              },
            },
          },
        }
        ```
      </Tab>
      <Tab title="禁用">
        ```json5
        {
          agents: {
            defaults: {
              models: {
                "openai/gpt-5.5": {
                  params: { responsesServerCompaction: false },
                },
              },
            },
          },
        }
        ```
      </Tab>
    </Tabs>

    <Note>
    `responsesServerCompaction` 仅控制 `context_management` 的注入。直接的 OpenAI Responses 模型仍会强制 `store: true`，除非兼容性设置了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="严格代理式 GPT 模式">
    对于 `openai/*` 上的 GPT-5 系列运行，OpenClaw 可以使用更严格的嵌入式执行契约：

    ```json5
    {
      agents: {
        defaults: {
          embeddedPi: { executionContract: "strict-agentic" },
        },
      },
    }
    ```

    使用 `strict-agentic` 时，OpenClaw：
    - 当存在可用工具操作时，不再将仅规划的一轮视为成功进展
    - 使用“立即执行”引导重试该轮
    - 为较大的工作自动启用 `update_plan`
    - 如果模型持续规划而不执行，则显示明确的阻塞状态

    <Note>
    仅适用于 OpenAI 和 Codex 的 GPT-5 系列运行。其他提供程序和较旧的模型系列保持默认行为。
    </Note>

  </Accordion>

  <Accordion title="原生 vs OpenAI 兼容路由">
    OpenClaw 会将直接 OpenAI、Codex 和 Azure OpenAI 端点，与通用的 OpenAI 兼容 `/v1` 代理区别对待：

    **原生路由**（`openai/*`、Azure OpenAI）：
    - 仅对支持 OpenAI `none` effort 的模型保留 `reasoning: { effort: "none" }`
    - 对拒绝 `reasoning.effort: "none"` 的模型或代理省略已禁用的 reasoning
    - 默认将工具 schema 设为严格模式
    - 仅在已验证的原生主机上附加隐藏归因请求头
    - 保留仅 OpenAI 的请求形状（`service_tier`、`store`、reasoning 兼容性、prompt-cache 提示）

    **代理/兼容路由：**
    - 使用更宽松的兼容行为
    - 从非原生的 `openai-completions` 负载中去除 Completions 的 `store`
    - 接受用于 OpenAI 兼容 Completions 代理的高级 `params.extra_body`/`params.extraBody` 透传 JSON
    - 接受用于 OpenAI 兼容 Completions 代理（如 vLLM）的 `params.chat_template_kwargs`
    - 不强制严格工具 schema 或仅原生请求头

    Azure OpenAI 使用原生传输和兼容行为，但不会接收隐藏归因请求头。

  </Accordion>
</AccordionGroup>

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="图像生成" href="/tools/image-generation" icon="image">
    共享的图像工具参数和提供程序选择。
  </Card>
  <Card title="视频生成" href="/tools/video-generation" icon="video">
    共享的视频工具参数和提供程序选择。
  </Card>
  <Card title="OAuth 和身份验证" href="/gateway/authentication" icon="key">
    身份验证详情和凭据复用规则。
  </Card>
</CardGroup>