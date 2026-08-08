---
summary: "将 Agent Plugins、Codex、Claude 和 Cursor 捆绑包安装并作为 OpenClaw 插件使用"
read_when:
  - 你想安装兼容 Agent Plugins、Codex、Claude 或 Cursor 的捆绑包
  - 你需要了解 OpenClaw 如何将捆绑包内容映射为原生功能
  - 你正在调试捆绑包检测或缺失的功能
title: "插件捆绑包"
---

OpenClaw 可以从四个外部生态系统安装插件：与供应商无关的
[**Agent Plugins**](https://agent-plugins.org) 标准，以及 **Codex**、
**Claude** 和 **Cursor**。这些被称为**捆绑包**——OpenClaw 会将其中的内容和元数据
包映射为技能、钩子和 MCP 工具等原生功能。

<Info>
  Bundles **并不**等同于原生 OpenClaw 插件。原生插件在进程内运行，
  并且可以注册任意能力。Bundles 是内容包，采用选择性的功能映射，
  且信任边界更窄。
</Info>

## 为什么存在 bundles

许多实用的插件以 Agent Plugins、Codex、Claude 或 Cursor 格式发布。OpenClaw 无需作者将它们重写为原生 OpenClaw 插件，而是会识别这些格式，并将其中受支持的内容映射到原生功能集。你可以安装 Agent Plugins 软件包、Claude 命令包或 Codex 技能捆绑包，并立即使用。

## 安装 Bundle

<Steps>
  <Step title="从目录、压缩包或市场安装">
    ```bash
    # 本地目录
    openclaw plugins install ./my-bundle

    # 压缩包
    openclaw plugins install ./my-bundle.tgz

    # Claude 市场
    openclaw plugins marketplace list <source>
    openclaw plugins install <plugin> --marketplace <source>
    ```

    `<source>` 是本地市场路径/仓库，或 git/GitHub 源。

  </Step>

  <Step title="验证检测结果">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    Bundle 会显示 `Format: bundle`，以及值为
    `agent (Agent Plugins)`、`codex`、`claude` 或 `cursor` 的 `Bundle format:`。

  </Step>

  <Step title="重启并使用">
    ```bash
    openclaw gateway restart
    ```

    已映射的功能（skills、hooks、MCP 工具、LSP 默认值）将在下一个会话中可用。

  </Step>
</Steps>

## OpenClaw 从 bundle 中映射了什么

并不是所有 bundle 功能今天都能在 OpenClaw 中运行。下面说明哪些可用，以及哪些已被检测到但尚未接通。

### 目前支持

| 功能          | 映射方式                                                                                          | 适用范围       |
| ------------- | ------------------------------------------------------------------------------------------------- | -------------- |
| Skill 内容    | Bundle skill roots 会作为普通 OpenClaw skill 加载                                                 | 所有格式       |
| 命令          | `commands/` 和 `.cursor/commands/` 会被视为 skill roots                                              | Claude、Cursor |
| Hook 包       | OpenClaw 风格的 `HOOK.md` + `handler.ts` 布局                                                     | Codex          |
| MCP 工具      | Bundle MCP 配置会合并到嵌入式 OpenClaw 设置中；支持的 stdio 和 HTTP 服务器会被加载                 | 所有格式       |
| 环境变量契约  | `PLUGIN_ROOT` 和 `PLUGIN_DATA` 环境变量，以及对 stdio MCP 服务器的占位符展开                       | Agent Plugins  |
| LSP 服务器    | Claude `.lsp.json` 和 manifest 声明的 `lspServers` 会合并到嵌入式 OpenClaw LSP 默认值中             | Claude         |
| 设置          | Claude `settings.json` 会作为嵌入式 OpenClaw 默认设置导入                                            | Claude         |

#### Skill 内容

- Bundle skill roots 会作为普通 OpenClaw skill roots 加载。
- Claude 的 `commands/` roots 会被视为额外的 skill roots。
- Cursor 的 `.cursor/commands/` roots 会被视为额外的 skill roots。

Claude markdown 命令文件和 Cursor 命令 markdown 都通过
正常的 OpenClaw skill 加载器工作。

#### Hook 包

Bundle hook roots 只有在使用正常的 OpenClaw hook-pack
布局时才会工作：`HOOK.md` 加上 `handler.ts` 或 `handler.js`。目前这主要
适用于 Codex 兼容场景。

#### 嵌入式 OpenClaw 的 MCP

- 已启用的 bundle 可以提供 MCP server 配置。
- OpenClaw 会将 bundle 的 MCP 配置合并到生效的嵌入式 OpenClaw
  设置中，作为 `mcpServers`。
- OpenClaw 在嵌入式 OpenClaw agent 执行期间，通过启动 stdio 服务器或连接到 HTTP 服务器来暴露受支持的 bundle MCP 工具。
- `coding` 和 `messaging` 工具配置文件默认包含 bundle MCP 工具；如需为某个 agent 或 gateway 排除它们，可使用 `tools.deny: ["bundle-mcp"]`。
- 项目本地的嵌入式 agent 设置仍会在 bundle 默认值之后生效，因此在需要时，workspace 设置可以覆盖 bundle 的 MCP 条目。
- Bundle MCP 工具目录在注册前会进行确定性排序，因此上游 `listTools()` 顺序变化不会导致 prompt-cache 的工具块抖动。

##### 传输方式

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

**HTTP** 连接到正在运行的 MCP 服务器，默认使用 `sse`，除非
请求的是 `streamable-http`：

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
- `type: "http"` 是 CLI 原生的下游结构；在 OpenClaw 配置中请使用 `transport: "streamable-http"`。`openclaw mcp set` 和 `openclaw doctor --fix` 会规范化这个常见别名。
- 只允许 `http:` 和 `https:` URL 协议。
- `headers` 的值支持 `${ENV_VAR}` 插值。
- 同时包含 `command` 和 `url` 的服务器条目会被拒绝。
- URL 凭据（userinfo 和 query params）会在工具
  描述和日志中被脱敏。
- `connectionTimeoutMs` 会覆盖 stdio 和 HTTP 传输的默认 30 秒连接超时。请求超时默认是 60 秒，
  也可以通过 `requestTimeoutMs` 覆盖。

##### 工具命名

OpenClaw 会以 `serverName__toolName` 的形式为 bundle MCP 工具注册适配提供方的安全名称。例如，一个键名为 `"vigil-harbor"` 且暴露 `memory_search` 工具的服务器，会注册为 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 之外的字符会被替换为 `-`。
- 以非字母开头的片段会添加字母前缀，因此像 `12306` 这样的数字服务器键会变成 provider-safe 的工具前缀。
- 服务器前缀最长限制为 30 个字符。
- 完整工具名最长限制为 64 个字符。
- 空服务器名会回退为 `mcp`。
- 冲突的已清理名称会通过数字后缀来消歧。
- 最终暴露的工具顺序会按安全名称确定性排序，从而保持重复的嵌入式 agent 轮次具有缓存稳定性。
- 配置文件过滤会将某个 bundle MCP 服务器中的每个工具都视为由 `bundle-mcp` 插件拥有，因此配置文件的允许/拒绝列表可以引用单个暴露工具名或 `bundle-mcp` 插件键。

#### 嵌入式 OpenClaw 设置

当 bundle 启用时，Claude `settings.json` 会作为默认的嵌入式 OpenClaw 设置导入。OpenClaw 在应用之前会对 shell 覆盖键进行清理：

- `shellPath`
- `shellCommandPrefix`

#### 嵌入式 OpenClaw LSP

- 已启用的 Claude bundle 可以提供 LSP server 配置。
- OpenClaw 会加载 `.lsp.json` 以及 manifest 中声明的任何 `lspServers` 路径。
- Bundle LSP 配置会合并到生效的嵌入式 OpenClaw LSP
  默认值中。
- 目前只有受支持的、基于 stdio 的 LSP 服务器可以运行；不支持的
  传输方式仍会显示在 `openclaw plugins inspect <id>` 中。

### 已检测但未执行

这些内容可以识别并显示在诊断中，但 OpenClaw 不会运行它们：

- Claude `agents`、`hooks/hooks.json` 自动化、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex `.app.json` 中除能力报告之外的元数据。

## Bundle 格式

<AccordionGroup>
  <Accordion title="Agent Plugins 包">
    标记：包根目录中的 `plugin.json`，遵循
    [Agent Plugins 1.0.0 标准](https://agent-plugins.org)

    可选内容：`skills/`、`mcp.json`

    格式行为：

    - 清单是严格 JSON（不是 JSON5）。OpenClaw 要求非空的
      `name`；清单中的其他字段均为可选，未知字段会被忽略
    - `skills/` 的直接子目录中，包含 `SKILL.md` 的会作为技能加载；不包含该文件的子目录会
      跳过并发出警告，且不会扫描更深层的目录
    - `mcp.json` 必须声明 1.0.0 `$schema`，且只能包含一个 `mcpServers` 对象；
      支持 `stdio`、`streamable-http` 和旧版 `sse` 传输
    - stdio 服务器启动时，其环境中会包含 `PLUGIN_ROOT`（插件根目录）和
      `PLUGIN_DATA`（OpenClaw 在其状态目录下为每个插件创建的持久化数据目录）；
      `${PLUGIN_ROOT}` 和 `${PLUGIN_DATA}` 占位符会在 `args`、`env` 值和
      `cwd` 中进行单次展开
    - stdio `command` 必须是裸可执行文件名，或插件内以 `./` 开头的相对路径；
      `cwd` 必须位于 `PLUGIN_ROOT` 或 `PLUGIN_DATA` 内
    - 无效的 `mcp.json` 会通过诊断信息禁用该插件的 MCP，但技能仍会继续加载；
      无效的单个服务器条目会被跳过
    - 此格式不会读取 `.mcp.json`（点号前缀）和内联清单中的 `mcpServers`；
      以该标准的封闭式架构为准
    - OpenClaw 会读取 `extensions["ai.openclaw"]`；目前支持具有与其他 bundle
      清单相同语义的 `activation`
    - 其他清单扩展命名空间会被忽略，并保留给其客户端使用
    - 反向域名客户端目录会被忽略并保留

  </Accordion>

  <Accordion title="Codex 包">
    标记：`.codex-plugin/plugin.json`

    可选内容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    当 Codex 包使用 skill 根目录和 OpenClaw 风格的 hook-pack 目录
    （`HOOK.md` + `handler.ts`）时，它们与 OpenClaw 的契合度最佳。

  </Accordion>

  <Accordion title="Claude 包">
    两种检测模式：

    - **基于清单：** `.claude-plugin/plugin.json`
    - **无清单：** 默认 Claude 布局（`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`.lsp.json`、`settings.json`）

    Claude 特定行为：

    - `commands/` 被视为技能内容
    - `settings.json` 会导入到嵌入式 OpenClaw 设置中（shell 覆盖键会被清理）
    - `.mcp.json` 会将受支持的 stdio 工具暴露给嵌入式 OpenClaw
    - `.lsp.json` 以及清单中声明的 `lspServers` 路径会加载到嵌入式 OpenClaw 的 LSP 默认配置中
    - 检测到 `hooks/hooks.json`，但不会执行
    - 清单中的自定义组件路径是附加式的；它们会扩展默认值，而不是替换默认值

  </Accordion>

  <Accordion title="Cursor 包">
    标记：`.cursor-plugin/plugin.json`

    可选内容：`skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 会被视为技能内容
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 仅用于检测，不会执行

  </Accordion>
</AccordionGroup>

## 检测优先级

OpenClaw 会先检查原生插件格式：

1. `openclaw.plugin.json` 或带有 `openclaw.extensions` 的有效 `package.json` - 视为**原生插件**
2. 客户端特定的包标记（`.codex-plugin/`、`.cursor-plugin/`、`.claude-plugin/`）- 视为该格式的**软件包**
3. 根目录下的 `plugin.json` - 视为 **Agent Plugins 软件包**
4. 默认的无清单 Claude 布局（`skills/`、`commands/`、`.mcp.json` 等）- 视为 **Claude 软件包**

如果一个软件包同时包含客户端特定标记和根目录下的 `plugin.json`，
则优先使用客户端特定格式，以保留其更丰富的映射（命令、钩子、
设置）。如果一个目录同时包含原生清单和软件包标记，OpenClaw 将使用原生路径。
这样可以防止双格式软件包被以软件包形式部分安装。

## 运行时依赖和清理

- 第三方兼容包不会进行启动时的 `npm install` 修复。它们应通过 `openclaw plugins install` 安装，并在已安装的插件目录中带上所需的一切。
- OpenClaw 自有的捆绑插件要么以轻量形式随核心包发布，要么可通过插件安装器下载。Gateway 启动时绝不会为它们运行包管理器。
- `openclaw doctor --fix` 会移除过期的本地捆绑插件安装记录，并且当配置仍然引用它们时，能够恢复在本地插件索引中缺失的可下载插件。

## 安全

Bundle 的信任边界比原生插件更窄：

- OpenClaw **不会** 在进程内加载任意 bundle 运行时模块。
- Skills 和 hook-pack 路径必须保持在插件根目录内（会进行边界检查）。
- 设置文件的读取也采用相同的边界检查。
- 支持的 stdio MCP 服务器可能会作为子进程启动。

这使得 bundle 默认更安全，但你仍应将第三方
bundle 视为其所暴露功能的受信任内容。

## 故障排查

<AccordionGroup>
  <Accordion title="已检测到 Bundle，但能力未运行">
    运行 `openclaw plugins inspect <id>`。如果某个能力已列出但标记为
    not wired，这属于产品限制，而不是安装损坏。
  </Accordion>

  <Accordion title="Claude 命令文件未显示">
    确保 bundle 已启用，并且 markdown 文件位于检测到的
    `commands/` 或 `skills/` 根目录中。
  </Accordion>

  <Accordion title="Claude 设置未生效">
    仅支持来自 `settings.json` 的内嵌 OpenClaw settings。OpenClaw 不会将
    bundle settings 视为原始配置补丁。
  </Accordion>

  <Accordion title="Claude hooks 未执行">
    `hooks/hooks.json` 仅用于检测。如果你需要可运行的 hooks，请使用
    OpenClaw hook-pack 布局或提供原生插件。
  </Accordion>
</AccordionGroup>

## 相关内容

- [安装和配置插件](/tools/plugin)
- [构建插件](/plugins/building-plugins) - 创建原生插件
- [插件清单](/plugins/manifest) - 原生清单模式。
