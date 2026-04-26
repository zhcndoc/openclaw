---
summary: "压缩嘈杂的 exec 和 bash 工具结果，并可选启用内置插件"
title: "Tokenjuice"
read_when:
  - 你希望在 OpenClaw 中获得更短的 `exec` 或 `bash` 工具结果
  - 你想启用内置的 tokenjuice 插件
  - 你需要了解 tokenjuice 会改变什么、又会保留什么原样
---

`tokenjuice` 是一个可选的内置插件，会在命令已经运行完成后压缩嘈杂的 `exec` 和 `bash`
工具结果。

它修改的是返回的 `tool_result`，而不是命令本身。Tokenjuice
不会重写 shell 输入、重新运行命令，也不会更改退出码。

目前，这适用于 PI 嵌入式运行以及 Codex
应用服务器 harness 中的 OpenClaw 动态工具。Tokenjuice 会挂钩到 OpenClaw 的 tool-result 中间件，并在结果返回到活动的 harness 会话之前对其进行裁剪。

## 启用插件

快速方式：

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

等效方式：

```bash
openclaw plugins enable tokenjuice
```

OpenClaw 已经自带该插件。不需要单独执行 `plugins install`
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

- 在嘈杂的 `exec` 和 `bash` 结果回传到会话之前对其进行压缩。
- 保持原始命令执行不变。
- 保留精确的文件内容读取以及 tokenjuice 应该原样保留的其他命令。
- 保持可选启用：如果你希望所有地方都输出逐字结果，请禁用该插件。

## 验证它是否生效

1. 启用插件。
2. 启动一个可以调用 `exec` 的会话。
3. 运行一个嘈杂的命令，例如 `git status`。
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

- [Exec tool](/tools/exec)
- [Thinking levels](/tools/thinking)
- [Context engine](/concepts/context-engine)
