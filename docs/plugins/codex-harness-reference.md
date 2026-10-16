---
summary: "Codex harness 的配置、认证、发现以及 app-server 参考"
title: "Codex harness 参考"
read_when:
  - "你需要 Codex harness 的每一个配置字段"
  - "你正在更改 app-server 传输、认证、发现或超时行为"
  - "你正在调试 Codex harness 启动、模型发现或环境隔离"
---

此参考文档涵盖官方 `codex` 插件的详细配置。 关于设置和路由决策，请先阅读 [Codex harness](/plugins/codex-harness)。

## <a id="plugin-config-surface"></a> 插件配置面

所有 Codex harness 设置都位于 `plugins.entries.codex.config` 下。

```json5
{
  plugins: {
    entries: {
      codex: {
        enabled: true,
        config: {
          discovery: {
            enabled: true,
            timeoutMs: 10000,
          },
          appServer: {
            mode: "guardian",
          },
        },
      },
    },
  },
}
```

顶级字段：

| 字段                      | 默认值                  | 含义                                                                                                                                                                                                                                 |
| -------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `discovery`                | 已启用                  | Codex 应用程序服务器 `model/list` 的模型发现设置。请参阅 [Codex 模型发现](/plugins/codex-harness-reference/model-discovery)。                                                                                              |
| `appServer`                | 托管的 stdio app-server | 传输、命令、身份验证、批准、沙箱和超时设置。普通harness默认为代理范围状态。请参阅 [Codex 应用程序服务器传输](/plugins/codex-harness-reference/app-server-transport)。                        |
| `codexDynamicToolsLoading` | `"searchable"`           | 使用 `"direct"` 将 OpenClaw 动态工具直接放入初始 Codex 工具上下文中。请参阅 [Codex 动态工具](/plugins/codex-harness-reference/dynamic-tools)。                                                                     |
| `codexDynamicToolsExclude` | `[]`                     | 从 Codex 应用程序服务器轮次中省略的其他 OpenClaw 动态工具名称。请参阅 [Codex 动态工具](/plugins/codex-harness-reference/dynamic-tools)。                                                                                  |
| `codexPlugins`             | 已禁用                 | 本机 Codex plugin/app 支持，包括选择访问连接的帐户应用程序。请参阅 [Native Codex 插件](/plugins/codex-native-plugins)。                                                                                          |
| `computerUse`              | 已禁用                 | Codex Computer Use 配置。参见 [Codex Computer Use](/plugins/codex-computer-use)。                                                                                                                                                        |
| `sessionCatalog`           | 已启用                  | 侧边栏的本机 Codex 会话发现。设置 `enabled: false` 以禁用它，或设置 `homes` 以包括其他本地 Codex 存储。请参阅 [Codex 会话目录和监督 ](/plugins/codex-harness-reference/supervision)。 |
| `supervision`              | 已禁用                 | 面向 agent 的原生会话转录和写入控制策略。参见 [Codex supervision](/plugins/codex-supervision)。                                                                                                                   |

## <a id="where-each-section-moved"></a> 各部分移动的地方

单页版本的每个部分现在都位于此页面或下面的九个子页面之一上。单页版本中的锚点仍然在这里解析。

### <a id="codex-session-catalog-and-supervision"></a> Codex 会话目录和监督

[Codex 会话目录和监管](/plugins/codex-harness-reference/supervision) — 本机 Codex 会话发现和面向代理的监管设置。

- <a id="supervision"></a>[监管](/plugins/codex-harness-reference/supervision#supervision)

### <a id="codex-app-server-transport"></a> Codex 应用程序服务器传输

[Codex 应用程序服务器传输](/plugins/codex-harness-reference/app-server-transport) — 应用程序服务器传输选择、appServer 字段表和本地测试环境覆盖。

- <a id="app-server-transport"></a>[应用程序服务器传输](/plugins/codex-harness-reference/app-server-transport#app-server-transport)
- <a id="environment-overrides"></a>[环境覆盖](/plugins/codex-harness-reference/app-server-transport#environment-overrides)

### <a id="codex-approval-and-sandbox-modes"></a> Codex 审批和沙箱模式

[Codex 批准和沙箱模式](/plugins/codex-harness-reference/approval-and-sandbox) — YOLO 和监护人批准预设，以及沙箱本机执行路径。

- <a id="approval-and-sandbox-modes"></a>[审批和沙箱模式](/plugins/codex-harness-reference/approval-and-sandbox#approval-and-sandbox-modes)
- <a id="sandboxed-native-execution"></a>[沙盒本机执行](/plugins/codex-harness-reference/approval-and-sandbox#sandboxed-native-execution)

### <a id="codex-auth-and-environment-isolation"></a> Codex 认证与环境隔离

[Codex 身份验证和环境隔离](/plugins/codex-harness-reference/auth) — Codex 身份验证选择顺序、凭证处理和环境隔离。

- <a id="auth-and-environment-isolation"></a>[认证与环境隔离](/plugins/codex-harness-reference/auth#auth-and-environment-isolation)

### <a id="codex-dynamic-tools"></a> Codex 动态工具

[Codex 动态工具](/plugins/codex-harness-reference/dynamic-tools) — OpenClaw 动态工具如何暴露给 Codex 应用程序服务器轮流。

- <a id="dynamic-tools"></a>[动态工具](/plugins/codex-harness-reference/dynamic-tools#dynamic-tools)

### <a id="codex-timeouts-and-turn-settlement"></a> Codex 超时和回合结算

[Codex 超时和转弯结算](/plugins/codex-harness-reference/timeouts) — 动态工具超时顺序、转弯执行预算和本地结算。

- <a id="timeouts"></a>[超时](/plugins/codex-harness-reference/timeouts#timeouts)
- <a id="turn-execution-and-settlement"></a>[回合执行结算](/plugins/codex-harness-reference/timeouts#turn-execution-and-settlement)

### <a id="codex-model-discovery"></a> Codex 模型发现

[Codex 模型发现](/plugins/codex-harness-reference/model-discovery) — Codex 应用程序服务器模型发现、离线提示和目录规则。

- <a id="model-discovery"></a>[模型发现](/plugins/codex-harness-reference/model-discovery#model-discovery)

### <a id="codex-restricted-turns"></a> Codex 限制转弯

[Codex 限制转动](/plugins/codex-harness-reference/restricted-turns) — 当工具策略限制 Codex 本机表面时，以及环零添加的内容。

- <a id="restricted-turns"></a>[限制转弯](/plugins/codex-harness-reference/restricted-turns#restricted-turns)

### <a id="codex-workspace-bootstrap-files"></a> Codex 工作区引导程序文件

[Codex 工作区引导程序文件](/plugins/codex-harness-reference/workspace-bootstrap-files) — 哪些工作区引导程序文件到达 Codex 轮次，以及它们的携带方式。

- <a id="workspace-bootstrap-files"></a>[工作区引导程序文件](/plugins/codex-harness-reference/workspace-bootstrap-files#workspace-bootstrap-files)

## <a id="related"></a> 相关内容

- [Codex 运行环境](/plugins/codex-harness)
- [Codex harness运行时](/plugins/codex-harness-runtime)
- [Codex 监督](/plugins/codex-supervision)
- [原生 Codex 插件](/plugins/codex-native-plugins)
- [Codex 计算机 Use](/plugins/codex-computer-use)
- [OpenAI 提供商](/providers/openai)
- [配置参考](/gateway/configuration-reference)
