---
summary: "code_execution：使用 xAI 运行受沙箱保护的远程 Python 分析"
read_when:
  - 你想启用或配置 code_execution
  - 你想进行远程分析，而不需要本地 shell 访问
  - 你想将 x_search 或 web_search 与远程 Python 分析结合使用
title: "代码执行"
---

`code_execution` 在 xAI 的 Responses API 上运行受沙箱保护的远程 Python 分析。它由捆绑的 `xai` 插件（在 `tools` 契约下）注册，并路由到与 `x_search` 相同的 `https://api.x.ai/v1/responses` 端点。

| Property           | Value                                                                             |
| ------------------ | --------------------------------------------------------------------------------- |
| Tool name          | `code_execution`                                                                  |
| Provider plugin    | `xai` (捆绑，`enabledByDefault: true`)                                         |
| Auth               | xAI 认证配置文件、`XAI_API_KEY`，或 `plugins.entries.xai.config.webSearch.apiKey` |
| Default model      | `grok-4-1-fast`                                                                   |
| Default timeout    | 30 秒                                                                             |
| Default `maxTurns` | 未设置（xAI 会应用其内部限制）                                                      |

这与本地的 [`exec`](/tools/exec) 不同：

- `exec` 在你的机器或配对节点上运行 shell 命令。
- `code_execution` 在 xAI 的远程沙箱中运行 Python。

在以下场景中使用 `code_execution`：

- 计算。
- 制表。
- 快速统计。
- 图表式分析。
- 分析由 `x_search` 或 `web_search` 返回的数据。

当你需要本地文件、你的 shell、你的仓库或配对设备时，不要使用它。请改用 [`exec`](/tools/exec)。

## 设置

<Steps>
  <Step title="提供 xAI 凭证">
    使用符合条件的 SuperGrok 或 X Premium 订阅通过 Grok OAuth 登录，
    使用适用于远程场景的 device-code 流程，或存储 API 密钥。OAuth 可用于
    `code_execution` 和 `x_search`；`XAI_API_KEY` 或插件 web-search
    配置也可以驱动 Grok `web_search`。

    ```bash
    openclaw models auth login --provider xai --method oauth
    openclaw models auth login --provider xai --device-code
    ```

    在全新安装时，初始化流程中也可使用相同的认证选项：

    ```bash
    openclaw onboard --install-daemon
    openclaw onboard --install-daemon --auth-choice xai-device-code
    ```

    或使用 API 密钥：

    ```bash
    openclaw models auth login --provider xai --method api-key
    export XAI_API_KEY=xai-...
    ```

    或通过配置：

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              webSearch: {
                apiKey: "xai-...",
              },
            },
          },
        },
      },
    }
    ```

  </Step>

  <Step title="启用并调整 code_execution">
    当 xAI 凭证可用时，`code_execution` 即可使用。将
    `plugins.entries.xai.config.codeExecution.enabled` 设置为 `false` 以禁用它，
    或使用相同的配置块来调整模型和超时时间。

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast", // 覆盖默认的 xAI 代码执行模型
                maxTurns: 2,            // 可选的内部工具轮次上限
                timeoutSeconds: 30,     // 请求超时（默认：30）
              },
            },
          },
        },
      },
    }
    ```

  </Step>

  <Step title="重启 Gateway">
    ```bash
    openclaw gateway restart
    ```

    一旦 xAI 插件以 `enabled: true` 重新注册，`code_execution` 就会出现在代理的工具列表中。

  </Step>
</Steps>

## 如何使用

自然地提出请求，并明确说明分析意图：

```text
使用 code_execution 计算这些数字的 7 日移动平均值：...
```

```text
使用 x_search 查找本周提及 OpenClaw 的帖子，然后使用 code_execution 按天统计它们。
```

```text
使用 web_search 收集最新的 AI 基准测试数值，然后使用 code_execution 比较百分比变化。
```

该工具在内部只接受一个 `task` 参数，因此代理应在一个提示中发送完整的分析请求以及任何内联数据。

## 错误

当工具在没有认证的情况下运行时，它会返回一个结构化的 `missing_xai_api_key` 错误，指向认证配置文件、环境变量和配置选项。该错误是 JSON 格式，而不是抛出的异常，因此代理可以自行纠正：

```json
{
  "error": "missing_xai_api_key",
  "message": "code_execution 需要 xAI 凭证。运行 `openclaw onboard --auth-choice xai-oauth` 使用 Grok 登录，运行 `openclaw onboard --auth-choice xai-api-key`，在 Gateway 环境中设置 `XAI_API_KEY`，或配置 `plugins.entries.xai.config.webSearch.apiKey`。",
  "docs": "https://docs.openclaw.ai/tools/code-execution"
}
```

## 限制

- 这是远程 xAI 执行，不是本地进程执行。
- 将结果视为一次性的分析，而不是持久化的笔记本会话。
- 不要假设可以访问本地文件或你的工作区。
- 如需最新的 X 数据，请先使用 [`x_search`](/tools/web#x_search)，再将结果传入 `code_execution`。

## 相关内容

<CardGroup cols={2}>
  <Card title="Exec 工具" href="/tools/exec" icon="terminal">
    在你的机器或配对节点上进行本地 shell 执行。
  </Card>
  <Card title="Exec 审批" href="/tools/exec-approvals" icon="shield">
    shell 执行的允许/拒绝策略。
  </Card>
  <Card title="Web 工具" href="/tools/web" icon="globe">
    `web_search`、`x_search` 和 `web_fetch`。
  </Card>
  <Card title="xAI 提供方" href="/providers/xai" icon="microchip">
    Grok 模型、web/x 搜索，以及代码执行配置。
  </Card>
</CardGroup>
