---
summary: "code_execution -- 使用 xAI 运行沙箱化的远程 Python 分析"
read_when:
  - 你想启用或配置 code_execution
  - 你想要远程分析而不需要本地 shell 访问
  - 你想将 x_search 或 web_search 与远程 Python 分析结合使用
title: "代码执行"
---

`code_execution` 在 xAI 的 Responses API 上运行沙箱化的远程 Python 分析。
这与本地 [`exec`](/tools/exec) 不同：

- `exec` 在你的机器或节点上运行 shell 命令
- `code_execution` 在 xAI 的远程沙箱中运行 Python

使用 `code_execution` 来进行：

- 计算
- 制表
- 快速统计
- 图表式分析
- 分析 `x_search` 或 `web_search` 返回的数据

当你需要本地文件、你的 shell、你的仓库或配对设备时，**不要**使用它。
为此请使用 [`exec`](/tools/exec)。

## 设置

你需要一个 xAI API 密钥。以下任一均可：

- `XAI_API_KEY`
- `plugins.entries.xai.config.webSearch.apiKey`

示例：

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...",
          },
          codeExecution: {
            enabled: true,
            model: "grok-4-1-fast",
            maxTurns: 2,
            timeoutSeconds: 30,
          },
        },
      },
    },
  },
}
```

## 如何使用

自然地提问并明确分析意图：

```text
使用 code_execution 计算这些数字的 7 日移动平均数：...
```

```text
使用 x_search 查找本周提及 OpenClaw 的帖子，然后使用 code_execution 按天统计数量。
```

```text
使用 web_search 收集最新的 AI 基准数据，然后使用 code_execution 比较百分比变化。
```

该工具内部接受单个 `task` 参数，因此代理应在一个提示中发送完整的分析请求和任何内联数据。

## 限制

- 这是远程 xAI 执行，而非本地进程执行。
- 应将其视为临时分析，而非持久化笔记本。
- 不要假设可以访问本地文件或你的工作区。
- 对于最新的 X 数据，请先使用 [`x_search`](/tools/web#x_search)。

## 相关内容

- [Exec 工具](/tools/exec)
- [Exec 审批](/tools/exec-approvals)
- [apply_patch 工具](/tools/apply-patch)
- [Web 工具](/tools/web)
- [xAI](/providers/xai)
