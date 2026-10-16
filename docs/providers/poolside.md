---
summary: "使用 Poolside Laguna 模型或 Poolside 代理与 OpenClaw"
read_when:
  - "您想要将 Poolside Laguna 模型与 OpenClaw 一起使用"
  - "您想要通过 ACP 运行 Poolside 代理"
title: "Poolside (Laguna)"
---

[Poolside](https://poolside.ai) 提供 Laguna 模型和 Poolside 代理 CLI。选择您希望 OpenClaw 执行的工作的集成：

| 目标                                                 | 一体化                         |
| ---------------------------------------------------- | ----------------------------------- |
| 将 Laguna 模型与 OpenClaw 代理结合使用            | Poolside-维护的提供商插件 |
| 将 Poolside 代理作为外部编码工具运行 | ACP 与 `pool` 目标          |

## <a id="laguna-model-provider"></a> Laguna 模型提供商

安装外部[`@poolside/openclaw-provider`插件](https://hub.openclaw.ai/poolside/plugins/openclaw-provider)：

```bash
openclaw plugins install clawhub:@poolside/openclaw-provider
```

按照 [Poolside 的 OpenClaw 指南 ](https://docs.poolside.ai/tools/openclaw) 进行身份验证、模型选择以及托管或自我管理端点。该插件拥有Poolside的模型目录并请求兼容性。

如果您使用 `POOLSIDE_API_KEY`，请在重新启动网关之前使其可供 **Gateway 进程** 使用。对于托管服务，将其放入全局运行时 `.env` 文件或服务环境中。稍后在交互式 shell 中导出它不会更新正在运行的服务。请参见[环境变量](/help/environment)。

## <a id="poolside-agent-over-acp"></a> Poolside 代理过ACP

`pool` ACP 目标推出 `pool acp`。在网关主机上安装并验证 [Poolside CLI](https://docs.poolside.ai/cli/install)，并确保 `pool` 位于网关的 `PATH` 上。与 OpenClaw 提供程序插件分开配置 CLI 身份验证。

启用 ACP 运行时插件，如 [ACP 快速入门](/tools/acp-agents/quickstart) 中所述。如果设置了 `acp.allowedAgents`，则包括 `pool`。然后开始一个会话：

```text
/acp spawn pool
```

有关权限，请参阅 [ACP 设置 ](/tools/acp-agents-setup)；有关 CLI 设置，请参阅 [Poolside 的 OpenClaw 指南 ](https://docs.poolside.ai/tools/openclaw)。
