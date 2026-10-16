---
summary: "子代理工具限制层以及如何通过配置缩小它"
title: "子代理工具策略"
read_when:
  - "您需要知道子代理总是丢失哪些工具"
  - "您想要允许或拒绝子代理的特定工具"
---

## <a id="tool-policy"></a> 工具策略

子代理使用与父代理或目标代理相同的 profile 和工具策略管道。之后，OpenClaw 会应用子代理限制层。

对于新创建的子项，当发布仅在父项工作区中不可用时，将继承允许的 `github_publish` 功能。孩子自己的工作空间仍必须符合网关发布的条件。显式拒绝和限制性配置文件、发件人、沙箱、运行时和继承策略仍然适用；这不会授予对另一个会话的存储库或凭据的访问权限。现有的孩子保留他们记录的政策。更正排除发布的策略后创建新的子项。

当已解决的子项在 `sessions_yield` 之后恢复请求者时，继续会保留在生成时捕获的请求者策略。切换必须仍然属于当前请求者会话和已解决的批次，并且该批次中的每个子级都必须携带相同的经过验证的请求者策略。冲突或缺失的子策略将继续保留在其普通限制策略下。当前的工具限制和实时撤销检查在执行时仍然适用；切换不会授予额外的工具或推断发送者身份。

Claude CLI 后端请求者的自动完成轮流会保留相同的捕获策略。这些工具仅通过 OpenClaw 的策略过滤 MCP 表面到达 CLI，因此本机 CLI 工具在回合中保持禁用状态，并且每个继承的拒绝仍然适用。其他 CLI 后端、节点托管的 Claude CLI 会话和结算批次不会重新获得请求者工具。仅消息工具回复保留其现有的源绑定 `message` 授权。当该受限表面需要自己的 Claude CLI 会话时，请求者的下一个恢复回合会收到完成提示，并在其帐户可以重播保存的历史记录时作为引用的上下文进行回复；请参阅 [CLI 后端](/gateway/cli-backends#sessions)。

无论深度或角色如何，子代理始终会丢失 `gateway`、`agents_list`、`session_status`、`progress_card`、`cron`、`message`、`sessions_send` 和 `conversations_*` 工具（系统-level/interactive 工具、家长拥有的进度卡、直接交付表面或主要代理应协调的工具）。该硬拒绝层源自每次持续的子代理会话信封，包括恢复的和可见的仪表板会话；普通的 `allow`/`alsoAllow` 条目无法覆盖它。隐藏启动还会在工具构建之前禁用 `message` 作为纵深防御。配置深度上限的子代理还会丢失 `subagents`、`sessions_list`、`sessions_history` 和 `sessions_spawn`，因此它们的通信保留在公告链上。

`sessions_history` 仍然是一个有界回忆视图，这里也没有秘密屏蔽——它既不是原始转录转储，也不是纯散文渲染。

默认情况下，深度 `5` 之下的子代理会接收 `sessions_spawn`、`subagents`、`sessions_list` 和 `sessions_history`，以便他们可以管理其子代理。

### <a id="delegate-tools-to-a-coding-agent"></a> 将工具委托给编码代理

当将实现交给单独配置的编码代理时，前门代理可能仍然无法执行命令或编辑文件。选择加入请求代理上的每个目标：

```json5
{
  agents: {
    entries: {
      intake: {
        tools: { deny: ["exec", "process", "write", "edit", "apply_patch"] },
        subagents: {
          allowAgents: ["coder"],
          delegateToolsTo: ["coder"],
        },
      },
      coder: {},
    },
  },
}
```

`delegateToolsTo` 是操作员拥有的权限，而不是 `sessions_spawn` 参数。它命名了精确配置的目标代理；它不会取代 `allowAgents` 或允许任意目标。如果没有这笔补助，现有的调用者工具上限将保持不变。吸入剂仍然受到局部限制。

该授权适用于本机跨代理切换，并且仅放宽请求代理自己的 `tools.deny` 层。全局、提供者、发送者、对话、沙箱和继承限制不是委派授予。这些层的重复拒绝仍然被拒绝，并且目标仍然应用其自己当前的工具策略和硬性子代理限制。不能为了使切换工作而丢弃限制性继承的允许列表。无法安全投影的显式授权在创建之前失败，而不是启动不可用的子项。 ACP 保留其原有的继承和准入检查。

初始切换需要网关端本机工具表面和本地放置。云工作者和 CLI- 介导的生成表面无法发起或传播异常。支持的 CLI 和插件工具目标使用 OpenClaw- 中介工具，而不是环境本机命令界面，因此可以在效果之前检查授权撤销。无法强制执行该投影的后端会拒绝运行。

编码目标的同代理本机助手保留授予和任何附加限制。他们不能将其转移给第三方智能体。完成返回到接收代理会保留接收代理的原始工具快照。删除目标补助金或其 `allowAgents` 准入会恢复后续准备的原始上限，并拒绝在生效前依赖于补助金的保留行动。已经开始的效果不会回滚。

现有会话保留其记录的策略；添加此设置不会追溯升级以前创建的子项。

### <a id="override-via-config"></a> 通过配置覆盖

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 1,
      },
    },
  },
  tools: {
    subagents: {
      tools: {
        // deny wins
        deny: ["gateway", "cron"],
        // if allow is set, it becomes allow-only (deny still wins)
        // allow: ["read", "exec", "process"]
      },
    },
  },
}
```

`tools.subagents.tools.allow` 是最终只允许过滤器。它可以缩小已经解析的工具集，但不能将 **添加回** 被 `tools.profile` 删除的工具。例如，`tools.profile: "coding"` 包括 `web_search`/`web_fetch`，但不包括 `browser` 工具。要让编码配置文件子代理使用浏览器自动化，请在配置文件阶段添加浏览器：

```json5
{
  tools: {
    profile: "coding",
    alsoAllow: ["browser"],
  },
}
```

当只有一个代理应该获得浏览器自动化时，请使用按代理配置 `agents.entries.*.tools.alsoAllow: ["browser"]`。
