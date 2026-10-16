---
summary: "使用设备流程或非交互式令牌导入从 OpenClaw 登录到 GitHub Copilot"
read_when:
  - "你想将 GitHub Copilot 作为模型提供方使用"
  - "你需要 `openclaw models auth login-github-copilot` 流程"
  - "你正在在内置 Copilot 提供方、Copilot SDK harness 和 Copilot Proxy 之间做选择"
title: "GitHub Copilot"
---

GitHub Copilot是GitHub的AI编码助手。它允许您访问 GitHub 帐户和计划的 Copilot 模型。 OpenClaw 可以通过三种不同的方式使用 Copilot 作为模型提供者或代理运行时。

## <a id="three-ways-to-use-copilot-in-openclaw"></a> Copilot在OpenClaw中的三种使用方法

<Tabs>
  <Tab id="built-in-provider-github-copilot" title="内置提供程序 （github-copilot）">
    使用本机设备登录流程获取 GitHub 令牌。默认情况下，OpenClaw 将令牌放入其受保护的本地秘密存储中，并在身份验证配置文件中仅保存 `tokenRef`。当 OpenClaw 运行时，它会验证 Copilot 访问并解析特定于帐户的 Copilot API 端点。这是 **default** 和最简单的路径，因为它不需要 VS Code。

    <Steps>
      <Step id="run-the-login-command" title="运行登录命令">
        ```bash
        openclaw models auth login-github-copilot
        ```

        系统会提示你访问一个 URL 并输入一次性代码。请保持终端打开直到完成。
      </Step>
      <Step id="set-a-default-model" title="设置默认模型">
        ```bash
        openclaw models set github-copilot/claude-sonnet-5
        ```

        或在配置中：

        ```json5
        {
          agents: {
            defaults: { model: { primary: "github-copilot/claude-sonnet-5" } },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab id="copilot-sdk-harness-plugin-copilot" title="Copilot SDK harness插件（副驾驶）">
    当您希望 GitHub 的 Copilot、CLI 和 SDK 拥有所选 `github-copilot/*` 模型的低级代理循环时，请安装外部 `@openclaw/copilot` 插件。

    ```bash
    openclaw plugins install @openclaw/copilot
    ```

    然后将某个模型或提供方切换到该运行时：

    ```json5
    {
      agents: {
        defaults: {
          model: "github-copilot/gpt-5.6-sol",
          models: {
            "github-copilot/gpt-5.6-sol": {
              agentRuntime: { id: "copilot" },
            },
          },
        },
      },
    }
    ```

    当您需要本机 Copilot CLI 会话、SDK- 托管线程状态和 Copilot-owned 压缩这些代理轮次时，请选择此选项。如果没有明确的 `agentRuntime` 选择加入，`github-copilot/*` 模型将继续使用内置提供程序。有关完整的运行时合同，请参阅 [Copilot SDKharness](/plugins/copilot)。

  </Tab>

  <Tab id="copilot-proxy-plugin-copilot-proxy" title="Copilot 代理插件 （copilot-proxy）">
    使用 **Copilot Proxy** VS Code 扩展作为本地桥接。OpenClaw 会与代理的 `/v1` 端点通信（默认 `http://localhost:3000/v1`），并使用你配置的模型列表。

    `copilot-proxy` 插件随 OpenClaw 一起提供，并且默认启用。配置基本 URL 和模型 ID：

    ```bash
    openclaw models auth login --provider copilot-proxy --set-default
    ```

    <Note>
    当您已在 VS Code 中运行 Copilot 代理或需要通过它进行路由时，请选择此选项。 VS Code 扩展必须保持运行。
    </Note>

  </Tab>
</Tabs>

## <a id="github-enterprise-(data-residency)"></a><a id="github-enterprise-data-residency"></a> GitHub Enterprise（数据驻留）

如果您的组织使用数据驻留 GitHub Enterprise 租户（`*.ghe.com` 主机，例如 `your-org.ghe.com`），则 Copilot 位于租户本地端点上，而不是公共 `github.com` 上。 OpenClaw 将其公开为一流的身份验证选择，因此您不必手动编辑 URL。

<Steps>
  <Step id="pick-the-enterprise-auth-choice" title="选择企业身份验证选项">
    在引导流程或 `openclaw models auth` 中，选择 **GitHub Copilot（Enterprise / data residency）**。系统会提示你输入 Enterprise 域名（例如 `your-org.ghe.com`），然后设备登录会针对该租户运行。

    只输入租户根域名（`your-org.ghe.com`）。像 `api.your-org.ghe.com` 或 `copilot-api.your-org.ghe.com` 这样的派生服务主机不被接受； OpenClaw 会自动根据租户根域名推导这些端点。

    ```bash
    openclaw models auth login --provider github-copilot --method device-enterprise
    ```

  </Step>
  <Step id="domain-is-persisted-to-config" title="域被持久化到配置中">
    所选主机会存储在提供商参数下，以便后续账户验证和补全请求自动指向该租户：

    ```json5
    {
      models: {
        providers: {
          "github-copilot": { params: { githubDomain: "your-org.ghe.com" } },
        },
      },
    }
    ```

  </Step>
</Steps>

设备流程和账户验证使用租户的 GitHub 端点，Copilot 请求使用 `https://copilot-api.your-org.ghe.com`。这样，身份验证和推理都会在配置的数据驻留租户内进行， 而不是使用公共端点。

<Note>
切换域名时总会重新执行设备登录。如果你已经保存了 Copilot 令牌，并选择了不同的域名（公共 `github.com` ↔ 一个 `*.ghe.com` 租户，或从一个租户切换到另一个租户），OpenClaw 不会复用现有令牌—— 它会强制进行全新的登录，以便令牌的作用域与写入配置的域名一致。 对 *相同* 域名重新执行登录时，仍会提示是否复用当前令牌。 切回公共 `github.com` 时会清除持久化的 `githubDomain`，使配置恢复为默认值。

仅当代理的标准化、支持的租户范围匹配时，代理才共享 Copilot 凭证； Doctor 会保留不同租户的凭据，因此可以针对其目标租户对每个受影响的代理进行身份验证，而不是删除其本地凭据。
</Note>

<Note>
`COPILOT_GITHUB_DOMAIN` 环境变量会覆盖所有解析该域名的 Copilot 路径中的已解析域名—— 包括 Enterprise 设备登录（`--method device-enterprise`）、独立的 `openclaw models auth login-github-copilot` 快捷方式、账户验证、 嵌入和补全。对于完全无头或 CI 设置，请将其设为你的 `*.ghe.com` 主机。 将其留空（并省略配置参数）即可使用公共 `github.com`。 登录时会持久化其为令牌签发所针对的域名（针对公共 `github.com` 登录时会清除该域名）， 因此即使取消设置环境变量，路由仍能保持正确。
</Note>

### <a id="tenant-request-identity"></a> 租户请求身份

OpenClaw 默认情况下使用 `copilot-developer-cli` 请求标识，包括数据驻留租户。首先确认您的企业是否允许Copilot CLI以及所选模型。 `*.ghe.com` 主机名并不意味着不同的集成策略。

如果您的租户管理员或 GitHub 支持需要不同的身份，请使用现有的提供商标头设置：

```json5
{
  models: {
    providers: {
      "github-copilot": {
        params: { githubDomain: "your-org.ghe.com" },
        headers: { "Copilot-Integration-Id": "vscode-chat" },
      },
    },
  },
}
```

提供者身份适用于设置期间的模型选择、实时模型发现、推理和嵌入。标头名称不区分大小写； `request.headers` 优先于提供商 `headers`。嵌入特定的 `memory.search.remote.headers` 仍然优先用于嵌入发现和请求。不相关的提供程序标头不会转发到目录或嵌入端点。更改身份不会授予对组织策略禁用的模型或客户端的访问权限。

## <a id="optional-flags"></a> 可选标志

| 命令                                                                | 标志            | 描述                                          |
| ---------------------------------------------------------------------- | --------------- | ---------------------------------------------------- |
| `openclaw models auth login-github-copilot`                            | `--yes`         | 在不提示的情况下覆盖现有的认证配置文件 |
| `openclaw models auth login --provider github-copilot --method device` | `--set-default` | 同时应用该提供方推荐的默认模型  |

```bash
# Skip the re-login confirmation
openclaw models auth login-github-copilot --yes

# Login and set the default model in one step
openclaw models auth login --provider github-copilot --method device --set-default
```

## <a id="non-interactive-onboarding"></a> 非交互式入门引导

设备登录流程需要交互式 TTY。对于无头设置，请使用 `openclaw onboard --non-interactive` 导入现有的 GitHub OAuth 访问令牌：

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

也可以省略`--auth-choice`；传递 `--github-copilot-token` 推断 GitHub Copilot 提供商身份验证选择。如果省略该标志，则载入将回退到 `COPILOT_GITHUB_TOKEN`。通用 `GH_TOKEN` 和 `GITHUB_TOKEN` 不会启用或验证提供程序。使用 `--secret-input-mode ref` 和 `COPILOT_GITHUB_TOKEN` 设置来存储环境支持的 `tokenRef` 而不是身份验证配置文件存储中的纯文本。

新的非交互式设置会在保存之前验证令牌。当安装程序必须选择默认值时，它还会检查实时 Copilot 模型目录。当为账户启用该模型时，OpenClaw 更喜欢提供商当前的通用模型；否则，它会使用固定顺序选择符合条件的后备。如果帐户没有支持流式传输和工具调用的选择器可见模型，则安装程序将在不写入新的身份验证配置文件的情况下失败。明确配置的默认模型永远不会被替换。

<AccordionGroup>
  <Accordion id="interactive-tty-required" title="需要交互式 TTY">
    设备登录流程需要交互式 TTY。请直接在终端中运行，不要在非交互式脚本或 CI 流水线中运行。
  </Accordion>

  <Accordion id="model-availability-depends-on-your-plan" title="模型可用性取决于您的计划">
    Copilot 模型的可用性取决于你的 GitHub 套餐和组织策略。交互式引导会使用实时目录来显示模型选择器，而非交互式引导会自动选择符合条件的模型。有关当前模型列表，请参阅 GitHub 的[各 Copilot 套餐支持的模型](https://docs.github.com/en/copilot/reference/ai-models/supported-models#supported-ai-models-per-copilot-plan)。
  </Accordion>

  <Accordion id="live-catalog-refresh-from-the-copilot-api" title="来自 Copilot API 的实时目录刷新">
    一旦设备登录（或 env-var）身份验证路径解析了 GitHub 令牌，OpenClaw 就会根据需要从 `${baseUrl}/models`（与 VS Code Copilot 使用的端点相同）刷新模型目录，以便运行时跟踪每个帐户的权利和准确的上下文窗口，而不会出现明显的流失。可见的实时目录不包括从 GitHub 的选取器中隐藏的模型或由帐户策略禁用的模型。自动设置默认值还需要流和工具调用支持。新发布的 Copilot 模型无需 OpenClaw 升级即可可见，上下文窗口反映了每个模型的实际限制（gpt-5.x 系列为 e.g. 400k，内部 `claude-opus-*-1m` 变体为 1M）。

    失败的刷新会报告失败并保留上次成功的库存或第一次成功之前的捆绑模型。成功的空响应将清除已发现的模型。缺少 Copilot 凭据不会发出实时请求。 Copilot 需要在代理的模型范围内进行显式提供程序配置、已保存的 Copilot 身份验证配置文件或 `COPILOT_GITHUB_TOKEN`。旧的 `plugins.entries.github-copilot.config.discovery.enabled` 交换机已退役。配置加载会忽略它，Doctor 在保存配置时将其删除。它不再阻止对配置的 Copilot 身份验证的实时请求。

  </Accordion>

  <Accordion id="transport-selection" title="交通选择">
    Claude 模型 ID 自动使用 Anthropic 消息传输。 Gemini 模型使用 OpenAI 聊天完成传输； GPT 和 o 系列模型保留 OpenAI 响应传输。捆绑的静态目录包括这些传输和请求兼容性设置，因此 Gemini 在实时发现不可用时继续使用聊天完成。当您账户的模型列表命名模型支持的端点并且默认传输不在其中时，OpenClaw 将改用列出的端点，因此仅聊天完成的模型（例如 `kimi-k3`）可以工作。
  </Accordion>

  <Accordion id="thinking-levels" title="思考级别">
    当所选模型公开该级别时，请使用 `/think xhigh` 或 `/think max`。 Copilot 的实时目录确定您的帐户支持的工作，并且 OpenClaw 在响应请求中保留这些工作。当响应模型在 `low` 处开始其本机工作范围时，`minimal` 映射到 `low`，而不是发送不受支持的值。明确的实时限制优先于捆绑目录。 Gemini 的聊天完成传输不会公开 `max`。实时条目列表 `xhigh` 的 Claude 模型甚至在 OpenClaw 识别其模型 ID 之前就使用自适应思维。有关会话和每条消息的控制，请参阅 [ 思维水平](/tools/thinking)。
  </Accordion>

  <Accordion id="request-compatibility" title="请求兼容性">
    OpenClaw 使用 Copilot CLI 请求标识发送 Copilot- 兼容请求标头，将工具结果后续轮次标记为代理启动，并在轮次携带图像输入时设置 Copilot 视觉标头。
  </Accordion>

  <Accordion id="environment-credentials" title="环境资质">
    `COPILOT_GITHUB_TOKEN` 是该提供商的唯一自动环境凭证。通用 `GH_TOKEN` 和 `GITHUB_TOKEN` 仍可用于其他 GitHub 工具，并仍受秘密审计和清理的覆盖。当仅存在通用 GitHub 身份验证时，Doctor 会报告激活更改一次，并附有登录或设置 `COPILOT_GITHUB_TOKEN` 的说明。

    设备登录流程将受保护存储 `tokenRef` 存储在 Copilot 身份验证配置文件中。明确选择的配置文件保持选中状态；无范围查找可以在第一个保存的配置文件之前使用 `COPILOT_GITHUB_TOKEN`。

  </Accordion>

  <Accordion id="token-storage" title="代币存储">
    默认情况下，设备登录将 GitHub 令牌存储在 OpenClaw 受保护的本地秘密存储中，并仅将 `tokenRef` 写入身份验证配置文件（配置文件 ID `github-copilot:github`）。内置存储不需要配置的外部秘密提供程序。如果 OpenClaw 无法写入存储，则登录会在替换身份验证配置文件之前停止，并报告状态目录或数据库权限需要修复。

    交互式加入遵循明确的 `--secret-input-mode plaintext` 兼容性选择。该模式内联存储令牌、报告选择并对 `openclaw secrets audit --check` 保持可见。

    受保护的存储通过 OpenClaw 面向用户的秘密 API 是只写的，但静态时不加密；它的 SQLite 文件依赖于状态目录权限。在运行时，OpenClaw 解析引用，验证 Copilot 访问，解析特定于帐户的 API 端点，并使用 GitHub 令牌进行 Copilot 请求。您不需要手动管理运行时身份验证。

    使用情况检查还使用所选配置文件的 GitHub 令牌。对于携带租户域的 OAuth 配置文件，使用时遵循该域，然后再遵循提供商配置的域。 `COPILOT_GITHUB_DOMAIN` 仍然优先。

  </Accordion>
</AccordionGroup>

## <a id="memory-search-embeddings"></a> 记忆搜索嵌入

GitHub Copilot 也可以作为 [memory search](/concepts/memory-search) 的嵌入提供方。如果你有 Copilot 订阅并已登录，OpenClaw 可将其用于嵌入，而无需单独的 API 密钥。

### <a id="config"></a> 配置

将 `memory.search.provider` 显式设置为使用 GitHub Copilot 嵌入。如果 GitHub 令牌可用，OpenClaw 会从 Copilot API 发现可用的嵌入模型， 并自动选择最佳模型。

```json5
{
  memory: {
    search: {
      provider: "github-copilot",
      // Optional: override the auto-discovered model
      model: "text-embedding-3-small",
    },
  },
}
```

### <a id="how-it-works"></a> 工作原理

1. OpenClaw 解析你的 GitHub 令牌（来自环境变量或身份验证配置文件）。
2. 验证 Copilot 访问权限，并解析特定于账户的 API 端点。
3. 查询 Copilot `/models` 端点以发现可用的嵌入模型，截止时间为 10 秒，其中包括读取响应正文。
4. 选择最佳模型（优先顺序：`text-embedding-3-small`、 `text-embedding-3-large`、`text-embedding-ada-002`）。
5. 向 Copilot 的 `/embeddings` 端点发送嵌入请求。

模型可用性取决于您的 GitHub 计划。如果发现失败或没有可用的嵌入模型，则仅当您显式配置另一个提供程序时，OpenClaw 才会使用 `memory.search.fallback`。否则，安装程序会报告错误，而不是默默地选择其他提供程序。

## <a id="related"></a> 相关内容

<CardGroup cols={2}>
  <Card title="选型" href="/concepts/model-providers" icon="layers">
    选择提供程序、模型引用和故障转移行为。
  </Card>
  <Card title="OAuth 并授权" href="/gateway/authentication" icon="key">
    身份验证详细信息和凭证重用规则。
  </Card>
</CardGroup>
