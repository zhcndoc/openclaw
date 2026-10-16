---
summary: "将 Agent Plugins、Codex、Claude 和 Cursor 捆绑包安装并作为 OpenClaw 插件使用"
read_when:
  - "你想安装兼容 Agent Plugins、Codex、Claude 或 Cursor 的捆绑包"
  - "你需要了解 OpenClaw 如何将捆绑包内容映射为原生功能"
  - "你正在调试捆绑包检测或缺失的功能"
title: "插件捆绑包"
---

OpenClaw 可以安装四种外部格式的插件：供应商中立的 [**Agent 插件**](https://agent-plugins.org) 标准，加上 **Codex**， **Claude** 和 **Cursor**。这些称为 **bundles** - OpenClaw 映射到本机功能（如技能、挂钩和 MCP 工具）的内容和元数据包。

<Info>
  Bundles **并不**等同于原生 OpenClaw 插件。原生插件在进程内运行， 并且可以注册任意能力。Bundles 是内容包，采用选择性的功能映射， 且信任边界更窄。
</Info>

## <a id="why-bundles-exist"></a> 为什么存在 bundles

许多实用的插件以 Agent Plugins、Codex、Claude 或 Cursor 格式发布。OpenClaw 无需作者将它们重写为原生 OpenClaw 插件，而是会识别这些格式，并将其中受支持的内容映射到原生功能集。你可以安装 Agent Plugins 软件包、Claude 命令包或 Codex 技能捆绑包，并立即使用。

## <a id="install-a-bundle"></a> 安装 Bundle

<Steps>
  <Step id="install-from-a-directory%2C-archive%2C-or-marketplace" title="从目录、存档或市场安装">
    ```bash
    # Local directory
    openclaw plugins install ./my-bundle

    # Archive
    openclaw plugins install ./my-bundle.tgz

    # Claude marketplace
    openclaw plugins marketplace list <source>
    openclaw plugins install <plugin> --marketplace <source>
    ```

    `<source>` 是本地市场 path/repo 或 git/GitHub 源。

  </Step>

  <Step id="verify-detection" title="验证检测">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    捆绑包显示 `Format: bundle` 加上 `Bundle format:` 值 `agent (Agent Plugins)`、`codex`、`claude` 或 `cursor`。

  </Step>

  <Step id="use-the-bundle" title="使用捆绑包">
    <a id="restart-and-use" />
    安装适用于正在运行的本地网关，无需重新启动它。如果网关已停止，请将其启动。请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。映射的功能（技能、挂钩、MCP 工具、LSP 默认值）将在下一个会话中提供。

  </Step>
</Steps>

## <a id="what-openclaw-maps-from-bundles"></a> OpenClaw 从 bundle 中映射了什么

并非所有捆绑功能都可以在 OpenClaw 中运行。这是有效的以及检测到但未连接的内容。

### <a id="supported-now"></a> 目前支持

| 功能                  | 映射方式                                                                                       | 适用于     |
| ------------------------ | ------------------------------------------------------------------------------------------------- | -------------- |
| Skill 内容            | Bundle skill roots 会作为普通 OpenClaw skill 加载                                                 | 所有格式    |
| 命令                 | `commands/` 和 `.cursor/commands/` 会被视为 skill roots                                        | Claude，光标 |
| 代理和输出样式 | Claude `agents/` 和 `output-styles/` 被视为技能根                                      | Claude         |
| 钩包               | OpenClaw-样式 `HOOK.md` + `handler.ts` 布局                                                   | Claude, Codex  |
| MCP 工具                | Bundle MCP 配置会合并到嵌入式 OpenClaw 设置中；支持的 stdio 和 HTTP 服务器会被加载 | 所有格式    |
| 环境变量契约             | `PLUGIN_ROOT` 和 `PLUGIN_DATA` 环境变量，以及对 stdio MCP 服务器的占位符展开         | 代理插件  |
| LSP 服务器              | Claude `.lsp.json` 和 manifest 声明的 `lspServers` 会合并到嵌入式 OpenClaw LSP 默认值中  | Claude         |
| 设置                 | Claude `settings.json` 会作为嵌入式 OpenClaw 默认设置导入                                     | Claude         |

#### <a id="skill-content"></a> Skill 内容

- Bundle skill roots 会作为普通 OpenClaw skill roots 加载。
- Claude `commands/`、`agents/` 和 `output-styles/` 根被视为附加技能根。
- Cursor 的 `.cursor/commands/` roots 会被视为额外的 skill roots。

Claude markdown 命令文件和 Cursor 命令 markdown 都通过正常的 OpenClaw skill 加载器工作。

#### <a id="hook-packs"></a> Hook 包

捆绑包钩子根是集合目录。将每个钩子的`HOOK.md`和`handler.ts`或`handler.js`放在自己的子目录中，例如`hooks/my-hook/`，并将`hooks/`声明为根。直接声明钩子的叶目录不会加载它。

插件检查将这些钩子包与检测到的 JSON 自动化分开列出。 Claude `hooks/hooks.json` 保留在声明的功能中，但不会显示为受支持的挂钩。包含两种布局的捆绑包保留其 OpenClaw 挂钩包。检查不会执行处理程序或证明正在运行的网关已加载它们。

#### <a id="embedded-openclaw-settings"></a> 嵌入式 OpenClaw 设置

当 bundle 启用时，Claude `settings.json` 会作为默认的嵌入式 OpenClaw 设置导入。OpenClaw 在应用之前会对 shell 覆盖键进行清理：

- `shellPath`
- `shellCommandPrefix`

#### <a id="embedded-openclaw-lsp"></a> 嵌入式 OpenClaw LSP

- 已启用的 Claude bundle 可以提供 LSP server 配置。
- OpenClaw 会加载 `.lsp.json` 以及 manifest 中声明的任何 `lspServers` 路径。
- Bundle LSP 配置会合并到生效的嵌入式 OpenClaw LSP 默认值中。
- 运行时工具白名单可以选择具有 `bundle-lsp`、`group:plugins` 或匹配的 `lsp_*` 名称和 glob 的捆绑包 LSP 工具。每个独立的限制都必须允许该工具。
- 仅支持 stdio 支持的 LSP 服务器可运行；不支持的传输仍然出现在 `openclaw plugins inspect <id>` 中。
- 取消轮次或压缩会取消挂起的 LSP 启动、停止其他服务器启动，并清理该操作已获取的服务器。

### <a id="detected-but-not-executed"></a> 已检测但未执行

这些内容可以识别并显示在诊断中，但 OpenClaw 不会运行它们：

- Claude `hooks/hooks.json` 自动化
- 光标 `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex `.app.json` 中除能力报告之外的元数据。

## <a id="mcp-for-embedded-openclaw"></a> MCP 用于嵌入式 OpenClaw

- 已启用的 bundle 可以提供 MCP server 配置。
- Stdio 命令默认其工作目录为插件配置目录。远程 HTTP 服务器不接收隐式工作目录。
- OpenClaw 会将 bundle 的 MCP 配置合并到生效的嵌入式 OpenClaw 设置中，作为 `mcpServers`。
- OpenClaw 在嵌入式 OpenClaw 代理轮流期间通过启动 stdio 服务器或连接到 HTTP 服务器来公开受支持的捆绑包 MCP 工具。
- `coding` 和 `messaging` 工具配置文件默认包含 bundle MCP 工具；如需为某个 agent 或 gateway 排除它们，可使用 `tools.deny: ["bundle-mcp"]`。
- 项目本地的嵌入式 agent 设置仍会在 bundle 默认值之后生效，因此在需要时，workspace 设置可以覆盖 bundle 的 MCP 条目。
- Bundle MCP 工具目录在注册之前按固定顺序排序，因此上游 `listTools()` 顺序更改不会影响提示缓存工具块。

### <a id="transports"></a> 运输

MCP 服务器可以使用 stdio 或 HTTP 传输。

**Stdio** 会启动一个子进程：

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "command": "node",
        "args": ["server.js"],
        "env": { "PORT": "3000" }
      }
    }
  }
}
```

**HTTP** 连接到正在运行的 MCP 服务器，默认使用 `sse`，除非请求的是 `streamable-http`：

```json
{
  "mcp": {
    "servers": {
      "my-server": {
        "url": "http://localhost:3100/mcp",
        "transport": "streamable-http",
        "headers": {
          "Authorization": "Bearer ${MY_SECRET_TOKEN}"
        },
        "connectionTimeoutMs": 30000
      }
    }
  }
}
```

- `transport` 接受 `"streamable-http"` 或 `"sse"`；如果省略则默认是 `sse`。
- `type: "http"` 是 CLI-native 下游形状；在 OpenClaw 配置中使用 `transport: "streamable-http"`。 `openclaw mcp set` 和 `openclaw doctor --fix` 对公共别名进行规范化。
- 只允许 `http:` 和 `https:` URL 协议。
- `headers` 的值支持 `${ENV_VAR}` 插值。
- 同时包含 `command` 和 `url` 的服务器条目会被拒绝。
- URL 凭据（userinfo 和 query params）会在工具描述和日志中被脱敏。
- `connectionTimeoutMs` 会覆盖 stdio 和 HTTP 传输的默认 30 秒连接超时。请求超时默认为 60 秒，可以使用 `requestTimeoutMs` 覆盖。会话开始时的工具列表 （`tools/list`） 在设置时使用 `requestTimeoutMs`，否则为 10 秒。

### <a id="tool-naming"></a> 工具命名

OpenClaw 会以 `serverName__toolName` 的形式为 bundle MCP 工具注册适配提供方的安全名称。例如，一个键名为 `"vigil-harbor"` 且暴露 `memory_search` 工具的服务器，会注册为 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 之外的字符会被替换为 `-`。
- 以非字母开头的片段会添加字母前缀，因此像 `12306` 这样的数字服务器键会变成 provider-safe 的工具前缀。
- 服务器前缀最长限制为 30 个字符。
- 完整工具名最长限制为 64 个字符。
- 空服务器名会回退为 `mcp`。
- 冲突的已清理名称会通过数字后缀来消歧。
- 最终公开的工具顺序按安全名称排序，保持重复的嵌入式代理轮流缓存稳定。
- 配置文件过滤将来自一个捆绑包 MCP 服务器的每个工具视为 `bundle-mcp` 拥有的插件，因此配置文件 allow/deny 列表可以引用单独的公开工具名称或 `bundle-mcp` 插件密钥。

## <a id="bundle-formats"></a> Bundle 格式

<AccordionGroup>
  <Accordion id="agent-plugins-bundles" title="代理插件捆绑包">
    标记：包根目录中的 `plugin.json`，遵循 [Agent Plugins 1.0.0 标准](https://agent-plugins.org)

    可选内容：`skills/`、`mcp.json`

    格式行为：

    - 清单是严格 JSON（不是 JSON5）。OpenClaw 要求非空的 `name`；清单中的其他字段均为可选，未知字段会被忽略
    - `skills/` 的直接子目录中，包含 `SKILL.md` 的会作为技能加载；不包含该文件的子目录会跳过并发出警告，且不会扫描更深层的目录
    - `mcp.json` 必须声明 1.0.0 `$schema`，且只能包含一个 `mcpServers` 对象； 支持 `stdio`、`streamable-http` 和旧版 `sse` 传输
    - stdio 服务器启动时，其环境中会包含 `PLUGIN_ROOT`（插件根目录）和 `PLUGIN_DATA`（OpenClaw 在其状态目录下为每个插件创建的持久化数据目录）； `${PLUGIN_ROOT}` 和 `${PLUGIN_DATA}` 占位符会在 `args`、`env` 值和 `cwd` 中进行单次展开
    - A stdio `command` 必须是裸露的可执行文件名称或 `./`- 插件内的相对路径； `cwd` 必须留在 `PLUGIN_ROOT` 或 `PLUGIN_DATA` 内
    - 无效的 `mcp.json` 会通过诊断信息禁用该插件的 MCP，但技能仍会继续加载； 无效的单个服务器条目会被跳过
    - `.mcp.json`（点前缀）和内联清单 `mcpServers` 是 **not** 以此格式读取；标准的封闭模式获胜
    - OpenClaw 读取为 `extensions["ai.openclaw"]`；它仅支持 `activation` ，其语义与其他捆绑清单相同
    - 其他清单扩展命名空间会被忽略，并保留给其客户端使用
    - 反向域名客户端目录会被忽略并保留

  </Accordion>

  <Accordion id="codex-bundles" title="Codex 捆绑包">
    标记：`.codex-plugin/plugin.json`

    可选内容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    当 Codex 捆绑包使用技能根和 OpenClaw- 样式挂钩包目录 （`HOOK.md` + `handler.ts`） 时，最适合 OpenClaw。

  </Accordion>

  <Accordion id="claude-bundles" title="Claude 捆绑包">
    两种检测模式：

    - **基于清单：** `.claude-plugin/plugin.json`
    - **无清单：** 默认 Claude 布局（`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`.lsp.json`、`settings.json`）

    `output-styles/` 不是检测标记。唯一内容为 `output-styles/` 的捆绑包不会被识别为 Claude 捆绑包。添加`.claude-plugin/plugin.json`或上面的标记之一，这样检测就成功了。检测在清单加载之前运行，因此未检测到的目录永远不会到达下面的组件路径。

    Claude-具体行为：

    - `commands/`、`agents/`、`output-styles/`视为技能内容
    - `settings.json` 会导入到嵌入式 OpenClaw 设置中（shell 覆盖键会被清理）
    - `.mcp.json` 会将受支持的 stdio 工具暴露给嵌入式 OpenClaw
    - `.lsp.json` 以及清单中声明的 `lspServers` 路径会加载到嵌入式 OpenClaw 的 LSP 默认配置中
    - 检测到 `hooks/hooks.json`，但不会执行
    - 清单中的自定义组件路径是附加式的；它们会扩展默认值，而不是替换默认值

  </Accordion>

  <Accordion id="cursor-bundles" title="光标束">
    标记：`.cursor-plugin/plugin.json`

    可选内容：`skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 会被视为技能内容
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 仅用于检测，不会执行

  </Accordion>
</AccordionGroup>

## <a id="detection-precedence"></a> 检测优先级

OpenClaw 会先检查原生插件格式：

1. `openclaw.plugin.json` 或带有 `openclaw.extensions` 的有效 `package.json` - 视为 **native 插件**
2. 客户端特定的包标记（`.codex-plugin/`、`.cursor-plugin/`、`.claude-plugin/`）- 视为该格式的**软件包**
3. 根目录下的 `plugin.json` - 视为 **Agent Plugins 软件包**
4. 默认的无清单 Claude 布局（`skills/`、`commands/`、`.mcp.json` 等）- 视为 **Claude 软件包**

如果一个软件包同时包含客户端特定标记和根目录下的 `plugin.json`， 则优先使用客户端特定格式，以保留其更丰富的映射（命令、钩子、 设置）。如果一个目录同时包含原生清单和软件包标记，OpenClaw 将使用原生路径。 这样可以防止双格式软件包被以软件包形式部分安装。

## <a id="runtime-dependencies-and-cleanup"></a> 运行时依赖和清理

- 第三方兼容包不会进行启动时的 `npm install` 修复。它们应通过 `openclaw plugins install` 安装，并在已安装的插件目录中带上所需的一切。
- OpenClaw- 拥有的捆绑插件要么是轻量级的核心，要么可以通过插件安装程序下载。网关启动从不为它们运行包管理器。
- `openclaw doctor --fix` 会移除过期的本地捆绑插件安装记录，并且当配置仍然引用它们时，能够恢复在本地插件索引中缺失的可下载插件。

## <a id="security"></a> 安全

Bundle 的信任边界比原生插件更窄：

- OpenClaw **不会** 在进程内加载任意 bundle 运行时模块。
- Skills 和 hook-pack 路径必须保持在插件根目录内（会进行边界检查）。
- 设置文件的读取也采用相同的边界检查。
- 支持的 stdio MCP 服务器可能会作为子进程启动。

这使得 bundle 默认更安全，但你仍应将第三方 bundle 视为其所暴露功能的受信任内容。

## <a id="troubleshooting"></a> 故障排查

<AccordionGroup>
  <Accordion id="bundle-is-detected-but-capabilities-do-not-run" title="检测到捆绑包，但功能未运行">
    运行 `openclaw plugins inspect <id>`。如果某个能力已列出但标记为 not wired，这属于产品限制，而不是安装损坏。
  </Accordion>

  <Accordion id="claude-command-agent-or-output-style-files-do-not-appear" title="Claude 命令、代理或输出样式文件不出现">
    确保捆绑包已启用，并且 Markdown 文件位于检测到的 `skills/`、`commands/`、`agents/` 或 `output-styles/` 根目录内。所有四个都通过相同的技能加载器加载。
  </Accordion>

  <Accordion id="claude-settings-do-not-apply" title="Claude 设置不适用">
    仅支持来自 `settings.json` 的内嵌 OpenClaw settings。OpenClaw 不会将 bundle settings 视为原始配置补丁。
  </Accordion>

  <Accordion id="claude-hooks-do-not-execute" title="Claude 挂钩不执行">
    `hooks/hooks.json` 仅用于检测。如果你需要可运行的 hooks，请使用 OpenClaw hook-pack 布局或提供原生插件。
  </Accordion>
</AccordionGroup>

## <a id="related"></a> 相关内容

- [安装和配置 Plugins](/tools/plugin)
- [Building Plugins](/plugins/building-plugins) - 创建本机插件
- [Plugin Manifest](/plugins/manifest) - 本机清单架构
