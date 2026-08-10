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

- **代理模型** - 通过显式的 `agentRuntime` 配置或 OpenAI 的隐式路由策略所选择的运行时使用 `openai/*`。要使用 ChatGPT/Codex 订阅，请使用 Codex 登录认证；如果希望基于密钥计费，请配置 API 密钥认证配置文件。
- **非代理 OpenAI API** - 直接访问 OpenAI Platform，按使用量计费，通过 `OPENAI_API_KEY` 或 `openai` API 密钥认证配置文件进行认证。
- **旧版配置** - `codex/*` 和 `openai-codex/*` 引用会由 `openclaw doctor --fix` 修复为 `openai/*`，并添加模型范围的 `agentRuntime.id: "codex"`。

OpenAI 明确支持在 OpenClaw 这样的外部工具和工作流中使用订阅 OAuth。

## 使用情况和成本跟踪

OpenClaw 将订阅配额和平台 API 计费分开处理：

- ChatGPT/Codex OAuth 会显示订阅计划、配额窗口和余额。
- `OPENAI_ADMIN_KEY` 会在控制台 UI 的 **使用情况** 中显示过去 30 天由提供方上报的组织成本和补全使用情况，包括每日支出、请求数/令牌总数、热门模型和成本类别。
- `OPENAI_PROJECT_ID` 可选地将 Admin API 历史记录限定到单个项目。
- OpenClaw 绝不会将 `OPENAI_API_KEY` 或 `openai` 推理配置文件发送到组织 API；这些凭据可能属于自定义、Azure 或代理本地端点。

显式的 Admin 密钥优先于 OAuth。提供方上报的历史记录不会与 OpenClaw 基于会话推导的估算成本合并；它可能包含来自其他客户端的 API 活动以及提供方侧的计费调整。

OpenAI 的 [API 使用情况仪表板](https://help.openai.com/en/articles/10478918) 文档说明了组织所有者和具有显式“使用情况仪表板”权限的用户访问使用数据所需的条件。

提供方、模型、运行时和通道是彼此独立的层级。如果这些标签开始混在一起，请在更改配置之前先阅读 [代理运行时](/concepts/agent-runtimes)。

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
| `codex` 插件                          | 插件              | 捆绑插件，提供原生 Codex 应用服务器运行时和 `/codex` 聊天控制。                          |
| 提供者/模型 `agentRuntime.id: codex` | Agent 运行时       | 为匹配的嵌入式轮次强制使用原生 Codex 应用服务器运行框架。                                 |
| `/codex ...`                            | 聊天命令集         | 从对话中绑定/控制 Codex 应用服务器线程。                                                 |
| `runtime: "acp", agentId: "codex"`      | ACP 会话路由       | 显式回退路径，通过 ACP/acpx 运行 Codex。                                                  |

## 隐式代理运行时

当 provider/model 的 `agentRuntime` 策略未设置或为 `auto` 时，OpenAI 的
provider-owned 路由策略会根据有效端点和适配器选择隐式运行时：

| 有效路由事实                                                                                                                                                           | 隐式运行时      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| 使用 `openai-responses` 的官方 Platform HTTPS 端点，或使用 `openai-chatgpt-responses` 的官方 ChatGPT HTTPS 端点；且未编写 provider 请求覆盖 | 可能选择 Codex |
| 已编写的 `openai-completions` 适配器                                                                                                                                   | OpenClaw        |
| 自定义端点                                                                                                                                                             | OpenClaw        |
| 使用 HTTP 的显式官方精确端点                                                                                                                                           | 拒绝            |
| 带有已编写的 provider/model 请求覆盖的路由                                                                                                                            | OpenClaw        |

有效的模型范围 `params.fastMode` / `params.fast_mode` 值和有效的截止键属于类型化的代理运行时控制项，而不是已编写的 provider 请求参数。它们不会使路由失去隐式选择 Codex 的资格，也不会自行选择运行时。当某个配置方案依赖特定运行时时，请固定设置 `agentRuntime.id: "openclaw"` 或 `agentRuntime.id: "codex"`。

显式的、非默认的 provider/model `agentRuntime.id` 仍然具有权威性。
例如，`agentRuntime.id: "openclaw"` 会将原本有资格使用 Codex 的
路由保留在 OpenClaw 上，而 `agentRuntime.id: "codex"` 则要求使用 Codex，
并且当有效路由未声明与 Codex 兼容时会关闭失败。
运行时选择不会改变凭证类型或计费：Platform API 密钥
认证和 ChatGPT/Codex 订阅认证仍然是分开的。

`openclaw doctor --fix` 会将旧版的 `codex/*` 和 `openai-codex/*` 模型
引用、旧版 Codex 认证配置文件 ID 以及旧版 Codex 认证顺序条目迁移到
规范的 `openai` 路由。迁移后的模型引用会获得模型范围的
`agentRuntime.id: "codex"`；新的认证顺序配置请使用 `auth.order.openai`。

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

| OpenAI 功能                | OpenClaw 接入方式                                                                            | 状态                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 聊天 / Responses          | `openai/<model>` 模型提供商                                                                    | 是                                                                       |
| Codex 订阅模型            | 使用 OpenAI OAuth 的 `openai/<model>`                                                          | 是                                                                       |
| 旧版 Codex 模型引用       | 旧版 Codex 模型引用、`codex-cli/<model>`                                                       | 由 doctor 修复为 `openai/<model>`                                        |
| Codex app-server 运行框架 | 兼容 Codex 的 HTTPS 路由，运行时未设置/为 `auto`，或显式设置 `agentRuntime.id: codex`           | 是                                                                       |
| 服务端网页搜索            | 原生 OpenAI Responses 工具                                                                     | 是，在启用网页搜索且未固定其他提供商时                                    |
| 图像                      | `image_generate`                                                                               | 是                                                                       |
| 视频                      | `video_generate`                                                                               | 是                                                                       |
| 文本转语音                | `tts.provider: "openai"` / `tts`                                                               | 是                                                                       |
| 批量语音转文本            | `tools.media.audio` / 媒体理解                                                                  | 是                                                                       |
| 流式语音转文本            | 语音通话 `streaming.provider: "openai"`                                                        | 是                                                                       |
| 实时语音                  | 语音通话 `realtime.provider: "openai"` / 控制界面 Talk `talk.realtime.provider: "openai"`      | 是（平台 API 密钥；浏览器/Gateway 中继 GPT-Live 使用 ChatGPT OAuth） |
| 嵌入                      | 记忆嵌入提供商                                                                                | 是                                                                       |

<Note>
GA OpenAI 实时语音通过公开的 **OpenAI Platform Realtime
API** 提供，并需要平台 API 密钥。浏览器和 Gateway 中继 GPT-Live
是例外：它们原生的 `api.openai.com/v1/live` 路由优先使用 ChatGPT
OAuth 配置，并在该账户拥有受候补名单限制的访问权限时，回退到平台 API 密钥认证。其他 GPT-Live 后端语音桥接使用 Frameless Bidi WebSocket，并需要平台 API 密钥认证。

平台身份验证按以下顺序解析：已配置的实时 API 密钥、`openai`
API 密钥配置文件，然后是 `OPENAI_API_KEY`。ChatGPT OAuth 不会配置 GA
Talk、语音通话、Discord 实时语音或实时转录。

如果 API key 认证报告缺少 billing，在使用 API-key
认证时，请为支撑你的 realtime 凭证的组织在
[platform.openai.com/account/billing](https://platform.openai.com/account/billing)
为支撑你的 realtime 凭证的组织配置账单。实时语音接受通过
`openclaw onboard --auth-choice openai-api-key` 创建的 `openai` API 密钥认证配置文件、通过
`talk.realtime.providers.openai.apiKey` 为控制界面 Talk 设置的平台 API 密钥、通过
`plugins.entries.voice-call.config.realtime.providers.openai.apiKey` 为语音通话设置的密钥，或
`OPENAI_API_KEY` 环境变量。

在使用平台身份验证的控制界面视频通话中，OpenAI WebRTC 会按需接收摄像头上下文：
当模型调用 `describe_view` 时，浏览器会通过实时数据通道发送一张有大小限制的 JPEG 图片。OpenClaw 不会向 OpenAI 会话附加持续的摄像头轨道。
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

对于要求使用非对称嵌入标签的 OpenAI 兼容端点，请在
`memory.search` 下设置 `queryInputType` 和 `documentInputType`。OpenClaw
会将这些值作为提供商专用的 `input_type` 请求字段进行转发：查询
嵌入使用 `queryInputType`；已索引的内存块和批量索引使用
`documentInputType`。完整示例请参阅
[内存配置参考](/reference/memory-config#provider-specific-config)。

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

    | 模型引用        | 运行时策略或路由事实                                 | 路由                     | 认证                              |
    | ---------------- | ------------------------------------------------------------- | ------------------------- | --------------------------------- |
    | `openai/gpt-5.6` | 未设置/`auto`，精确的官方 HTTPS 原生路由，无请求覆盖 | 可能选择 Codex     | 按顺序排列的 API 密钥认证配置文件      |
    | `openai/gpt-5.6` | 提供商/模型 `agentRuntime.id: "openclaw"`                  | OpenClaw 嵌入式运行时 | 所选的 `openai` API 密钥配置文件 |
    | `openai/gpt-5.5` | 显式提供商/模型 `agentRuntime.id`                     | 所选代理运行时    | 所选的 OpenAI API 密钥配置文件   |
    | `openai/*`       | 编写的 Completions、自定义配置或请求覆盖 | OpenClaw 嵌入式运行时 | 凭据类型保持不变 |
    | `openai/*`       | 明文官方 HTTP 端点                  | 已拒绝                 | 不会发送凭据             |

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

    若要从 OpenAI API 中尝试 ChatGPT 当前的即时模型，请将模型
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

  <Tab title="Codex 订阅">
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
        设备代码流程登录，而不是使用本地回调浏览器：

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

    | 模型引用                | 运行时策略或路由事实                                 | 路由                                                    | 认证                                               |
    | ------------------------ | ------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
    | `openai/gpt-5.6-sol`     | 未设置/`auto`，精确的官方 HTTPS 原生路由，无请求覆盖 | 可能选择 Codex                                    | Codex 登录，或按顺序排列的 `openai` 认证配置文件 |
    | `openai/gpt-5.6-terra`   | 未设置/`auto`，精确的官方 HTTPS 原生路由，无请求覆盖 | 可能选择 Codex                                    | 目录公开 Terra 时使用 Codex 登录       |
    | `openai/gpt-5.6-luna`    | 未设置/`auto`，精确的官方 HTTPS 原生路由，无请求覆盖 | 可能选择 Codex                                    | 目录公开 Luna 时使用 Codex 登录        |
    | `openai/gpt-5.6-sol`     | 提供商/模型 `agentRuntime.id: "openclaw"`                  | OpenClaw 嵌入式运行时，内部 Codex 认证传输 | 所选的 `openai` OAuth 配置文件                    |
    | `openai/gpt-5.5`         | 显式提供商/模型 `agentRuntime.id`                     | 所选代理运行时                                   | 所选的 OpenAI 认证配置文件                       |
    | `openai/*`               | 编写的 Completions、自定义配置或请求覆盖 | OpenClaw 嵌入式运行时                                | 凭据要求取决于具体路由      |
    | `openai/*`               | 明文官方 HTTP 端点                  | 已拒绝                                                 | 不会发送凭据                              |
    | 旧版 Codex GPT-5.5 引用 | 已由 doctor 修复                                            | 重写为 `openai/gpt-5.5`                            | 已迁移的 OpenAI OAuth 配置文件                      |
    | `codex-cli/gpt-5.5`      | 已由 doctor 修复                                            | 重写为 `openai/gpt-5.5`                            | Codex app-server 认证                              |

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
    浏览器 OAuth（默认）或上面的设备代码流程登录；OpenClaw 会在其自己的代理认证存储中管理
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

    对于同一代理中的多个 Codex OAuth 登录，请使用 `--profile-id`，然后通过认证排序或
    `/model ...@<profileId> -s` 控制它们：

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

    ### 上下文窗口默认值和长上下文选择加入

    OpenClaw 将原生模型容量和活动运行时预算视为两个独立的值：

    - `contextWindow` 声明提供商的模型总窗口。
    - `contextTokens` 限制 OpenClaw 为活动输入使用的窗口大小。

    ChatGPT/Codex OAuth 遵循实时 Codex 账户目录。当前目录通常为 GPT-5.6
    宣布 `272000` 个令牌的活动窗口。直接 API 密钥 GPT-5.5 和 GPT-5.6
    模型的 `contextTokens` 默认值也为 `272000`，尽管 Platform API 暴露了更大的原生窗口。
    这使不同认证模式下的正常延迟、质量和成本配置保持一致。配置的
    `agents.defaults.contextTokens` 值可以进一步降低该预算，但不能将模型提升到其配置的
    `contextTokens` 上限之上。

    对于直接 API 密钥 GPT-5.5 和 GPT-5.6，OpenAI 记录的提供商窗口为 `1050000`
    个令牌，最大输出令牌数为 `128000`。预留完整的输出额度后，以下两个
    运行时方案使用相同的安全输入预算：

    ```text
    1050000 总计 - 128000 最大输出 = 922000 安全活动输入
    自动压缩阈值 = 700000 个活动令牌
    ```

    `922000` 是推导出的运行预算，并非提供商单独公布的
    输入限制。两个运行时会以不同方式转换该预算：嵌入式
    OpenClaw 发送 Responses 压缩控制，而原生 Codex 管理自己的
    目录窗口和自动压缩。请参阅官方的
    [模型比较](https://developers.openai.com/api/docs/models/compare)
    和 [GPT-5.5 模型页面](https://developers.openai.com/api/docs/models/gpt-5.5)。

    #### 嵌入式 OpenClaw 转换

    此示例将精确的 Sol 模型固定到嵌入式 OpenClaw 运行时，
    通过共享运行时控制启用 OpenAI API 快速模式，并要求 OpenAI Responses
    在 `700000` 个活动令牌处执行压缩：

    ```json5
    {
      models: {
        providers: {
          openai: {
            models: [
              {
                id: "gpt-5.6-sol",
                name: "GPT-5.6 Sol",
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
          model: { primary: "openai/gpt-5.6-sol" },
          models: {
            "openai/gpt-5.6-sol": {
              agentRuntime: { id: "openclaw" },
              params: {
                fastMode: true,
                responsesServerCompaction: true,
                responsesCompactThreshold: 700000,
              },
            },
          },
        },
      },
    }
    ```

    OpenAI Responses 自动压缩会生成一个加密的 `compaction`
    输出项。无状态客户端会将最新项带入下一次请求，并可以丢弃所有更早的输入项。
    OpenClaw 会以不透明方式持久化该项，按路由、会话和认证阻止不当重用，
    重放该项，清理被替换的前缀，使其经过工作进程转录提交，并从显示内容和诊断信息中移除。
    切勿打印、记录或暴露加密内容。

    一个由进程拥有的隔离 Gateway 运行验证了这一精确的
    `openai/gpt-5.6-sol` 配置。密集轮次分别达到 `295098`、`586562`
    和 `863664` 个提示令牌。第三轮生成并持久化了一个一等服务器压缩项；
    下一次请求重放了该精确的不透明项，清理其前缀，并使用了 `9602` 个提示令牌。
    一个确定性的长响应生成了 `5480` 个输出令牌，持久化标记在压缩和 Gateway 重启后仍然保留，
    重启延迟为 `12081` 毫秒，每次调用都报告 `serviceTier: priority`，
    整个测试套件耗时 `220.03` 秒。这些计时是观测结果，并非服务级别保证。

    #### 原生 Codex 转换

    保持相同的 OpenClaw 模型选择，但将 Codex 设为显式运行时，
    并且不要向此模型条目添加 Responses 压缩参数：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openai/gpt-5.6-sol" },
          models: {
            "openai/gpt-5.6-sol": {
              agentRuntime: { id: "codex" },
              params: { fastMode: true },
            },
          },
        },
      },
    }
    ```

    Codex 必须将 `922000` 同时用于 `context_window` 和
    `max_context_window`，将 `700000` 用于 `auto_compact_token_limit`，
    并设置匹配的应用服务器覆盖项，其中包含
    `model_auto_compact_token_limit_scope=total`。Codex 随后会应用其有效窗口的 95% 预留，
    得到 `875900` 个活动令牌。配置一个有序的 OpenAI API 密钥配置文件，并保留默认的
    隔离代理范围 Codex 主目录。完整的目录、应用服务器、认证和重启方案位于
    [Codex harness 长上下文](/plugins/codex-harness#direct-api-long-context)。

    这些示例是两个明确的运行时选择，而不是一个会自动选择的配置。
    以模型为范围的 `agentRuntime` 和由运行时负责的压缩设置必须同步更改。
    OpenClaw 只有在两者的模型引用或代理配置可区分时，才能同时保留这两种选择；
    否则，应将模型运行时及其匹配配置作为一个原子更改一起切换。然后重启 Gateway
    和原生 Codex app-server，运行 `/model default -s`，并开始新的聊天。
    现有的原生 Codex 线程会保留创建时记录的提供商和模型。

    <Warning>
    一旦 GPT-5.5 或 GPT-5.6 请求超过 `272000` 个输入令牌，
    OpenAI 就会应用更高的长上下文定价：整个符合条件的请求将按输入和缓存费率的 2 倍计费，
    输出费率按 1.5 倍计费。快速模式定价取决于具体模型；GPT-5.6 Sol API 快速模式目前
    在标准模式基础上还要增加 2 倍。因此，对于该模型，长上下文快速流量的综合价格为短上下文
    标准输入侧定价的 4 倍，以及短上下文标准输出侧定价的 3 倍。大型提示会在多轮之间重新发送或压缩，
    因此即使可见回复很短，选择加入的会话也可能比默认设置昂贵得多。请参阅
    [快速模式](https://openai.com/api-priority-processing/)
    和 [OpenAI API 定价](https://developers.openai.com/api/docs/pricing)。
    账户访问权限、实际限制和计费以 API 为准。
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

默认的每个代理的 `codex-home/auth.json` 并不是运行时认证存储。如果你在那里复制或挂载了 Codex CLI 凭据，请在启动原生 Codex 回合之前，将它们导入代理的 OpenClaw 认证存储。将 `<agent-id>` 替换为拥有此 Codex home 的已配置代理：

```bash
openclaw migrate plan codex --from <codex-home> --agent <agent-id> --include-secrets --item auth:openai
openclaw migrate apply codex --from <codex-home> --agent <agent-id> --include-secrets --item auth:openai --yes
```

本地 ChatGPT/Codex 订阅登录不会仅仅因为网关进程还通过 `OPENAI_API_KEY` 使用直接 OpenAI 模型或嵌入而被替换。环境变量 API 密钥回退仅适用于本地 stdio 无账户路径；它绝不会通过 WebSocket app-server 连接发送。当选择订阅类型的 Codex 配置文件时，OpenClaw 还会阻止将 `CODEX_API_KEY` 和 `OPENAI_API_KEY` 传递给启动的 stdio app-server 子进程，而是通过 app-server 登录 RPC 发送所选凭据。

当该订阅配置文件因 Codex 使用限额而被阻止时，OpenClaw 会将该配置文件标记为已阻止，直到 Codex 公布的重置时间，并让认证顺序轮换到下一个 `openai:*` 配置文件，而不会更改所选模型，也不会退出 Codex harness。一旦重置时间过去，该订阅配置文件即可再次使用。

## 图像生成

捆绑的 `openai` 插件通过 `image_generate` 工具注册图像生成。它使用同一个 `openai/gpt-image-2` 模型引用，同时支持 OpenAI API 密钥和 Codex OAuth 图像生成。

| 能力                    | OpenAI API 密钥                    | Codex OAuth                          |
| ----------------------- | ---------------------------------- | ------------------------------------ |
| 模型引用                | `openai/gpt-image-2`               | `openai/gpt-image-2`                 |
| 身份验证                | `OPENAI_API_KEY`                   | OpenAI Codex OAuth 登录              |
| 传输方式                | OpenAI Images API                  | Codex Responses 后端                 |
| 每次请求的最大图像数    | 4                                  | 4                                    |
| 编辑模式                | 已启用（最多 5 张参考图像）         | 已启用（最多 5 张参考图像）           |
| 内容审核                | `low` 或 `auto`；支持生成和编辑     | `low` 或 `auto`；支持生成和编辑       |
| 尺寸覆盖                | 支持，包括 2K/4K 尺寸               | 支持，包括 2K/4K 尺寸                 |
| 宽高比 / 分辨率         | 不会转发到 OpenAI Images API        | 在安全的情况下映射到受支持的尺寸      |

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

从输入文件开始时，在 `openclaw infer image edit` 中使用相同的 `--output-format` 和 `--background` 标志。`--openai-background` 仍可作为 OpenAI 专用别名使用。使用 `--quality low|medium|high|auto` 来控制 OpenAI Images 的质量和成本。在 `image generate` 和 `image edit` 中使用 `--openai-moderation low|auto`，即可传递 OpenAI 的内容审核提示。直接的 OpenAI Images API 和 ChatGPT/Codex OAuth Responses 后端都支持文生图生成和参考图像编辑的内容审核。

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
请参见 [视频生成](/tools/video-generation) 了解共享工具参数、
提供方选择以及故障转移行为。

OpenAI 提供方声明支持 `supportsSize`，但不支持 `supportsAspectRatio` 或
`supportsResolution`。OpenClaw 的共享规范化层会在请求到达提供方之前，
将请求的 `aspectRatio` 转换为最接近的 OpenAI `size`，因此宽高比请求通常仍然有效。
`resolution` 没有尺寸回退，会被丢弃，并向调用者提示为
`Ignored unsupported overrides for openai/<model>: resolution=<value>`。
</Note>

## GPT-5 提示词贡献

OpenClaw 为 `openai` 提供方上的 GPT-5 系列模型添加了一个共享的 GPT-5 提示词贡献（包括会规范化为 `openai/*` 的旧版、修复前的 Codex 引用）。其他同样提供 GPT-5 系列模型 ID 的提供方，例如 OpenRouter 或 opencode 路由，不会收到此覆盖层；它受提供方 ID `openai` 约束，而不是仅由模型 ID 决定。更旧的 GPT-4.x 模型永远不会收到它。

原生 Codex 应用服务器运行框架不会通过开发者指令获得人格/工具纪律行为契约或友好交互风格覆盖层；原生 Codex 保留 Codex 自有的基础、模型和项目文档行为，而 OpenClaw 会为原生线程禁用 Codex 内置人格，使代理工作区人格文件保持权威。OpenClaw 仅向原生 Codex 线程贡献运行时上下文：通道传递、OpenClaw 动态工具、ACP 委派、工作区上下文以及 OpenClaw 技能。来自同一贡献中的心跳指导文本是唯一例外：原生 Codex 的心跳轮次确实会收到它，但它是作为专门的协作指令注入的，而不是通过共享提示词贡献钩子注入的。

GPT-5 提示词贡献会为匹配的 OpenClaw 组装提示添加一个带标签的行为契约，涵盖人格持久性、执行安全、工具纪律、输出形态、完成检查以及验证。特定通道的回复和静默消息行为仍保留在共享的 OpenClaw 系统提示和出站传递策略中。友好交互风格层是独立且可配置的。

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
  <Tab title="命令行">
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
  <Accordion title="语音合成（TTS）">
    捆绑的 `openai` 插件为
    `tts` 表面注册语音合成。

    | 设置       | 配置路径                                            | 默认值                              |
    | ---------- | --------------------------------------------------- | ----------------------------------- |
    | 模型       | `tts.providers.openai.model`                        | `gpt-4o-mini-tts`                   |
    | 声音       | `tts.providers.openai.speakerVoice`                 | `coral`                             |
    | 速度       | `tts.providers.openai.speed`                        | （未设置）                          |
    | 指令       | `tts.providers.openai.instructions`                 | （未设置，仅适用于 `gpt-4o-mini-tts` 系列） |
    | 格式       | `tts.providers.openai.responseFormat`               | 语音留言为 `opus`，文件为 `mp3`     |
    | API 密钥   | `tts.providers.openai.apiKey`                       | 回退使用 `OPENAI_API_KEY`           |
    | 基础 URL   | `tts.providers.openai.baseUrl`                      | `https://api.openai.com/v1`         |
    | 额外请求体 | `tts.providers.openai.extraBody` / `extra_body`     | （未设置）                          |

    可用模型：`gpt-4o-mini-tts`、`gpt-4o-mini-tts-2025-12-15`、`tts-1`、
    `tts-1-hd`。可用声音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、
    `echo`、`fable`、`juniper`、`marin`、`onyx`、`nova`、`sage`、`shimmer`、
    `verse`。

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
    设置 `OPENAI_TTS_BASE_URL` 可覆盖 TTS 基础 URL，而不会影响聊天 API 端点。OpenAI TTS 和 GA Realtime 语音通过 OpenAI Platform API 密钥配置。仅支持 OAuth 的安装可以通过 ChatGPT 订阅使用 Codex 支持的聊天模型、GPT-Live 以及 GA Realtime 浏览器 Talk（请参阅 Realtime 折叠面板）。如果没有 Platform API 密钥，它们无法使用 OpenAI TTS、iOS Realtime WebRTC、Voice Call、Gateway relay 或 Discord realtime voice。
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

  <Accordion title="实时转录">
    捆绑的 `openai` 插件为
    Voice Call 插件注册实时转录。

    | 设置       | 配置路径                                                          | 默认值 |
    | ---------- | ----------------------------------------------------------------- | ------ |
    | 模型       | `plugins.entries.voice-call.config.streaming.providers.openai.model` | `gpt-4o-transcribe` |
    | 语言       | `...openai.language`                                              | （未设置） |
    | 提示       | `...openai.prompt`                                                | （未设置） |
    | 静默时长   | `...openai.silenceDurationMs`                                    | `800` |
    | VAD 阈值   | `...openai.vadThreshold`                                          | `0.5` |
    | 身份验证   | `...openai.apiKey`、`OPENAI_API_KEY` 或 `openai` API 密钥配置文件 | 需要 Platform API 密钥 |

    <Note>
    使用 WebSocket 连接到 `wss://api.openai.com/v1/realtime`，并使用
    G.711 u-law（`g711_ulaw` / `audio/pcmu`）音频。对于 `openai` API 密钥
    配置文件，Gateway 会在打开 WebSocket 之前生成一个临时的 Realtime 转录客户端
    secret。此流式提供方用于 Voice Call 的实时转录路径；Discord 语音目前会录制短
    片段，并改用批量 `tools.media.audio` 转录路径。
    </Note>

  </Accordion>

  <Accordion title="实时语音">
    捆绑的 `openai` 插件为 Voice Call
    插件注册实时语音。

    | 设置                                  | 配置路径                                                              | 默认值             |
    | ------------------------------------- | --------------------------------------------------------------------- | ------------------ |
    | 模型                                  | `plugins.entries.voice-call.config.realtime.providers.openai.model`    | `gpt-realtime-2.1` |
    | 声音                                  | `...openai.voice`                                                      | `alloy`            |
    | 温度（Azure 部署桥接）                | `...openai.temperature`                                               | `0.8`              |
    | VAD 阈值                              | `...openai.vadThreshold`                                              | `0.5`              |
    | 静默时长                              | `...openai.silenceDurationMs`                                         | `500`              |
    | 前缀填充                              | `...openai.prefixPaddingMs`                                           | `300`              |
    | 推理力度                              | `...openai.reasoningEffort`                                           | （未设置）         |
    | 身份验证                              | `openai` 身份验证配置文件、`...openai.apiKey` 或 `OPENAI_API_KEY`     | Platform API 密钥；浏览器和 Gateway relay GPT-Live 支持 ChatGPT OAuth |

    `gpt-realtime-2.1` 可用的内置 Realtime 声音有：`alloy`、`ash`、
    `ballad`、`coral`、`echo`、`sage`、`shimmer`、`verse`、`marin`、`cedar`。
    OpenAI 推荐 `marin` 和 `cedar` 以获得最佳 Realtime 质量。此声音集合与上方
    的文本转语音声音是分开的；像 `fable`、`nova` 或 `onyx` 这类仅用于 TTS 的声音
    不适用于 Realtime 会话。
    如果你更偏好更小、成本更低的 Realtime 2.1 变体，请显式将模型设为
    `gpt-realtime-2.1-mini`。

    #### 通过 ChatGPT OAuth 使用 GA Realtime 浏览器 Talk

    浏览器 Talk 可以将 `gpt-realtime-2.1`、`gpt-realtime-2.1-mini` 或
    `gpt-realtime-2` 与 Platform API 密钥身份验证或 OpenClaw ChatGPT
    OAuth 订阅配置文件结合使用。Platform 身份验证按以下顺序优先：
    已配置的 realtime 密钥、`openai` API 密钥配置文件，然后是
    `OPENAI_API_KEY`。如果均未配置，Gateway 会回退到由
    `openclaw models auth login --provider openai` 创建的
    ChatGPT OAuth 配置文件。

    两条浏览器路径公开相同的 Talk 会话契约，但会将凭据保存在信任边界的不同侧。Platform 身份验证会生成临时客户端 secret，浏览器直接与 OpenAI 交换 SDP。OAuth 身份验证则留在 Gateway 中：现有的单次使用 offer broker 将原始 `application/sdp` 发送到
    `/v1/realtime/calls?model=<model>`，并且只返回 answer SDP。
    OAuth 令牌永远不会到达浏览器。如果已配置的 Platform 凭据无法解析，仍会采取故障关闭策略；在 OAuth 回退生效前，请修复或移除该凭据来源。

    此 GA OAuth 回退仅适用于浏览器。iOS 客户端自有 WebRTC、Voice
    Call、Gateway relay、提供方 WebSocket 传输、Discord realtime voice
    以及其他后端 GA Realtime 桥接仍然只支持 Platform 密钥。

    #### GPT-Live 传输路径

    GPT-Live 支持浏览器 Talk 以及 Gateway 自有的 `gateway-relay`
    Talk，可使用 ChatGPT OAuth 或已注册的 Platform API 密钥。两条路径都会在
    `/v1/live` 创建 WebRTC 呼叫；Gateway relay 使用 `werift` 对等端，并将媒体、凭据
    和经过身份验证的 sideband 保留在 Gateway 上。Discord 和 Voice Call 使用带
    Platform API 密钥身份验证的 Frameless Bidi
    `wss://api.openai.com/v1/live?model=...` 端点。

    使用 `gpt-live-1-codex`（推荐）或
    `gpt-live-1-boulder-alpha`。`gpt-live-1` 和
    `gpt-live-1-mini` 这两个值在此路径上无效。请通过
    `talk.realtime.model` 显式选择；`gpt-realtime-2.1` 仍是 GA 默认值。

    GPT-Live 接受以下声音：`alloy`、`ash`、`ballad`、`cedar`、`coral`、
    `echo`、`marin`、`sage`、`shimmer` 和 `verse`。OpenClaw 默认使用
    `marin`，并会将未知或不受支持的已配置声音映射回该声音。

    浏览器 WebRTC 前置条件如下，顺序不可变：

    1. ChatGPT OAuth 身份验证配置文件：`openclaw models auth login --provider openai`。
       现有的 Codex CLI（`~/.codex`）登录信息**不会**被读取；配置文件必须存在于 OpenClaw 中。拥有 `/v1/live` 访问权限的 Platform API 密钥也可以替代，但该权限受候补名单限制。
    2. 将 `talk.realtime.model` 设置为 `gpt-live-*` 值——可通过控制界面的**设置 →
       Talk**，或使用下面的配置完成。
    3. 以完整模式注册捆绑的 `openai` 插件。限制性的
       `plugins.allow` 列表会失败，并显示“OpenAI GPT-Live browser session broker
       is unavailable”。

    请注意一种不对称的失败模式：如果已配置的 Platform API 密钥无法解析（例如损坏的 secret 引用），就会以“fix or remove it”抑制 OAuth 回退——请修复或删除该密钥，而不要期待 OAuth 静默接管。

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

    对于 Gateway 自有的 WebRTC 路径，请选择 Gateway relay。它优先使用 OpenClaw ChatGPT OAuth 配置文件；如果不可用，则依次回退到
    `talk.realtime.providers.openai.apiKey` 中已注册的 Platform 密钥、
    `openai` API 密钥配置文件或 `OPENAI_API_KEY`：

    ```json5
    {
      talk: {
        realtime: {
          provider: "openai",
          model: "gpt-live-1-codex",
          transport: "gateway-relay",
        },
      },
    }
    ```

    浏览器 Talk 使用 `transport: "webrtc"`。

    | 使用者 | GPT-Live 状态 |
    | ------ | ------------- |
    | 浏览器 Talk | 支持客户端 WebRTC 和 Gateway 自有 sideband |
    | Gateway-relay Talk | 支持 Gateway 自有 WebRTC 和 sideband |
    | Discord 双向语音 | 支持使用 Platform 密钥的后端 WebSocket |
    | Voice Call 和电话服务 | 支持使用 Platform 密钥的后端 WebSocket |
    | iOS 客户端自有 Talk | 待定 |
    | Android realtime Talk | 等待 Android 设备 live-proof 切换；Android 仍使用原生 Talk |

    <Warning>
    Platform API 密钥对 `/v1/live` 的访问受候补名单限制，未完成注册时通常会返回
    `400 model_not_found`。请使用 ChatGPT OAuth 配置文件，或通过
    [GPT-Live API 访问申请表](https://openai.com/form/gpt-live-1-in-the-api/)申请 Platform 访问权限。
    </Warning>

    `403 Voice session access denied` 响应含义较为宽泛，不能单凭此响应证明账户没有相应权限：无效的声音也会产生相同响应。首先根据上面的可接受列表检查模型和声音，然后确认所选的 ChatGPT OAuth 配置文件与
    `chatgpt-account-id` 属于同一账户。

    Gateway 自有的 WebRTC 路由会通过已配置的 OpenClaw agent 路由 sideband 委派，并使 OAuth 或 Platform 凭据远离 relay 客户端。直接 WebSocket 桥接支持通过 Platform 身份验证实现 Discord 语音和 Voice
    Call/电话服务；OpenClaw 会将 G.711 u-law 电话音频转换为 GPT-Live 的 24 kHz PCM 流，反向转换亦然。在 Gateway relay 路径从 Android 设备获得实时证明之前，Android 的客户端侧开关会保持关闭。

    WebRTC 路径会在 `api.openai.com/v1/live` 上创建呼叫，并在那里加入其
    sideband。后端路径会打开 `/v1/live?model=...`，发送 Frameless
    `session.update`，然后通过同一个 socket 传输 PCM 音频、转录文本、
    委派和委派结果。旧版 `chatgpt.com` 后端路由会返回 `403`，不会被使用。

    维护者可以使用选择性启用的 live 测试来执行 OpenClaw 完整的 OAuth 路径。没有 ChatGPT OAuth 凭据时测试会跳过，并且永远不会打印令牌内容：

    ```bash
    OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_GPT_LIVE=1 node --import tsx scripts/test-live.mts -- extensions/openai/realtime-quicksilver.live.test.ts
    OPENCLAW_LIVE_TEST=1 OPENCLAW_LIVE_GPT_LIVE=1 node --import tsx scripts/test-live.mts -- extensions/openai/realtime-quicksilver-gateway-bridge.live.test.ts
    ```

    <Note>
    GA 后端 OpenAI realtime 桥接使用 Realtime WebSocket 会话格式，不接受
    `session.temperature`；GPT-Live 使用独立的 Frameless Bidi 格式。Azure OpenAI
    部署仍可通过 `azureEndpoint` 和 `azureDeployment` 使用，并保留与部署兼容的会话格式（包括 `temperature`）。
    支持双向工具调用和 G.711 u-law 音频。
    </Note>

    <Note>
    Realtime 声音在会话创建时选定。OpenAI 允许大多数
    会话字段在之后更改，但一旦模型在该会话中发出过音频，就不能再
    更改声音。OpenClaw 当前将内置 Realtime 声音 id 作为字符串暴露。
    </Note>

    <Note>
    控制界面 Talk 使用 OpenAI 浏览器 WebRTC 会话。GA
    `gpt-realtime-*` 模型在 Platform 凭据可用时使用 Gateway 生成的临时客户端 secret，并在浏览器中直接交换 SDP。
    已配置的 realtime 密钥、API 密钥配置文件和 `OPENAI_API_KEY` 按此顺序使用该路径。
    没有 Platform 凭据时，GA 浏览器 Talk 使用与 GPT-Live 相同的 Gateway offer broker，因此 ChatGPT OAuth 始终保留在服务器端。
    当两种身份验证模式都已配置时，GPT-Live 优先使用 ChatGPT OAuth；如果账户拥有受候补名单限制的 `/v1/live` 访问权限，则回退到 Platform API 密钥访问。
    GA Gateway relay 和 Voice Call 后端 realtime WebSocket 桥接需要 Platform 凭据。
    GPT-Live Gateway relay 则使用 Gateway 自有 WebRTC，优先使用 ChatGPT OAuth，并回退到已获准访问的 Platform 权限；Voice Call GPT-Live 使用 Platform 密钥后端 WebSocket。
    维护者可以使用
    `OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts`
    进行实时验证；其中 OpenAI 测试部分会验证后端 WebSocket 桥接、合成的 PCM24
    语音到响应音频往返，以及浏览器 WebRTC SDP 交换，并且不会记录 secret。
    传入 `--openai-only` 可在没有 Google 凭据的情况下运行这些测试。
    使用 `--openai-audio-cycles 3` 可进行短时间的重复连接、应答和关闭浸泡测试。
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

下面的 `transport` 和 `serviceTier` 示例是由作者编写的嵌入式提供程序请求设置，因此，原本符合条件的 `auto` 路由会保持使用 OpenClaw，而不会隐式选择 Codex。有效的 `fastMode` / `fast_mode` 值以及有效的截止时间键属于类型化的 agent-runtime 控制项，不会选择运行时。因此，特定于运行时的示例会显式固定 `agentRuntime.id`。原生 Codex app-server harness 管理自身的传输和请求设置；当有效路由未声明为兼容 Codex 时，显式设置 `agentRuntime.id: "codex"` 会安全失败。

<AccordionGroup>
  <Accordion title="传输（WebSocket vs SSE）">
    OpenClaw 对 `openai/*` 默认采用 WebSocket 优先，并在失败时回退到 SSE（`"auto"`）。

    在 `"auto"` 模式下，OpenClaw：
    - 在回退到 SSE 之前，会对首次较早的 WebSocket 失败重试一次
    - 发生失败后，会将 WebSocket 标记为降级 60 秒，并在冷却期间使用 SSE
    - 为重试和重新连接附加稳定的会话与轮次身份标头
    - 在不同传输变体之间规范化用量计数器（`input_tokens` / `prompt_tokens`）

    | 值                   | 行为                               |
    | ---------------------- | ------------------------------------ |
    | `"auto"`（默认）      | 优先使用 WebSocket，失败时回退到 SSE |
    | `"sse"`               | 仅强制使用 SSE                       |
    | `"websocket"`         | 仅强制使用 WebSocket                 |

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              agentRuntime: { id: "openclaw" },
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

    - **聊天/界面：** `/fast status|auto|on|off`
    - **配置：** `agents.defaults.models["<provider>/<model>"].params.fastMode`

    有效的 `params.fastMode` / `params.fast_mode` 值以及有效的截止时间键
    属于类型化的运行时控制项。它们不计入作者编写的提供程序请求参数，
    也不会选择 OpenClaw 或 Codex。下面的示例固定使用嵌入式
    OpenClaw，因为它描述的是直接的提供程序请求。

    在嵌入式运行时中启用后，OpenClaw 会将快速模式映射到 OpenAI API
    快速模式（以前称为优先处理），目前发送
    `service_tier = "priority"`。快速模式不会重写 `reasoning` 或
    `text.verbosity`。`fastMode: "auto"` 会让新的模型调用在自动截止时间
    之前以快速模式启动，之后启动的重试、回退、工具结果或续接调用则不使用
    快速模式。截止时间默认为 60 秒；在活动模型上设置
    `params.fastAutoOnSeconds` 可更改该值。

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              agentRuntime: { id: "openclaw" },
              params: { fastMode: "auto", fastAutoOnSeconds: 30 },
            },
          },
        },
      },
    }
    ```

    <Note>
    完整的优先级顺序为：内联消息、已存储会话、每个 agent 的默认值、
    全局默认值、每个模型的 `params.fastMode`，最后是关闭。
    `/fast default` 只会清除会话层。`/status` 报告的是解析后的 OpenClaw
    策略和运行时，而不是上游实际采用或返回的服务层级。请参阅
    [思考级别](/tools/thinking#fast-mode-fast) 和
    [Codex harness](/plugins/codex-harness#shared-fast-mode-and-codex-fast-mode)。
    </Note>

    快速模式按高级价格计费，并且因模型而异。GPT-5.6 Sol API 快速模式
    目前按标准 token 价格的 2 倍计费，长上下文乘数会按上文所述叠加。
    ChatGPT/Codex 积分快速模式是独立的计费系统：GPT-5.6 和 GPT-5.5
    目前消耗 2.5 倍的标准积分，而使用 API 密钥运行 Codex 则采用 API token
    价格。请参阅
    [快速模式](https://openai.com/api-priority-processing/)、
    [API 定价](https://developers.openai.com/api/docs/pricing) 和
    [Codex 速度](https://learn.chatgpt.com/docs/agent-configuration/speed)。

  </Accordion>

  <Accordion title="带有 service_tier 的 OpenAI API 快速模式">
    OpenAI 现在将此 API 产品称为快速模式；它以前称为优先处理。
    OpenClaw 目前发送的线路值为
    `service_tier = "priority"`。在嵌入式 OpenClaw 运行时中，按模型设置
    显式层级：

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "openai/gpt-5.5": {
              agentRuntime: { id: "openclaw" },
              params: { serviceTier: "priority" },
            },
          },
        },
      },
    }
    ```

    支持的值：`auto`、`default`、`flex`、`priority`。

    <Warning>
    `params.serviceTier` 是由作者编写的嵌入式提供程序设置，而不是原生
    Codex app-server 配置。它仅由嵌入式运行时转发到原生 OpenAI 端点
    （`api.openai.com`）和原生 ChatGPT 端点（`chatgpt.com/backend-api`）。
    如果通过代理路由任一提供程序，OpenClaw 会原样保留 `service_tier`。
    请通过 `plugins.entries.codex.config.appServer.serviceTier` 单独配置
    原生 harness；共享的快速模式运行控制可能会覆盖该值。
    </Warning>

  </Accordion>

  <Accordion title="服务器端压缩（Responses API）">
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

    OpenAI 会将压缩后的状态作为加密的 `compaction` 输出项发出。
    请将该项视为不透明数据。对于无状态续接，请向前传递最新的项，并丢弃
    它所替代的较早输入前缀。OpenClaw 会自动执行此操作：仅针对匹配的路由、
    会话和身份验证身份持久化并重放该项，在 worker 提交会话记录期间保留该项，
    并将其从用户可见历史记录和诊断信息中过滤掉。绝不要显示或记录加密内容。

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

  <Accordion title="严格代理式 GPT 模式">
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
    Codex app-server harness；后者会自行管理轮次与计划行为。对于原生 Codex 运
    行，harness 选择比 execution-contract 设置更重要。
    </Note>

  </Accordion>

  <Accordion title="原生路由与 OpenAI 兼容路由">
    OpenClaw 会将直接的 OpenAI、Codex 和 Azure OpenAI 端点
    与通用的 OpenAI 兼容 `/v1` 代理区别对待：

    **原生路由**（`openai/*`、Azure OpenAI）：
    - 仅对支持 OpenAI `none` effort 的模型保留 `reasoning: { effort: "none" }`
    - 对于模型或代理不接受 `reasoning.effort: "none"` 的情况，省略禁用的 reasoning
    - 默认将工具 schema 设为严格模式
    - 仅在已验证的原生主机上附加隐藏归因标头（Azure
      OpenAI 不会获得这些标头，即使它是原生路由）
    - 保留仅 OpenAI 可用的请求形状调整（`service_tier`、`store`、
      reasoning-compat、prompt-cache 提示）

    **代理/兼容路由：**
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