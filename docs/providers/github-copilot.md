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
    使用原生设备登录流程获取 GitHub 令牌，然后在 OpenClaw 运行时将其交换为 Copilot API 令牌。这是**默认**且最简单的路径，因为它不需要 VS Code。

    <Steps>
      <Step title="运行登录命令">
        ```bash
        openclaw models auth login-github-copilot
        ```

        系统会提示你访问一个 URL 并输入一次性代码。请保持终端打开直到完成。
      </Step>
      <Step title="设置默认模型">
        ```bash
        openclaw models set github-copilot/claude-opus-4.7
        ```

        或在配置中：

        ```json5
        {
          agents: {
            defaults: { model: { primary: "github-copilot/claude-opus-4.7" } },
          },
        }
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Copilot SDK harness 插件（copilot）">
    当你希望 GitHub 的 Copilot CLI 和 SDK 为所选 `github-copilot/*` 模型接管底层代理循环时，请安装外部 `@openclaw/copilot` 插件。

    ```bash
    openclaw plugins install @openclaw/copilot
    ```

    然后将某个模型或提供方切换到该运行时：

    ```json5
    {
      agents: {
        defaults: {
          model: "github-copilot/gpt-5.5",
          models: {
            "github-copilot/gpt-5.5": {
              agentRuntime: { id: "copilot" },
            },
          },
        },
      },
    }
    ```

    当你希望使用原生 Copilot CLI 会话、由 SDK 管理的线程状态，以及 Copilot 为这些代理轮次负责压缩时，请选择此项。如果没有显式启用 `agentRuntime`，`github-copilot/*` 模型仍会使用内置提供方。有关完整的运行时契约，请参阅 [Copilot SDK harness](/plugins/copilot)。

  </Tab>

  <Tab title="Copilot Proxy 插件（copilot-proxy）">
    使用 **Copilot Proxy** VS Code 扩展作为本地桥接。OpenClaw 会与
    代理的 `/v1` 端点通信（默认 `http://localhost:3000/v1`），并使用你配置的
    模型列表。

    `copilot-proxy` 插件随 OpenClaw 一起提供，并默认启用。
    使用以下命令配置基础 URL 和模型 id：

    ```bash
    openclaw models auth login --provider copilot-proxy --set-default
    ```

    <Note>
    当你已经在 VS Code 中运行 Copilot Proxy，或需要通过它进行路由时，请选择此项。
    VS Code 扩展必须保持运行。
    </Note>

  </Tab>
</Tabs>

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

<AccordionGroup>
  <Accordion title="需要交互式 TTY">
    设备登录流程需要交互式 TTY。请直接在终端中运行，不要在非交互式脚本或 CI 流水线中运行。
  </Accordion>

  <Accordion title="模型可用性取决于你的套餐">
    Copilot 模型的可用性取决于你的 GitHub 套餐。如果某个模型被拒绝，请尝试另一个 ID（例如 `github-copilot/gpt-5.5`）。请参阅 GitHub 的 [每个 Copilot 套餐支持的模型](https://docs.github.com/en/copilot/reference/ai-models/supported-models#supported-ai-models-per-copilot-plan) 了解当前模型列表。
  </Accordion>

  <Accordion title="从 Copilot API 实时刷新目录">
    一旦设备登录（或环境变量）认证路径解析出 GitHub 令牌，OpenClaw 就会按需从 `${baseUrl}/models` 刷新模型目录（与 VS Code Copilot 使用的相同端点），从而让运行时跟踪每个账户的权限和准确的上下文窗口，而无需清单频繁变更。新发布的 Copilot 模型无需升级 OpenClaw 即可可见，且上下文窗口会反映真实的每个模型限制（例如 gpt-5.x 系列为 400k，内部 `claude-opus-*-1m` 变体为 1M）。

    在发现功能被禁用、用户没有 GitHub 认证配置文件、令牌交换失败，或者 `/models` HTTPS 调用出错时，内置静态目录会作为可见回退项保留。若要退出并完全依赖静态清单目录（离线 / 断网环境）：

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
    OpenClaw 在 Copilot 传输上发送符合 Copilot IDE 风格的请求头
    （VS Code 编辑器/插件版本以及 `vscode-chat` 集成 id），
    将工具结果的后续回合标记为由代理发起，并在某一轮包含图像输入时
    设置 Copilot vision 请求头。
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
    登录会在认证配置文件存储中保存一个 GitHub 令牌（配置文件 id
    `github-copilot:github`），并在 OpenClaw 运行时将其交换为一个短期的 Copilot API
    令牌。你无需手动管理该令牌。
  </Accordion>
</AccordionGroup>

## Memory search embeddings

GitHub Copilot 也可以作为 [memory search](/concepts/memory-search) 的嵌入提供方。如果你有 Copilot 订阅并已登录，OpenClaw 可将其用于嵌入，而无需单独的 API 密钥。

### Config

将 `memorySearch.provider` 明确设置为使用 GitHub Copilot 嵌入。如果有可用的 GitHub 令牌，OpenClaw 会从 Copilot API 发现可用的嵌入模型并自动选择最佳模型。

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        provider: "github-copilot",
        // 可选：覆盖自动发现的模型
        model: "text-embedding-3-small",
      },
    },
  },
}
```

### 工作原理

1. OpenClaw 会解析你的 GitHub 令牌（来自环境变量或认证配置文件）。
2. 将其兑换为一个短期有效的 Copilot API 令牌。
3. 查询 Copilot 的 `/models` 端点以发现可用的嵌入模型。
4. 选择最佳模型（优先级顺序：`text-embedding-3-small`、
   `text-embedding-3-large`、`text-embedding-ada-002`）。
5. 将嵌入请求发送到 Copilot 的 `/embeddings` 端点。

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
