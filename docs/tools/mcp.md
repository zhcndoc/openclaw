---
summary: "通过控制界面、CLI 或配置将 MCP 服务器连接到 OpenClaw"
title: "连接 MCP 服务器"
read_when:
  - 为 OpenClaw 智能体添加 MCP 服务器
  - 在设置和 `openclaw mcp` 之间进行选择
  - 排查 MCP 传输、OAuth 或工具发现问题
---

模型上下文协议（MCP）是一种让智能体借用其他程序工具的方式：MCP 服务器会公开工具、资源和提示，OpenClaw 连接到它后，即可将这些工具提供给你的智能体。服务器定义位于配置中的 `mcp.servers` 下，而它们公开的工具会遵循与其他所有内容相同的工具配置文件和工具策略控制——连接服务器不会绕过你的策略。

<Note>
本指南介绍的是将第三方 MCP 服务器连接**到 OpenClaw**。反过来，如果要将 OpenClaw 频道中的对话公开给另一个 MCP 客户端，请使用 [`openclaw mcp serve`](/cli/mcp#openclaw-as-an-mcp-server)。
</Note>

## 从设置中添加服务器

1. 打开控制界面，前往 **设置 → MCP**。
2. 在 **已配置的服务器** 下，选择 **添加服务器**。
3. 为其指定一个唯一名称，并选择传输方式：**可流式传输的 HTTP**、**SSE** 或 **Stdio**。
4. 对于 HTTP 传输方式，输入服务器的 `http://` 或 `https://` URL。对于 stdio，输入命令及其参数。
5. 选择 **添加服务器**。

这会通过 Gateway 写入新的 `mcp.servers` 条目。对于超出基本配置的内容——请求头、环境值、OAuth 元数据、TLS 设置、超时、并行工具调用提示、工具过滤器——请使用页面下方的作用域配置编辑器。服务器行还允许你启用、禁用或移除定义。

服务器保存后，请验证它确实能够响应：

```bash
openclaw mcp doctor <name> --probe
```

保存定义并不能证明服务器可访问——探测才可以。请注意，已经运行的 Gateway 或代理进程可能需要重启或重新加载运行时，才能获取新的定义。

## 从编写器添加服务器

在 Control UI 聊天中，选择 **+** → **连接器** → **添加 MCP 服务器…**。该对话框使用与设置相同的服务器字段，并且需要管理员权限。

选择 **仅此会话** 以仅在当前会话中启用，或选择 **所有位置** 以全局启用。无论选择哪种范围，都会保存全局服务器定义；会话策略则是按会话应用的层级。有关完整的范围和工具访问行为，请参阅[编写器功能菜单](/web/control-ui#composer-capability-menu)。

在活跃对话中，打开 **+ → 连接器 → 工具访问**，即可查看
或拒绝该会话中的单个工具。该视图遵循会话的
实际运行时所有者：内置 OpenClaw 会话读取进程内 MCP
目录，而原生代理工具可以提供其线程所有的目录。会话服务器和工具拒绝设置会由任一运行时在
下一轮开始前强制执行。

## 从 CLI 添加服务器

本地 stdio 服务器：

```bash
openclaw mcp add local-tools \
  --command node \
  --arg ./dist/mcp-server.js \
  --cwd /srv/openclaw-tools
openclaw mcp doctor local-tools --probe
```

远程 Streamable HTTP 服务器，仅公开其中一部分工具：

```bash
openclaw mcp add docs \
  --url https://mcp.example.com/mcp \
  --transport streamable-http \
  --include 'search,read_*'
openclaw mcp doctor docs --probe
```

实用的配套命令：使用 `openclaw mcp status --verbose` 查看仅包含配置的摘要，使用 `openclaw mcp probe <name>` 查看实时功能，使用 `openclaw mcp login <name>` 登录使用 OAuth 的 HTTP 服务器。[MCP CLI 参考](/cli/mcp) 记录了每个命令、标志和输出格式，以及单独的 `mcp serve` 桥接器。

## 直接配置服务器

同一个 `docs` 服务器，直接写入配置：

```json5
{
  mcp: {
    servers: {
      docs: {
        url: "https://mcp.example.com/mcp",
        transport: "streamable-http",
        enabled: true,
        connectionTimeoutMs: 5000,
        requestTimeoutMs: 20000,
        toolFilter: {
          include: ["search", "read_*"],
        },
      },
    },
  },
}
```

启用的服务器需要命令（stdio）或 URL（SSE 或可流式传输的 HTTP）之一。服务器名称 `__proto__` 已被保留；请选择其他名称。设置 `enabled: false` 会保留该定义，但不会连接服务器。不要将凭据写入配置字面量中——请通过受支持的机密机制存储敏感标头和环境变量值。

## 故障排除

### 服务器出现在设置中，但未提供任何工具

运行 `openclaw mcp doctor <name> --probe`。Doctor 会先验证已保存的定义，然后建立实时连接，并报告服务器公布的工具及其他功能。如果连接成功但缺少预期工具，请检查 `toolFilter.include` 和 `toolFilter.exclude`。

### stdio 服务器无法启动

确认 `command` 能够在 Gateway 进程环境中解析，并且 `cwd` 存在。参数应放在 `args` 中，显式指定 `transport: "stdio"` 时必须提供非空的 command。

### HTTP 服务器需要授权

设置 `auth: "oauth"`，并提供所需的 `oauth` 元数据，然后运行：

```bash
openclaw mcp login <name>
```

按照输出的授权 URL 操作，并在提示时使用 `--code` 重新运行。

### 更改未传达到活动代理

`openclaw mcp reload` 会刷新当前 CLI 进程拥有的运行时。运行在其他位置的 Gateway 或代理需要单独执行重新加载、发布配置或重启。

## 相关内容

- [控制界面](/web/control-ui#composer-capability-menu)
- [MCP CLI 参考](/cli/mcp)
- [管理插件](/plugins/manage-plugins)
- [工具策略](/tools)
