---
summary: "命名浏览器配置文件并通过 Chrome DevTools MCP 附加到正在运行的 Chrome 会话"
title: "多配置文件和现有会话附加"
read_when:
  - "您希望代理使用您登录的浏览器会话"
  - "您正在创建额外的命名浏览器配置文件"
  - "您需要 Chrome MCP 启动覆盖或现有会话限制"
---

## <a id="profiles-(multi-browser)"></a><a id="profiles-multi-browser"></a> 配置文件（多浏览器）

OpenClaw 支持多个命名配置文件（路由配置）。配置文件可以是：

- **openclaw-management**：基于 Chromium- 的专用浏览器实例，具有自己的用户数据目录 + CDP 端口
- **remote**：显式CDP URL（在其他地方运行的基于Chromium-的浏览器）
- **现有会话**：通过 Chrome DevTools MCP 自动连接的现有 Chrome 配置文件

默认值：

- 如果缺失，会自动创建 `openclaw` 配置文件。
- `user` 配置文件是内置的，用于 Chrome MCP 现有会话附加。
- 除了 `user` 外，现有会话配置文件均为可选；使用 `--driver existing-session` 创建它们。
- 本地 CDP 端口默认从 **18800-18899** 分配。
- 删除配置文件会将其本地数据目录移动到废纸篓。

所有控制端点都接受 `?profile=<name>`；CLI 使用 `--browser-profile`。

## <a id="existing-session-via-chrome-devtools-mcp"></a> 通过 Chrome DevTools MCP 使用现有会话

OpenClaw 还可以通过官方 Chrome DevTools MCP 服务器附加到正在运行的基于 Chromium- 的浏览器配置文件。这将重用该浏览器配置文件中已打开的选项卡和登录状态。

官方背景和设置参考：

- [Chrome 开发者版：在浏览器会话中使用 Chrome DevTools MCP](https://developer.chrome.com/blog/chrome-devtools-mcp-debug-your-browser-session)
- [镀铬 DevTools MCP README](https://github.com/ChromeDevTools/chrome-devtools-mcp)

内置配置文件：`user`。如果你希望使用不同的名称或浏览器数据目录，请创建自定义的现有会话配置文件。

默认情况下，内置 `user` 配置文件使用 Chrome MCP 自动连接，其目标是默认的本地 Google Chrome 配置文件。将 `userDataDir` 用于 Brave、Edge、Chromium 或非默认 Chrome 配置文件。 `~` 扩展到您的 OS 主目录：

```json5
{
  browser: {
    profiles: {
      brave: {
        driver: "existing-session",
        attachOnly: true,
        userDataDir: "~/Library/Application Support/BraveSoftware/Brave-Browser",
      },
    },
  },
}
```

然后在对应的浏览器中：

1. 打开该浏览器用于远程调试的 inspect 页面。
2. 启用远程调试。
3. 保持浏览器运行，并在 OpenClaw 连接时批准连接提示。

常见的 inspect 页面：

- Chrome: `chrome://inspect/#remote-debugging`
- Brave: `brave://inspect/#remote-debugging`
- 边缘：`edge://inspect/#remote-debugging`

实时连接冒烟测试：

```bash
openclaw browser --browser-profile user start
openclaw browser --browser-profile user status
openclaw browser --browser-profile user tabs
openclaw browser --browser-profile user snapshot --format ai
```

成功时的表现：

- `status` 显示：`driver: existing-session`
- `status` 显示：`transport: chrome-mcp`
- `status` 显示：`running: true`
- `tabs` 列出你已经打开的浏览器标签页
- `snapshot` 返回所选实时标签页中的 refs

如果连接无法工作，需要检查什么：

- 基于Chromium-的目标浏览器是版本`144+`
- 该浏览器的 inspect 页面中是否已启用远程调试
- 浏览器是否已显示并且你是否接受了附加连接提示
- 如果 Chrome 是通过显式的 `--remote-debugging-port` 启动的，请将 `browser.profiles.<name>.cdpUrl` 设置为该 DevTools 端点，而不要依赖 Chrome MCP 自动连接
- `openclaw doctor` 会迁移旧的基于扩展的浏览器配置，并检查默认自动连接配置文件所需的 Chrome 是否已在本地安装，但它无法替你在浏览器侧启用远程调试

对于启动失败，请检查 `browser/chrome-mcp` 日志中是否有有限的、经过编辑的子进程 stderr 尾部（如果可用）。

代理使用方式：

- 当你需要用户已登录的浏览器状态时，使用 `profile="user"`。
- 如果你使用自定义的现有会话配置文件，请传入那个明确的配置文件名称。
- 只有在用户就在电脑前并且可以批准附加提示时，才选择这种模式。
- 网关或节点主机在其自己的运行时（Node 或 Bun）上启动打包的 Chrome DevTools MCP 服务器。

注意：

- 这条路径比隔离的 `openclaw` 配置文件风险更高，因为它可以在你已登录的浏览器会话内执行操作。
- OpenClaw 不会为这个驱动启动浏览器；它只会进行附加。
- 停止附加或失败会关闭拥有的 MCP 子进程及其经过验证的子进程，而不是已运行的浏览器。更换附件等待清理；如果无法验证清理，OpenClaw 会报告错误，而不是将会话视为已关闭。
- OpenClaw 在这里使用官方的 Chrome DevTools MCP `--autoConnect` 流程。如果设置了 `userDataDir`，它会被传递过去，用于定位该用户数据目录。
- existing-session 可以在所选主机上附加，也可以通过已连接的 browser node 附加。如果 Chrome 在别处运行且没有连接 browser node， 请改用 remote CDP 或 node 主机。
- Chrome MCP 的目标和 snapshot refs 仅作用于一个 MCP 子进程。该进程重启后，请再次运行 `browser tabs`，在进行特定目标工作前显式选择新的目标， 并在使用 refs 前获取新的 snapshot。每个 ref 只对其对应的目标和最新快照有效。 即使 URL 相同，旧别名也不会转移到替换后的标签页。
- 启动快照刷新会使该选项卡的早期引用无效，即使刷新失败也是如此。条件等待重用当前文档快照并保留其引用。过时文档错误只会废弃该选项卡的快照；稍后的民意调查捕获了替换文档。导航后拍摄新快照，然后再执行另一个基于引用的操作。
- 带标签的屏幕截图可以包含多个帧中的控件。成功的捕获在返回之前从每个帧中删除临时标签。
- Chrome DevTools MCP 当前通过进程本地数字页面 ID 路由页面工具。进程范围的句柄可防止子进程替换之间的重用，但相邻工具调用之间的进程内浏览器上下文替换仍然可以重新定位操作。完全原子路由需要上游页面工具支持稳定的目标 ID。

### <a id="custom-chrome-mcp-launch"></a> 自定义 Chrome MCP 启动

OpenClaw包括一个精确固定的Chrome DevTools MCP 1.10.1与临时文档身份补丁的依赖关系并启动其CLI直接运行运行时OpenClaw， Node or Bun。这npm包带有已修补的依赖项；源码检查通过获取它`pnpm install`。这使得运行时使用的服务器与OpenClaw的浏览器合约测试。该补丁被追踪到[上游修复](https://github.com/ChromeDevTools/chrome-devtools-mcp/pull/2788)。

覆盖每个配置文件的服务器以获取自定义可执行文件或版本。自定义服务器由操作员管理，并且必须保留 Chrome MCP 的连接参数和文档绑定元素标识。

| 字段        | 它的作用                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `mcpCommand` | 自定义服务器可执行文件。绝对路径受到尊重；省略或显式 `npx` 选择 OpenClaw 的打包服务器。             |
| `mcpArgs`    | 额外的参数原封不动地传递给 `mcpCommand`。连接选项会覆盖生成的端点或自动连接参数。 |

`mcpArgs` 扩展所选服务器的参数。设置 `mcpCommand: "npx"` 的现有配置继续选择内置固定服务器。默认启动器启用 `--experimentalVision` 进行本机坐标单击。自定义 `mcpCommand` 必须公开 `click_at` 工具才能支持 `click-coords`；需要时在 `mcpArgs` 中传递服务器相应的功能标志。

当 `mcpArgs` 未设置连接选项时，OpenClaw 将配置的 `cdpUrl` 转发到 Chrome MCP，而不是生成 `--autoConnect`：

- `http(s)://...` → `--browserUrl <url>`（DevTools HTTP 发现端点）。
- `ws(s)://...` → `--wsEndpoint <url>`（直接 CDP WebSocket）。

`mcpArgs` 中的显式端点参数覆盖 `cdpUrl`；在端点旁边添加 `--autoConnect` 不会隐藏它。 OpenClaw 使用选定的端点进行 CDP 控制，并在启动 Chrome MCP 之前检查浏览器 CDP 策略。即使专用网络访问受信任，匹配的 `blockedHostnames` 条目也会拒绝附件。不相关的阻止列表条目不会阻止附件，并且默认的严格策略限制仍然适用。

无效、空、重复或冲突的端点参数在启动前失败并出现错误。提供一个有效端点，或省略 `cdpUrl` 和端点参数以使用主机本地附件。

选择端点后，`userDataDir` 将被忽略：Chrome MCP 附加到该端点后面正在运行的浏览器，而不是打开配置文件目录。

<Accordion id="existing-session-feature-limitations" title="现有会话功能限制">

与受管理的 `openclaw` 配置文件相比，existing-session 驱动的限制更多：

- **不明确的 iframe 引用** - 打包服务器将元素 ID 范围限定到其框架和文档。如果自定义服务器为不同文档返回相同的 ID，则 OpenClaw 会丢弃快照并使其引用无效。无参考页面截图仍然可用；更新自定义服务器或使用托管浏览器配置文件进行基于引用的工作。
- **截图**——页面捕获和 `--ref` 元素捕获可用；CSS `--element` 选择器不可用。页面或基于 ref 的元素截图不需要 Playwright。（任何配置文件上，`--full-page` 都不能与 `--ref` 或 `--element` 结合使用，不仅限于 existing-session。）
- **Actions** - `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要快照引用（无CSS 选择器）。 `click-coords` 在可见视口坐标处发送本机输入，无需快照引用，支持左键单击和双击。 Right/middle 按钮和非零延迟返回不支持的操作错误。 `click` 仅适用于左键（无按钮覆盖或修改器）。 `type` 不支持 `slowly=true`；使用 `fill` 或 `press`。 `press` 不支持 `delayMs`。 `type`、`hover`、`scrollIntoView`、`drag`、`select` 和 `fill` 不支持每次调用 `timeoutMs` 覆盖； `evaluate` 确实如此。 `select` 接受一个精确的 HTML 选项值，包括空值或空白值；重复的显示标签不会更改选择的值。不支持`batch`；单独发送操作。
- **等待/上传/对话框** - `wait --url` 支持精确、子字符串和全局模式（与托管相同）；现有会话配置文件不支持 `wait --load networkidle`（它适用于托管配置文件和 raw/remote CDP 配置文件）。上传钩子需要`ref`或`inputRef`，不支持CSS `element`；当页面的文件输入接受多个文件时传递多个路径。对话框挂钩不支持超时覆盖或 `dialogId`。
- **对话框可见性** - 当操作打开模式对话框时，托管浏览器操作响应包括 `blockedByDialog` 和 `browserState.dialogs.pending`；快照还包括待处理的对话框状态。当对话待处理时，用 `browser dialog --accept/--dismiss --dialog-id <id>` 进行响应。在 OpenClaw 外部处理的对话框出现在 `browserState.dialogs.recent` 下。
- **Playwright-仅具有** - PDF导出、下载拦截、`responsebody`和代理操作`requests`、`errors`、`text`和`emulate` 需要 Playwright- 支持的配置文件，例如托管 `openclaw` 配置文件。使用 `snapshot` 检查现有会话页面。

</Accordion>
