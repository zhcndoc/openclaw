---
summary: "安装并使用 Codex、Claude 和 Cursor 捆绑包作为 OpenClaw 插件"
read_when:
  - 你想安装一个兼容 Codex、Claude 或 Cursor 的捆绑包
  - 你需要了解 OpenClaw 如何将捆绑包内容映射到原生功能
  - 你正在调试捆绑包检测或缺失能力
title: "插件捆绑包"
---

OpenClaw 可以从三个外部生态系统安装插件：**Codex**、**Claude**，
以及 **Cursor**。这些被称为**捆绑包**——即内容和元数据包，
OpenClaw 会将其映射为技能、hooks 和 MCP 工具等原生功能。

<Info>
  捆绑包与原生 OpenClaw 插件**不**相同。原生插件在进程内运行
  并且可以注册任何功能。捆绑包是内容包，具有
  选择性功能映射和更窄的信任边界。
</Info>

## 为什么存在捆绑包

许多有用的插件以 Codex、Claude 或 Cursor 格式发布。OpenClaw
无需作者将它们重写为原生 OpenClaw 插件，而是
检测这些格式并将它们支持的内容映射到原生功能集。这意味着你可以安装 Claude 命令包或 Codex 技能捆绑包
并立即使用它。

## 安装捆绑包

<Steps>
  <Step title="从目录、归档或市场安装">
    ```bash
    # 本地目录
    openclaw plugins install ./my-bundle

    # 归档
    openclaw plugins install ./my-bundle.tgz

    # Claude 市场
    openclaw plugins marketplace list <marketplace-name>
    openclaw plugins install <plugin-name>@<marketplace-name>
    ```

  </Step>

  <Step title="验证检测">
    ```bash
    openclaw plugins list
    openclaw plugins inspect <id>
    ```

    捆绑包显示为 `Format: bundle`，子类型为 `codex`、`claude` 或 `cursor`。

  </Step>

  <Step title="重启并使用">
    ```bash
    openclaw gateway restart
    ```

    映射后的功能（技能、hooks、MCP 工具、LSP 默认值）会在下一次会话中可用。

  </Step>
</Steps>

## OpenClaw 从捆绑包映射的内容

并非每个捆绑包功能都能在 OpenClaw 中运行。以下是有效的内容以及
被检测但尚未连接的内容。

### 当前支持

| 功能       | 映射方式                                                                                 | 适用于     |
| ------------- | ------------------------------------------------------------------------------------------- | -------------- |
| 技能内容 | 捆绑包技能根目录作为普通 OpenClaw 技能加载                                           | 所有格式    |
| 命令      | `commands/` 和 `.cursor/commands/` 作为技能根目录处理                                  | Claude、Cursor |
| Hook 包    | OpenClaw 风格的 `HOOK.md` + `handler.ts` 布局                                             | Codex          |
| MCP 工具     | 捆绑包 MCP 配置合并到嵌入式 Pi 设置中；支持的 stdio 和 HTTP 服务器会被加载 | 所有格式    |
| LSP 服务器   | Claude `.lsp.json` 和清单中声明的 `lspServers` 合并到嵌入式 Pi LSP 默认值中  | Claude         |
| 设置       | Claude `settings.json` 导入为嵌入式 Pi 默认设置                                     | Claude         |

#### 技能内容

- 捆绑包技能根目录作为普通 OpenClaw 技能根目录加载
- Claude `commands` 根目录被视为额外技能根目录
- Cursor `.cursor/commands` 根目录被视为额外技能根目录

这意味着 Claude markdown 命令文件通过正常的 OpenClaw 技能
加载器工作。Cursor 命令 markdown 通过相同的路径工作。

#### Hook 包

- 捆绑包 Hook 根目录**仅**在它们使用普通 OpenClaw hook 包
  布局时有效。目前这主要是 Codex 兼容的情况：
  - `HOOK.md`
  - `handler.ts` 或 `handler.js`

#### 用于 Pi 的 MCP

- 启用的捆绑包可以提供 MCP 服务器配置
- OpenClaw 将捆绑包 MCP 配置合并到有效的嵌入式 Pi 设置中，作为
  `mcpServers`
- OpenClaw 在嵌入式 Pi 的 agent 回合中，通过
  启动 stdio 服务器或连接到 HTTP 服务器来公开受支持的捆绑包 MCP 工具
- `coding` 和 `messaging` 工具配置文件默认包含捆绑包 MCP 工具；
  对 agent 或 gateway 可使用 `tools.deny: ["bundle-mcp"]` 来退出
- 项目本地 Pi 设置在捆绑包默认值之后仍然生效，因此需要时工作区
  设置可以覆盖捆绑包 MCP 条目
- 捆绑包 MCP 工具目录在注册前会进行确定性排序，因此
  上游 `listTools()` 顺序变化不会导致 prompt-cache 工具块频繁变动

##### 传输方式

MCP 服务器可以使用 stdio 或 HTTP 传输：

**Stdio** 启动子进程：

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

**HTTP** 默认通过 `sse` 连接到运行中的 MCP 服务器，或在请求时使用 `streamable-http`：

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
- 仅允许 `http:` 和 `https:` URL 方案
- `headers` 值支持 `${ENV_VAR}` 插值
- 同时包含 `command` 和 `url` 的服务器条目会被拒绝
- URL 凭据（userinfo 和 query params）会从工具
  描述和日志中脱敏
- `connectionTimeoutMs` 会覆盖 stdio 和 HTTP 传输的默认 30 秒连接超时

##### 工具命名

OpenClaw 使用提供商安全的名称注册捆绑包 MCP 工具，形式为
`serverName__toolName`。例如，键为 `"vigil-harbor"` 的服务器暴露
`memory_search` 工具，注册为 `vigil-harbor__memory_search`。

- `A-Za-z0-9_-` 之外的字符会被替换为 `-`
- 服务器前缀最长为 30 个字符
- 完整工具名最长为 64 个字符
- 空服务器名回退为 `mcp`
- 冲突的清理后名称会通过数字后缀消歧
- 最终暴露的工具顺序按安全名称确定性排序，以保持重复 Pi
  回合的缓存稳定
- 配置文件过滤将一个 bundle MCP 服务器中的所有工具视为由插件
  `bundle-mcp` 拥有，因此配置文件允许列表和拒绝列表可以包含单个暴露工具名或
  `bundle-mcp` 插件键

#### 嵌入式 Pi 设置

- 当捆绑包启用时，Claude `settings.json` 作为默认嵌入式 Pi 设置导入
- OpenClaw 在应用之前清理 shell 覆盖键

清理的键：

- `shellPath`
- `shellCommandPrefix`

#### 嵌入式 Pi LSP

- 启用的 Claude 捆绑包可以贡献 LSP 服务器配置
- OpenClaw 会加载 `.lsp.json` 以及清单中声明的任何 `lspServers` 路径
- 捆绑包 LSP 配置会合并到有效的嵌入式 Pi LSP 默认值中
- 目前只有受支持的、基于 stdio 的 LSP 服务器可以运行；不受支持的
  传输方式仍会显示在 `openclaw plugins inspect <id>` 中

### 已检测但未执行

这些会被识别并在诊断中显示，但 OpenClaw 不运行它们：

- Claude `agents`、`hooks.json` 自动化、`outputStyles`
- Cursor `.cursor/agents`、`.cursor/hooks.json`、`.cursor/rules`
- Codex 内联/应用元数据，超出能力报告的部分

## 捆绑包格式

<AccordionGroup>
  <Accordion title="Codex 捆绑包">
    标记：`.codex-plugin/plugin.json`

    可选内容：`skills/`、`hooks/`、`.mcp.json`、`.app.json`

    当 Codex 捆绑包使用技能根目录和 OpenClaw 风格的
    hook 包目录（`HOOK.md` + `handler.ts`）时，最适合 OpenClaw。

  </Accordion>

  <Accordion title="Claude 捆绑包">
    两种检测模式：

    - **基于清单：** `.claude-plugin/plugin.json`
    - **无清单：** 默认 Claude 布局（`skills/`、`commands/`、`agents/`、`hooks/`、`.mcp.json`、`.lsp.json`、`settings.json`）

    Claude 特定行为：

    - `commands/` 会被视为技能内容
    - `settings.json` 会导入到嵌入式 Pi 设置中（shell 覆盖键会被清理）
    - `.mcp.json` 会将受支持的 stdio 工具公开给嵌入式 Pi
    - `.lsp.json` 以及清单中声明的 `lspServers` 路径会加载到嵌入式 Pi LSP 默认值中
    - `hooks/hooks.json` 会被检测但不执行
    - 清单中的自定义组件路径是追加式的（它们扩展默认值，而不是替换默认值）

  </Accordion>

  <Accordion title="Cursor 捆绑包">
    标记：`.cursor-plugin/plugin.json`

    可选内容：`skills/`、`.cursor/commands/`、`.cursor/agents/`、`.cursor/rules/`、`.cursor/hooks.json`、`.mcp.json`

    - `.cursor/commands/` 被视为技能内容
    - `.cursor/rules/`、`.cursor/agents/` 和 `.cursor/hooks.json` 仅检测

  </Accordion>
</AccordionGroup>

## 检测优先级

OpenClaw 首先检查原生插件格式：

1. `openclaw.plugin.json` 或包含 `openclaw.extensions` 的有效 `package.json` — 被视为**原生插件**
2. 捆绑包标记（`.codex-plugin/`、`.claude-plugin/` 或默认 Claude/Cursor 布局）— 被视为**捆绑包**

如果目录同时包含两者，OpenClaw 使用原生路径。这防止
双格式包被部分安装为捆绑包。

## Runtime dependencies and cleanup

- 捆绑插件运行时依赖随 OpenClaw 包一起发布在
  `dist/*` 下。OpenClaw 在启动时**不会**为捆绑插件运行 `npm install`；
  发布流水线负责提供完整的捆绑依赖负载（参见
  [发布](/reference/RELEASING) 中的发布后验证规则）。

## 安全性

捆绑包比原生插件具有更窄的信任边界：

- OpenClaw **不**在进程内加载任意捆绑包运行时模块
- 技能和 hook 包路径必须保持在插件根目录内（边界检查）
- 设置文件读取时进行相同的边界检查
- 支持的 stdio MCP 服务器可能作为子进程启动

这使得捆绑包默认更安全，但对于它们确实暴露的功能，你仍应将第三方
捆绑包视为受信任内容。

## 故障排查

<AccordionGroup>
  <Accordion title="捆绑包被检测到但功能不运行">
    运行 `openclaw plugins inspect <id>`。如果功能被列出但标记为
    未连接，那是产品限制 — 而不是安装损坏。
  </Accordion>

  <Accordion title="Claude 命令文件未出现">
    确保捆绑包已启用，并且 markdown 文件位于检测到的
    `commands/` 或 `skills/` 根目录内。
  </Accordion>

  <Accordion title="Claude 设置未应用">
    仅支持来自 `settings.json` 的嵌入式 Pi 设置。OpenClaw 不
    将捆绑包设置视为原始配置补丁。
  </Accordion>

  <Accordion title="Claude hooks 不执行">
    `hooks/hooks.json` 仅检测。如果你需要可运行的 hooks，请使用
    OpenClaw hook 包布局或发布原生插件。
  </Accordion>
</AccordionGroup>

## 相关内容

- [安装和配置插件](/tools/plugin)
- [构建插件](/plugins/building-plugins) — 创建原生插件
- [插件清单](/plugins/manifest) — 原生清单架构
