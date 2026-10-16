---
summary: "从浏览器 Control UI 设置页面编辑和检查 MCP 服务器"
title: "MCP 中的 Control UI"
read_when:
  - "从浏览器而不是 CLI 编辑 MCP 配置"
  - "查找 Control UI MCP 库存或启用切换"
---

Control UI 有一个专用的 MCP 设置页面，用于操作员编辑和快速清点。

## Control UI

浏览器Control UI包括一个专用的MCP设置页面，位于`/settings/mcp`；之前的 `/mcp` 路径仍然是别名。该页面显示配置的服务器计数、enabled/OAuth/filter 摘要、每服务器传输行、enable/disable 控件、常见 CLI 命令以及 `mcp` 配置部分的范围编辑器。

如需查看涵盖设置、编排器路径（**+** → **连接器** → **添加 MCP 服务器…**）及其**本次会话**/**所有位置**作用域、CLI 和直接配置的简短设置指南，请参阅[连接 MCP 服务器](/tools/mcp)。

使用该页面进行运维人员编辑和快速清点。需要实时服务器证明时，请使用 `openclaw mcp doctor --probe` 或 `openclaw mcp probe`。

启用的插件详细信息页面显示其声明的 HTTP MCP 服务器的 **Accounts** 和 `auth: "oauth"`。选择**Connect**，完成提供商的登录和同意，然后返回OpenClaw。授权保存后，页面刷新保存状态，显示**Connected**。 **Edit** 打开 MCP 设置页面。登录需要管理员连接。

插件声明在安装和启用后直接起作用；不需要重复的 `mcp.servers` 条目。显式的 `mcp.servers.<name>` 条目会覆盖插件的定义，包括用于禁用该服务器的 `enabled: false` 。

声明了 API-key 字段的插件还会显示 **Credentials**，包括其环境变量名称。 **Configure** 打开现有的插件设置编辑器以获取密钥和秘密引用。配置的键显示复选标记和 **Configured**，**Edit** 返回到该编辑器。这些部分仅在安装后出现，而不出现在预安装目录预览中。凭证的存在并不验证密钥或秘密引用是否适用于该服务。

服务器名称和 URL 必须与插件的活动 MCP 声明匹配。本部分不会检查服务运行状况或发现未配置的 URL 的 OAuth。本地 stdio 服务器、每个请求者帐户和 `oauth.authProfileId` 连接保留其现有的身份验证设置路径。

运维工作流：

1. 打开Control UI并选择**MCP**。
2. 查看摘要卡片中的总数、已启用、OAuth 和已过滤服务器。
3. 使用每个服务器行查看传输、认证、过滤、超时和命令提示。
4. 当你想保留定义但将其排除在运行时发现之外时，切换启用状态。
5. 编辑作用域内的 `mcp` 配置段，以进行结构性更改，例如新增服务器、头部、TLS、OAuth 元数据或工具过滤器。
6. 选择 **保存** 仅持久化配置，或选择 **保存并发布** 通过 Gateway 配置路径应用。
7. 当你需要该已编辑服务器已启动并列出工具的实时证明时，运行 `openclaw mcp doctor --probe`。

注意：

- 命令片段会给服务器名称加引号，因此即使是不常见的名称，在 shell 中也很方便复制
- 当显示的 URL- 类似值包含嵌入凭据时，它们会在渲染之前经过编辑
- 该页面不会自行启动 MCP 传输
- 活动运行时可能需要 `openclaw mcp reload`、Gateway 配置发布或进程重启，具体取决于哪个进程持有 MCP 客户端
