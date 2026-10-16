---
summary: "单一浏览器工具、其操作以及代理传递的参数"
title: "浏览器代理工具"
read_when:
  - "您需要浏览器工具操作列表"
  - "您正在为浏览器编写代理工具参数"
  - "您需要沙箱和节点定位规则"
---

Agent 只有 **一个工具** 用于浏览器自动化：

- `browser` - doctor/status/start/stop/tabs/open/focus/close/snapshot/screenshot/navigate/act/requests/errors/text/emulate

映射关系：

- 在Playwright-支持的配置文件上，`browser open`遵循`timeoutMs`打开导航，上限为120秒，默认为30秒。如果页面提交后加载事件超时，则 `open` 在导航安全检查后返回可用选项卡；它可能仍在加载。使用`snapshot`或`act`与`kind: "wait"`来检查或等待您需要的内容。未提交或阻塞的页面仍然会失败并被清理。取消正在进行的打开将关闭其新创建的选项卡，而无需等待导航超时；现有选项卡保持打开状态。
- `browser snapshot` 返回一个稳定的 UI 树（AI 或 ARIA）。
- Snapshot `query` 保留包含 **all** 空格分隔的查询标记的行，忽略大小写。匹配行保留元素引用；结果报告匹配计数并遵循 `maxChars`。它搜索返回的快照，因此如果源被截断，则增加快照范围。
- `browser requests`读取收集到的网络日志。可选 `filter` 匹配 URL 或资源类型中的子字符串； `limit` 保留最新条目（默认 50）。结果报告 `total` 匹配收集的请求和 `returned` 条目；产出预算可能会进一步减少这一数字。 `clear=true` 读取后清除整个收集的日志，包括过滤或限制忽略的条目。
- `browser errors` 读取收集的页面错误。 `limit` 保留最新条目（默认 50）。结果报告 `total` 收集的错误和 `returned` 条目；产出预算可能会进一步减少这一数字。 `clear=true` 读取后清除整个收集的日志，包括限制忽略的条目。页面错误仍然是不受信任的外部内容。
- `browser text` 使用第一个显式 `selector` 匹配提取可见散文，否则使用第一个 `article`、`main` 或 `body`。 `maxChars` 必须为正；默认长度不能超过 40,000 个字符。该工具的输出预算可能会进一步缩减。页面文本仍然是不受信任的外部内容。
- `browser emulate` 将 `device`（Playwright 器件名称）、`colorScheme`（`dark`、`light`、`no-preference` 或 `none`）中的一个或多个应用到清除）、`timezoneId` 和 `locale`。设置按该顺序应用并返回 `applied` 列表；它们不是原子的。这四个操作支持本地和节点目标，但不支持 Chrome MCP 现有会话配置文件。
- `browser navigate` 也会返回已加载页面的内联快照（高效交互层，因此有效载荷保持紧凑且有界），所以 agent 不需要后续再调用 snapshot。批量 `act` 结果中，如果报告了跨文档导航，也会包含同样的新鲜页面状态。解析为下载的导航则会跳过它。
- `browser act` 使用快照 `ref` ID 到 click/type/drag/select. 当捕获的控件消失时，其绑定引用失败。在重试该操作之前拍摄新快照。
- `browser screenshot` 捕获像素（整页、元素或带标签的 refs）。
- 如果在浏览器仍在捕获或恢复页面设置时屏幕截图超时，则该选项卡上的进一步屏幕截图、调整大小和设备更改将返回恢复错误。捕获完成后重试。如果它仍然卡住，请关闭并重新打开受影响的选项卡；其他选项卡仍然可用。
- `browser doctor` 检查 Gateway、插件、配置文件、浏览器和标签页是否就绪。
- `browser` 接受：
  - `profile` 用于选择一个命名的浏览器配置文件（openclaw、chrome 或 remote CDP）。
  - `target`（`sandbox` | `host` | `node`）用于选择浏览器所在位置。
  - 省略 `target` 和 `node` 以使用配置的路由。当沙箱浏览器桥可用时，托管配置文件将使用它。如果没有沙箱桥，启用的 `gateway.nodes.browser.node` 引脚会选择该节点，包括在手动路由模式下；不可用的固定节点失败而不是切换到主机。
  - 如果没有 pin，自动路由会优先选择可用的主机浏览器，并且在节点路由可用时可以选择单个连接的浏览器节点。没有引脚的手动路由和禁用的节点路由使用主机。除非选择网关或节点路由，否则独立运行使用主机；请参阅 [ 远程和托管浏览器](/tools/browser/remote#node-browser-proxy-zero-config-default)。
  - 显式 `target="host"` 选择网关主机并绕过配置的节点路由。显式 `target="node"` 或 `node` 选择器请求节点路由； `gateway.nodes.browser.mode="off"` 拒绝。
  - 在沙盒会话中，主机和节点控制都需要 `agents.defaults.sandbox.browser.allowHostControl=true`。现有会话配置文件无法使用沙盒浏览器。当网桥可用时，除非显式选择节点，否则它们将使用主机，并遵守相同的主机控制策略。
  - 在启用节点引脚、无沙箱桥和允许主机控制的情况下，工具描述将已配置的节点标识为默认节点。其他配置保留现有工具说明；该指导不依赖于实时节点连接。

这使得代理可以重用捕获的元素引用而不是脆弱的选择器。

代理工具参数示例（重用 `tabs` 或 `open` 中的 `targetId`）：

```json
{ "action": "requests", "targetId": "t1", "filter": "fetch", "limit": 20, "clear": true }
```

```json
{ "action": "text", "targetId": "t1", "selector": "article", "maxChars": 6000 }
```

```json
{ "action": "snapshot", "targetId": "t1", "query": "sign in", "maxChars": 4000 }
```

对于 [ 浏览器仪表板 ](/web/dashboards#share-a-browser-dashboard-with-your-agent)，请使用其稳定的小部件名称而不是选项卡 ID：

```json
{ "action": "snapshot", "dashboard": "service-status", "refs": "aria" }
```

`dashboard` 选择器适用于当前会话。首先使用`dashboard`工具创建保存的`browser:dashboard`小部件；其道具选择 URL 和可选的托管配置文件。 `browser` 解析仪表板中显示的同一页面以进行快照、单击、键入和导航。请勿将选择器与显式配置文件、节点或目标 ID 结合使用。 `open` 显式恢复已停止的仪表板，并且 `close` 停止其正在运行的浏览器。其他操作会使已停止的仪表板停止。普通的原始选项卡关闭无法关闭仪表板拥有的选项卡。

```json
{
  "action": "emulate",
  "targetId": "t1",
  "device": "iPhone 15",
  "colorScheme": "dark",
  "timezoneId": "America/New_York",
  "locale": "en-US"
}
```
