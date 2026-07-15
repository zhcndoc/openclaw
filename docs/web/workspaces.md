---
summary: "控制 UI 中可由代理组合的工作区"
read_when:
  - 构建或重新排列工作区选项卡和小部件
  - 让代理组合工作区
  - 审查自定义小部件审批和沙箱模型
title: "工作区"
---

[Control UI](/web/control-ui) 中的 **工作区** 选项卡是你和你的代理共同整理的一个界面。选项卡、小部件、它们在 12 列网格上的位置，以及它们的数据绑定，都保存在同一个文档中。任何能够编辑该文档的东西都可以组合工作区：你、`openclaw workspaces` CLI，或者调用 `workspace_*` 工具的代理。

每次写入都会经过同一条已验证的路径，因此人类的布局和代理的布局不会出现分歧。每次被接受的写入都会提升一个版本并广播 `plugin.workspaces.changed`，因此代理的编辑会在已经打开的浏览器中出现，而无需重新加载。

## 启用工作区

捆绑的 Workspaces 插件默认处于禁用状态。在 Control UI 中，打开 **Plugins**，
找到 **Workspaces**，并选择 **Enable**。你也可以通过 CLI 启用它：

```sh
openclaw plugins enable workspaces
```

启用该插件后，会添加 **Workspaces** 选项卡，并提供 `openclaw workspaces` CLI
以及 `workspace_*` 代理工具。禁用它会移除这些入口，但不会删除工作区数据库或小组件资源。

## 默认工作区

首次加载时，你会得到一个 **概览** 工作区：包含费用和 token 卡片、实例健康状态、
会话、cron 状态以及活动信息流。它是普通的工作区内容——你可以拖动它、
折叠它、隐藏它或删除它。

## 内置小部件

插件自带九个受信任的小部件，并作为第一方 UI 渲染：

`stat-card`, `markdown`, `table`, `iframe-embed`, `sessions`, `usage`, `cron`,
`instances`, `activity`。

小部件通过 **绑定** 来声明数据，它们绝不会自行获取数据：

| 绑定     | 解析为                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------- |
| `static` | 存储在文档中的字面值（最大 8 KB）。                                                        |
| `file`   | 位于 `<stateDir>/workspaces/data/` 下的 JSON、Markdown 或 CSV 文件，也可通过 JSON 指针进一步限定。 |
| `rpc`    | 固定允许列表中的只读网关方法之一，由受信任的 Control UI 解析。                |

`file` 绑定是将你自己的数字放入工作区的最简单方式：把一个
JSON 文件写入数据目录，然后让 `stat-card` 指向它。

## 来源

选项卡和小部件带有一个 `createdBy` 标记——`user`、`system` 或 `agent:<id>`——由执行写入的人设置。它不能由调用方提供，因此代理不能将其工作标记为你的，而代理创建的小部件上的“AI”徽标始终表示其字面含义。

## 自定义小组件

Agent 可以使用 `workspace_widget_scaffold` 创建一个真实的 HTML 小组件（或者你也可以使用
`openclaw workspaces widget-scaffold <name>`）。Agent 编写的代码会被视为不可信：

- 通过脚手架生成的小组件会以 **pending** 状态进入注册表。不会创建 iframe，并且
  在操作员批准之前，其文件的资源路由会返回 404。
- 批准是一个独立于编辑布局的决定：`workspaces.widget.approve`
  需要 `operator.approvals` 范围，这与保护 exec 批准的相同范围。
- 已批准的小组件会在 `<iframe sandbox="allow-scripts">` 中渲染 —— 绝不会使用
  `allow-same-origin` —— 因此其 origin 是不透明的，且无法访问父页面的 DOM、
  存储或 cookies。
- 其资源以 `connect-src 'none'` 提供服务，阻止脚本联网，例如
  `fetch`、XHR 和 WebSockets。它不持有任何凭据，也从不与网关通信。
- 数据仅通过带版本号的 `postMessage` 桥接传递给它。自定义代码可以接收已声明的
  `static` 绑定，这些绑定本身已经是由 agent 或 operator 编写的 workspace 值。RPC 和文件绑定保留在受信任的内置小组件中：浏览器允许
  沙箱化的子框架导航到自己的 frame，因此特权数据不会被发送到 agent 编写的 HTML 中。

从小组件向聊天发送提示还额外需要一个 manifest 能力、一次逐次调用的确认（其中引用完全一致的文本），并且会经过速率限制。

## CLI

```sh
openclaw workspaces tabs list
openclaw workspaces tabs create --title Financials
openclaw workspaces widget-scaffold revenue-chart --title "Revenue Chart"
openclaw workspaces widget-approve revenue-chart
```

`widget-approve` 需要一个已配对且具有 `operator.approvals` 作用域的设备；而从
Control UI 中进行批准则不需要，因为浏览器已经持有该作用域。

## 存储

工作区文档、自定义小部件注册表以及一个 20 项的撤销环保存在
`<stateDir>/workspaces/workspaces.sqlite` 中。代理创建的小部件资源保留在
`<stateDir>/workspaces/widgets/<name>/` 下的磁盘上，而文件绑定数据位于
`<stateDir>/workspaces/data/` 下，因为代理会使用普通文件工具创建这些内容，并且小部件路由会提供它们的字节内容。
