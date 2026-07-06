---
summary: "code_execution：使用 xAI 运行受沙箱保护的远程 Python 分析"
read_when:
  - 你想启用或配置 code_execution
  - 你想进行远程分析，而不需要本地 shell 访问
  - 你想将 x_search 或 web_search 与远程 Python 分析结合使用
title: "代码执行"
---

`code_execution` 在 xAI 的 Responses API（
`https://api.x.ai/v1/responses`，与 `x_search` 使用的端点相同）上运行受沙箱保护的远程 Python 分析。它由捆绑的 `xai` 插件通过 `tools` 合约注册。

| 属性               | 值                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------- |
| 工具名称           | `code_execution`                                                                   |
| 提供者插件         | `xai`（捆绑，`enabledByDefault: true`）                                         |
| 认证               | xAI 认证配置文件、`XAI_API_KEY`，或 `plugins.entries.xai.config.webSearch.apiKey` |
| 默认模型           | `grok-4-1-fast`                                                                   |
| 默认超时时间       | 30 秒                                                                             |
| 默认 `maxTurns`    | 未设置（xAI 会应用其内部限制）                                                      |

可用于计算、制表、快速统计以及图表式分析，包括来自 `x_search` 或 `web_search` 的数据。它无法访问本地文件、你的 shell、你的仓库或配对设备，并且不会在调用之间持久保存状态，因此请将每次调用视为一次性的分析，而不是笔记本会话。若要获取最新的 X 数据，请先运行 [`x_search`](/tools/web#x_search)，然后将结果传入。

对于本地执行，请改用 [`exec`](/tools/exec)。

## 设置

<Steps>
  <Step title="提供 xAI 凭据">
    OAuth 需要符合条件的 SuperGrok 或 X Premium 订阅
    （设备码验证，因此它可以在远程主机上工作，无需
    localhost 回调）：

    ```bash
    openclaw models auth login --provider xai --method oauth
    ```

    在全新安装过程中，相同的选项也可在引导流程中使用：

    ```bash
    openclaw onboard --install-daemon --auth-choice xai-oauth
    ```

    或者使用 API 密钥：

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

    以上三种方式中的任意一种也会启用 `x_search` 和 Grok `web_search`。

  </Step>

  <Step title="启用并调优 code_execution">
    只要 xAI 凭据可用，`code_execution` 就会可用。将
    `plugins.entries.xai.config.codeExecution.enabled` 设置为 `false` 可将其禁用，
    也可以使用相同的配置块来覆盖模型、轮次上限或超时时间：

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast", // Override the default xAI code execution model
                maxTurns: 2,            // Optional maximum number of internal tool turns
                timeoutSeconds: 30,     // Request timeout (default: 30)
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

明确表达分析意图；该工具只接受一个 `task` 参数，
因此请在一个提示中发送完整请求以及任何内联数据：

```text
使用 code_execution 计算这些数字的 7 日移动平均值：...
```

```text
使用 x_search 查找本周提及 OpenClaw 的帖子，然后使用 code_execution 按天统计它们。
```

```text
使用 web_search 收集最新的 AI 基准测试数值，然后使用 code_execution 比较百分比变化。
```

## 错误

如果没有认证，工具会返回一个结构化的 JSON 错误（不是抛出的异常），这样代理就可以自行纠正：

```json
{
  "error": "missing_xai_api_key",
  "message": "code_execution 需要 xAI 凭证。运行 `openclaw onboard --auth-choice xai-oauth` 使用 Grok 登录，运行 `openclaw onboard --auth-choice xai-api-key`，在 Gateway 环境中设置 `XAI_API_KEY`，或配置 `plugins.entries.xai.config.webSearch.apiKey`。",
  "docs": "https://docs.openclaw.ai/tools/code-execution"
}
```

## 相关内容

<CardGroup cols={2}>
  <Card title="Exec 工具" href="/tools/exec" icon="terminal">
    在你的机器上或配对节点上进行本地 shell 执行。
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
