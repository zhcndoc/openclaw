---
summary: "通过 API 密钥或 Codex 订阅在 OpenClaw 中使用 OpenAI"
read_when:
  - 你想在 OpenClaw 中使用 OpenAI 模型
  - 你想使用 Codex 订阅认证而不是 API 密钥
  - 你需要更严格的 GPT-5 代理执行行为
title: "OpenAI"
---

OpenClaw 使用一个 provider id，`openai`，同时用于直接的 API 密钥认证和
ChatGPT/Codex 订阅认证。`openai/*` 是规范的模型路由。
对于嵌入式代理轮次，在运行时策略未设置或为 `auto` 时，OpenAI 的路由
事实决定 OpenClaw 是否可以隐式选择捆绑的 Codex app-server 运行时。
仅有 `openai/*` 前缀并不会选择运行时。

- **Agent models** - `openai/*` through the runtime selected by explicit
  `agentRuntime` config or OpenAI's implicit route policy. Sign in with Codex
  auth for ChatGPT/Codex subscription use, or configure an API-key auth
  profile when you want key-based billing.
- **Non-agent OpenAI APIs** - direct OpenAI Platform access, billed per use,
  through `OPENAI_API_KEY` or an `openai` API-key auth profile.
- **Legacy config** - `codex/*` and `openai-codex/*` refs are repaired to
  `openai/*` plus model-scoped `agentRuntime.id: "codex"` by
  `openclaw doctor --fix`.

OpenAI 明确支持在 OpenClaw 这样的外部工具和工作流中使用订阅 OAuth。

## 使用情况和成本跟踪

OpenClaw 将订阅配额和 Platform API 计费分开处理：

- ChatGPT/Codex OAuth 会显示订阅计划、配额窗口和余额。
- `OPENAI_ADMIN_KEY` 会在控制台 UI 的 **Usage** 中显示 30 天的提供方上报组织成本和补全使用情况，包括每日支出、请求/令牌总数、热门模型和成本类别。
- `OPENAI_PROJECT_ID` 可选地将 Admin API 历史记录限定到单个项目。
- OpenClaw 绝不会将 `OPENAI_API_KEY` 或 `openai` 推理配置文件发送到组织 API；这些凭据可能属于自定义、Azure 或代理本地端点。

显式的 Admin key 优先于 OAuth。提供方上报的历史记录不会与 OpenClaw 基于会话推导的估算成本合并；它可能包含来自其他客户端的 API 活动以及提供方侧的计费调整。

OpenAI 的 [API Usage Dashboard](https://help.openai.com/en/articles/10478918) 文档说明了组织所有者和显式 Usage Dashboard 权限对使用数据的要求。

提供方、模型、运行时和通道是彼此独立的层级。如果这些标签
开始混在一起，请在更改配置之前先阅读 [Agent runtimes](/concepts/agent-runtimes)。

## 快速选择

| 目标                                              | 使用                                                                | 备注                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| ChatGPT/Codex 订阅，原生 Codex 运行时              | `openai/gpt-5.6-sol`                                               | 新订阅设置；使用 Codex 身份验证登录。                               |
| 代理轮次的直接 API 密钥计费                      | `openai/gpt-5.6` 加上一个有序的 API 密钥身份验证配置文件              | 新的 API 密钥设置；裸的直接 API ID 会解析为 Sol。                  |
| 选择一个确切的 GPT-5.6 层级                      | `openai/gpt-5.6-sol`、`-terra` 或 `-luna`                         | 检查 `models list` 以查看此账户可用的层级。                         |
| 没有 GPT-5.6 访问权限的账户                      | `openai/gpt-5.5`                                                   | 明确的恢复选择；OpenClaw 不会静默降级。                             |
| 直接 API 密钥计费，显式 OpenClaw 运行时           | `openai/gpt-5.6` 加上 provider/model `agentRuntime.id: "openclaw"` | 选择一个正常的 `openai` API 密钥配置文件。                           |
| 最新 ChatGPT Instant 模型别名                     | `openai/chat-latest`                                               | 仅限直接 API 密钥；是会变化的别名，不是稳定默认值。                  |
| 图像生成或编辑                                   | `openai/gpt-image-2`                                               | 可与 `OPENAI_API_KEY` 或 Codex OAuth 配合使用。                     |
| 透明背景图像                                     | `openai/gpt-image-1.5`                                             | 将 `outputFormat` 设置为 `png` 或 `webp`，并设置 `background=transparent`。 |

## 命名映射

| 你看到的名称                          | 层级              | 含义                                                                                     |
| --------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------- |
| `openai`                                | 提供者前缀         | 规范的 OpenAI 模型路由；路由事实决定隐式运行时。                                          |
| `codex` 插件                          | 插件              | 捆绑插件，提供原生 Codex app-server 运行时和 `/codex` 聊天控制。                          |
| provider/model `agentRuntime.id: codex` | Agent 运行时       | 为匹配的嵌入式轮次强制使用原生 Codex app-server harness。                                 |
| `/codex ...`                            | 聊天命令集         | 从对话中绑定/控制 Codex app-server 线程。                                                 |
| `runtime: "acp", agentId: "codex"`      | ACP 会话路由       | 显式回退路径，通过 ACP/acpx 运行 Codex。                                                  |

## 隐式代理运行时

当 provider/model 的 `agentRuntime` 策略未设置或为 `auto` 时，OpenAI 的
provider-owned 路由策略会根据有效端点和适配器选择隐式运行时：

| 有效路由事实                                                                                                                                                  | 隐式运行时            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 精确的官方 Platform HTTPS 端点，使用 `openai-responses`；或精确的官方 ChatGPT HTTPS 端点，使用 `openai-chatgpt-responses`；且没有作者指定的请求覆盖 | 可选择 Codex         |
| 作者指定的 `openai-completions` 适配器                                                                                                                                  | OpenClaw              |
| 自定义端点                                                                                                                                                        | OpenClaw              |
| 明确的、精确的官方端点但使用 HTTP                                                                                                                            | 拒绝                 |
| 带有作者指定的 provider/model 请求覆盖的路由                                                                                                                 | OpenClaw              |

显式的、非默认的 provider/model `agentRuntime.id` 仍然具有权威性。
例如，`agentRuntime.id: "openclaw"` 会将原本有资格使用 Codex 的
路由保留在 OpenClaw 上，而 `agentRuntime.id: "codex"` 则要求使用 Codex，
并且当有效路由未声明与 Codex 兼容时会关闭失败。
运行时选择不会改变凭证类型或计费：Platform API 密钥
认证和 ChatGPT/Codex 订阅认证仍然是分开的。

`openclaw doctor --fix` migrates legacy `codex/*` and `openai-codex/*` model
refs, legacy Codex auth profile ids, and legacy Codex auth-order entries to the
canonical `openai` route. Migrated model refs receive model-scoped
`agentRuntime.id: "codex"`; use `auth.order.openai` for new auth-order config.

<Note>
全新的 OpenAI 设置仅在未配置主模型时才会应用 GPT-5.6 作为主模型。
添加或刷新 OpenAI 认证会保留现有的显式选择，包括 `openai/gpt-5.5`，
除非你显式使用 `models auth login --set-default` 或 `models set`。
仅当你希望某个代理模型使用 API 密钥认证时，才使用 API 密钥认证配置文件。
</Note>

## GPT-5.6 有限预览

OpenClaw 识别精确的 `openai/gpt-5.6-sol`、
`openai/gpt-5.6-terra` 和 `openai/gpt-5.6-luna` 模型 id。这三者在当前目录中都提供
`xhigh` 和 `max` 推理。OpenAI 将 Sol 描述为旗舰层级，Terra 描述为均衡层级，Luna 描述为快速、
更低成本的层级。请参阅
[GPT-5.6 发布公告](https://openai.com/index/previewing-gpt-5-6-sol/)
和[访问指南](https://help.openai.com/en/articles/20001325-a-preview-of-gpt-5-6-sol-terra-and-luna)。

使用直接的 OpenAI API key 认证时，裸的 `openai/gpt-5.6` id 是 Sol 的别名，并且是全新设置的默认值。原生 Codex 目录不会在客户端应用该直接 API 别名；根据工作区访问权限，它可以显示精确的 Sol、Terra 和 Luna id。因此，全新的 ChatGPT/Codex OAuth 设置使用 `openai/gpt-5.6-sol`。使用以下命令检查当前账号：

```bash
openclaw models list --provider openai
```

API 组织和 Codex 工作区访问权限可能不同。如果 GPT-5.6 不可用，请显式选择 GPT-5.5：

```bash
openclaw models set openai/gpt-5.5
```

OpenClaw 会暴露上游访问错误，不会静默地将一个 GPT-5.6 选择替换为 GPT-5.5。

<Note>
符合条件的精确官方 HTTPS 路由在运行时策略未设置或为 `auto` 时，可能会选择捆绑的 Codex 应用服务器插件；
作者创建的 Completions 路由、自定义端点以及请求传输覆盖仍保留在 OpenClaw 上。纯文本的
官方 HTTP 端点会被拒绝。显式的提供方/模型运行时配置仍然具有最高优先级。运行 `openclaw doctor --fix` 可修复过时的旧版 Codex 模型
引用、`codex-cli/*` 引用，或未由显式运行时配置设置的旧运行时会话固定。
</Note>

## OpenClaw 功能覆盖

| OpenAI 功能                  | OpenClaw 表面                                                                               | 状态                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Chat / Responses          | `openai/<model>` model provider                                                               | Yes                                                             |
| Codex subscription models | `openai/<model>` with OpenAI OAuth                                                            | Yes                                                             |
| Legacy Codex model refs   | old Codex model refs, `codex-cli/<model>`                                                     | Repaired by doctor to `openai/<model>`                          |
| Codex app-server harness  | Codex-compatible HTTPS route with runtime unset/`auto`, or explicit `agentRuntime.id: codex`  | Yes                                                             |
| Server-side web search    | Native OpenAI Responses tool                                                                  | Yes, when web search is enabled and no other provider is pinned |
| Images                    | `image_generate`                                                                              | Yes                                                             |
| Videos                    | `video_generate`                                                                              | Yes                                                             |
| Text-to-speech            | `tts.provider: "openai"` / `tts`                                                              | Yes                                                             |
| Batch speech-to-text      | `tools.media.audio` / media understanding                                                     | Yes                                                             |
| Streaming speech-to-text  | Voice Call `streaming.provider: "openai"`                                                     | Yes                                                             |
| Realtime voice            | Voice Call `realtime.provider: "openai"` / Control UI Talk `talk.realtime.provider: "openai"` | Yes (Platform API key, or ChatGPT OAuth for browser GPT-Live)   |
| Embeddings                | memory embedding provider                                                                     | Yes                                                             |

<Note>
GA OpenAI Realtime voice goes through the public **OpenAI Platform Realtime
API** and requires a Platform API key. Browser GPT-Live is the exception: its
native `api.openai.com/v1/live` route prefers a ChatGPT OAuth profile and falls
back to Platform API-key auth when that account has waitlist-gated access.

Platform auth is resolved in this order: configured realtime API key, `openai`
API-key profile, then `OPENAI_API_KEY`. ChatGPT OAuth does not configure GA
Talk, Voice Call, Discord realtime voice, or realtime transcription.

如果 API key 认证报告缺少 billing，在使用 API-key
认证时，请为支撑你的 realtime 凭证的组织在
[platform.openai.com/account/billing](https://platform.openai.com/account/billing)
for the organization backing your realtime credentials when using API-key
auth. Realtime voice accepts the `openai` API-key auth profile created by
`openclaw onboard --auth-choice openai-api-key`, a Platform API key set via
`talk.realtime.providers.openai.apiKey` for Control UI Talk, or
`plugins.entries.voice-call.config.realtime.providers.openai.apiKey` for Voice
Call, or the `OPENAI_API_KEY` environment variable.

In Control UI Video Talk with Platform auth, OpenAI WebRTC receives camera context on demand:
when the model calls `describe_view`, the browser sends one bounded JPEG over
the realtime data channel. OpenClaw does not attach a continuous camera track
to the OpenAI session.
</Note>

## 内存嵌入

OpenClaw 可以使用 OpenAI，或 OpenAI 兼容的嵌入端点，来进行
`memory_search` 索引和查询嵌入：

```json5
{
  memory: {
    search: {
      provider: "openai",
      model: "text-embedding-3-small",
    },
  },
}
```

For OpenAI-compatible endpoints that require asymmetric embedding labels, set
`queryInputType` and `documentInputType` under `memory.search`. OpenClaw
forwards these as provider-specific `input_type` request fields: query
embeddings use `queryInputType`; indexed memory chunks and batch indexing use
`documentInputType`. See the
[Memory configuration reference](/reference/memory-config#provider-specific-config)
for the full example.

## 快速开始

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

    | Model ref        | Runtime policy or route facts                                 | Route                     | Auth                              |
    | ---------------- | ------------------------------------------------------------- | ------------------------- | --------------------------------- |
    | `openai/gpt-5.6` | unset/`auto`, exact official HTTPS native route, no request override | Codex may be selected     | Ordered API-key auth profile      |
    | `openai/gpt-5.6` | provider/model `agentRuntime.id: "openclaw"`                  | OpenClaw embedded runtime | Selected `openai` API-key profile |
    | `openai/gpt-5.5` | explicit provider/model `agentRuntime.id`                     | Selected agent runtime    | Selected OpenAI API-key profile   |
    | `openai/*`       | authored Completions, custom, or request override | OpenClaw embedded runtime | Credential type remains unchanged |
    | `openai/*`       | plaintext official HTTP endpoint                  | Rejected                 | Credential is not sent             |

    <Note>
    当运行时未设置或为 `auto` 时，只有符合条件的精确官方 HTTPS 原生
    路由才可能隐式选择 Codex app-server harness。对于代理模型上的 API 密钥认证，
    请创建一个 `openai` API-key 认证配置文件，并使用
    `auth.order.openai` 进行排序；`OPENAI_API_KEY` 仍然是非代理 OpenAI
    API 接口的直接回退方式。运行 `openclaw doctor --fix` 以迁移旧的
    传统 Codex 认证顺序条目。
    </Note>

    ### 配置示例

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/gpt-5.6" } } },
    }
    ```

    直接 API 的裸 `gpt-5.6` id 会解析为 Sol 等级。如果该 API
    组织未公开 GPT-5.6，请明确将 primary 设为
    `openai/gpt-5.5`。

    若要从 OpenAI API 中尝试 ChatGPT 当前的 Instant 模型，请将模型
    设为 `openai/chat-latest`：

    ```json5
    {
      env: { OPENAI_API_KEY: "example-openai-key-not-real" },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest` 是一个会变化的别名。新的 OpenAI API-key 设置应改为使用
    `openai/gpt-5.6`，其裸直接 API id 会解析为 Sol。现有的显式 primary（包括
    `openai/gpt-5.5`）保持不变。`chat-latest` 别名只接受 `medium` 文本详细度；
    OpenClaw 会将该模型请求的任何其他详细度强制为 `medium`。

    <Warning>
    OpenClaw 在直接 OpenAI API 密钥路由上**不**提供 `gpt-5.3-codex-spark`。它
    仅在你的已登录账户公开该模型时，通过 Codex 订阅目录条目可用。
    </Warning>

  </Tab>

  <Tab title="Codex subscription">
    **最适合：** 使用你的 ChatGPT/Codex 订阅，通过原生 Codex
    app-server 执行，而不是单独的 API 密钥。Codex 云需要 ChatGPT
    登录。

    <Steps>
      <Step title="运行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai
        ```

        或直接运行 OAuth：

        ```bash
        openclaw models auth login --provider openai
        ```

        对于无头或不便使用回调的环境，添加 `--device-code` 以通过 ChatGPT
        device-code 流程登录，而不是使用本地回调浏览器：

        ```bash
        openclaw models auth login --provider openai --device-code
        ```
      </Step>
      <Step title="使用规范的 OpenAI 模型路由">
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-5.6-sol
        ```

        这个精确的官方 HTTPS 原生
        路由不需要任何运行时配置。它可能会自动选择 Codex app-server 运行时，
        而 OpenClaw 会在选择该运行时时安装或修复捆绑的 Codex 插件。
      </Step>
      <Step title="验证 Codex 认证是否可用">
        ```bash
        openclaw models list --provider openai
        ```

        网关运行后，在聊天中发送 `/codex status` 或 `/codex models`
        以验证原生应用服务器运行时。
      </Step>
    </Steps>

    ### 路由摘要

    | Model ref                | Runtime policy or route facts                                 | Route                                                    | Auth                                               |
    | ------------------------ | ------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
    | `openai/gpt-5.6-sol`     | unset/`auto`, exact official HTTPS native route, no request override | Codex may be selected                                    | Codex sign-in, or an ordered `openai` auth profile |
    | `openai/gpt-5.6-terra`   | unset/`auto`, exact official HTTPS native route, no request override | Codex may be selected                                    | Codex sign-in when the catalog exposes Terra       |
    | `openai/gpt-5.6-luna`    | unset/`auto`, exact official HTTPS native route, no request override | Codex may be selected                                    | Codex sign-in when the catalog exposes Luna        |
    | `openai/gpt-5.6-sol`     | provider/model `agentRuntime.id: "openclaw"`                  | OpenClaw embedded runtime, internal Codex-auth transport | Selected `openai` OAuth profile                    |
    | `openai/gpt-5.5`         | explicit provider/model `agentRuntime.id`                     | Selected agent runtime                                   | Selected OpenAI auth profile                       |
    | `openai/*`               | authored Completions, custom, or request override | OpenClaw embedded runtime                                | Credential requirement remains route-specific      |
    | `openai/*`               | plaintext official HTTP endpoint                  | Rejected                                                 | Credential is not sent                              |
    | Legacy Codex GPT-5.5 ref | repaired by doctor                                            | Rewritten to `openai/gpt-5.5`                            | Migrated OpenAI OAuth profile                      |
    | `codex-cli/gpt-5.5`      | repaired by doctor                                            | Rewritten to `openai/gpt-5.5`                            | Codex app-server auth                              |

    <Warning>
    新的订阅支持设置使用精确的 `openai/gpt-5.6-sol`；原生 Codex 目录也可能公开精确的 Terra 或 Luna 引用。如果
    账户未公开 GPT-5.6，请明确选择 `openai/gpt-5.5`。较旧的
    Codex GPT 引用属于旧版 OpenClaw 路由，而不是原生 Codex 运行时
    路径；运行 `openclaw doctor --fix` 可以在不升级现有显式 GPT-5.5 选择的情况下迁移它们。`gpt-5.3-codex-spark` 仍仅限于其 Codex 订阅目录中明确列出的账户；其直接 OpenAI
    API-key 和 Azure 引用仍会被抑制。
    </Warning>

    <Note>
    新配置应将 OpenAI 代理认证顺序放在 `auth.order.openai` 下；
    doctor 会迁移旧的传统 Codex 认证顺序条目。
    </Note>

    ### 配置示例

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.6-sol" },
        },
      },
    }
    ```

    对于 API 密钥备用方案，请将所选模型保持在 `openai/*` 下，并将
    认证顺序放在 `openai` 下。OpenClaw 会先尝试订阅，再尝试 API 密钥，同时保持使用 Codex harness：

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.6-sol" },
        },
      },
      auth: {
        order: {
          openai: [
            "openai:user@example.com",
            "openai:api-key-backup",
          ],
        },
      },
    }
    ```

    <Note>
    现在的引导不再从 `~/.codex` 导入 OAuth 凭据。请使用
    浏览器 OAuth（默认）或上面的 device-code 流程登录；OpenClaw 会在其自己的代理认证存储中管理
    生成的凭据。
    </Note>

    ### 检查并恢复 Codex OAuth 路由

    ```bash
    openclaw models status
    openclaw models auth list --provider openai
    openclaw config get agents.defaults.model --json
    openclaw config get models.providers.openai.agentRuntime --json
    ```

    对于特定代理，添加 `--agent <id>`：

    ```bash
    openclaw models status --agent <id>
    openclaw models auth list --agent <id> --provider openai
    ```

    如果较旧的配置仍包含传统 Codex GPT 引用，或在没有显式运行时配置的情况下仍有过期的 OpenAI
    运行时会话固定，请修复它：

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    如果 `models auth list --provider openai` 显示没有可用配置文件，请再次登录：

    ```bash
    openclaw models auth login --provider openai
    openclaw models status --probe --probe-provider openai
    ```

    对同一代理中的多个 Codex OAuth 登录，请使用 `--profile-id`，然后
    通过认证顺序或 `/model ...@<profileId>` 进行控制：

    ```bash
    openclaw models auth login --provider openai --profile-id openai:ritsuko
    openclaw models auth login --provider openai --profile-id openai:lain
    ```

    在依赖配置文件顺序之前，请运行 `openclaw doctor --fix` 以迁移旧的传统 OpenAI Codex 前缀
    配置文件 id 和顺序条目。

    ### 状态指示器

    聊天中的 `/status` 会显示当前
    会话正在使用哪个模型运行时。当符合条件的隐式路由或显式
    provider/model 运行时策略选择它时，捆绑的 Codex app-server harness 会显示为
    `Runtime: OpenAI Codex`。

    ### Doctor 警告

    如果配置或会话状态中仍保留传统 Codex 模型引用或过期的 OpenAI 运行时固定，
    `openclaw doctor --fix` 会将它们重写为带有
    Codex 运行时的 `openai/*`，除非显式配置了 OpenClaw。

    ### Context window defaults and long-context opt-in

    OpenClaw treats native model capacity and the active runtime budget as
    separate values:

    - `contextWindow` declares the provider's total model window.
    - `contextTokens` caps how much of that window OpenClaw uses for active input.

    ChatGPT/Codex OAuth follows the live Codex account catalog. The current
    catalog commonly advertises a `272000` token active window for GPT-5.6.
    Direct API-key GPT-5.5 and GPT-5.6 models also default to `272000`
    `contextTokens`, even though the Platform API exposes a larger native
    window. This keeps the normal latency, quality, and cost profile consistent
    across auth modes. A configured `agents.defaults.contextTokens` value can
    lower that budget further, but it cannot raise a model above its configured
    `contextTokens` cap.

    For direct API-key GPT-5.5 and GPT-5.6, OpenAI documents a `1050000`
    token provider window and `128000` maximum output tokens. Reserving the
    full output allowance leaves `922000` tokens for input. This is a derived
    operating budget, not a separate provider-published input limit. See the
    official [model comparison](https://developers.openai.com/api/docs/models/compare)
    and [GPT-5.5 model page](https://developers.openai.com/api/docs/models/gpt-5.5).
    The following example opts one Terra model into that allowance and asks
    OpenAI to compact at `700000` active tokens:

    ```json5
    {
      models: {
        providers: {
          openai: {
            models: [
              {
                id: "gpt-5.6-terra",
                name: "GPT-5.6 Terra",
                contextWindow: 1050000,
                contextTokens: 922000,
                maxTokens: 128000,
              },
            ],
          },
        },
      },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.6-terra" },
          models: {
            "openai/gpt-5.6-terra": {
              agentRuntime: { id: "openclaw" },
              params: {
                responsesServerCompaction: true,
                responsesCompactThreshold: 700000,
              },
            },
          },
        },
      },
    }
    ```

    `agentRuntime.id: "openclaw"` is intentional in this example. It proves the
    embedded OpenClaw Responses path is using the model metadata and server-side
    compaction settings above. A native Codex harness thread owns its context
    budget in Codex config instead; see
    [Codex harness long context](/plugins/codex-harness#direct-api-long-context).

    <Warning>
    OpenAI applies higher long-context pricing once a GPT-5.5 or GPT-5.6
    request exceeds `272000` input tokens: the whole qualifying request is
    billed at 2× input and 1.5× output rates. Large prompts are resent or
    compacted across turns, so an opt-in session can cost substantially more
    than the default even when the visible reply is short. See
    [OpenAI API pricing](https://developers.openai.com/api/docs/pricing). The API
    remains authoritative for account access, actual limits, and billing.
    </Warning>

    ### 目录恢复

    OpenClaw 在可用时会对 `gpt-5.5` 使用上游 Codex 目录元数据。若实时 Codex 发现
    在账户已通过认证时仍省略了 `gpt-5.5` 行，OpenClaw 会合成该 OAuth 模型行，
    以免 cron、子代理以及配置的默认模型运行因
    `Unknown model` 而失败。

  </Tab>
</Tabs>

## 原生 Codex app-server 认证

原生 Codex app-server harness 会在满足条件的精确官方 HTTPS 路由隐式选择 `openai/*` 模型引用时使用它，或者在 provider/model `agentRuntime.id: "codex"` 显式选择它时使用它。其认证仍然基于账户。OpenClaw 按以下顺序选择认证：

1. 为代理按顺序排列的 OpenAI 认证配置文件，优先使用 `auth.order.openai` 下的配置。运行 `openclaw doctor --fix` 可迁移较旧的遗留 Codex 认证配置文件 id 和认证顺序。
2. app-server 现有的账户，例如本地 Codex CLI 的 ChatGPT 登录。对于默认的隔离代理主页，OpenClaw 会通过其登录 RPC 将该原生 CLI 账户桥接到 app-server；它不会共享 CLI 的配置、插件或线程存储。
3. 仅对于本地 stdio app-server 启动，并且仅当 app-server 报告没有账户时：`CODEX_API_KEY`，然后是 `OPENAI_API_KEY`。

本地 ChatGPT/Codex 订阅登录不会因为网关进程也有用于直接 OpenAI 模型或嵌入的 `OPENAI_API_KEY` 就被替换。环境变量 API key 兜底仅适用于本地 stdio 无账号路径；它绝不会通过 WebSocket app-server 连接发送。当选中订阅式 Codex 配置文件时，OpenClaw 还会将 `CODEX_API_KEY` 和 `OPENAI_API_KEY` 排除在启动的 stdio app-server 子进程之外，并通过 app-server 登录 RPC 发送所选凭据。

当该订阅配置文件因 Codex 使用限额而被阻止时，OpenClaw 会将该配置文件标记为已阻止，直到 Codex 公布的重置时间，并让认证顺序轮换到下一个 `openai:*` 配置文件，而不会更改所选模型，也不会退出 Codex harness。一旦重置时间过去，该订阅配置文件即可再次使用。

## 图像生成

捆绑的 `openai` 插件通过 `image_generate` 工具注册图像生成。它使用同一个 `openai/gpt-image-2` 模型引用，同时支持 OpenAI API 密钥和 Codex OAuth 图像生成。

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
参见 [图像生成](/tools/image-generation) 了解共享工具参数、
提供方选择以及故障转移行为。
</Note>

`gpt-image-2` 是 OpenAI 文生图和图像编辑的默认模型。`gpt-image-1.5`、`gpt-image-1` 和 `gpt-image-1-mini` 仍可作为显式模型覆盖使用。对于透明背景的 PNG/WebP 输出，请使用 `openai/gpt-image-1.5`；当前 `gpt-image-2` API 会拒绝 `background: "transparent"`。

对于透明背景请求，请调用 `image_generate`，并设置 `model: "openai/gpt-image-1.5"`、`outputFormat: "png"` 或 `"webp"`，以及 `background: "transparent"`；旧的 `openai.background` 提供方选项仍然可接受。OpenClaw 还通过将默认的 `openai/gpt-image-2` 透明背景请求重写为 `gpt-image-1.5`，来保护公开的 OpenAI 和 OpenAI Codex OAuth 路由；Azure 和自定义 OpenAI 兼容端点会保留其配置的部署/模型名称。

相同设置也可用于无头 CLI 运行：

```bash
openclaw infer image generate \
  --model openai/gpt-image-1.5 \
  --output-format png \
  --background transparent \
  --prompt "一张放在透明背景上的简洁红色圆形贴纸" \
  --json
```

在从输入文件开始时，对 `openclaw infer image edit` 使用相同的 `--output-format` 和 `--background` 标志。
`--openai-background` 仍可作为 OpenAI 专用别名使用。使用
`--quality low|medium|high|auto` 来控制 OpenAI Images 的质量和成本。
使用 `--openai-moderation low|auto` 从 `image generate` 或 `image edit` 中传递 OpenAI 的审核提示。

对于 ChatGPT/Codex OAuth 安装，请保持使用相同的 `openai/gpt-image-2` 引用。当配置了 `openai` OAuth 配置文件时，OpenClaw 会解析已存储的 OAuth 访问令牌，并通过 Codex Responses 后端发送图像请求；它不会先尝试 `OPENAI_API_KEY`，也不会静默回退到 API 密钥。如果你想直接使用 OpenAI Images API 路由，请显式配置 `models.providers.openai`，并提供 API 密钥、自定义 base URL 或 Azure 端点。若该自定义图像端点位于受信任的 LAN/私有地址，还需要设置 `browser.ssrfPolicy.dangerouslyAllowPrivateNetwork: true`；除非启用此选项，OpenClaw 会继续阻止私有/内部的 OpenAI 兼容图像端点。

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

捆绑的 `openai` 插件通过
`video_generate` 工具注册视频生成。

| 功能            | 值                                                                                 |
| --------------- | ---------------------------------------------------------------------------------- |
| 默认模型        | `openai/sora-2`                                                                    |
| 模式            | 文本转视频、图像转视频、单视频编辑                                                   |
| 参考输入        | 1 张图像或 1 个视频                                                                |
| 大小覆盖        | 支持文本转视频和图像转视频                                                           |
| 宽高比          | 转换为最接近支持的尺寸，不会按原始值直接传递                                         |
| 其他覆盖        | `resolution`、`audio`、`watermark` 不受支持，会被丢弃并给出工具警告                 |

OpenAI 图像生成视频请求使用 `POST /v1/videos`，并带有图像
`input_reference`。单视频编辑使用 `POST /v1/videos/edits`，并将
上传的视频放在 `video` 字段中。

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
请参见 [Video Generation](/tools/video-generation) 了解共享工具参数、
提供方选择以及故障转移行为。

OpenAI 提供方声明支持 `supportsSize`，但不支持 `supportsAspectRatio` 或
`supportsResolution`。OpenClaw 的共享规范化层会在请求到达提供方之前，
将请求的 `aspectRatio` 转换为最接近的 OpenAI `size`，因此宽高比请求通常仍然有效。
`resolution` 没有尺寸回退，会被丢弃，并向调用者提示为
`Ignored unsupported overrides for openai/<model>: resolution=<value>`。
</Note>

## GPT-5 提示贡献

OpenClaw 为 `openai` 提供方上的 GPT-5 系列模型添加了一个共享的 GPT-5 提示贡献（包括会规范化为 `openai/*` 的旧版、修复前的 Codex 引用）。其他同样提供 GPT-5 系列模型 ID 的提供方，例如 OpenRouter 或 opencode 路由，不会收到此覆盖层；它受提供方 ID `openai` 约束，而不是仅由模型 ID 决定。更旧的 GPT-4.x 模型永远不会收到它。

原生 Codex app-server harness 不会通过开发者指令获得 persona/工具纪律行为契约或友好交互风格覆盖层；原生 Codex 保留 Codex 自有的基础、模型和项目文档行为，而 OpenClaw 会为原生线程禁用 Codex 内置人格，使代理工作区人格文件保持权威。OpenClaw 仅向原生 Codex 线程贡献运行时上下文：通道传递、OpenClaw 动态工具、ACP 委派、工作区上下文以及 OpenClaw 技能。来自同一贡献中的心跳指导文本是唯一例外：原生 Codex 的心跳轮次确实会收到它，但它是作为专门的协作指令注入的，而不是通过共享提示贡献钩子注入。

GPT-5 贡献会为匹配的 OpenClaw 组装提示添加一个带标签的行为契约，涵盖人格持久性、执行安全、工具纪律、输出形态、完成检查以及验证。特定通道的回复和静默消息行为仍保留在共享的 OpenClaw 系统提示和出站传递策略中。友好交互风格层是独立且可配置的。

| 值                   | 效果                               |
| -------------------- | ---------------------------------- |
| `"friendly"`（默认） | 启用友好交互风格层                 |
| `"on"`               | `"friendly"` 的别名                |
| `"off"`              | 仅禁用友好风格层                   |

<Tabs>
  <Tab title="配置">
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
当共享的 `agents.defaults.promptOverlays.gpt5.personality` 设置未配置时，仍会读取旧的 `plugins.entries.openai.config.personality` 作为兼容性回退。
</Note>

## 语音与音频

<AccordionGroup>
  <Accordion title="Speech synthesis (TTS)">
    The bundled `openai` plugin registers speech synthesis for the
    `tts` surface.

    | Setting      | Config path                                            | Default                          |
    | ------------- | --------------------------------------------------------- | ----------------------------------- |
    | Model        | `tts.providers.openai.model`                  | `gpt-4o-mini-tts`                |
    | Voice        | `tts.providers.openai.speakerVoice`           | `coral`                          |
    | Speed        | `tts.providers.openai.speed`                  | (unset)                          |
    | Instructions | `tts.providers.openai.instructions`           | (unset, `gpt-4o-mini-tts` only)  |
    | Format       | `tts.providers.openai.responseFormat`         | `opus` for voice notes, `mp3` for files |
    | API key      | `tts.providers.openai.apiKey`                 | Falls back to `OPENAI_API_KEY`   |
    | Base URL     | `tts.providers.openai.baseUrl`                | `https://api.openai.com/v1`      |
    | Extra body   | `tts.providers.openai.extraBody` / `extra_body` | (unset)                        |

    可用模型：`gpt-4o-mini-tts`、`tts-1`、`tts-1-hd`。可用声音：
    `alloy`、`ash`、`ballad`、`cedar`、`coral`、`echo`、`fable`、`juniper`、
    `marin`、`onyx`、`nova`、`sage`、`shimmer`、`verse`。

    `extraBody` 会在 OpenClaw 生成的字段之后合并到 `/audio/speech` 请求 JSON 中，因此可用于需要额外键（如 `lang`）的 OpenAI 兼容端点。原型键会被忽略。

    ```json5
    {
      tts: {
        providers: {
          openai: { model: "gpt-4o-mini-tts", speakerVoice: "coral" },
        },
      },
    }
    ```

    <Note>
    Set `OPENAI_TTS_BASE_URL` to override the TTS base URL without affecting
    the chat API endpoint. OpenAI TTS and GA Realtime voice are configured
    through an OpenAI Platform API key. OAuth-only installs can use
    Codex-backed chat models and GPT-Live browser Talk (which works over the
    ChatGPT subscription — see the Realtime accordion), but not TTS or GA
    realtime talk-back.
    </Note>

  </Accordion>

  <Accordion title="语音转文本">
    捆绑的 `openai` 插件通过 OpenClaw 的媒体理解转录表面注册批量语音转文本。

    - 默认模型：`gpt-4o-transcribe`
    - 端点：OpenAI REST `/v1/audio/transcriptions`
    - 输入路径：multipart 音频文件上传
    - 用于任何入站音频转录读取 `tools.media.audio` 的场景，
      包括 Discord 语音频道片段和频道音频附件

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

  <Accordion title="Realtime transcription">
    捆绑的 `openai` 插件为
    Voice Call 插件注册实时转录。

    | 设置             | 配置路径                                                          | 默认值 |
    | ----------------- | ----------------------------------------------------------------------- | --------- |
    | Model            | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | Language         | `...openai.language`                                                 | （未设置） |
    | Prompt           | `...openai.prompt`                                                   | （未设置） |
    | Silence duration | `...openai.silenceDurationMs`                                        | `800`   |
    | VAD threshold    | `...openai.vadThreshold`                                             | `0.5`   |
    | Auth             | `...openai.apiKey`, `OPENAI_API_KEY`，或 `openai` API-key profile    | 需要 Platform API key |

    <Note>
    使用 WebSocket 连接到 `wss://api.openai.com/v1/realtime`，并使用
    G.711 u-law (`g711_ulaw` / `audio/pcmu`) 音频。对于 `openai` API-key
    profile，Gateway 会在打开 WebSocket 之前生成一个临时的 Realtime 转录客户端
    secret。此流式提供方用于 Voice Call 的实时转录路径；Discord 语音目前会录制短
    片段，并改用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="Realtime voice">
    捆绑的 `openai` 插件为 Voice Call
    插件注册实时语音。

    | 设置                                  | 配置路径                                                              | 默认值             |
    | --------------------------------------- | ---------------------------------------------------------------------------- | ---------------------- |
    | Model                                  | `plugins.entries.voice-call.config.realtime.providers.openai.model`     | `gpt-realtime-2.1`  |
    | Voice                                  | `...openai.voice`                                                       | `alloy`             |
    | Temperature (Azure deployment bridge)  | `...openai.temperature`                                                 | `0.8`               |
    | VAD threshold                          | `...openai.vadThreshold`                                                | `0.5`                |
    | Silence duration                       | `...openai.silenceDurationMs`                                           | `500`                |
    | Prefix padding                         | `...openai.prefixPaddingMs`                                             | `300`                |
    | Reasoning effort                       | `...openai.reasoningEffort`                                             | （未设置）              |
    | Auth                                   | `openai` API-key profile、`...openai.apiKey`，或 `OPENAI_API_KEY` | 需要 OpenAI Platform API key |

    `gpt-realtime-2.1` 可用的内置 Realtime 声音有：`alloy`、`ash`、
    `ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、`marin`、`cedar`。
    OpenAI 推荐 `marin` 和 `cedar` 以获得最佳 Realtime 质量。此声音集合与上方
    的文本转语音声音是分开的；像 `fable`、`nova` 或 `onyx` 这类仅用于 TTS 的声音
    不适用于 Realtime 会话。
    如果你更偏好更小、成本更低的 Realtime 2.1 变体，请显式将模型设为
    `gpt-realtime-2.1-mini`。

    #### GPT-Live browser Talk

    GPT-Live is supported for browser Talk WebRTC sessions using a ChatGPT
    OAuth subscription profile. The complete path was verified on 2026-07-28
    with a ChatGPT Pro account: call creation returned `201 Created`, and the
    authenticated sideband emitted `session.started` for the same `rtc_*` call.

    Use `gpt-live-1-codex` (recommended) or
    `gpt-live-1-boulder-alpha`. The values `gpt-live-1` and
    `gpt-live-1-mini` are not valid on this route. Opt in explicitly with
    `talk.realtime.model`; `gpt-realtime-2.1` remains the GA default.

    GPT-Live accepts these voices: `alloy`, `ash`, `ballad`, `cedar`, `coral`,
    `echo`, `marin`, `sage`, `shimmer`, and `verse`. OpenClaw defaults to
    `marin` and maps unknown or unsupported configured voices back to it.

    Prerequisites, in order:

    1. A ChatGPT OAuth auth profile: `openclaw models auth login --provider openai`.
       An existing Codex CLI (`~/.codex`) sign-in is **not** read; the profile
       must exist in OpenClaw. A Platform API key with `/v1/live` access works
       instead, but that access is waitlist-gated.
    2. `talk.realtime.model` set to a `gpt-live-*` value — via **Settings →
       Talk** in the Control UI or the config below.
    3. The bundled `openai` plugin registered in full mode. A restrictive
       `plugins.allow` list fails with "OpenAI GPT-Live browser session broker
       is unavailable".

    Note one asymmetric failure mode: a configured Platform API key that
    cannot be resolved (for example a broken secret reference) suppresses the
    OAuth fallback with "fix or remove it" — repair or delete the key rather
    than expecting OAuth to take over silently.

    ```json5
    {
      talk: {
        realtime: {
          provider: "openai",
          model: "gpt-live-1-codex",
          transport: "webrtc",
        },
      },
    }
    ```

    <Warning>
    Platform API-key access to `/v1/live` is waitlist-gated and commonly returns
    `400 model_not_found` without enrollment. Use a ChatGPT OAuth profile, or request Platform access with the
    [GPT-Live API access form](https://openai.com/form/gpt-live-1-in-the-api/).
    </Warning>

    A `403 Voice session access denied` response is overloaded and does not by
    itself prove an account entitlement problem: an invalid voice produces the
    same response. First verify the model and voice against the accepted lists
    above, then verify that the selected ChatGPT OAuth profile and
    `chatgpt-account-id` belong to the same account.

    GPT-Live remains limited to browser Talk WebRTC sessions. Voice
    Call/telephony, Gateway relay, provider WebSocket transports, and Android
    are unsupported. The Gateway owns the authenticated sideband and routes
    delegated work through the configured OpenClaw agent; the browser never
    receives the OAuth token.

    The canonical OpenClaw path creates the call on `api.openai.com/v1/live`
    and joins its sideband there. The legacy `chatgpt.com` backend route returns
    `403` and is not used.

    Maintainers can exercise OpenClaw's complete OAuth path with the opt-in
    live test. It skips when no ChatGPT OAuth credential is available and
    never prints token material:

    ```bash
    OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_GPT_LIVE=1 node scripts/run-vitest.mjs run --config test/vitest/vitest.live.config.ts extensions/openai/realtime-quicksilver.live.test.ts
    ```

    <Note>
    后端 OpenAI realtime 桥接使用 GA Realtime WebSocket 会话
    结构，不接受 `session.temperature`。Azure OpenAI
    部署仍可通过 `azureEndpoint` 和 `azureDeployment` 使用，并
    保持与部署兼容的会话结构（包括 `temperature`）。
    支持双向工具调用和 G.711 u-law 音频。
    </Note>

    <Note>
    Realtime 声音在会话创建时选定。OpenAI 允许大多数
    会话字段在之后更改，但一旦模型在该会话中发出过音频，就不能再
    更改声音。OpenClaw 当前将内置 Realtime 声音 id 作为字符串暴露。
    </Note>

    <Note>
    Control UI Talk uses OpenAI browser WebRTC sessions. GA
    `gpt-realtime-*` models use a Gateway-minted ephemeral client secret and a
    direct browser SDP exchange when Platform credentials are available.
    Configured realtime keys, API-key profiles, and `OPENAI_API_KEY` use that
    path in that order. ChatGPT OAuth is not a Platform Realtime credential and
    is not used for GA models. GPT-Live instead uses the native Gateway offer
    broker described above, prefers ChatGPT OAuth when both auth modes are
    configured, and falls back to Platform API-key access when the account has
    waitlist-gated `/v1/live` access.
    Gateway relay and Voice Call backend realtime WebSocket bridges continue to
    require Platform credentials and a GA model.
    Maintainer live verification is available with
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`;
    OpenAI 路径会同时验证后端 WebSocket 桥接和浏览器 WebRTC SDP 交换，且不会记录密钥。
    传入 `--openai-only` 可在不使用 Google 凭证的情况下运行这两个路径。
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
[语音与语音合成](#voice-and-speech) 下的 **实时语音** 折叠面板。
</Note>

在以下情况下使用 Azure OpenAI：

- 你已经拥有 Azure OpenAI 订阅、配额或企业协议
- 你需要 Azure 提供的区域数据驻留或合规性控制
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
`openai` 提供程序的图像生成路径进行 Azure 路由需要
OpenClaw 2026.4.22 或更高版本。更早的版本会将任何自定义的
`openai.baseUrl` 视为公共 OpenAI 端点，并在 Azure 图像
部署上失败。
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
/tool image_generate model=openai/gpt-image-2-prod prompt="一张干净的海报" size=1024x1024 count=1
```

同样的“部署名称”规则也适用于任何通过捆绑的 `openai` 提供程序路由的
图像生成调用。

### 区域可用性

Azure 图像生成目前仅在部分区域可用
（例如 `eastus2`、`swedencentral`、`polandcentral`、`westus3`、
`uaenorth`）。在创建部署之前，请查看 Microsoft 的当前区域列表，并确认
特定模型在你的区域中可用。

### 参数差异

Azure OpenAI 和公共 OpenAI 并不总是接受相同的图像参数。
Azure 可能会拒绝公共 OpenAI 允许的选项（例如 `gpt-image-2` 上的某些
`background` 值），或者仅在特定模型版本上公开这些选项。这些差异来自 Azure 和底层模型，而不是
OpenClaw。如果 Azure 请求因验证错误而失败，请在
Azure 门户中查看你的特定部署和 API 版本所支持的参数集。

<Note>
Azure OpenAI 使用原生传输和兼容行为，但不会接收
OpenClaw 的隐藏归因请求头 - 请参见
[高级配置](#advanced-configuration) 下 **原生与 OpenAI 兼容
路由** 折叠面板。

对于 Azure 上的聊天或 Responses 流量（超出图像生成范围），请使用
引导流程或专用的 Azure 提供程序配置；仅有 `openai.baseUrl` 并不会自动匹配 Azure 的 API/认证形态。
还存在一个单独的 `azure-openai-responses/*` 提供程序；请参见下面的服务器端压缩
折叠面板。
</Note>

## 高级配置

下方按模型的 `params` 示例会影响 OpenClaw 的内置提供程序
请求。对它们进行配置属于有意编写的请求行为，因此一个原本符合条件的
`auto` 路由会继续停留在 OpenClaw 上，而不会隐式选择 Codex。原生
Codex app-server harness 使用其自己的传输和请求设置；当有效路由未声明为
与 Codex 兼容时，显式的 `agentRuntime.id: "codex"` 会直接失败。

<AccordionGroup>
  <Accordion title="传输（WebSocket vs SSE）">
    OpenClaw 对 `openai/*` 默认采用 WebSocket 优先，并在失败时回退到 SSE（`"auto"`）。

    在 `"auto"` 模式下，OpenClaw：
    - 在回退到 SSE 之前，会对首次较早的 WebSocket 失败重试一次
    - 发生失败后，会将 WebSocket 标记为降级 60 秒，并在冷却期间使用 SSE
    - 为重试和重新连接附加稳定的会话与轮次身份标头
    - 在不同传输变体之间规范化用量计数器（`input_tokens` / `prompt_tokens`）

    | Value                | Behavior                          |
    | ---------------------- | ------------------------------------ |
    | `"auto"` (default)   | WebSocket first, SSE fallback     |
    | `"sse"`              | Force SSE only                    |
    | `"websocket"`        | Force WebSocket only              |

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

  <Accordion title="快速模式">
    OpenClaw 为 `openai/*` 提供一个共享的快速模式开关：

    - **Chat/UI:** `/fast status|auto|on|off`
    - **Config:** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    启用后，OpenClaw 会将快速模式映射到 OpenAI 优先处理
    （`service_tier = "priority"`）。现有的 `service_tier` 值会被
    保留，且快速模式不会重写 `reasoning` 或
    `text.verbosity`。`fastMode: "auto"` 会让新的模型调用在自动
    截止时间之前以快速模式启动，然后让后续的重试、回退、工具结果或
    续写调用不使用快速模式。默认截止时间为 60 秒；可在当前模型上设置
    `params.fastAutoOnSeconds` 来更改。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": { params: { fastMode: "auto", fastAutoOnSeconds: 30 } },
          },
        },
      },
    }
    ```

    <Note>
    会话覆盖优先于配置。 在 Sessions UI 中清除会话覆盖后，
    会话将恢复为配置中的默认值。
    </Note>

  </Accordion>

  <Accordion title="Priority processing (service_tier)">
    OpenAI 的 API 通过 `service_tier` 提供优先处理。可在
    OpenClaw 中按模型设置：

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
    `serviceTier` 仅会转发到原生 OpenAI 端点
    （`api.openai.com`）和原生 Codex 端点（`chatgpt.com/backend-api`）。
    如果你通过代理路由任一提供程序，OpenClaw 会保留
    `service_tier` 不变。
    </Warning>

  </Accordion>

  <Accordion title="Server-side compaction (Responses API)">
    对于直接的 OpenAI Responses 模型（`api.openai.com` 上的 `openai/*`），
    OpenAI 插件的 OpenClaw 流包装器会自动启用服务器端
    压缩：

    - 强制 `store: true`（除非模型兼容性设置了 `supportsStore: false`）
    - 注入 `context_management: [{ type: "compaction", compact_threshold: ... }]`
    - 默认 `compact_threshold`：`contextWindow` 的 70%（如果不可用则为
      `80000`）

    这适用于内置的 OpenClaw 运行时路径以及嵌入式运行所使用的 OpenAI 提供程序
    钩子。原生 Codex app-server harness 通过 Codex 自行管理其上下文，
    不受此设置影响。

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
    `responsesServerCompaction` 只控制 `context_management` 注入。
    直接的 OpenAI Responses 模型仍会强制 `store: true`，除非兼容性
    设置了 `supportsStore: false`。
    </Note>

  </Accordion>

  <Accordion title="Strict-agentic GPT mode">
    对于通过 OpenClaw 嵌入式运行时运行的 `openai` 提供程序 GPT-5 系列模型，
    OpenClaw 已默认采用更严格的执行契约，称为
    `strict-agentic`。只要解析后的提供程序是 `openai` 且模型 id 匹配 GPT-5 系列，
    它就会自动启用，除非配置显式将其关闭：

    ```json5
    {
      agents: {
        defaults: {
          embeddedAgent: { executionContract: "default" },
        },
      },
    }
    ```

    显式设置 `"strict-agentic"` 在受支持的通道上不会产生变化（因为它
    已经是默认值），而在不受支持的提供程序/模型组合上则不会生效。

    启用 `strict-agentic` 后，OpenClaw：
    - 为较大工作自动启用 `update_plan`
    - 使用可见答案续写来重试结构上为空或仅含推理的轮次
    - 在所选 harness 提供明确的计划事件时使用这些事件

    OpenClaw 不会根据 assistant 的 prose 来判断某一轮是计划、进度更新还是最终答案。

    <Note>
    该契约完全存在于 OpenClaw 的嵌入式 agent runner 中。它不适用于原生
    Codex app-server harness；后者会自行管理轮次与计划行为。对于原生 Codex 运行，
    harness 选择比 execution-contract 设置更重要。
    </Note>

  </Accordion>

  <Accordion title="Native vs OpenAI-compatible routes">
    OpenClaw 会将直接的 OpenAI、Codex 和 Azure OpenAI 端点
    与通用的 OpenAI 兼容 `/v1` 代理区别对待：

    **Native routes** (`openai/*`, Azure OpenAI):
    - 仅对支持 OpenAI `none` effort 的模型保留 `reasoning: { effort: "none" }`
    - 对于模型或代理不接受 `reasoning.effort: "none"` 的情况，省略禁用的 reasoning
    - 默认将工具 schema 设为严格模式
    - 仅在已验证的原生主机上附加隐藏归因标头（Azure
      OpenAI 不会获得这些标头，即使它是原生路由）
    - 保留仅 OpenAI 可用的请求形状调整（`service_tier`、`store`、
      reasoning-compat、prompt-cache 提示）

    **Proxy/compatible routes:**
    - 使用更宽松的兼容行为
    - 从非原生 `openai-completions` 载荷中移除 Completions 的 `store`
    - 接受面向 OpenAI 兼容 Completions 代理的高级 `params.extra_body`/`params.extraBody` 透传 JSON
    - 接受 `params.chat_template_kwargs`，适用于如 vLLM 之类的 OpenAI 兼容 Completions 代理
    - 不强制严格工具 schema 或仅原生可用的标头

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