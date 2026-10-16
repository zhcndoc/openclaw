---
summary: "将 OpenAI 与 API 密钥、Codex 订阅连接，或使用 ChatGPT 登录（测试版）"
read_when:
  - "您正在首次连接 OpenAI 至 OpenClaw"
  - "你想使用 Codex 订阅认证而不是 API 密钥"
  - "您正在恢复损坏的 Codex OAuth 路线或长上下文预算"
title: "OpenAI 设置"
sidebarTitle: "设置"
---

比较 [OpenAI 身份验证方法](/providers/openai/authentication)，根据模型访问、托管插件、使用情况跟踪和权限进行选择。

## <a id="getting-started"></a> 入门

<Tabs>
  <Tab id="api-key-openai-platform" title="API 密钥（OpenAI 平台）">
    **最适合：** 直接 API 访问和按使用量计费。

    <Steps>
      <Step id="get-your-api-key" title="获取您的 API 密钥">
        从 [OpenAI Platform 控制台](https://platform.openai.com/api-keys) 创建或复制一个 API 密钥。
      </Step>
      <Step id="run-onboarding" title="运行入门引导培训">
        ```bash
        openclaw onboard --auth-choice openai-api-key
        ```

        或直接传入密钥：

        ```bash
        openclaw onboard --openai-api-key "$OPENAI_API_KEY"
        ```
      </Step>
      <Step id="verify-the-model-is-available" title="验证模型是否可用">
        ```bash
        openclaw models list --provider openai
        ```
      </Step>
    </Steps>

    ### <a id="route-summary"></a> 路由摘要

    | 模型引用        | 运行时策略或路由事实                                 | 路由                     | 认证                              |
    | ---------------- | ------------------------------------------------------------- | ------------------------- | --------------------------------- |
    | `openai/gpt-5.6` | unset/`auto`，确切的官方 HTTPS 原生路由，无请求覆盖 | 可能选择 Codex     | 订购 API-key 身份验证配置文件      |
    | `openai/gpt-5.6` | provider/model `agentRuntime.id: "openclaw"`                  | OpenClaw 嵌入式运行时 | 选定的 `openai` API- 密钥配置文件 |
    | `openai/gpt-5.5` | 显式 provider/model `agentRuntime.id`                     | 选定的代理运行时    | 选定的 OpenAI API- 密钥配置文件   |
    | `openai/*`       | 编写的 Completions、自定义配置或请求覆盖 | OpenClaw 嵌入式运行时 | 凭据类型保持不变 |
    | `openai/*`       | 明文官方 HTTP 端点                  | 已拒绝                 | 不会发送凭据             |

    <Note>
    在未设置运行时或 `auto` 的情况下，只有符合条件的确切官方 HTTPS 本机路由才可以隐式选择 Codex 应用程序服务器harness。对于代理模型上的 API-key 身份验证，请创建 `openai` API-key 身份验证配置文件并使用 `auth.order.openai` 进行订购； `OPENAI_API_KEY` 仍然是非代理 OpenAI API 表面的直接后备。运行 `openclaw doctor --fix` 以迁移旧版 Codex 身份验证顺序条目。
    </Note>

    ### <a id="config-example"></a> 配置示例

    ```json5
    {
      env: { vars: { OPENAI_API_KEY: "example-openai-key-not-real" } },
      agents: { defaults: { model: { primary: "openai/gpt-6-astra" } } },
    }
    ```

    直接 API 的裸 `gpt-5.6` 别名也受支持，并会解析为 Sol 层级。如果此 API 组织不公开 GPT-5.6，请明确将 primary 设置为 `openai/gpt-5.5`。

    要从 OpenAI API 尝试 ChatGPT 当前的 Instant 模型，请将模型设置为 `openai/chat-latest`：

    ```json5
    {
      env: { vars: { OPENAI_API_KEY: "example-openai-key-not-real" } },
      agents: { defaults: { model: { primary: "openai/chat-latest" } } },
    }
    ```

    `chat-latest` 是移动别名。新的 OpenAI API-key 设置改为使用 `openai/gpt-6-astra`。裸直接 API `openai/gpt-5.6` 别名仍然受支持并解析为 Sol。现有的显式初选（包括 `openai/gpt-5.5`）保持不变。 `chat-latest` 别名仅接受 `medium` 文本详细信息；对于该模型，OpenClaw 强制 `medium` 提供任何其他请求的详细信息。

    <Warning>
    OpenClaw 是否 **not** 在直接 OpenAI API-key 路由上公开 `gpt-5.3-codex-spark`。当您的登录帐户公开它时，它只能通过 Codex 订阅目录条目使用。
    </Warning>

  </Tab>

  <Tab id="codex-subscription" title="Codex 订阅">
    **最适合：** 使用你的 ChatGPT/Codex 订阅，通过原生 Codex app-server 执行，而不是单独的 API 密钥。Codex 云需要 ChatGPT 登录。

    <Steps>
      <Step id="run-codex-oauth" title="运行 Codex OAuth">
        ```bash
        openclaw onboard --auth-choice openai
        ```

        或直接运行 OAuth：

        ```bash
        openclaw models auth login --provider openai
        ```

        对于无头或不便使用回调的环境，添加 `--device-code` 以通过 ChatGPT 设备代码流程登录，而不是使用本地回调浏览器：

        ```bash
        openclaw models auth login --provider openai --device-code
        ```
      </Step>
      <Step id="use-the-standard-openai-model-route" title="使用标准OpenAI模型路线">
        <a id="use-the-canonical-openai-model-route" />
        ```bash
        openclaw config set agents.defaults.model.primary openai/gpt-6-astra
        ```

        这个精确的官方 HTTPS 原生路由不需要任何运行时配置。它可能会自动选择 Codex app-server 运行时， 而 OpenClaw 会在选择该运行时时安装或修复捆绑的 Codex 插件。
      </Step>
      <Step id="verify-codex-auth-is-available" title="验证 Codex 身份验证可用">
        ```bash
        openclaw models list --provider openai
        ```

        网关运行后，在聊天中发送 `/codex status` 或 `/codex models` 以验证原生应用服务器运行时。
      </Step>
    </Steps>

    ### <a id="route-summary-1"></a><a id="route-summary-2"></a> 路由摘要

    | 模型引用                | 运行时策略或路由事实                                 | 路由                                                    | 认证                                               |
    | ------------------------ | ------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------- |
    | `openai/gpt-6-astra`     | unset/`auto`，确切的官方 HTTPS 原生路由，无请求覆盖 | 可能选择 Codex                                    | Codex 登录，或订购的 `openai` 身份验证配置文件 |
    | `openai/gpt-5.6-terra`   | unset/`auto`，确切的官方 HTTPS 原生路由，无请求覆盖 | 可能选择 Codex                                    | 当目录公开 Terra 时 Codex 登录       |
    | `openai/gpt-5.6-luna`    | unset/`auto`，确切的官方 HTTPS 原生路由，无请求覆盖 | 可能选择 Codex                                    | Codex 当目录暴露 Luna 时登录        |
    | `openai/gpt-6-astra`     | provider/model `agentRuntime.id: "openclaw"`                  | OpenClaw 嵌入式运行时，内部 Codex-auth 传输 | 选定的 `openai` OAuth 配置文件                    |
    | `openai/gpt-5.5`         | 显式 provider/model `agentRuntime.id`                     | 选定的代理运行时                                   | 选定的 OpenAI 身份验证配置文件                       |
    | `openai/*`               | 编写的 Completions、自定义配置或请求覆盖 | OpenClaw 嵌入式运行时                                | 凭据要求取决于具体路由      |
    | `openai/*`               | 明文官方 HTTP 端点                  | 已拒绝                                                 | 不会发送凭据                              |
    | 旧版 Codex GPT-5.5 引用 | 已由 doctor 修复                                            | 重写为 `openai/gpt-5.5`                            | 已迁移的 OpenAI OAuth 配置文件                      |
    | `codex-cli/gpt-5.5`      | 已由 doctor 修复                                            | 重写为 `openai/gpt-5.5`                            | Codex app-server 认证                              |

    <Warning>
    新的订阅支持设置使用精确的 `openai/gpt-6-astra`；原生 Codex 目录也可能会公开确切的 Terra 或 Luna 参考。如果帐户未公开 Astra，请显式选择可用模型。较旧的 Codex GPT 引用是旧版 OpenClaw 路由，而不是本机 Codex 运行时路径；运行 `openclaw doctor --fix` 来迁移它们，而无需升级现有的显式 GPT-5.5 选择。 `gpt-5.3-codex-spark` 仅限于 Codex 订阅目录对其进行广告的帐户；直接 OpenAI API-key 和 Azure 引用仍然受到抑制。
    </Warning>

    <Note>
    新配置应将 OpenAI 代理认证顺序放在 `auth.order.openai` 下； doctor 会迁移旧的传统 Codex 认证顺序条目。
    </Note>

    ### <a id="config-example-1"></a><a id="config-example-2"></a> 配置示例

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-6-astra" },
        },
      },
    }
    ```

    通过 API-key 备份，将所选模型保留在 `openai/*` 下，并将授权顺序放在 `openai` 下。 OpenClaw 首先尝试订阅，然后尝试 API 密钥，同时留在 Codex harness上：

    ```json5
    {
      plugins: { entries: { codex: { enabled: true } } },
      agents: {
        defaults: {
          model: { primary: "openai/gpt-6-astra" },
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
    现在的引导不再从 `~/.codex` 导入 OAuth 凭据。请使用浏览器 OAuth（默认）或上面的设备代码流程登录；OpenClaw 会在其自己的代理认证存储中管理生成的凭据。
    </Note>

    ### <a id="check-and-recover-codex-oauth-routing"></a> 检查并恢复 Codex OAuth 路由

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

    如果较旧的配置仍包含传统 Codex GPT 引用，或在没有显式运行时配置的情况下仍有过期的 OpenAI 运行时会话固定，请修复它：

    ```bash
    openclaw doctor --fix
    openclaw config validate
    ```

    如果 `models auth list --provider openai` 显示没有可用配置文件，请再次登录：

    ```bash
    openclaw models auth login --provider openai
    openclaw models status --probe --probe-provider openai
    ```

    对于同一代理中的多个 Codex OAuth 登录，请使用 `--profile-id`，然后通过认证排序或 `/model ...@<profileId> -s` 控制它们：

    ```bash
    openclaw models auth login --provider openai --profile-id openai:ritsuko
    openclaw models auth login --provider openai --profile-id openai:lain
    ```

    在依赖配置文件顺序之前，请运行 `openclaw doctor --fix` 以迁移旧的传统 OpenAI Codex 前缀配置文件 id 和顺序条目。

    ### <a id="status-indicator"></a> 状态指示器

    聊天中的 `/status` 会显示当前会话正在使用哪个模型运行时。当符合条件的隐式路由或显式 provider/model 运行时策略选择它时，捆绑的 Codex app-server harness 会显示为 `Runtime: OpenAI Codex`。

    ### <a id="doctor-warning"></a> Doctor 警告

    如果配置或会话状态中仍保留传统 Codex 模型引用或过期的 OpenAI 运行时固定， `openclaw doctor --fix` 会将它们重写为带有 Codex 运行时的 `openai/*`，除非显式配置了 OpenClaw。

    ### <a id="context-window-defaults-and-long-context-opt-in"></a> 上下文窗口默认值和长上下文选择加入

    OpenClaw 将原生模型容量和活动运行时预算视为两个独立的值：

    - `contextWindow` 声明模型的本机窗口。
    - `contextTokens` 限制 OpenClaw 为活动输入使用的窗口大小。

    ChatGPT/Codex OAuth 遵循实时 Codex 帐户目录。当前目录通常宣传 GPT-5.6. Direct API-key GPT-5.5 和 GPT-5.6 模型的 `272000` 令牌活动窗口也默认为 `272000` `contextTokens`，即使平台 API 公开了更大的本机窗口。这使得正常的延迟、质量和成本配置文件在不同的身份验证模式下保持一致。在该确切模型条目上使用 `models.providers.openai.models[].contextTokens` 覆盖直接模型的主动输入预算。

    对于直接 API-key GPT-5.5 和 GPT-5.6，OpenAI 记录了 `1050000` 令牌提供程序窗口和 `128000` 最大输出令牌。保留全部输出限额可提供以下两个运行时配方使用的共享安全输入预算：

    ```text
    1050000 total - 128000 maximum output = 922000 safe active input
    automatic compaction threshold = 700000 active tokens
    ```

    `922000` 是推导出的运行预算，并非提供商单独公布的输入限制。两个运行时会以不同方式转换该预算：嵌入式 OpenClaw 发送 Responses 压缩控制，而原生 Codex 管理自己的目录窗口和自动压缩。请参阅官方的 [模型比较](https://developers.openai.com/api/docs/models/compare) 和 [GPT-5.5 模型页面](https://developers.openai.com/api/docs/models/gpt-5.5)。

    #### <a id="embedded-openclaw-translation"></a> 嵌入式 OpenClaw 转换

    此示例将精确的 Sol 模型固定到嵌入式 OpenClaw 运行时， 通过共享运行时控制启用 OpenAI API 快速模式，并要求 OpenAI Responses 在 `700000` 个活动令牌处执行压缩：

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

    OpenAI Responses 自动压缩会生成一个加密的 `compaction` 输出项。无状态客户端会将最新项带入下一次请求，并可以丢弃所有更早的输入项。 OpenClaw 会以不透明方式持久化该项，按路由、会话和认证阻止不当重用， 重放该项，清理被替换的前缀，使其经过工作进程转录提交，并从显示内容和诊断信息中移除。 切勿打印、记录或暴露加密内容。

    在 OpenClaw 2026.8.1 上运行的进程拥有的隔离网关验证了这一确切的 `openai/gpt-5.6-sol` 配置。密集回合达到`295098`、`586562`和`863664`提示令牌。第三回合发出并持久保存一流的服务器压缩项；下一个请求重播了该确切的不透明项目，修剪了其前缀，并使用了 `9602` 提示标记。长响应产生 `5480` 输出令牌，持久标记在压缩和网关重新启动中幸存下来，重新启动延迟为 `12081` 毫秒，每次调用都报告 `serviceTier: priority`，整个套件花费了 `220.03` 秒。这些时间是观察结果，而不是服务水平保证。

    #### <a id="native-codex-translation"></a> 原生 Codex 转换

    保持相同的 OpenClaw 模型选择，但将 Codex 设为显式运行时， 并且不要向此模型条目添加 Responses 压缩参数：

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

    Codex 必须接收 `context_window` 和 `max_context_window` 的 `922000`，`auto_compact_token_limit` 的 `700000`，以及与 `model_auto_compact_token_limit_scope=total` 匹配的应用程序服务器覆盖。 Codex 然后应用其 95% 的有效窗口储备，产生 `875900` 活跃代币。配置有序的 OpenAI API-key 配置文件，并保留默认的隔离代理范围 Codex 主目录。完整的目录、应用程序服务器、身份验证和重新启动配方位于 [Codex harness长上下文 ](/plugins/codex-harness/configuration#direct-api-long-context) 中。

    这些示例是两个明确的运行时选择，而不是一个会自动选择的配置。 以模型为范围的 `agentRuntime` 和由运行时负责的压缩设置必须同步更改。 OpenClaw 只有在两者的模型引用或代理配置可区分时，才能同时保留这两种选择； 否则，应将模型运行时及其匹配配置作为一个原子更改一起切换。然后重启 Gateway 和原生 Codex app-server，运行 `/model default -s`，并开始新的聊天。 现有的原生 Codex 线程会保留创建时记录的提供商和模型。

    <Warning>
    OpenAI一旦GPT-5.5 or GPT-5.6请求超过`272000`输入令牌：整个合格请求的计费为2× 输入和缓存速率以及1.5× 输出率。快速模式定价因模型而异；GPT-5.6索尔API快速模式目前是另一种2× 超过标准。对于该模型，组合的长上下文快速流量因此是4× 短上下文标准投入方定价和3× 短上下文标准产出定价。大型提示会跨轮重新发送或压缩，因此即使可见回复很短，选择加入会话的成本也可能比默认会话高得多。看[快速模式](https://openai.com/api-priority-processing/)和[开放人工智能API定价](https://developers.openai.com/api/docs/pricing)。这API在帐户访问、实际限制和计费方面仍然具有权威性。
    </Warning>

    ### <a id="catalog-recovery"></a> 目录恢复

    OpenClaw 在可用时会对 `gpt-5.5` 使用上游 Codex 目录元数据。若实时 Codex 发现在账户已通过认证时仍省略了 `gpt-5.5` 行，OpenClaw 会合成该 OAuth 模型行， 以免 cron、子代理以及配置的默认模型运行因 `Unknown model` 而失败。

  </Tab>
</Tabs>

<a id="chatgpt-token-sharing-preview" />

<a id="sign-in-with-chatgpt-preview" />

## <a id="sign-in-with-chatgpt-(beta)"></a><a id="sign-in-with-chatgpt-beta"></a> 使用 ChatGPT 登录（测试版）

使用 ChatGPT （SIWC） 登录以获得应用程序特定授权，以便将您的 Codex 津贴用于符合条件的响应 API 请求。在 [ChatGPT 设置 → Usage](https://chatgpt.com/settings/usage) 中检查共享配额使用情况。 OpenClaw 不显示 SIWC 配额或每个应用程序的使用情况，并且不设置每个应用程序的限制； ChatGPT 可能会为您的帐户提供特定于应用程序的控制。

您的帐户和工作区必须具有由 OpenAI 启用的 SIWC 注册和令牌共享。

SIWC 尚不支持 OpenAI- 托管插件或连接的应用程序。这些需要具有连接器调用范围的 Codex 凭据，而设备代码登录不授予该凭据。 OpenClaw 工具和本地配置的插件仍然可以使用自己的凭据。请参见 [OpenAI 身份验证](/providers/openai/authentication) 来比较方法。

在运行 OpenClaw 的计算机上运行此命令：

```bash
openclaw models auth login --provider openai --method siwc
```

批准登录期间的令牌共享以启用模型调用。如果您仅授予身份权限，OpenClaw 会保存帐户，但会要求您在推理之前启用共享或选择其他凭据。

浏览器返回`http://localhost:8080/auth/callback`。如果您的浏览器在另一台计算机上运行，​​请在开始登录之前将其端口 8080 转发到 OpenClaw 的 IPv4 环回。对于 SSH 主机，请在浏览器的计算机上运行以下命令：

```bash
ssh -N -L 8080:127.0.0.1:8080 user@gateway-host
```

打开该计算机上的登录链接。

要重新连接现有帐户，请使用相同的 ChatGPT 用户和工作区登录。要进行切换，请在登录提示中选择 **连接不同的 ChatGPT 帐户或工作区**。

### <a id="current-limitations"></a> 当前限制

- 支持开发者功能工具和网页搜索。尚不支持 OpenAI- 托管插件、连接的应用程序、托管 MCP 工具、工具搜索和托管图像生成。
- 当选定的响应模型接受文本、图像和文件时，可以输入它们。这不会授予对文件上传 API、音频或视频输入或转录 API 的访问权限。
- SIWC 凭证不授权图像生成、音频转录、语音合成或内存嵌入。为这些工具配置单独的兼容凭据。当没有可用的图像生成提供商时，将使用代理的表情符号继续入门引导；头像是可选的。
- Responses 请求使用 HTTP 流。 WebSocket 推理和 OpenClaw 中的 SIWC 配额报告不可用。
- 使用 Codex 运行时，SIWC 需要托管本地进程和隔离的代理主目录。支持自动上下文摘要；此凭证不支持手动 `/compact`、远程执行和受监督会话。

OpenClaw 使用相同配置文件的访问令牌作为推理，通过 `GET https://api.openai.com/v1/models` 从所选帐户中发现 SIWC 模型选择。仅提供标记为显示的模型及其特定于帐户的名称和顺序。切换配置文件使用该配置文件的目录。成功的空列表保持为空；被拒绝的凭证不会回退到静态模型访问。如果发现暂时不可用，OpenClaw 会保留静态提示并将发现标记为不可用。 Codex 应用程序服务器的捆绑或缓存模型列表并不是当前 SIWC 帐户访问的证明。

模型和津贴资格由 OpenAI 强制执行。 SIWC 不导入 ChatGPT 对话或 Codex 历史记录。
