我会严格保留原始 markdown 结构，只翻译可见文本内容；先快速检查是否有仓库级说明会影响这段内容，然后直接给出译文。---
summary: "将 Codex、Claude 和 Cursor bundle 作为 OpenClaw 插件安装并使用"
read_when:
  - 你想安装一个兼容 Codex、Claude 或 Cursor 的 bundle
  - 你需要了解 OpenClaw 如何将 bundle 内容映射为原生功能
  - 你正在排查 bundle 检测或缺失能力的问题
title: "插件 bundles"
---

OpenClaw 可以从三个外部生态系统安装插件：**Codex**、**Claude**
和 **Cursor**。这些被称为 **bundles** —— 内容和元数据包，OpenClaw 会
将它们映射为技能、hooks 和 MCP 工具等原生功能。

<Info>
  Bundles **并不**等同于原生 OpenClaw 插件。原生插件在进程内运行，
  并且可以注册任意能力。Bundles 是内容包，采用选择性的功能映射，
  且信任边界更窄。
</Info>

## 为什么存在 bundles

许多有用的插件都以 Codex、Claude 或 Cursor 格式发布。OpenClaw 不要求作者将它们重写为原生 OpenClaw 插件，而是检测这些格式并将其支持的内容映射到原生功能集中。这意味着你可以安装 Claude 命令包或 Codex 技能 bundle，并立即使用。

## 安装 bundle

<Steps>
  <Step title="从目录、压缩包或市场安装">
    ```bash
    # 本地目录
    openclaw plugins install ./my-bundle

    # 压缩包
    openclaw plugins install ./my-bundle.tgz

    # Claude 市场
    openclaw plugins marketplace list <marketplace-name>
    openclaw plugins install <plugin-name>@<marketplace-name>
    ```

  </Step>

  <Step title="验证检测结果">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    Bundles 会显示为 `Format: bundle`，子类型为 `codex`、`claude` 或 `cursor`。

  </Step>

  <Step title="重启并使用">
    ```bash
    openclaw gateway restart
    ```

    已映射的功能（skills、hooks、MCP 工具、LSP 默认值）将在下一个会话中可用。

  </Step>
</Steps>

## OpenClaw 从 bundles 中映射了什么

并不是所有 bundle 功能今天都能在 OpenClaw 中运行。下面说明哪些可用，以及哪些已被检测到但尚未接通。

### 目前支持

| Feature       | How it maps                                                                                       | Applies to     |
| ------------- | ------------------------------------------------------------------------------------------------- | -------------- |
| Skill content | Bundle skill roots 作为普通 OpenClaw skills 加载                                                 | All formats    |
| Commands      | `commands/` 和 `.cursor/commands/` 被视为 skill roots                                        | Claude, Cursor |
| Hook packs    | OpenClaw 风格的 `HOOK.md` + `handler.ts` 布局                                                   | Codex          |
| MCP tools     | Bundle MCP 配置合并到嵌入式 OpenClaw 设置中；支持的 stdio 和 HTTP 服务器会被加载 | All formats    |
| LSP servers   | Claude `.lsp.json` 和 manifest 中声明的 `lspServers` 合并到嵌入式 OpenClaw LSP 默认值中  | Claude         |
| Settings      | Claude `settings.json` 导入为嵌入式 OpenClaw 默认值                                     | Claude         |

#### Skill content

- bundle skill roots 作为普通 OpenClaw skill roots 加载
- Claude `commands` roots 会被视为额外的 skill roots
- Cursor `.cursor/commands` roots 会被视为额外的 skill roots

这意味着 Claude 的 markdown 命令文件会通过正常的 OpenClaw skill 加载器运行。Cursor 命令 markdown 也通过同一路径运行。

#### Hook packs

- bundle hook roots **仅在**使用标准 OpenClaw hook-pack 布局时有效。当前主要是 Codex 兼容场景：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### 嵌入式 OpenClaw 的 MCP

- 启用的 bundles 可以贡献 MCP 服务器配置
- OpenClaw 会将 bundle MCP 配置合并到生效的嵌入式 OpenClaw 设置中，键名为 `mcpServers`
- OpenClaw 会在嵌入式 OpenClaw agent 回合中，通过启动 stdio 服务器或连接 HTTP 服务器来暴露支持的 bundle MCP 工具
- `coding` 和 `messaging` 工具配置文件默认包含 bundle MCP 工具；对 agent 或 gateway 使用 `tools.deny: ["bundle-mcp"]` 可将其排除
- 项目本地的嵌入式 agent 设置仍会在 bundle 默认值之后生效，因此工作区设置可以在需要时覆盖 bundle MCP 条目
- bundle MCP 工具目录在注册前会以确定性顺序排序，因此上游 `listTools()` 顺序变化不会扰动提示缓存中的工具块

##### 传输方式

MCP 服务器可以使用 stdio 或 HTTP 传输：

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

**HTTP** 默认通过 `sse` 连接到正在运行的 MCP 服务器，或在需要时使用 `streamable-http`：

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

- `transport` 可以设置为 `"streamable-http"` 或 `"sse"`；如果省略，OpenClaw 使用 `sse`
- `type: "http"` 是 CLI 原生的下游形态；在 OpenClaw 配置中使用 `transport: "streamable-http"`。`openclaw mcp set` 和 `openclaw doctor --fix` 会规范化这个常见别名。
- 只允许 `http:` 和 `https:` URL scheme
- `headers` 的值支持 `${ENV_VAR}` 插值
- 同时包含 `command` 和 `url` 的服务器条目会被拒绝
- URL 凭据（userinfo 和 query 参数）会在工具描述和日志中被脱敏
- `connectionTimeoutMs` 会覆盖 stdio 和 HTTP 传输的默认 30 秒连接超时

##### 工具命名

OpenClaw 会以 `serverName__toolName` 的形式为 bundle MCP 工具注册适配提供方的安全名称。例如，一个键名为 `"vigil-harbor"` 且暴露 `memory_search` 工具的服务器，会注册为 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 之外的字符会被替换为 `-`
- 以非字母开头的片段会被加上字母前缀，因此像 `12306` 这样的数字服务器键会变成提供方安全的工具前缀
- 服务器前缀最长为 30 个字符
- 完整工具名最长为 64 个字符
- 空服务器名会回退为 `mcp`
- 经过清理后发生冲突的名称会通过数字后缀进行区分
- 最终暴露的工具顺序会按安全名称确定性排序，以保持重复嵌入式 agent 回合中的缓存稳定
- 配置文件过滤会将同一个 bundle MCP 服务器中的所有工具视为由插件 `bundle-mcp` 拥有，因此配置文件的 allowlist 和 deny list 可以包含单个暴露的工具名，也可以包含 `bundle-mcp` 插件键

#### 嵌入式 OpenClaw 设置

- 启用的 Claude bundles 可以贡献 LSP 服务器配置
- OpenClaw 会在应用之前清理 shell 覆盖键

清理后的键：

- `shellPath`
- `shellCommandPrefix`

#### 嵌入式 OpenClaw LSP

- 已启用的 Claude bundles 可以贡献 LSP 服务器配置
- OpenClaw 会加载 `.lsp.json` 以及任何 manifest 中声明的 `lspServers` 路径
- bundle LSP 配置会合并到生效的嵌入式 OpenClaw LSP 默认值中
- 目前只有受支持的、基于 stdio 的 LSP 服务器可以运行；不受支持的传输方式仍会显示在 `openclaw plugins inspect <id>` 中

### 已检测但未执行

这些内容可以识别并显示在诊断中，但 OpenClaw 不会运行它们：

- Claude `agents`、`hooks.json` 自动化、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex 的内联/应用元数据，超出能力报告范围的部分

## Bundle 格式

<AccordionGroup>
  <Accordion title="Codex bundles">
    标记：`.codex-plugin/plugin.json`

    可选内容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    当 Codex bundles 使用 skill roots 和 OpenClaw 风格的 hook-pack 目录
    （`HOOK.md` + `handler.ts`）时，它们与 OpenClaw 的契合度最佳。

  </Accordion>

  <Accordion title="Claude bundles">
    两种检测模式：

    - **基于 manifest：** `.claude-plugin/plugin.json`
    - **无 manifest：** 默认 Claude 布局（`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`.lsp.json`、`settings.json`）

    Claude 特定行为：

    - `commands/` 会被视为 skill content
    - `settings.json` 会导入到嵌入式 OpenClaw 设置中（shell 覆盖键会被清理）
    - `.mcp.json` 会将受支持的 stdio 工具暴露给嵌入式 OpenClaw
    - `.lsp.json` 以及 manifest 中声明的 `lspServers` 路径会加载到嵌入式 OpenClaw LSP 默认值中
    - `hooks/hooks.json` 会被检测到，但不会执行
    - manifest 中的自定义组件路径是叠加式的（它们扩展默认值，而不是替换默认值）

  </Accordion>

  <Accordion title="Cursor bundles">
    标记：`.cursor-plugin/plugin.json`

    可选内容：`skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 会被视为 skill content
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 仅用于检测，不会执行

  </Accordion>
</AccordionGroup>

## 检测优先级

OpenClaw 会先检查原生插件格式：

1. `openclaw.plugin.json` 或包含 `openclaw.extensions` 的有效 `package.json` —— 视为 **native plugin**
2. Bundle 标记（`.codex-plugin/`、`.claude-plugin/`，或默认 Claude/Cursor 布局）—— 视为 **bundle**

如果一个目录同时包含两者，OpenClaw 会使用原生路径。这样可以防止双格式包被作为 bundle 部分安装。

## 运行时依赖和清理

- 第三方兼容 bundles 不会在启动时通过 `npm install` 修复。它们应通过 `openclaw plugins install` 安装，并在已安装的插件目录中提供所需的一切。
- OpenClaw 自带的 bundled 插件要么以轻量形式随核心一起发布，要么可通过插件安装器下载。Gateway 启动时绝不会为它们运行包管理器。
- `openclaw doctor --fix` 会移除旧的暂存依赖目录，并且在配置引用缺失于本地插件索引中的可下载插件时，可以恢复这些插件。

## 安全

Bundle 的信任边界比原生插件更窄：

- OpenClaw **不会**在进程内加载任意 bundle 运行时模块
- Skills 和 hook-pack 路径必须位于插件根目录内（会进行边界检查）
- Settings 文件会使用相同的边界检查读取
- 支持的 stdio MCP 服务器可能会作为子进程启动

这使得 bundle 默认更安全，但你仍应将第三方
bundle 视为其所暴露功能的受信任内容。

## 故障排查

<AccordionGroup>
  <Accordion title="Bundle is detected but capabilities do not run">
    运行 `openclaw plugins inspect <id>`。如果某个 capability 被列出但标记为
    not wired，这属于产品限制——不是安装损坏。
  </Accordion>

  <Accordion title="Claude command files do not appear">
    确保 bundle 已启用，并且 markdown 文件位于检测到的
    `commands/` 或 `skills/` 根目录中。
  </Accordion>

  <Accordion title="Claude settings do not apply">
    仅支持来自 `settings.json` 的内嵌 OpenClaw settings。OpenClaw 不会将
    bundle settings 视为原始配置补丁。
  </Accordion>

  <Accordion title="Claude hooks do not execute">
    `hooks/hooks.json` 仅用于检测。如果你需要可运行的 hooks，请使用
    OpenClaw hook-pack 布局或提供原生插件。
  </Accordion>
</AccordionGroup>

## 相关内容

- [Install and Configure Plugins](/tools/plugin)
- [Building Plugins](/plugins/building-plugins) — 创建原生插件
- [Plugin Manifest](/plugins/manifest) — 原生 manifest schema
