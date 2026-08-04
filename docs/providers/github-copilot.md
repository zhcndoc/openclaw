---
summary: "通过设备流或非交互式令牌导入，从 OpenClaw 登录 GitHub Copilot"
read_when:
  - 你想将 GitHub Copilot 作为模型提供方使用
  - 你需要 `openclaw models auth login-github-copilot` 流程
  - 你正在在内置 Copilot 提供方、Copilot SDK harness 和 Copilot Proxy 之间做选择
title: "GitHub Copilot"
---

GitHub Copilot 是 GitHub 的 AI 编码助手。它为你的 GitHub 账户和套餐提供对 Copilot
模型的访问。OpenClaw 可以通过三种不同方式将 Copilot 作为模型
提供方或代理运行时使用。

## 在 OpenClaw 中使用 Copilot 的三种方式

<Tabs>
  <Tab title="内置提供方（github-copilot）">
    使用原生设备登录流程获取并存储 GitHub 令牌。OpenClaw 运行时会验证 Copilot 访问权限，并解析特定于账户的 Copilot API 端点。这是**默认**且最简单的方式，因为它不需要 VS Code。

    <Steps>
      <Step title="运行登录命令">
        ```bash
        openclaw models auth login-github-copilot
        ```

        系统会提示你访问一个 URL 并输入一次性代码。请保持终端打开直到完成。
      </Step>
      <Step title="设置默认模型">
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

  <Tab title="Copilot SDK 代理框架插件（copilot）">
    当你希望 GitHub 的 Copilot CLI 和 SDK 为所选 `github-copilot/*` 模型接管底层代理循环时，请安装外部 `@openclaw/copilot` 插件。

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

    当你希望使用原生 Copilot CLI 会话、由 SDK 管理的线程状态，以及 Copilot 为这些代理轮次负责压缩时，请选择此项。如果没有显式启用 `agentRuntime`，`github-copilot/*` 模型仍会使用内置提供方。有关完整的运行时契约，请参阅 [Copilot SDK 代理框架](/plugins/copilot)。

  </Tab>

  <Tab title="Copilot Proxy 插件（copilot-proxy）">
    使用 **Copilot Proxy** VS Code 扩展作为本地桥接。OpenClaw 会与
    代理的 `/v1` 端点通信（默认 `http://localhost:3000/v1`），并使用你配置的
    模型列表。

    `copilot-proxy` 插件随 OpenClaw 一起提供，并默认启用。
    使用以下命令配置基础 URL 和模型 ID：

    ```bash
    openclaw models auth login --provider copilot-proxy --set-default
    ```

    <Note>
    当你已经在 VS Code 中运行 Copilot Proxy，或需要通过它进行路由时，请选择此项。
    VS Code 扩展必须保持运行。
    </Note>

  </Tab>
</Tabs>

## GitHub Enterprise（数据驻留）

如果你的组织使用支持数据驻留的 GitHub Enterprise 租户（例如
`*.ghe.com` 主机，如 `your-org.ghe.com`），Copilot 会驻留在租户本地
端点，而不是公共 `github.com`。OpenClaw 将其作为一项一等认证选项提供，
因此你无需手动编辑 URL。

<Steps>
  <Step title="选择 Enterprise 认证选项">
    在引导流程或 `openclaw models auth` 中，选择
    **GitHub Copilot（Enterprise / data residency）**。系统会提示你输入
    Enterprise 域名（例如 `your-org.ghe.com`），然后设备登录会针对该租户运行。

    只输入租户根域名（`your-org.ghe.com`）。像
    `api.your-org.ghe.com` 或 `copilot-api.your-org.ghe.com` 这样的派生服务主机不被接受；
    OpenClaw 会自动根据租户根域名推导这些端点。

    ```bash
    openclaw models auth login --provider github-copilot --method device-enterprise
    ```

  </Step>
  <Step title="域名会持久化到配置中">
    所选主机会存储在提供商参数下，以便后续账户验证和补全请求自动
    指向该租户：

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

设备流程和账户验证使用租户的 GitHub 端点，Copilot 请求使用
`https://copilot-api.your-org.ghe.com`。这样，身份验证和推理都会在配置的数据驻留租户内进行，
而不是使用公共端点。

<Note>
切换域名时总会重新执行设备登录。如果你已经保存了
Copilot 令牌，并选择了不同的域名（公共 `github.com` ↔ 一个 `*.ghe.com`
租户，或从一个租户切换到另一个租户），OpenClaw 不会复用现有令牌——
它会强制进行全新的登录，以便令牌的作用域与写入配置的域名一致。
对 *相同* 域名重新执行登录时，仍会提示是否复用当前令牌。
切回公共 `github.com` 时会清除持久化的
`githubDomain`，使配置恢复为默认值。
</Note>

<Note>
`COPILOT_GITHUB_DOMAIN` 环境变量会覆盖所有解析该域名的 Copilot 路径中的已解析域名——
包括 Enterprise 设备登录（`--method device-enterprise`）、独立的
`openclaw models auth login-github-copilot` 快捷方式、账户验证、
嵌入和补全。对于完全无头或 CI 设置，请将其设为你的 `*.ghe.com` 主机。
将其留空（并省略配置参数）即可使用公共 `github.com`。
登录时会持久化其为令牌签发所针对的域名（针对公共 `github.com` 登录时会清除该域名），
因此即使取消设置环境变量，路由仍能保持正确。
</Note>

## 可选标志

| 命令                                                                   | 标志            | 描述                                                 |
| ---------------------------------------------------------------------- | --------------- | ---------------------------------------------------- |
| `openclaw models auth login-github-copilot`                            | `--yes`         | 在不提示的情况下覆盖现有的认证配置文件 |
| `openclaw models auth login --provider github-copilot --method device` | `--set-default` | 同时应用该提供方推荐的默认模型 |

```bash
# 跳过重新登录确认
openclaw models auth login-github-copilot --yes

# 一步完成登录并设置默认模型
openclaw models auth login --provider github-copilot --method device --set-default
```

## 非交互式引导

设备登录流程需要交互式 TTY。对于无头设置，请使用 `openclaw onboard --non-interactive` 导入现有的 GitHub OAuth 访问令牌：

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

你也可以省略 `--auth-choice`；传入 `--github-copilot-token` 会推断出 GitHub Copilot 提供方认证选项。如果省略该标志，引导流程会依次回退到 `COPILOT_GITHUB_TOKEN`、`GH_TOKEN`，然后是 `GITHUB_TOKEN`。将 `COPILOT_GITHUB_TOKEN` 与 `--secret-input-mode ref` 一起使用，可在 `auth-profiles.json` 中存储基于环境变量的 `tokenRef`，而不是明文。

全新的非交互式设置会在保存令牌前验证令牌。当设置流程必须选择默认模型时，还会检查实时 Copilot 模型目录。对于账户已启用的模型，OpenClaw 优先选择提供方当前的通用模型；否则会确定性地选择符合条件的备用模型。如果账户中没有对模型选择器可见、且支持流式传输和工具调用的模型，设置流程会失败，并且不会写入新的认证配置文件。显式配置的默认模型不会被替换。

<AccordionGroup>
  <Accordion title="需要交互式 TTY">
    设备登录流程需要交互式 TTY。请直接在终端中运行，不要在非交互式脚本或 CI 流水线中运行。
  </Accordion>

  <Accordion title="模型可用性取决于你的套餐">
    Copilot 模型的可用性取决于你的 GitHub 套餐和组织策略。交互式引导会使用实时目录来显示模型选择器，而非交互式引导会自动选择符合条件的模型。有关当前模型列表，请参阅 GitHub 的[各 Copilot 套餐支持的模型](https://docs.github.com/en/copilot/reference/ai-models/supported-models#supported-ai-models-per-copilot-plan)。
  </Accordion>

  <Accordion title="从 Copilot API 刷新实时目录">
    一旦设备登录（或环境变量）认证路径解析出 GitHub 令牌，OpenClaw 就会按需从 `${baseUrl}/models` 刷新模型目录（这是 VS Code Copilot 使用的同一端点），从而无需频繁变更清单，运行时即可跟踪每个账户的使用权限和准确的上下文窗口。可见的实时目录会排除 GitHub 模型选择器中隐藏的模型，或被账户策略禁用的模型。自动设置所选的默认模型还必须支持流式传输和工具调用。
    新发布的 Copilot 模型无需升级 OpenClaw 即可显示，上下文窗口也会反映每个模型的实际限制（例如，gpt-5.x 系列为 400k，内部的
    `claude-opus-*-1m` 变体为 1M）。

    当发现功能被禁用、用户没有 GitHub 认证配置文件、运行时认证失败，或 `/models` HTTPS 调用出错时，内置的静态目录会继续作为可见的备用目录。若要选择退出并完全依赖静态清单目录（适用于离线/气隙环境）：

    ```json5
    {
      plugins: {
        entries: {
          "github-copilot": {
            config: { discovery: { enabled: false } },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="传输方式选择">
    Claude 模型 ID 会自动使用 Anthropic Messages 传输方式。
    Gemini 模型使用 OpenAI Chat Completions 传输方式；GPT 和 o 系列
    模型保持使用 OpenAI Responses 传输方式。OpenClaw 会根据
    模型引用选择正确的传输方式。
  </Accordion>

  <Accordion title="请求兼容性">
    OpenClaw 会发送与 Copilot 兼容的请求标头，并使用 Copilot CLI 的请求身份；将工具结果后续轮次标记为代理发起；当某个轮次包含图像输入时，还会设置 Copilot 视觉标头。
  </Accordion>

  <Accordion title="环境变量解析顺序">
    OpenClaw 按以下优先级顺序从环境变量解析 Copilot 认证：

    | 优先级 | 变量                  | 说明                             |
    | ------ | --------------------- | -------------------------------- |
    | 1      | `COPILOT_GITHUB_TOKEN` | 最高优先级，Copilot 专用 |
    | 2      | `GH_TOKEN`            | GitHub CLI 令牌（回退）      |
    | 3      | `GITHUB_TOKEN`        | 标准 GitHub 令牌（最低）   |

    当设置了多个变量时，OpenClaw 会使用优先级最高的那个。设备登录流程（`openclaw models auth login-github-copilot`）会将其令牌存储在认证配置文件存储中，并且优先于所有环境变量。

  </Accordion>

  <Accordion title="令牌存储">
    登录流程会将 GitHub 令牌存储在认证配置文件存储中（配置文件 ID 为
    `github-copilot:github`）。运行时，OpenClaw 会验证 Copilot 访问权限，
    解析账户专属的 API 端点，并使用存储的 GitHub 令牌发送 Copilot 请求。你无需手动管理运行时认证。
  </Accordion>
</AccordionGroup>

## 记忆搜索嵌入

GitHub Copilot 也可以作为 [memory search](/concepts/memory-search) 的嵌入提供方。如果你有 Copilot 订阅并已登录，OpenClaw 可将其用于嵌入，而无需单独的 API 密钥。

### 配置

将 `memory.search.provider` 显式设置为使用 GitHub Copilot 嵌入。如果
GitHub 令牌可用，OpenClaw 会从 Copilot API 发现可用的嵌入模型，
并自动选择最佳模型。

```json5
{
  memory: {
    search: {
      provider: "github-copilot",
      // 可选：覆盖自动发现的模型
      model: "text-embedding-3-small",
    },
  },
}
```

### 工作原理

1. OpenClaw 解析你的 GitHub 令牌（来自环境变量或身份验证配置文件）。
2. 验证 Copilot 访问权限，并解析特定于账户的 API 端点。
3. 查询 Copilot 的 `/models` 端点，以发现可用的嵌入模型。
4. 选择最佳模型（优先顺序：`text-embedding-3-small`、
   `text-embedding-3-large`、`text-embedding-ada-002`）。
5. 向 Copilot 的 `/embeddings` 端点发送嵌入请求。

模型可用性取决于你的 GitHub 套餐。如果没有可用的嵌入模型，OpenClaw 会跳过 Copilot 并尝试下一个提供方。

## 相关内容

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供方、模型引用和故障转移行为。
  </Card>
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证细节和凭据复用规则。
  </Card>
</CardGroup>
