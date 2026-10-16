---
summary: "使用 mcpregistry 子命令管理 OpenClaw- 保存的 MCP 服务器定义"
title: "管理已保存的 MCP 服务器"
read_when:
  - "保存第三方 MCP 服务器以供 OpenClaw- 托管代理运行"
  - "查找 `list`、`show`、`status`、`doctor`、`probe`、`add`、`set`、`configure`、`tools`、 `login`、`logout`、`reload` 或 `unset` 确实"
  - "为已保存的服务器设置 Codex 工具审批模式"
---

本页介绍 OpenClaw MCP 客户端注册表：读取和写入 `mcp.servers` 定义的子命令、它们的 Codex 批准行为以及现成的服务器配方。

## <a id="openclaw-as-an-mcp-client-registry"></a> OpenClaw 作为 MCP 客户端注册表

这是 `openclaw mcp list`、`show`、`status`、`doctor`、`probe`、`add`、`set`、`configure`、`tools`、`login`、`logout`、`reload` 和 `unset` 路径。

这些命令不会通过 MCP 公开 OpenClaw。它们在 OpenClaw 配置中的 `mcp.servers` 下管理 OpenClaw- 托管的 MCP 服务器定义。它们不会从 `config/mcporter.json` 读取 mcporter 服务器。

这些已保存的定义适用于 OpenClaw 之后会启动或配置的运行时，例如嵌入式 OpenClaw 和其他运行时适配器。OpenClaw 将这些定义集中存储，因此这些运行时无需维护各自重复的 MCP 服务器列表。

<AccordionGroup>
  <Accordion id="important-behavior" title="重要行为">
    - 这些命令管理 OpenClaw 配置和 OAuth 凭证状态
    - `status`、`list`、`show`、`doctor`（不带 `--probe`）、`set`、`configure`、`tools`、`logout`、`reload` 和 `unset` 不会连接到目标 MCP 服务器
    - `login` 为配置的 HTTP 服务器执行 MCP OAuth 网络流并保存生成的本地凭据
    - `status --verbose` 会在不连接的情况下打印已解析的传输、认证、超时、过滤器和并行工具调用提示
    - `doctor` 检查保存的定义是否存在本地设置问题，例如缺少 stdio 命令、无效工作目录、缺少 TLS 文件、禁用的服务器、文字敏感的 header/env 值以及不完整的 OAuth 授权
    - `doctor --probe` 在静态检查通过后会加入与 `probe` 相同的在线连接验证
    - `probe` 连接到选定的服务器或所有已配置的服务器，列出工具并报告 capabilities/diagnostics
    - `add` 在保存之前根据标志构建定义并进行检查，除非设置了 `--no-probe` 或首先需要 OAuth 授权
    - 运行时适配器会在执行时决定它们实际支持的传输形态
    - `enabled: false` 会保留服务器定义，但会将其排除在嵌入式运行时发现之外
    - `requestTimeoutMs` 和 `connectionTimeoutMs` 以毫秒为单位分别为每个服务器设置请求和连接超时
    - `supportsParallelToolCalls: true` 表示适配器可以并发调用这些服务器
    - HTTP 服务器可以使用静态标头、OAuth 登录、TLS 验证控制和 mTLS certificate/key 路径
    - 嵌入式 OpenClaw 会在常规 `coding` 和 `messaging` 工具配置文件中暴露已配置的 MCP 工具；`minimal` 仍然会隐藏它们，而 `tools.deny: ["bundle-mcp"]` 会显式禁用它们
    - 整体服务器工具拒绝（例如`tools.deny: ["bundle-mcp"]`或`tools.deny: ["docs__*"]`）在连接之前排除这些服务器；个别工具拒绝仍然适用于发现的目录
    - 每个服务器的 `toolFilter.include` 和 `toolFilter.exclude` 会在发现 MCP 工具后、成为 OpenClaw 工具之前对其进行过滤
    - 通告资源或提示的服务器还公开 listing/reading 资源和 listing/fetching 提示的实用工具；这些生成的实用程序名称（`resources_list`、`resources_read`、`prompts_list`、`prompts_get`）使用相同的 include/exclude 过滤器
    - fetched 提示向代理呈现其描述和角色标记消息，包括用于具有视觉功能的模型的本机图像块；编码模式保持原提示符JSON形状
    - dynamic MCP 工具列表更改使该会话的缓存目录无效；下一个 discovery/use 从服务器刷新
    - 重复 MCP 工具 request/protocol 故障会短暂暂停该服务器，因此一台损坏的服务器不会消耗整个回合
    - 会话范围的 MCP 运行时在轮次之间保持活动状态，直到会话 reset/deletion 或压缩 ID 翻转、显式停止、相关服务器配置更改或网关关闭；拥有的 stdio 子级在清理期间终止
    - 没有幸存的运行时会话的分离一次性运行会在运行结束时退出其 MCP 运行时；保留的转录本不会延长寿命
    - native harness准备会保留最终捆绑包的服务器连接和 OAuth 上下文，直到会话关闭；当没有其他租约需要它们时，可以在准备后退役该捆绑包之外未使用的发现服务器
    - 取消压缩会关闭为该压缩创建的 MCP 运行时，包括挂起的启动和工具发现
    - `mcp.sessionIdleTtlMs` 是一个选择加入的空闲超时（以毫秒为单位）：未设置或 `0` 使运行时保持活动状态，正有限值启用空闲驱逐（分数向下舍入）
    - a 网关最多允许 256 个 OpenClaw- 托管运行时，并具有跨会话和请求者分区的服务器连接；没有可用服务器和仅登录目录的会话不消耗此限制。达到限制将拒绝新的准入，直到您停止或重置未使用的会话。详情参见[MCP配置](/gateway/config-extensions#mcp)

  </Accordion>
</AccordionGroup>

运行时适配器可以将此共享注册表标准化为其下游客户端期望的形状。例如，嵌入式 OpenClaw 直接消耗 OpenClaw `transport` 值，而 Claude Code 和 Gemini 接收 CLI-native `type` 值，例如 `http`、`sse`、或 `stdio`。

CLI `login`、`logout`、`probe`、`doctor --probe` 和保存的服务器突变（`add`、`set`、`configure`、`tools`、 `unset`）要求停止本地网关。它们在加载可写状态之前获取独占状态所有权，并通过 OAuth 回调、凭证刷新和清理来保留它。如果网关拥有选定的状态目录，则该命令会在尝试本地写入之前拒绝并提供停止并重试指导。使用 Control UI 进行受支持的实时 MCP 设置和登录操作。当网关运行时，`list`、`show`、`status` 和不含 `--probe` 的 `doctor` 仍然可用。

### <a id="saved-mcp-server-definitions"></a> 已保存的 MCP 服务器定义

命令：

- `openclaw mcp list [--json]`
- `openclaw mcp show [name] [--json]`
- `openclaw mcp status [--verbose] [--json]`
- `openclaw mcp doctor [name] [--probe] [--json]`
- `openclaw mcp probe [name] [--json]`
- `openclaw mcp add <name> [flags]`
- `openclaw mcp set <name> <json>`
- `openclaw mcp configure <name> [flags]`
- `openclaw mcp tools <name> [--include csv] [--exclude csv] [--clear]`
- `openclaw mcp login <name> [--code code]`
- `openclaw mcp logout <name>`
- `openclaw mcp reload`
- `openclaw mcp unset <name>`

注意：

- `list` 会对服务器名称进行排序。
- 不带名称的 `show` 会打印完整的已配置 MCP 服务器对象。
- `status` 会在不建立连接的情况下对已配置的传输方式进行分类。`--verbose` 会包含解析后的启动、超时、OAuth、筛选器和并行调用详细信息，包括已存储的 OAuth 令牌需要额外授权的情况。在文本和 JSON 输出中，包含凭据的 stdio 参数都会被隐藏。
- `doctor` 会在不建立连接的情况下执行静态检查。当命令还应验证已启用服务器是否能够连接时，请添加 `--probe`。
- `probe` 连接到已启用的已保存服务器并报告工具计数、resources/prompts 支持、列表更改支持和诊断。如果没有启用，则纯输出说明无法检查任何服务器并显示 add/enable 命令； `--json` 保留其空结果信封。指定的禁用服务器被拒绝并带有启用提示。
- `add` 接受 stdio 标志，例如 `--command`、`--arg`、`--env` 和 `--cwd`，或 HTTP 标志，例如 `--url`、 `--transport`、`--header`、`--auth oauth`、TLS、超时和工具选择标志。使用`--approval auto|prompt|approve`设置Codex工具审批模式。
- `set` 要求在命令行中提供一个 JSON 对象值。
- `configure` 更新启用、工具过滤器、超时、OAuth、TLS、Codex 批准模式和并行工具调用提示，而无需替换整个服务器定义。添加 `--probe` 以在保存之前验证更新的服务器。
- `tools` 更新每服务器工具过滤器。 Include/exclude 条目是 MCP 工具名称和简单的 `*` 通配符。
- `login` 为配置了 `auth: "oauth"` 的 HTTP 服务器运行 OAuth 流。对于环回重定向，OpenClaw 监听浏览器回调并自动完成登录。打印的 `--code` 命令仍然是远程、无头或无法访问的回调的后备。
- `logout` 会清除指定服务器的已存储 OAuth 凭据，但不会移除已保存的服务器定义。
- `reload` 仅为当前 CLI 进程处置缓存的进程内 MCP 运行时。另一个进程中的网关或代理进程仍然需要自己的重新加载或重新启动路径。
- 将 `transport: "streamable-http"` 用于可流式传输的 HTTP MCP 服务器。 `openclaw mcp set` 还将 CLI-native `type: "http"` 标准化为相同的当前配置格式以实现兼容性。
- 如果指定名称的服务器不存在，`unset` 会执行失败。

示例：

```bash
openclaw mcp list
openclaw mcp show context7 --json
openclaw mcp status --verbose
openclaw mcp doctor --probe
openclaw mcp probe context7 --json
openclaw mcp add memory --command npx --arg -y --arg @modelcontextprotocol/server-memory
openclaw mcp set context7 '{"command":"uvx","args":["context7-mcp"]}'
openclaw mcp tools context7 --include 'resolve-library-id,get-library-docs'
openclaw mcp set docs '{"url":"https://mcp.example.com","transport":"streamable-http"}'
openclaw mcp configure docs --timeout 20 --connect-timeout 5 --include 'search,read_*'
openclaw mcp configure docs --auth oauth --oauth-scope 'docs.read'
openclaw mcp login docs
openclaw mcp logout docs
openclaw mcp unset context7
```

### <a id="codex-tool-approvals"></a> Codex 工具认证

MCP 工具批准遵循有效的 Codex 会话权限状态，除非您明确覆盖服务器的批准模式。默认的完全权限姿势不会提示，包括对于没有MCP安全注释的工具。更严格的姿势保留批准检查：`workspace` 可以使用自动审查，而 `guarded` 和 `read-only` 可以提示操作员使用未注释的工具。交互式回合可以批准 Control UI 中的这些调用。

对于您信任的服务器，在添加时设置模式：

```bash
openclaw mcp add memory \
  --command npx \
  --arg -y \
  --arg @modelcontextprotocol/server-memory \
  --approval approve
```

对于现有的已保存服务器，仅更新其批准模式：

```bash
openclaw mcp configure memory --approval approve
```

该标志写入 `codex.defaultToolsApprovalMode`。显式 `openclaw mcp configure <server> --approval approve|prompt|auto` 会覆盖该服务器的基于姿势的默认值：`approve` 绕过每次调用批准，`prompt` 询问每次调用，而 `auto` 使用该工具的安全注释。仅将 `approve` 用于受信任的服务器。当服务器使用 `auto` 并且其工具均没有安全注释时，`mcp probe` 和 `mcp doctor --probe` 会发出警告；该警告描述了提示姿势下的呼叫。

当提供时，**Allow Always** 批准该工具，而不仅仅是当前参数。对于在 `mcp.servers` 中配置的服务器上运行的网关托管的 Codex，当提供持久持久性并且批准明确匹配一个实时网关拥有的工具调用时，OpenClaw 会在主机批准文档中保存持久的、每代理 server/tool 授权。丢失或不明确的匹配以及仅允许会话持久性的请求保留 Codex 的 native/session 行为。 Codex 应用程序、本机插件服务器和计算机使用服务器不包括在内。

存储的授权适用于 `auto` 或未指定的服务器模式。明确的 `prompt` 不断询问，即使有资助；显式 `approve` 已绕过批准。在下一个线程配置和挂钩注册（例如新会话或重新启动）时会获取新的授权。当前会话继续讨论 Codex 的记忆决定。

使用 `openclaw approvals get --gateway` 检查授权，并使用 `openclaw approvals set --gateway --file <file>` 通过编辑 `agents.<agentId>.mcpTools` 撤销授权。撤销也会在下一个 preparation/registration. 上生效。当服务器保存在本机配置中时，Codex 还可以保留自己的批准；如果存在的话，单独撤销。有关文档形状和 export/edit 工作流程，请参阅 [MCP 工具 grants](/tools/exec-approvals#mcp-tool-grants)。

对于通过 Slack 按钮进行批准交付，请参阅 Slack](/channels/slack/rich-messages#native-approvals-in-slack) 中的 [ 本机批准。

当操作员拒绝 MCP 工具批准时，Codex 仅向模型报告其通用的“用户拒绝 MCP 工具调用”；补救措施显示在操作员卡上，而不是模型上。

可选的 `codex` 块是仅适用于 Codex 应用程序服务器线程的 OpenClaw 投影元数据；它不会更改 ACP 会话、通用 Codex harness配置或其他运行时适配器。使用非空 `codex.agents` 将服务器仅投影到特定的 OpenClaw 代理 ID 中。空的、空白的或无效的代理列表会被配置验证拒绝，并被运行时投影路径忽略，而不是成为全局的。在将本机 `mcp_servers` 配置传递给 Codex 之前，OpenClaw 会剥离 `codex` 元数据。

### <a id="common-server-recipes"></a> 常见服务器配方

这些示例只会保存服务器定义。之后，运行 `openclaw mcp doctor --probe` 来证明服务器已启动并暴露了工具。

<Tabs>
  <Tab id="filesystem" title="文件系统">
    ```bash
    openclaw mcp add files \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-filesystem \
      --arg "$HOME/Documents" \
      --include 'read_file,list_directory,search_files'
    openclaw mcp doctor files --probe
    ```

    将文件系统服务器的作用范围限制在代理应读取或编辑的最小目录树内。

  </Tab>
  <Tab id="memory" title="记忆">
    ```bash
    openclaw mcp add memory \
      --command npx \
      --arg -y \
      --arg @modelcontextprotocol/server-memory
    openclaw mcp probe memory --json
    ```

    如果服务器暴露了不应提供给普通代理的写入工具，请使用工具过滤。

  </Tab>
  <Tab id="local-script" title="本地脚本">
    ```bash
    openclaw mcp add local-tools \
      --command node \
      --arg ./dist/mcp-server.js \
      --cwd /srv/openclaw-tools \
      --env API_BASE=https://internal.example
    openclaw mcp status --verbose
    ```

    `doctor` 会检查 `cwd` 是否存在，以及是否可以从已配置的环境中解析该命令。

  </Tab>
  <Tab id="remote-http" title="远程 HTTP">
    ```bash
    openclaw mcp add docs \
      --url https://mcp.example.com/mcp \
      --transport streamable-http \
      --auth oauth \
      --oauth-scope docs.read \
      --timeout 20 \
      --connect-timeout 5 \
      --include 'search,read_*'
    openclaw mcp doctor docs --probe
    ```

    当远程服务器支持 OAuth 时请使用它。如果服务器需要静态请求头，请避免提交字面量 bearer token。

  </Tab>
  <Tab title="Desktop/CUA">
    ```bash
    openclaw mcp set cua-driver '{"command":"cua-driver","args":["mcp"]}'
    openclaw mcp tools cua-driver --include 'list_apps,get_window_state,click,type_text'
    openclaw mcp doctor cua-driver --probe
    ```

    直接桌面控制服务器继承它们启动的进程的权限。使用窄工具过滤器和 OS- 级别权限提示。

  </Tab>
</Tabs>
