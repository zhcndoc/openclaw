---
summary: "使用可选的捆绑插件压缩冗长的 exec 和 bash 工具结果"
title: "Tokenjuice"
read_when:
  - 你希望在 OpenClaw 中获得更短的 `exec` 或 `bash` 工具结果
  - 你想启用捆绑的 tokenjuice 插件
  - 你需要了解 tokenjuice 会改变什么，以及它会保留原样的内容
---

`tokenjuice` 是一个可选的捆绑插件，会在命令已经运行完成后压缩冗长的 `exec` 和 `bash`
工具结果。

它改变的是返回的 `tool_result`，而不是命令本身。Tokenjuice 不会重写 shell 输入、重新运行命令，或更改退出代码。

目前这适用于 Codex
app-server harness 中的 PI 内嵌运行和 OpenClaw 动态工具。Tokenjuice 会挂接到 OpenClaw 的工具结果中间件，并在输出返回到活动的 harness 会话之前对其进行裁剪。

## 启用插件

快速方式：

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

等效方式：

```bash
openclaw plugins enable tokenjuice
```

OpenClaw 已经自带该插件。没有单独的 `plugins install`
或 `tokenjuice install openclaw` 步骤。

如果你更喜欢直接编辑配置：

```json5
{
  plugins: {
    entries: {
      tokenjuice: {
        enabled: true,
      },
    },
  },
}
```

## tokenjuice 会改变什么

- 在冗长的 `exec` 和 `bash` 结果反馈到会话之前，对它们进行压缩。
- 保持原始的命令执行不受影响。
- 保留精确的文件内容读取以及 tokenjuice 应保留原样的其他命令。
- 保持可选启用：如果你希望所有地方都输出逐字原文，请禁用该插件。

## 验证它是否正常工作

1. 启用插件。
2. 启动一个可以调用 `exec` 的会话。
3. 运行一个冗长的命令，例如 `git status`。
4. 检查返回的工具结果是否比原始 shell 输出更短且更有结构。

## 禁用插件

```bash
openclaw config set plugins.entries.tokenjuice.enabled false
```

或者：

```bash
openclaw plugins disable tokenjuice
```

## 相关内容

- [Exec 工具](/tools/exec)
- [思考级别](/tools/thinking)
- [上下文引擎](/concepts/context-engine)
