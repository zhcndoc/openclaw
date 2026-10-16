---
summary: "在 macOS 面板中显示托管小部件"
read_when:
  - "Showing an agent-created widget on a Mac"
  - "从配对节点控制 macOS 小部件面板"
  - "Debugging hosted widget navigation"
title: "小部件面板"
doc-schema-version: 1
---

macOS 应用程序包括一个用于显示托管小部件文档的本机面板。 Canvas 插件拥有此演示路径。它不是独立的可视工作区或 A2UI 推送目标。

建议的代理路径是 [`show_widget`](/tools/show-widget) 和 `presentation.target: "node_panel"`。 OpenClaw 将小部件存储为托管文档，选择连接的 macOS 节点，打开面板并将其导航到该文档。如果未连接符合条件的 Mac 或演示失败，小部件仍会内联显示在聊天中，并且工具结果会说明如何重试。

本机面板中的小部件仅用于渲染。主机集成的小部件操作在 Control UI 聊天和 [ 会话仪表板 ](/web/dashboards) 表面中仍然可用，而不是在面板中。

## <a id="panel-behavior"></a> 面板行为

- 该面板无边框、可调整大小，并固定在菜单栏或鼠标光标附近。
- 呈现小部件不会切换应用程序或获取键盘焦点。
- 一次只能看到一个小部件面板。
- 该应用程序会记住每个会话的面板大小和位置。

可以从 **Dashboard → 设置 → 本机 → 功能** 禁用画布。禁用时，面板命令返回 `CANVAS_DISABLED`。

## <a id="agent-path"></a> 代理路径

要求代理使用 `show_widget` 并定位节点面板。该工具仅在小部件呈现器插件处于活动状态时才会公开 `node_panel`。

```json
{
  "title": "Build status",
  "widget_code": "<main><h1>Build passed</h1></main>",
  "presentation": { "target": "node_panel" }
}
```

演示成功后，结果会识别所选的 Mac。 OpenClaw 当前仅选择声明 `canvas.present` 的已连接 macOS 节点。

## <a id="node-commands"></a> Node 命令

配对节点命令界面包含三个命令：

```bash
openclaw nodes canvas present --node <id>
openclaw nodes canvas navigate --node <id> "/__openclaw__/canvas/documents/<document-id>/index.html"
openclaw nodes canvas hide --node <id>
```

- `canvas.present` 显示面板。它还接受现有的可选目标和放置参数。
- `canvas.navigate` 加载托管小部件文档路径或应用程序本地画布 URL。
- `canvas.hide` 隐藏面板而不更改其当前文档。

下的托管路径`/__openclaw__/canvas/`通过节点会话的当前作用域来解决`pluginSurfaceUrls.canvas` URL。该应用程序会在导航前刷新这种短暂的功能。调用者应该传递文档路径，而不是构造或复制功能URL。

应用程序本地方案仍然可用于应用程序拥有的内容：

```text
openclaw-canvas://<session>/<path>
```

该方案处理的文件必须保留在应用程序支持中会话的 Canvas 根目录内。目录遍历被阻止。

## <a id="a2ui-belongs-on-session-dashboards"></a> A2UI 属于会话仪表板

A2UI 小部件在 [ 会话仪表板 ](/web/dashboards) 上呈现，它们与其他仪表板小部件共享相同的固定、布局、批准和交互模型。他们的渲染器包继续从网关的 `/__openclaw__/a2ui/` 资源路径加载。

macOS 面板不接受 A2UI push/reset 命令，并且不会自动导航到 A2UI 页面。

## <a id="migrating-documents-from-a-custom-root"></a> 从自定义根迁移文档

跑步`openclaw doctor --fix`转移退休人员的文件`plugins.entries.canvas.config.host.root`（或较旧的`canvasHost.root`） 进入状态目录`canvas/documents`文件夹。显式插件根优先于旧设置。 Doctor 仅在没有遗留文档后才会删除根设置。如果目录访问或文档复制失败，doctor 会发出警告并保留源定位器以供重试。它可能会将旧设置移至插件配置中，同时保留路径。已经指向默认存储文件夹（包括通过符号链接）的根不需要复制。

修复报告的权限或目标冲突，然后重新运行命令。请勿自行删除 root 设置。托管路由仅服务于默认存储文件夹，因此在迁移完成之前剩余的旧文档不可用。

## <a id="related"></a> 相关内容

- [显示小部件](/tools/show-widget)
- [会话仪表盘](/web/dashboards)。
- [macOS 应用](/platforms/macos)
- [节点](/nodes)
