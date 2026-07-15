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

<Warning>
  `code_execution` 运行在 xAI 的服务器上。xAI 按每 1,000 次工具调用收取 5 美元，
  另加模型的输入和输出 token 费用。
</Warning>

| 属性               | 值                                                                                 |
| ------------------ | --------------------------------------------------------------------------------- |
| 工具名称           | `code_execution`                                                                  |
| 提供方插件         | `xai`（内置，`enabledByDefault: true`）                                           |
| 认证               | xAI 认证配置文件、`XAI_API_KEY`，或 `plugins.entries.xai.config.webSearch.apiKey` |
| 默认模型           | `grok-4.3`                                                                        |
| 默认超时           | 30 秒                                                                            |
| 默认 `maxTurns`    | 未设置（xAI 会应用其自身的内部限制）                                              |

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

  <Step title="启用并调整 code_execution">
    如果省略 `enabled`，则仅当当前
    模型的提供方为 `xai` 且 xAI 凭据已解析时，才会暴露 `code_execution`。对于
    当前模型提供方已知为非 xAI 的情况，设置
    `plugins.entries.xai.config.codeExecution.enabled` 为 `true`，即可启用
    跨提供方使用。如果当前模型提供方缺失或无法解析，
    该工具将保持隐藏。将 `enabled` 设置为 `false` 可为所有
    提供方禁用它。始终需要 xAI 凭据。

    使用相同的配置块来覆盖模型、轮次上限或超时时间：

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true, // 对于已知的非 xAI 模型提供方是必需的
                model: "grok-4.3", // 覆盖默认的 xAI 代码执行模型
                maxTurns: 2,            // 可选的内部工具轮次上限
                timeoutSeconds: 30,     // 请求超时时间（默认：30）
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

    一旦 xAI 插件重新注册，并且上面的提供方、启用状态和认证检查都通过，`code_execution`
    就会出现在 agent 的工具列表中。

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
  "message": "code_execution requires xAI credentials. Run `openclaw onboard --auth-choice xai-oauth` to sign in with Grok, run `openclaw onboard --auth-choice xai-api-key`, set `XAI_API_KEY` in Gateway environments, or configure `plugins.entries.xai.config.webSearch.apiKey`.",
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
