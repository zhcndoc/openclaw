---
summary: "将 Codex、Claude 和 Cursor 兼容的捆绑包作为 OpenClaw 插件安装"
read_when:
  - 你想安装一个 Codex、Claude 或 Cursor 兼容的捆绑包
  - 你需要了解 OpenClaw 会执行捆绑包的哪些功能
  - 你正在调试捆绑包检测、MCP 工具、LSP 默认值或缺失的能力
title: "插件捆绑包"
doc-schema-version: 1
---

插件捆绑包使 OpenClaw 能够复用兼容的 Codex、Claude 和 Cursor 插件布局，而无需将它们作为原生 OpenClaw 运行时模块加载。当你已有一个现成捆绑包，并需要安装它、验证 OpenClaw 如何对其分类，以及了解哪些部分会成为 OpenClaw 技能、钩子、MCP 工具、设置或诊断时，请使用此页面。

<Info>
  捆绑包不是原生 OpenClaw 插件。原生插件在进程内运行，并且可以直接注册 OpenClaw 能力。捆绑包是内容和元数据包，OpenClaw 会选择性地将其映射到受支持的界面。
</Info>

## 选择合适的插件格式

当你已经有一个 Codex、Claude 或 Cursor 兼容的包，并希望 OpenClaw 将其受支持的内容映射为技能、钩子包、MCP 工具、设置或 LSP 默认值，而无需将其重写为原生插件时，请使用捆绑包。当集成必须注册通道、提供者、服务、HTTP 路由、Gateway 方法、插件拥有的 CLI 命令或其他运行时能力时，请构建原生 OpenClaw 插件。

| 需要                                                                                     | 使用          |
| ---------------------------------------------------------------------------------------- | ------------- |
| 复用兼容生态中的技能、命令 markdown、MCP 配置或 LSP 默认值                               | 捆绑包        |
| 在 OpenClaw 中执行任意插件运行时代码                                                     | 原生插件      |
| 发布完整的 OpenClaw 能力                                                                 | 原生插件      |
| 移植现有的 Claude 或 Cursor 命令包                                                       | 捆绑包        |

有关原生插件编写，请参阅 [构建插件](/plugins/building-plugins)；有关主要安装流程，请参阅 [插件](/tools/plugin)。

## 安装并验证捆绑包

<Steps>
  <Step title="安装捆绑包">
    从本地目录、压缩包或受支持的市场源安装：

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

  <Step title="检查检测结果">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    兼容的捆绑包会显示为 `Format: bundle`，并带有 `codex`、`claude` 或 `cursor` 子类型。

  </Step>

  <Step title="重启 Gateway">
    ```bash
    openclaw gateway restart
    ```

    安装或更新插件代码后需要重启 Gateway。

  </Step>
</Steps>

## OpenClaw 从 bundles 中映射了什么

并非所有捆绑包功能今天都能在 OpenClaw 中运行。OpenClaw 会将受支持的内容映射到原生界面，并在插件诊断中报告仅检测但不执行的内容。

### 目前支持

| 功能          | 映射方式                                                                                     | 适用范围        |
| ------------- | -------------------------------------------------------------------------------------------- | --------------- |
| 技能内容      | 捆绑包的技能根目录会作为普通 OpenClaw 技能加载                                               | 所有格式        |
| 命令          | `commands/` 和 `.cursor/commands/` 会被视为技能根目录                                         | Claude, Cursor  |
| 钩子包        | OpenClaw 风格的 `HOOK.md` 以及 `handler.ts` 或 `handler.js` 布局                             | 主要为 Codex    |
| MCP 工具      | 捆绑包 MCP 配置会合并到嵌入式 Pi 设置中；受支持的 stdio 和 HTTP 服务器会加载                 | 所有格式        |
| LSP 服务器    | Claude 的 `.lsp.json` 和清单中声明的 `lspServers` 会合并到嵌入式 Pi LSP 默认值中              | Claude          |
| 设置          | Claude 的 `settings.json` 在移除 shell 覆盖键后会作为嵌入式 Pi 默认值导入                    | Claude          |

### 技能内容

捆绑包的技能根目录会像普通 OpenClaw 技能根目录一样加载。Claude 的 `commands/` 和 Cursor 的 `.cursor/commands/` 也通过相同路径加载。

### 钩子包

捆绑包钩子根目录**仅在**使用普通 OpenClaw 钩子包布局时运行：`HOOK.md` 搭配 `handler.ts` 或 `handler.js`。目前这主要适用于 Codex 兼容的情况。

### MCP 工具

启用的捆绑包可以将 MCP 服务器配置作为 `mcpServers` 贡献给嵌入式 Pi。受支持的 stdio 和 HTTP 服务器可在嵌入式 Pi 轮次中暴露工具。`coding` 和 `messaging` 工具配置文件默认包含捆绑包 MCP 工具；若要对某个代理或 Gateway 排除它，请使用 `tools.deny: ["bundle-mcp"]`。

### 嵌入式 Pi 设置

当捆绑包启用时，Claude 的 `settings.json` 会作为默认嵌入式 Pi 设置导入。OpenClaw 会在应用它们之前移除 shell 覆盖键。

### 嵌入式 Pi LSP

Claude 的 `.lsp.json` 和清单中声明的 `lspServers` 会合并到嵌入式 Pi LSP 默认值中。受支持的基于 stdio 的 LSP 服务器可以运行。

### 已检测但不执行

OpenClaw 会在诊断中报告这些内容，但不会运行它们：

- Claude `agents`、`hooks/hooks.json`、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex 应用或内联元数据

## 捆绑包格式和检测

OpenClaw 会先检查原生插件标记，再检查捆绑包标记。包含 `openclaw.plugin.json` 或有效 `package.json` 中 `openclaw.extensions` 条目的目录会被视为原生插件，即使它也包含捆绑包文件。这可以防止双格式包通过捆绑包路径被部分加载。

在原生检测之后，OpenClaw 会识别以下捆绑包布局：

<AccordionGroup>
  <Accordion title="Codex bundles">
    标记：`.codex-plugin/plugin.json`

    支持的映射内容：`skills/`、`hooks/`、`.mcp.json`，以及 `.app.json`
    能力报告。

    当 Codex 捆绑包使用技能根目录和 OpenClaw 风格的钩子包目录时，它们最适合 OpenClaw。

  </Accordion>

  <Accordion title="Claude bundles">
    检测模式：

    - **基于清单：** `.claude-plugin/plugin.json`
    - **无清单：** 默认 Claude 布局，包含 `skills/`、`commands/`、
      `agents/`、`hooks/hooks.json`、`.mcp.json`、`.lsp.json` 或
      `settings.json`

    支持的映射内容：`skills/`、`commands/`、`settings.json`、
    `.mcp.json`、`.lsp.json`、清单中声明的 `mcpServers`，以及
    清单中声明的 `lspServers`。

    仅检测内容：`agents`、`hooks/hooks.json` 和 `outputStyles`。

  </Accordion>

  <Accordion title="Cursor bundles">
    标记：`.cursor-plugin/plugin.json`

    支持的映射内容：`skills/`、`.cursor/commands/` 和 `.mcp.json`。

    仅检测内容：`.cursor/agents`、`.cursor/hooks.json` 和
    `.cursor/rules`。

  </Accordion>
</AccordionGroup>

Claude 清单组件路径是可叠加的。声明自定义路径会扩展捆绑包中已存在的默认路径，而不是替换它们。

## MCP 配置参考

捆绑包 MCP 工具使用合成插件键 `bundle-mcp` 进行配置文件筛选。若要对某个代理或 Gateway 排除它，请拒绝该键：

```json5
{
  tools: {
    deny: ["bundle-mcp"],
  },
}
```

项目本地的嵌入式 Pi 设置在捆绑包默认值之后仍然适用，因此在需要时工作区设置可以覆盖捆绑包 MCP 条目。

### MCP 配置形状

捆绑包 MCP 文件可以使用 `mcpServers`、`servers` 或顶层服务器映射。stdio 服务器会启动一个子进程：

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": { "PORT": "3000" }
    }
  }
}
```

HTTP 服务器默认通过 `sse` 连接，或在请求时通过 `streamable-http` 连接：

```json
{
  "mcpServers": {
    "my-server": {
      "url": "http://localhost:3100/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer local-dev-token"
      },
      "connectionTimeoutMs": 30000
    }
  }
}
```

规则：

- `transport` 可以是 `"sse"` 或 `"streamable-http"`。如果省略，OpenClaw
  会使用 `sse`。
- `type: "http"` 是 CLI 原生的下游别名。捆绑包配置中优先使用
  `transport: "streamable-http"`；`openclaw mcp set` 和
  `openclaw doctor --fix` 会规范化该别名。
- 仅支持 `http:` 和 `https:` URL。
- `headers` 必须是一个 JSON 对象，其值需兼容字符串。
- 带有 `command` 的服务器条目会被视为 stdio。带有 `url` 且没有 command 的服务器条目会被视为 HTTP。
- URL 凭据，包括 userinfo 和查询参数，会从工具描述和日志中脱敏。
- `connectionTimeoutMs` 会覆盖 stdio 和 HTTP 传输的默认 30 秒连接超时。

为了保证 stdio 启动安全，不支持的环境变量条目会被忽略并给出诊断信息，而不会被直接透传。

### MCP 路径和工具名称

基于文件的 MCP 配置会相对于声明它的捆绑包文件进行解析。显式的相对 `command`、`args`、`cwd` 和 `workingDirectory` 值会按该文件所在目录展开。Claude 捆绑包配置还可以使用 `${CLAUDE_PLUGIN_ROOT}` 来引用捆绑包根目录。

OpenClaw 会使用对提供者安全的名称注册捆绑包 MCP 工具：

```text
serverName__toolName
```

命名规则：

- `A-Za-z0-9_-` 之外的字符会变成 `-`。
- 服务器前缀必须以字母开头；数字服务器键会加上 `mcp-`
  前缀。
- 空服务器名称会回退为 `mcp`。
- 服务器前缀最长为 30 个字符。
- 完整工具名称最长为 64 个字符。
- 冲突的规范化名称会附加数字后缀。
- 暴露的工具会按安全名称确定性排序，以便重复的 Pi 轮次
  保持稳定的工具块。
- 配置文件允许列表和拒绝列表可以指定单个暴露工具或
  `bundle-mcp` 插件键。

## 嵌入式 Pi 设置和 LSP 默认值

已启用的 Claude 包可以为嵌入式 Pi 运行时提供 `settings.json` 默认值。OpenClaw 会先于项目本地设置应用这些设置，然后清理 shell 覆盖键，以便包或工作区设置无法更改 shell 执行行为。

清理后的键：

- `shellPath`
- `shellCommandPrefix`

已启用的 Claude 包还可以通过 `.lsp.json` 或清单中声明的 `lspServers` 提供 LSP 服务器配置。OpenClaw 会将这些条目合并到嵌入式 Pi 的 LSP 默认值中。支持基于 stdio 的 LSP 服务器可以运行；不受支持的服务器条目仍会显示在 `openclaw plugins inspect <id>` 诊断信息中。

## 运行时依赖和清理

第三方兼容包不会在启动时进行 `npm install` 修复。请使用 `openclaw plugins install` 安装它们，并将它们所需的所有运行时文件打包到已安装的插件目录中。

OpenClaw 自带的捆绑插件要么作为核心中的轻量组件随程序发布，要么可通过插件安装器下载。Gateway 启动时不会为它们运行包管理器。`openclaw doctor --fix` 可以移除旧的分阶段依赖目录，并恢复那些配置引用了但本地插件索引中缺失的可下载插件。

## 安全边界

包的运行时边界比原生插件更窄：

- OpenClaw 不会在进程内加载任意包运行时模块。
- skill 根目录、hook-pack 路径、设置文件、MCP 文件和 LSP 文件都会经过插件根边界检查读取。
- OpenClaw 风格的 hook-pack 必须保留在插件根目录内。
- 支持的基于 stdio 的 MCP 服务器仍然可以启动子进程。

请将第三方包视为其所暴露的映射功能的可信内容，尤其是 MCP 服务器和 hook-pack。

## 故障排查

| 症状                                         | 检查                                                                            | 修复                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 功能已列出但不运行                            | 运行 `openclaw plugins inspect <id>`，检查它是否被标记为未接入                 | 这是当前产品限制，不是安装损坏                                                               |
| Claude 命令文件没有显示为技能                 | 检查 markdown 文件是否位于 `commands/` 中，或位于声明的命令路径下               | 将文件移动到已检测到的 `commands/` 或 `skills/` 根目录下，启用该包并重启                    |
| Claude `settings.json` 未生效                 | 检查该包是否已启用，并查看诊断信息                                             | 仅会导入嵌入式 Pi 设置；shell 覆盖键会被移除                                                  |
| Claude hooks 不执行                          | 检查该包是否只包含 `hooks/hooks.json`                                           | 使用 OpenClaw hook-pack 布局，或提供一个原生插件                                              |

## 相关内容

- [Plugins](/tools/plugin) - 安装、配置和排查插件问题
- [管理插件](/plugins/manage-plugins) - 常见插件 CLI 示例
- [插件清单](/plugins/plugin-inventory) - 生成的捆绑插件和外部插件列表
- [插件清单文件](/plugins/manifest) - 原生插件清单 schema
- [构建插件](/plugins/building-plugins) - 创建原生插件
