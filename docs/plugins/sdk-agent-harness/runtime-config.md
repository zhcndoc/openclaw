---
summary: "用于本机 Codex harness模式以及严格的提供程序或模型运行时策略的操作员配置"
read_when:
  - "您正在为嵌入式转弯启用捆绑的 Codex harness"
  - "您希望harness选择失败而不是后退"
  - "您需要提供程序、模型或每个代理 `agentRuntime` 配置示例"
title: "代理harness运行时配置"
sidebarTitle: "运行时配置"
---

操作员配置：打开捆绑的本机 Codex 模式，并固定提供程序、模型或每个代理运行时策略，以便缺少的harness失败，而不是通过嵌入式运行时进行路由。 [Agent harness插件 ](/plugins/sdk-agent-harness) 参考的一部分。

## <a id="native-codex-harness-mode"></a> Native Codex harness模式

捆绑的 `codex` harness是嵌入式 OpenClaw 代理转弯的本机 Codex 模式。首先启用捆绑的 `codex` 插件，如果您的配置使用限制性白名单，则在 `plugins.allow` 中包含 `codex`。本机应用程序服务器配置应使用 `openai/gpt-*`；仅当有效路由声明 Codex 兼容性时，OpenAI 代理才会选择 Codex harness。旧版 Codex 模型引用应使用 `openclaw doctor --fix` 进行修复，旧版 `codex/*` 模型引用保留本机harness的兼容性别名。

当此模式运行时，Codex 拥有本机线程 id、恢复行为、压缩和应用程序服务器执行。 OpenClaw 仍然拥有聊天通道、可见的转录镜像、工具策略、批准、媒体传输和会话选择。使用 provider/model `agentRuntime.id: "codex"` 需要注册的 Codex harness。除非该工具在执行前声明精确请求回退，否则不受支持的 routes/auth 将被拒绝。 Codex 运行时失败不会通过另一个运行时重试。

## <a id="agents-api-environment"></a> 代理 API 环境

`agentsapi` 插件接受值为 `openai_hosted` 和 `self_hosted` 的 `plugins.entries.agentsapi.config.environment`。省略的配置使用 `openai_hosted`。

对于 `self_hosted`，OpenClaw 将其准备好的绝对工作空间路径作为代理 API `workspace_directory` 发送。执行器必须已在同一路径中具有该目录。在选择此模式之前，请为网关会话配置运营商拥有的 [webhook 控制器](https://developers.openai.com/api/docs/guides/agents-api/environments/lifecycle#start-compute-from-webhooks)。控制器通过经过身份验证的代理 API 检索每个会话的环境 ID 和远程 URL 并按照 [ 官方自托管设置 ](https://developers.openai.com/api/docs/guides/agents-api/environments/self-hosted) 连接其执行器。它拥有启动、重新连接和清理功能。 OpenClaw 不会通过此设置启动或配置执行程序。输入提交的截止时间为 60 秒 HTTP，包括等待执行器连接的任何时间。控制器必须及时连接； API 较长的连接窗口不会延长此期限。

将 `plugins.entries.agentsapi.config.hostExecutorSkillDirectories` 设置为执行器主机上的绝对路径。这些目录必须已使用技能文件进行设置，并且可以通过执行器供代理 API 工具使用。 OpenClaw 将路径作为代理 API `capability_directories` 字段发送。harness通过该执行器发现并读取技能； OpenClaw 不复制或安装这些文件。此显式目录选择使用本机技能发现，无需 OpenClaw 的每技能资格过滤器。网关功能政策仍然适用。省略和空列表保留现有行为。托管会话忽略此列表。

更改环境或自托管工作区或技能目录后重置 OpenClaw 会话。现有托管会话将继续使用省略或显式的 `openai_hosted` 配置。此选择不会扩展 MVP 的现有工具或媒体功能。

## <a id="agents-api-http-mcp-servers"></a> 代理 API HTTP MCP 服务器

代理 API 工具从 `mcp.servers` 和插件 MCP 捆绑包中读取已启用的 HTTP 服务器。在每台服务器上设置 `transport: "streamable-http"`、`url` 和可选的 `headers`。 HTTP 连接从会话的执行环境运行，包括用于专用网络服务的自托管执行器。 Native MCP 拥有发现和执行； OpenClaw 不会为这些工具创建另一个网关传输。

确切的 `toolFilter.include` 名称将作为本机白名单转发。排除和会话工具拒绝需要明确的包含列表并从中减去。不支持通配符、网关管理的 OAuth、旧版 SSE 和自定义 TLS 设置。不支持的服务器和标头无法解析的服务器将通过错误日志被忽略，而支持的服务器仍然可用。这包括请求者范围的连接和 URL-only 定义，它们保留了旧版 SSE 默认值。对有效 MCP 配置或凭证的更改需要重置会话。

Stdio MCP 转发仍然存在延迟实施差距。添加支持后，执行器的本机 MCP 生命周期将拥有这些进程。

harness作者可以重用 `openclaw/plugin-sdk/agent-harness-runtime` 中的 `loadAgentHarnessMcpConfig`，以将启用的捆绑包和运算符定义与会话服务器覆盖合并。它返回静态连接配置、诊断信息和省略的请求者范围服务器的名称，而不打开连接。相同的 SDK 导出 `decodeHeaderEnvPlaceholder` 用于识别 `${NAME}` 和 `Bearer ${NAME}` 标头引用；harness解决了其自身运输的价值。读取返回的服务器的`transport`字段。 Doctor 规范化操作员配置，并且捆绑包加载会在此边界之前转换外部 `type` 字段。没有 `transport` 的服务器的传输支持和默认设置仍然由harness负责。

## <a id="runtime-strictness"></a> 运行时严格性

默认情况下，OpenClaw 使用 `auto` provider/model 运行时策略：已注册的插件 harness 可以声明兼容的有效路由，而当没有匹配项时，内嵌运行时会处理该轮对话。仅有 provider/model 前缀本身绝不会选择某个 harness。请在缺少 harness 选择时使用显式的 provider/model 插件运行时，例如 `agentRuntime.id: "codex"`，这样就会失败，而不是通过内嵌运行时进行路由。 显式选择不会使不兼容的路由变为兼容。所选插件 harness 的失败始终会硬失败。 这不会阻止显式的 provider/model `agentRuntime.id: "openclaw"`。

要请求 Codex 进行嵌入式运行：

```json
{
  "models": {
    "providers": {
      "openai": {
        "agentRuntime": {
          "id": "codex"
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "model": "openai/gpt-6-astra"
    }
  }
}
```

如果您想要一个标准模型 ID 的 CLI 后端，请将运行时放在该模型条目上：

```json
{
  "agents": {
    "defaults": {
      "model": "anthropic/claude-opus-5",
      "models": {
        "anthropic/claude-opus-5": {
          "agentRuntime": {
            "id": "claude-cli"
          }
        }
      }
    }
  }
}
```

逐 agent 覆盖使用相同的按模型范围形状：

```json
{
  "agents": {
    "entries": {
      "codex-only": {
        "model": "openai/gpt-6-astra",
        "models": {
          "openai/gpt-6-astra": {
            "agentRuntime": { "id": "codex" }
          }
        }
      }
    }
  }
}
```

如下这类旧的按整个 agent 设定运行时示例会被忽略：

```json validate=false
{
  "agents": {
    "defaults": {
      "agentRuntime": {
        "id": "codex"
      }
    }
  }
}
```

使用显式插件运行时，当请求的工具未注册或拒绝已解析的 provider/model 且没有声明的回退时，会话会提前失败。即使使用显式运行时，编写的传输覆盖也可以通过该后备选择 OpenClaw。为了证明本机执行，请检查完成结果中的实际harness；单独配置的意图并不能证明。

此设置只控制内嵌式 agent harness。它不会禁用图片、视频、音乐、TTS、PDF 或其他 provider 特定的模型路由。
