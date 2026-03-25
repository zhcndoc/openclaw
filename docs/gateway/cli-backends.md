---
summary: "CLI 后端：通过本地 AI CLI 实现纯文本回退"
read_when:
  - 当 API 供应商故障时，你需要一个可靠的回退方案
  - 你正在运行 Claude Code CLI 或其他本地 AI CLI，想要复用它们
  - 你需要一个纯文本、无工具调用且仍支持会话和图像的路径
title: "CLI 后端"
---

# CLI 后端（回退运行时）

当 API 提供商故障、被限流或暂时异常时，OpenClaw 可以运行**本地 AI CLI**作为**纯文本回退方案**。  
这是刻意保守设计的：

- **禁用工具**（不调用任何工具）。
- **纯文本输入 → 纯文本输出**（可靠）。
- **支持会话**（保持后续对话连贯）。
- **如果 CLI 支持图像路径，可以传递图像**。

该方案设计为**安全网**，而非首选路径。需要"始终可用"的文本响应且不依赖外部 API 时，可使用本方案。

## 初学者友好快速启动

你可以在无需任何配置的情况下使用 Claude Code CLI（OpenClaw 内置默认配置）：

```bash
openclaw agent --message "hi" --model claude-cli/opus-4.6
```

Codex CLI 也可开箱即用：

```bash
openclaw agent --message "hi" --model codex-cli/gpt-5.4
```

如果你的网关运行在 launchd/systemd 下且 PATH 环境变量有限，只需添加命令完整路径：

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
      },
    },
  },
}
```

就这些。无需密钥或额外的身份验证配置，CLI 本身即可处理认证。

## 作为回退方案使用

将 CLI 后端添加到回退列表，使其仅在主模型失败时运行：

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["claude-cli/opus-4.6", "claude-cli/opus-4.5"],
      },
      models: {
        "anthropic/claude-opus-4-6": { alias: "Opus" },
        "claude-cli/opus-4.6": {},
        "claude-cli/opus-4.5": {},
      },
    },
  },
}
```

注意：

- 如果你使用 `agents.defaults.models`（白名单），必须包含 `claude-cli/...`。
- 如果主提供商失败（认证错误、限流、超时），OpenClaw 会尝试 CLI 后端。

## 配置概览

所有 CLI 后端配置位于：

```
agents.defaults.cliBackends
```

每个条目以**供应商 ID**（如 `claude-cli`、`my-cli`）为键。  
该供应商 ID 构成模型标识的左半部分：

```
<provider>/<model>
```

### 配置示例

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
        "my-cli": {
          command: "my-cli",
          args: ["--json"],
          output: "json",
          input: "arg",
          modelArg: "--model",
          modelAliases: {
            "claude-opus-4-6": "opus",
            "claude-opus-4-6": "opus",
            "claude-sonnet-4-6": "sonnet",
          },
          sessionArg: "--session",
          sessionMode: "existing",
          sessionIdFields: ["session_id", "conversation_id"],
          systemPromptArg: "--system",
          systemPromptWhen: "first",
          imageArg: "--image",
          imageMode: "repeat",
          serialize: true,
        },
      },
    },
  },
}
```

## 工作原理

1. 根据提供商前缀（如 `claude-cli/...`）**选择后端**。  
2. 使用相同的 OpenClaw 提示和工作区上下文**构建系统提示**。  
3. **执行 CLI**，若支持会话则带上会话 ID，保持历史一致。  
4. **解析输出**（JSON 或纯文本），返回最终文本。  
5. **持久化每个后端的会话 ID**，后续请求复用同一 CLI 会话。

## 会话

- 若 CLI 支持会话，设置 `sessionArg`（如 `--session-id`）或 `sessionArgs`（当 ID 需注入多个参数时，支持占位符 `{sessionId}`）。  
- 若 CLI 通过"恢复"子命令使用不同参数，设置 `resumeArgs`（恢复时替代 `args`）和可选的 `resumeOutput`（非 JSON 恢复时）。  
- `sessionMode`：  
  - `always`：始终发送会话 ID（无存储则新生成 UUID）。  
  - `existing`：仅当之前存储过会话 ID 时发送。  
  - `none`：从不发送会话 ID。

## 图像（透传）

若 CLI 接受图像路径，设置 `imageArg`：

```json5
imageArg: "--image",
imageMode: "repeat"
```

OpenClaw 会将 base64 图像写入临时文件。如果设置了 `imageArg`，则路径作为 CLI 参数传递；如果未设置，OpenClaw 会将文件路径附加到提示末尾（路径注入），这对某些 CLI（如 Claude Code CLI）自动加载本地文件已经足够。

## 输入 / 输出

- `output: "json"`（默认）尝试解析 JSON 并提取文本和会话 ID。  
- `output: "jsonl"` 解析 JSONL 流（Codex CLI `--json`）并提取最后一条代理消息及可用的 `thread_id`。  
- `output: "text"` 将标准输出视为最终响应。

输入模式：

- `input: "arg"`（默认）将提示作为最后一个 CLI 参数传递。  
- `input: "stdin"` 通过标准输入发送提示。  
- 当提示非常长且设置了 `maxPromptArgChars` 时，会回退到 stdin 传递。

## 默认值（内置）

OpenClaw 为 `claude-cli` 提供内置默认配置：

- `command: "claude"`  
- `args: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions"]`  
- `resumeArgs: ["-p", "--output-format", "json", "--permission-mode", "bypassPermissions", "--resume", "{sessionId}"]`  
- `modelArg: "--model"`  
- `systemPromptArg: "--append-system-prompt"`  
- `sessionArg: "--session-id"`  
- `systemPromptWhen: "first"`  
- `sessionMode: "always"`

OpenClaw 也内置了 `codex-cli` 默认配置：

- `command: "codex"`  
- `args: ["exec","--json","--color","never","--sandbox","read-only","--skip-git-repo-check"]`  
- `resumeArgs: ["exec","resume","{sessionId}","--color","never","--sandbox","read-only","--skip-git-repo-check"]`  
- `output: "jsonl"`  
- `resumeOutput: "text"`  
- `modelArg: "--model"`  
- `imageArg: "--image"`  
- `sessionMode: "existing"`

仅在需要时覆盖（常见场景为指定命令的绝对路径）。

## 限制

- **不支持 OpenClaw 工具**（CLI 后端永远不会收到工具调用）。部分 CLI 可能自带代理工具。  
- **不支持流式输出**（CLI 输出收集完毕后返回）。  
- **结构化输出依赖 CLI 的 JSON 格式**。  
- **Codex CLI 会话** 通过文本输出恢复（非 JSONL），结构化程度低于首次 `--json` 运行。OpenClaw 会话功能依然正常。

## 故障排查

- **找不到 CLI**：将 `command` 设置为完整路径。  
- **模型名称错误**：使用 `modelAliases` 映射 `provider/model` 到 CLI 模型。  
- **无会话连续性**：确保已设置 `sessionArg` 且 `sessionMode` 不是 `none`（Codex CLI 目前不能通过 JSON 输出恢复）。  
- **图像被忽略**：设置 `imageArg` 并确认 CLI 支持文件路径。
