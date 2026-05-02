---
summary: "将 Codex、Claude 和 Cursor bundle 作为 OpenClaw 插件安装和使用"
read_when:
  - 你想安装一个兼容 Codex、Claude 或 Cursor 的 bundle
  - 你需要了解 OpenClaw 如何将 bundle 内容映射为原生功能
  - 你正在排查 bundle 检测或缺失能力问题
title: "插件 bundles"
---

OpenClaw 可以从三个外部生态系统安装插件：**Codex**、**Claude**
和 **Cursor**。这些被称为 **bundles** —— 内容和元数据包，
OpenClaw 会将其映射为原生功能，例如 skills、hooks 和 MCP tools。

<Info>
  Bundles **并不** 等同于原生 OpenClaw 插件。原生插件在进程内运行，
  可以注册任意能力。Bundles 是内容包，采用选择性的功能映射，并且
  信任边界更窄。
</Info>

## 为什么需要 bundles

许多有用的插件以 Codex、Claude 或 Cursor 格式发布。与其要求作者将
它们重写为原生 OpenClaw 插件，OpenClaw 不如直接检测这些格式，并将
其支持的内容映射到原生功能集合中。这意味着你可以安装一个 Claude
命令包或一个 Codex skill bundle，并立即使用它。

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

    映射后的功能（skills、hooks、MCP tools、LSP defaults）会在下一次会话中可用。

  </Step>
</Steps>

## OpenClaw 从 bundles 中映射了什么

并不是每一种 bundle 功能今天都能在 OpenClaw 中运行。下面列出了
当前可用的内容，以及已检测到但尚未接入的内容。

### 目前支持

| 功能          | 映射方式                                                                                    | 适用范围       |
| ------------- | ------------------------------------------------------------------------------------------- | -------------- |
| Skill 内容    | Bundle 的 skill roots 作为普通 OpenClaw skills 加载                                            | 所有格式       |
| Commands      | `commands/` 和 `.cursor/commands/` 视为 skill roots                                           | Claude, Cursor |
| Hook packs    | OpenClaw 风格的 `HOOK.md` + `handler.ts` 布局                                                  | Codex          |
| MCP tools     | Bundle 的 MCP 配置合并到嵌入式 Pi 设置中；支持的 stdio 和 HTTP servers 会被加载                    | 所有格式       |
| LSP servers   | Claude 的 `.lsp.json` 和清单中声明的 `lspServers` 合并到嵌入式 Pi 的 LSP defaults 中           | Claude         |
| Settings      | Claude 的 `settings.json` 导入为嵌入式 Pi defaults                                               | Claude         |

#### Skill 内容

- bundle 的 skill roots 会作为普通 OpenClaw skill roots 加载
- Claude 的 `commands` roots 会被视为额外的 skill roots
- Cursor 的 `.cursor/commands` roots 会被视为额外的 skill roots

这意味着 Claude 的 markdown 命令文件会通过正常的 OpenClaw skill loader
生效。Cursor 的命令 markdown 也会通过同一路径生效。

#### Hook packs

- bundle 的 hook roots **仅在**它们使用普通 OpenClaw hook-pack 布局时才有效
  。目前这主要是 Codex 兼容的情况：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### Pi 的 MCP

- 已启用的 bundles 可以贡献 MCP server 配置
- OpenClaw 会将 bundle 的 MCP 配置合并到有效的嵌入式 Pi 设置中，作为
  `mcpServers`
- OpenClaw 会在嵌入式 Pi agent 回合期间，通过启动 stdio servers 或连接
  HTTP servers，暴露受支持的 bundle MCP tools
- `coding` 和 `messaging` 工具配置文件默认包含 bundle MCP tools；如需对
  agent 或 gateway 关闭它们，可使用 `tools.deny: ["bundle-mcp"]`
- 项目本地的 Pi 设置仍会在 bundle defaults 之后生效，因此在需要时，
  workspace 设置可以覆盖 bundle 的 MCP 条目
- 为了保持 prompt-cache tool blocks 稳定，bundle MCP 工具目录在注册前会按
  确定性顺序排序，因此上游 `listTools()` 顺序变化不会引起抖动

##### 传输方式

MCP servers 可以使用 stdio 或 HTTP 传输：

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

**HTTP** 默认通过 `sse` 连接到正在运行的 MCP server，或者在请求时使用
`streamable-http`：

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

- `transport` 可以设置为 `"streamable-http"` 或 `"sse"`；若省略，OpenClaw
  使用 `sse`
- `type: "http"` 是 CLI 原生的下游形状；在 OpenClaw 配置中请使用
  `transport: "streamable-http"`。`openclaw mcp set` 和 `openclaw doctor --fix`
  会规范化这个常见别名。
- 只允许 `http:` 和 `https:` URL schemes
- `headers` 的值支持 `${ENV_VAR}` 插值
- 同时包含 `command` 和 `url` 的 server 条目会被拒绝
- URL 凭据（userinfo 和 query params）会在工具描述和日志中被脱敏
- `connectionTimeoutMs` 会覆盖 stdio 和 HTTP 传输的默认 30 秒连接超时

##### 工具命名

OpenClaw 会使用 provider-safe 名称注册 bundle MCP tools，格式为
`serverName__toolName`。例如，一个键为 `"vigil-harbor"`、暴露
`memory_search` 工具的 server 会注册为 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 之外的字符会被替换为 `-`
- server 前缀最长为 30 个字符
- 完整工具名最长为 64 个字符
- 空的 server 名称会回退为 `mcp`
- 冲突的清理后名称会通过数字后缀进行区分
- 最终暴露的工具顺序会按安全名称确定性排序，以保持重复的 Pi 回合缓存稳定
- profile 过滤会将某个 bundle MCP server 的所有工具视为由 `bundle-mcp`
  这个插件拥有，因此 profile 的 allowlist 和 deny list 可以包含单个暴露的
  工具名，或 `bundle-mcp` 插件键

#### 嵌入式 Pi 设置

- 当 bundle 启用时，Claude 的 `settings.json` 会作为默认的嵌入式 Pi 设置导入
- OpenClaw 在应用 shell override keys 前会先进行清理

清理后的键：

- `shellPath`
- `shellCommandPrefix`

#### 嵌入式 Pi LSP

- 已启用的 Claude bundles 可以贡献 LSP server 配置
- OpenClaw 会加载 `.lsp.json` 以及清单中声明的任意 `lspServers` 路径
- bundle 的 LSP 配置会合并到有效的嵌入式 Pi LSP defaults 中
- 目前只有受支持的、基于 stdio 的 LSP servers 可以运行；不受支持的
  传输方式仍会显示在 `openclaw plugins inspect <id>` 中

### 已检测但不执行

这些内容会被识别并显示在诊断信息中，但 OpenClaw 不会运行它们：

- Claude `agents`、`hooks.json` automation、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex 内联 / 应用元数据，除能力报告之外的内容

## Bundle 格式

<AccordionGroup>
  <Accordion title="Codex bundles">
    标记：`.codex-plugin/plugin.json`

    可选内容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    当 Codex bundles 使用 skill roots 和 OpenClaw 风格的 hook-pack 目录
    （`HOOK.md` + `handler.ts`）时，与 OpenClaw 的兼容性最好。

  </Accordion>

  <Accordion title="Claude bundles">
    两种检测模式：

    - **基于清单：** `.claude-plugin/plugin.json`
    - **无清单：** 默认 Claude 布局（`skills/`、`commands/`、`agents/`、
      `hooks/`、`.mcp.json`、`.lsp.json`、`settings.json`）

    Claude 特定行为：

    - `commands/` 会被视为 skill 内容
    - `settings.json` 会导入到嵌入式 Pi 设置中（shell override keys 会被清理）
    - `.mcp.json` 会将受支持的 stdio tools 暴露给嵌入式 Pi
    - `.lsp.json` 加上清单中声明的 `lspServers` 路径会加载到嵌入式 Pi 的 LSP defaults 中
    - `hooks/hooks.json` 会被检测到，但不会执行
    - 清单中的自定义组件路径是增量式的（它们扩展默认值，而不是替换默认值）

  </Accordion>

  <Accordion title="Cursor bundles">
    标记：`.cursor-plugin/plugin.json`

    可选内容：`skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 会被视为 skill 内容
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 仅检测，不执行

  </Accordion>
</AccordionGroup>

## 检测优先级

OpenClaw 会先检查原生插件格式：

1. `openclaw.plugin.json` 或带有有效 `openclaw.extensions` 的 `package.json` —— 视为 **原生插件**
2. Bundle 标记（`.codex-plugin/`、`.claude-plugin/`，或默认 Claude/Cursor 布局）—— 视为 **bundle**

如果一个目录同时包含两者，OpenClaw 会使用原生路径。这可以防止
双格式包被部分安装为 bundles。

## 运行时依赖和清理

- 第三方兼容 bundle 不会在启动时执行 `npm install` 修复。它们应该通过 `openclaw plugins install` 安装，并将所需内容随插件一起提供在已安装的插件目录中。
- OpenClaw 自有的打包插件要么随核心以轻量形式提供，要么可通过插件安装器下载。Gateway 启动时绝不会为它们运行包管理器。
- `openclaw doctor --fix` 会移除旧的分阶段依赖目录，并且可以安装本地插件索引中缺失的已配置可下载插件。

## 安全性

Bundles 的信任边界比原生插件更窄：

- OpenClaw 不会在进程内加载任意 bundle 运行时模块
- Skills 和 hook-pack 路径必须保留在插件根目录内（会进行边界检查）
- Settings 文件会使用相同的边界检查进行读取
- 支持的 stdio MCP servers 可能会作为子进程启动

这使得 bundles 默认更安全，但你仍然应该将第三方 bundles 视为
其所暴露功能范围内的受信任内容。

## 故障排查

<AccordionGroup>
  <Accordion title="已检测到 Bundle，但能力未运行">
    运行 `openclaw plugins inspect <id>`。如果某个能力已列出但标记为
    未连接（not wired），这属于产品限制，而不是安装损坏。
  </Accordion>

  <Accordion title="Claude 命令文件未出现">
    请确保 bundle 已启用，并且 markdown 文件位于已检测到的
    `commands/` 或 `skills/` 根目录中。
  </Accordion>

  <Accordion title="Claude 设置未生效">
    仅支持来自 `settings.json` 的内嵌 Pi 设置。OpenClaw 不会
    将 bundle 设置视为原始配置补丁。
  </Accordion>

  <Accordion title="Claude hooks 未执行">
    `hooks/hooks.json` 仅用于检测。如果你需要可运行的 hooks，请使用
    OpenClaw hook-pack 布局或提供一个原生插件。
  </Accordion>
</AccordionGroup>

## 相关内容

- [安装并配置插件](/tools/plugin)
- [构建插件](/plugins/building-plugins) — 创建一个原生插件
- [插件清单](/plugins/manifest) — 原生 manifest 规范
