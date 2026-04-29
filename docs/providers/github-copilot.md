---
summary: "通过设备流或非交互式令牌导入，从 OpenClaw 登录 GitHub Copilot"
read_when:
  - 你想将 GitHub Copilot 用作模型提供方
  - 你需要 `openclaw models auth login-github-copilot` 流程
title: "GitHub Copilot"
---

GitHub Copilot 是 GitHub 的 AI 编程助手。它为你的 GitHub 账户和套餐提供对 Copilot 模型的访问。OpenClaw 可以通过两种不同方式将 Copilot 用作模型提供方。

## 在 OpenClaw 中使用 Copilot 的两种方式

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

  <Tab title="Copilot Proxy 插件（copilot-proxy）">
    将 **Copilot Proxy** VS Code 扩展用作本地桥接。OpenClaw 与代理的 `/v1` 端点通信，并使用你在其中配置的模型列表。

    <Note>
    当你已经在 VS Code 中运行 Copilot Proxy，或者需要通过它进行路由时，请选择此方式。你必须启用该插件并保持 VS Code 扩展运行。
    </Note>

  </Tab>
</Tabs>

## 可选标志

| Flag            | Description                                         |
| --------------- | --------------------------------------------------- |
| `--yes`         | 跳过确认提示                        |
| `--set-default` | 同时应用提供方推荐的默认模型 |

```bash
# 跳过确认
openclaw models auth login-github-copilot --yes

# 一步完成登录并设置默认模型
openclaw models auth login --provider github-copilot --method device --set-default
```

## 非交互式引导

如果你已经有用于 Copilot 的 GitHub OAuth 访问令牌，可以在无头设置期间使用 `openclaw onboard --non-interactive` 导入它：

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
    Copilot 模型的可用性取决于你的 GitHub 套餐。如果某个模型被拒绝，请尝试另一个 ID（例如 `github-copilot/gpt-4.1`）。
  </Accordion>

  <Accordion title="传输方式选择">
    Claude 模型 ID 会自动使用 Anthropic Messages 传输。GPT、o 系列和 Gemini 模型保留 OpenAI Responses 传输。OpenClaw 会根据模型引用选择正确的传输方式。
  </Accordion>

  <Accordion title="请求兼容性">
    OpenClaw 会在 Copilot 传输上发送 Copilot IDE 风格的请求头，包括内置的压缩、工具结果和图像后续轮次。除非已针对 Copilot 的 API 验证过该行为，否则它不会为 Copilot 启用提供方级别的 Responses continuation。
  </Accordion>

  <Accordion title="环境变量解析顺序">
    OpenClaw 按以下优先级顺序从环境变量解析 Copilot 认证：

    | Priority | Variable              | Notes                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | 最高优先级，Copilot 专用 |
    | 2        | `GH_TOKEN`            | GitHub CLI 令牌（回退）      |
    | 3        | `GITHUB_TOKEN`        | 标准 GitHub 令牌（最低）   |

    当设置了多个变量时，OpenClaw 会使用优先级最高的那个。设备登录流程（`openclaw models auth login-github-copilot`）会将其令牌存储在认证配置文件存储中，并且优先于所有环境变量。

  </Accordion>

  <Accordion title="令牌存储">
    登录会将 GitHub 令牌存储在认证配置文件存储中，并在 OpenClaw 运行时将其交换为 Copilot API 令牌。你无需手动管理该令牌。
  </Accordion>
</AccordionGroup>

<Warning>
设备登录命令需要交互式 TTY。当你需要无头设置时，请使用非交互式引导。
</Warning>

## 记忆搜索嵌入

GitHub Copilot 也可以作为 [memory search](/concepts/memory-search) 的嵌入提供方。如果你有 Copilot 订阅并已登录，OpenClaw 可将其用于嵌入，而无需单独的 API 密钥。

### 自动检测

当 `memorySearch.provider` 为 `"auto"`（默认值）时，GitHub Copilot 会以 15 的优先级尝试——位于本地嵌入之后、OpenAI 和其他付费提供方之前。如果可用 GitHub 令牌，OpenClaw 会从 Copilot API 发现可用的嵌入模型，并自动选择最佳模型。

### 显式配置

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

1. OpenClaw 解析你的 GitHub 令牌（来自环境变量或认证配置文件）。
2. 将其交换为短期有效的 Copilot API 令牌。
3. 查询 Copilot `/models` 端点以发现可用的嵌入模型。
4. 选择最佳模型（优先 `text-embedding-3-small`）。
5. 向 Copilot `/embeddings` 端点发送嵌入请求。

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
