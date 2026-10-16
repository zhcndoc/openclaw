---
summary: "Native Block Kit 图表和表格、模式提交和批准按钮"
read_when:
  - "在 Slack 中本地渲染图表或表格"
  - "处理插件拥有的 Slack 模式提交"
  - "批准来自 Slack 的执行或插件请求"
title: "Slack 图表、表格和认证"
sidebarTitle: "图表、表格和批准"
---

Block Kit 表面 OpenClaw 在 Slack 中本地渲染。

## <a id="native-charts"></a> 原生图表

Slack 的公开 [`data_visualization` Block Kit 区块](https://docs.slack.dev/reference/block-kit/blocks/data-visualization-block/) 可在消息中渲染折线图、柱状图、面积图和饼图。OpenClaw 将可移植的 `presentation` `chart` 区块映射为这种原生形态；除正常的 `chat:write` 消息访问权限外，不需要额外的 OAuth 作用域、 文件上传、图像渲染器或 Slack 配置。

```json
{
  "blocks": [
    {
      "type": "chart",
      "chartType": "bar",
      "title": "Quarterly revenue",
      "categories": ["Q1", "Q2"],
      "series": [{ "name": "Revenue", "values": [120, 145] }],
      "xLabel": "Quarter"
    }
  ]
}
```

Slack 的限制会在原生渲染前强制执行：

- 标题和可选坐标轴标签：50 个字符
- 饼图：1-12 个正值分段
- line/bar/area：1-12个唯一命名的系列和1-20个共享类别
- 分段、类别和系列标签：20 个字符
- 每个系列都必须为每个类别包含一个有限值；非饼图数值可以为负数

每个本机图表还带有用于屏幕阅读器、通知、会话镜像和无法呈现块的客户端的顶级文本表示。发送到其他 OpenClaw 通道的标准演示文稿会接收与文本相同的图表数据，除非它们宣传本机图表支持。如果 Slack 拒绝带有 `invalid_blocks` 的图表，则 OpenClaw 会删除被拒绝的本机数据块，保留所有同级控件，并将完整的图表表示形式作为可见文本发送。

Slack 每条消息最多接受两个 `data_visualization` 块；它的公共参考没有记录每个消息子类型的限制。当演示文稿包含两个以上的有效图表时，OpenClaw 会保持其顺序并在后续消息中继续本机呈现，每条消息中的图表不超过两个。

Slack 的 [开发者发布](https://docs.slack.dev/changelog/2026/06/16/block-kit-data-visualization-block/) 将该区块描述为面向应用的 Block Kit 功能，并未公布任何付费方案限制。Business+/Enterprise 的资格说明适用于 Slackbot 自动生成 AI 图表，这与应用发送一个已经结构化的 Block Kit 图表是不同的。图表是仅限消息的区块，不是 App Home、模态窗口或 Canvas 内容。

## <a id="native-tables"></a> 原生表格

Slack 当前的 [`data_table` Block Kit 区块](https://docs.slack.dev/reference/block-kit/blocks/data-table-block/) 可在消息中渲染结构化的行和列。OpenClaw 会将显式的、可移植的 `presentation` `table` 块映射为 `data_table`；它不使用 Slack 旧版的 [`table` 区块](https://docs.slack.dev/reference/block-kit/blocks/table-block/)。 除了正常的 `chat:write` 消息访问权限之外，不需要额外的 OAuth 作用域或 Slack 配置。

```json
{
  "blocks": [
    {
      "type": "table",
      "caption": "Open pipeline",
      "headers": ["Account", "Stage", "ARR"],
      "rows": [
        ["Acme", "Won", 125000],
        ["Globex", "Review", 82000]
      ],
      "rowHeaderColumnIndex": 0
    }
  ]
}
```

OpenClaw 将标题和字符串单元格映射到 Slack `raw_text` 单元格。数字单元映射到 `raw_number`，并保留有限的数值用于本机排序和过滤。 `rowHeaderColumnIndex`（如果存在）将从零开始的列标记为 Slack 行标题。

Slack 公布的 `data_table` 限制会在原生渲染前强制执行：

- 1-20 列
- 1-100 行数据，外加表头行
- 每一行的单元格数量必须相同
- 在一条消息中的所有表格单元格总字符数最多为 10,000

多个有效的表块可以本地呈现，同时消息保持在聚合字符限制内。无法在本机信封内呈现的表格将变成完整的文本，而不是丢失行或单元格。如果该文本超过一条 Slack 消息，则发送和斜线响应将使用有序文本块。表编辑会因显式大小错误而失败，而不是默默地截断现有消息中的行。

从可移植 presentation 生成的每个原生表格还会附带一个顶层文本表示，供屏幕阅读器、通知、会话镜像以及无法渲染该区块的客户端使用。原始图表和表格值在回退内容中保持字面形式，因此诸如 `<@U123>` 这样的单元格数据不会变成 Slack 提及。 如果 Slack 因 `invalid_blocks` 拒绝原生图表或表格区块，OpenClaw 会在一次有界恢复步骤中移除所有原生数据区块，保留诸如按钮和选择器之类的有效同级区块，并在禁用 Slack 格式化的情况下发送完整可见的图表和表格文本。斜杠命令传递会跟踪 Slack 在该命令中的五次调用 `response_url` 预算。在每一批回复之前，它都会选择一个能适配剩余调用次数的完整计划，否则会在发送该批次之前失败。

仅明确`presentation`表块被提升为本机表。Markdown管道表保留创作文本；OpenClaw不猜测表结构或单元格类型。现有可信Slack-本地生产者可以继续传递原始块`channelData.slack.blocks`； OpenClaw从有效的原始数据中派生后备文本`data_table`单元格，而格式错误的自定义块可能会降级为其标题或一般块套件后备。便携式代理，CLI，并且插件输出应该使用`presentation`。

Slack 客户端还可以将粘贴的电子表格内容作为旧版 `table` 块发送到消息的顶层 blocks 或 attachments 中。OpenClaw 会将这些传入单元格渲染为对分隔符安全的 TSV，用于实时 agent 输入、线程上下文，以及 Slack `read` 操作。只有原生表格块才会从普通 attachments 中被接纳；link-unfurl 和其他未转发的 attachment 文本仍然被排除在外。

入站消息和表格单元格中的富文本日期保留 Slack 提供的后备文本。当该可选文本不存在或为空白时，OpenClaw 将有效的 Unix 秒时间戳呈现为 ISO UTC 瞬时，例如 `2023-11-14T22:13:20.000Z`。这使得仅日期消息可读，而无需猜测 Slack 查看器的时区或相对日期格式。

## <a id="plugin-owned-modal-submissions"></a> 插件拥有的模态框提交

注册了交互处理器的 Slack 插件，也可以在 OpenClaw 为 agent 可见的系统事件压缩负载之前，接收模态框的 `view_submission` 和 `view_closed` 生命周期事件。在打开 Slack 模态框时，请使用以下一种路由模式：

- 将 `callback_id` 设为 `openclaw:<namespace>:<payload>`。
- 或者保留现有的 `callback_id` 并将 `pluginInteractiveData: "<namespace>:<payload>"` 放入模态 `private_metadata` 中。

处理程序接收 `ctx.interaction.kind` 作为 `view_submission` 或 `view_closed`、标准化 `inputs` 以及来自 Slack 的完整原始 `stateValues` 对象。仅回调 ID 路由足以调用插件处理程序；当模态还应产生代理可见的系统事件时，包括现有模态 `private_metadata` user/session 路由字段。代理收到一个紧凑的、经过编辑的 `Slack interaction: ...` 系统事件。如果处理程序返回 `systemEvent.summary`、`systemEvent.reference` 或 `systemEvent.data`，这些字段将包含在该紧凑事件中，以便代理可以引用插件拥有的存储，而无需查看完整的表单负载。

## <a id="native-approvals-in-slack"></a> Slack 中的原生审批

Slack 可以作为原生审批客户端，通过交互式按钮和交互操作来处理审批，而不是回退到 Web UI 或终端。

- Exec 和插件批准可以呈现为 Slack-native Block Kit 提示。
- `channels.slack.execApprovals.*` 保留本机执行批准客户端启用和 DM/channel 路由配置。
- Exec 批准 DM 使用 `channels.slack.execApprovals.approvers` 或 `commands.ownerAllowFrom`。
- 当 Slack 启用为原始会话的本机批准客户端时、当 `approvals.plugin` 路由到原始 Slack 会话或 Slack 目标时、或者当显式非空 `approvals.plugin.slack` 时，Plugin 批准使用 Slack-native 按钮审阅者列表适用于该请求。
- Plugin 审批 DM 在针对请求进行配置时使用 `approvals.plugin.slack` 审阅者。省略的默认审阅者列表保留 `channels.slack.allowFrom`、命名帐户 `allowFrom` 或帐户默认路由。
- 审批者授权仍然会被强制执行：仅限 exec 的审批者不能批准插件请求，除非他们同时也是插件审批者。

对于 Enterprise Grid 组织安装，将保留原始事件的已验证工作区以用于批准提示、批准者 DM、按钮回调和最终消息更新。当组织安装的帐户不具有该事件拥有的工作区范围时，审批交付将被阻止。

这使用了与其他频道相同的共享审批按钮界面。当你的 Slack 应用设置中启用了 `interactivity` 时，审批提示会直接在对话中渲染为 Block Kit 按钮。当这些按钮存在时，它们是主要的审批 UX；只有当工具结果表明聊天审批不可用，或手动审批是唯一途径时，OpenClaw 才应包含手动 `/approve` 命令。

配置路径：

- `channels.slack.execApprovals.enabled`
- `channels.slack.execApprovals.approvers`（可选；在可能时回退到 `commands.ownerAllowFrom`）
- `channels.slack.execApprovals.target`（`dm` | `channel` | `both`，默认：`dm`）
- `agentFilter`, `sessionFilter`

Slack 本机执行批准需要 `enabled: true` 或 `"auto"` 以及至少一个已解析的执行批准者。保留 `enabled` 未设置或将其设置为 `false` 将禁用本机执行批准交付。当 Slack 插件审批者解析并且请求与其过滤器匹配时，Slack 还可以通过此本机客户端路径处理本机插件审批。禁用 Slack 执行批准不会禁用通过 `approvals.plugin` 启用的本机插件批准交付，它使用 Slack 插件批准者。 `approvals.plugin.slack.approvers` 设置默认的 Slack 插件审阅者列表； `approvals.plugin.slack.plugins` 可以为选定的本机工具插件和单个工具覆盖它。审阅者 ID 可以是所选账户内的原始 `U…`/`W…` ID 或 `team:<workspace-id>:user:<user-id>`。显式空列表拒绝针对该范围的 Slack 决策。有关优先级和工具密钥格式，请参阅 [Plugin 权限请求](/plugins/plugin-permission-requests#route-approval-prompts)。

使用命令所有者作为审批者的最小 Slack-native 配置：

```json5
{
  channels: {
    slack: {
      execApprovals: { enabled: "auto" },
    },
  },
  commands: {
    ownerAllowFrom: ["slack:U12345678"],
  },
}
```

要覆盖批准者、添加过滤器或选择原始聊天传送：

```json5
{
  channels: {
    slack: {
      execApprovals: {
        enabled: true,
        approvers: ["U12345678"],
        target: "both",
      },
    },
  },
}
```

共享的 `approvals.exec` 转发是独立的。仅当 exec 审批提示也必须路由到其他聊天或显式的带外目标时才使用它。共享的 `approvals.plugin` 转发也同样独立；只有当 Slack 能够原生处理插件审批请求时，Slack 原生投递才会抑制该回退。

Same-chat `/approve` 也适用于已经支持命令的 Slack 频道和 DM。有关完整批准转发模型，请参阅 [Exec批准](/tools/exec-approvals)。
