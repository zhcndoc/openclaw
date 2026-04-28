---
summary: "通过设备流程或非交互式令牌导入，从 OpenClaw 登录 GitHub Copilot"
read_when:
  - 您想将 GitHub Copilot 作为模型提供者使用
  - 您需要使用 `openclaw models auth login-github-copilot` 流程
title: "GitHub Copilot"
---

GitHub Copilot 是 GitHub 的 AI 编程助手。它为您的 GitHub 账户和套餐提供对 Copilot
模型的访问。OpenClaw 可以通过两种不同的方式将 Copilot 作为模型
提供者使用。

## 在 OpenClaw 中使用 Copilot 的两种方式

<Tabs>
  <Tab title="内置提供者 (github-copilot)">
    使用原生设备登录流程获取 GitHub 令牌，然后在 OpenClaw 运行时将其交换为 Copilot API 令牌。这是**默认**且最简单的路径，因为它不需要 VS Code。

    <Steps>
      <Step title="运行登录命令">
        ```bash
        openclaw models auth login-github-copilot
        ```

        系统会提示您访问一个 URL 并输入一次性代码。保持终端打开直到完成。
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

  <Tab title="Copilot Proxy 插件 (copilot-proxy)">
    使用 **Copilot Proxy** VS Code 扩展作为本地桥接。OpenClaw 与代理的 `/v1` 端点通信，并使用您在那里配置的模型列表。

    <Note>
    当您已经在 VS Code 中运行 Copilot Proxy 或需要通过它路由时选择此项。您必须启用插件并保持 VS Code 扩展运行。
    </Note>

  </Tab>
</Tabs>

## 可选标志

| 标志            | 描述                                         |
| --------------- | --------------------------------------------------- |
| `--yes`         | 跳过确认提示                        |
| `--set-default` | 同时应用提供者推荐的默认模型 |

```bash
# 跳过确认
openclaw models auth login-github-copilot --yes

# 一步登录并设置默认模型
openclaw models auth login --provider github-copilot --method device --set-default
```

## 非交互式入门

如果您已经拥有用于 Copilot 的 GitHub OAuth 访问令牌，可在无头设置期间使用
`openclaw onboard --non-interactive` 导入它：

```bash
openclaw onboard --non-interactive --accept-risk \
  --auth-choice github-copilot \
  --github-copilot-token "$COPILOT_GITHUB_TOKEN" \
  --skip-channels --skip-health
```

您也可以省略 `--auth-choice`；传入 `--github-copilot-token` 会推断出
GitHub Copilot 提供者的认证选择。如果省略该标志，入门流程会回退到
`COPILOT_GITHUB_TOKEN`、`GH_TOKEN`，然后是 `GITHUB_TOKEN`。使用
`--secret-input-mode ref` 并设置 `COPILOT_GITHUB_TOKEN`，可在
`auth-profiles.json` 中存储一个由环境变量支持的 `tokenRef`，而不是明文。

<AccordionGroup>
  <Accordion title="需要交互式 TTY">
    设备登录流程需要交互式 TTY。直接在终端中运行，不要在非交互式脚本或 CI 管道中运行。
  </Accordion>

  <Accordion title="模型可用性取决于您的计划">
    Copilot 模型可用性取决于您的 GitHub 计划。如果模型被拒绝，尝试另一个 ID（例如 `github-copilot/gpt-4.1`）。
  </Accordion>

  <Accordion title="传输选择">
    Claude 模型 ID 自动使用 Anthropic Messages 传输。GPT、o-series 和 Gemini 模型保留 OpenAI Responses 传输。OpenClaw 根据模型引用选择正确的传输。
  </Accordion>

  <Accordion title="请求兼容性">
    OpenClaw 在 Copilot 传输上发送 Copilot IDE 风格的请求头，
    包括内置压缩、工具结果和图像后续轮次。除非
    已针对 Copilot 的 API 验证该行为，否则它不会为 Copilot 启用提供者级别的 Responses 连续性。
  </Accordion>

  <Accordion title="环境变量解析顺序">
    OpenClaw 按以下
    优先级顺序从环境变量中解析 Copilot 认证：

    | 优先级 | 变量              | 备注                            |
    | -------- | --------------------- | -------------------------------- |
    | 1        | `COPILOT_GITHUB_TOKEN` | 最高优先级，Copilot 特定 |
    | 2        | `GH_TOKEN`            | GitHub CLI 令牌（回退）      |
    | 3        | `GITHUB_TOKEN`        | 标准 GitHub 令牌（最低）   |

    当设置了多个变量时，OpenClaw 使用优先级最高的一个。设备登录流程（`openclaw models auth login-github-copilot`）将其令牌存储在认证配置存储中，并优先于所有环境变量。

  </Accordion>

  <Accordion title="令牌存储">
    登录会将 GitHub 令牌存储在认证配置存储中，并在 OpenClaw 运行时将其交换为 Copilot API 令牌。您无需手动管理令牌。
  </Accordion>
</AccordionGroup>

<Warning>
设备登录命令需要交互式 TTY。当您需要无头设置时，请使用非交互式入门流程。
</Warning>

## 内存搜索嵌入

GitHub Copilot 也可以作为 [内存搜索](/concepts/memory-search) 的嵌入提供者。如果您有 Copilot 订阅并已登录，OpenClaw 可以在无需单独 API 密钥的情况下将其用于嵌入。

### 自动检测

当 `memorySearch.provider` 为 `"auto"`（默认值）时，GitHub Copilot 的尝试优先级为 15——在本地嵌入之后、OpenAI 和其他付费提供者之前。如果可用 GitHub 令牌，OpenClaw 会从 Copilot API 发现可用的嵌入模型，并自动选择最佳模型。

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

1. OpenClaw 解析您的 GitHub 令牌（来自环境变量或认证配置文件）。
2. 将其交换为一个短期有效的 Copilot API 令牌。
3. 查询 Copilot `/models` 端点以发现可用的嵌入模型。
4. 选择最佳模型（优先 `text-embedding-3-small`）。
5. 向 Copilot `/embeddings` 端点发送嵌入请求。

模型可用性取决于您的 GitHub 计划。如果没有可用的嵌入模型，OpenClaw 会跳过 Copilot 并尝试下一个提供者。

## 相关

<CardGroup cols={2}>
  <Card title="模型选择" href="/concepts/model-providers" icon="layers">
    选择提供者、模型引用和故障转移行为。
  </Card>
  <Card title="OAuth 和认证" href="/gateway/authentication" icon="key">
    认证详细信息和凭据重用规则。
  </Card>
</CardGroup>
