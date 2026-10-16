---
summary: "tools.agentToAgent、tools.sessions 可见性、sessions_spawn 附件和子代理默认值"
read_when:
  - "限制哪些代理可以相互联系"
  - "缩小会话工具可以看到的会话范围"
  - "允许一个代理向另一个代理发送消息而不读取其历史记录"
  - "设置子代理并发、超时或附件限制"
title: "配置 — 跨代理、会话和子代理工具"
---

会话和子代理工具达到的范围：哪些代理可以互相调用，它们可以定位哪些会话，以及应用于生成的子代理的默认值。

## `tools.agentToAgent`

```json5
{
  tools: {
    agentToAgent: {
      allow: ["home", "work"],
    },
  },
}
```

默认情况下，跨代理访问处于启用状态。 `enabled`（默认 `true`）门控跨代理会话工具调用：`sessions_send` 到另一个代理，以及跨代理 `sessions_list`、`sessions_history`、`sessions_search`，以及默认 `tools.sessions.visibility: "all"` 下的状态读取。设置 `enabled: false` 以关闭跨代理访问。同代理访问从不参考此策略。请求者拥有的本机子代理和 ACP 子会话是一个例外：在 `tree` 或 `all` 可见性下，在咨询此策略之前，它们保持跨代理边界可访问，包括使用 `enabled: false`。

`allow` 列出可能参与跨代理呼叫的代理 ID 或 `*` 模式。请求代理和目标代理都必须与条目匹配。确切的 ID 区分大小写；通配符模式不区分大小写。

<Note>
省略或空的 `allow` 视为未设置：默认情况下启用座席到座席访问，每个座席都可以联系其他每个座席。列出每个参与的代理、请求者和目标，以限制跨代理访问，如上例所示。仅包含空白条目的列表会拒绝所有跨代理呼叫。删除代理（`openclaw agents delete`）会从 `allow` 中删除其 id；如果列表清空，策略将回退到允许全部，因此在删除代理后重新检查 `allow`。
</Note>

### <a id="per-agent-send-only-access"></a> 每代理仅发送访问

使用 `agents.entries.<agentId>.tools.agentToAgent.send` 让一个代理向选定的代理发送请求，而无需扩大会话可见性。它不会删除现有的读取访问权限：当您需要仅发送访问权限时，请将 `tools.sessions.visibility` 保留在 `all` 以下。例如，让 `specialist` 向 `ops` 寻求帮助，而不授予直接跨代理历史记录访​​问权限：

```json5
{
  tools: {
    agentToAgent: { enabled: true, allow: ["specialist", "ops"] },
    sessions: { visibility: "agent" },
  },
  agents: {
    ownership: "explicit",
    entries: {
      specialist: {
        tools: { agentToAgent: { send: ["ops"] } },
      },
      ops: {
        tools: { agentToAgent: { send: [] } },
      },
    },
  },
}
```

`specialist` 可以使用 `sessions_send` 到达 `ops` 并接收对该发送回合的回复，即使 `ops` 具有 `send: []`。 `ops` 无法发起普通的跨代理发送。两个代理都无法直接访问另一个代理的历史记录。 `sessions_send` 工具仍必须由调用者的有效工具策略启用。专员可以直接对配置的座席进行寻址；它不需要首先列出操作代理的会话。致电 `sessions_send`：

```json
{ "agentId": "ops", "message": "Please check the service status." }
```

`send` 是一个可选的字符串数组：

- **Omit `send`：** 保留全局 `tools.agentToAgent` 策略和 `tools.sessions.visibility` 检查发送。
- **`send: []`：** 拒绝来自该代理的普通跨代理发送，即使在 `visibility: "all"` 下也是如此。与全局 `allow` 不同，空的 `send` 不是允许所有的。
- **目标 ID 或 `*` 模式：** 仅匹配的目标代理可以接收来自该请求者的普通跨代理发送。即使在 `self`、`tree` 或 `agent` 可见性下，匹配也允许 `sessions_send`；它不会扩展其他工具。对任何目标代理使用 `["*"]`。删除代理会从这些列表中删除其确切的 ID；空列表仍然是 `[]`（拒绝），并且通配符规则仍然存在。
- **全局策略仍然适用：**、`enabled: false`或不包括请求者或目标的`allow`列表拒绝发送。这是传出策略，而不是每个目标的接收策略。
- **现有边界仍然存在：**同一代理发送仍然服从可见性。请求者拥有的 native/ACP 子访问权限不变。隐身限制和沙盒生成会话限制仍然适用，包括沙盒子代理； `send` 无法到达该夹具之外。
- **交付前更改：** 网关在异步准备之后并在接受目标输入之前立即重新检查当前发送策略。撤回目标会阻止尚未接受的发送；它不会撤回已接受的输入或其应有的答复。
- **回复，非历史记录：** 该回复属于授权发送轮次。 `send` 不授予列表、历史记录、搜索、状态或会话控制访问权限。 `watch: true` 另外需要正常状态可见性；仅发送访问无法订阅其他隐藏的会话状态。

<Warning>
仅发送访问是要求目标代理执行操作的权限。它不会阻止特权目标在其回复中泄露数据或执行不受信任的请求。保持目标工具和说明适合传入的请求；使用单独的网关进行强隔离。参见[安全信任模型](/gateway/security/trust-model)。
</Warning>

## `tools.sessions`

控制会话工具（`sessions_list`、`sessions_history`、`sessions_search`、`sessions_send`、`session_status`）可以针对哪些会话。

默认值：`all`（网关上的每个会话，包括其他代理和其他用户的记录）。跨代理访问由 `tools.agentToAgent` 管理，默认情况下处于启用状态。使用 `agent`、`tree` 或 `self` 缩小可见范围。

```json5
{
  tools: {
    sessions: {
      // "self" | "tree" | "agent" | "all"
      visibility: "all",
      // Opt in to sessions_send targets in threads/topics (default false)
      allowThreadTargets: false,
    },
  },
}
```

<AccordionGroup>
  <Accordion id="visibility-scopes" title="可见范围">
    - `self`：仅当前会话密钥。
    - `tree`：当前会话+当前会话（子代理）生成的会话。当呼叫者是主要主会话时，它包括列表、历史记录、搜索、发送和状态的每个相同代理会话。
    - `agent`：属于当前代理 ID 的任何会话（如果您在同一代理 ID 下运行每个发送者会话，则可以包括其他用户）。
    - `all`：任何会话。跨代理定位由 `tools.agentToAgent` 控制，默认情况下处于启用状态。
    - `self` 没有主会话可见性异常。隐姓埋名的否认仍然是绝对的。将可见性缩小到 `agent`、`tree` 或 `self` 会阻止普通的跨代理访问，除非每个代理 `tools.agentToAgent.send` 规则允许仅发送例外。 `tree` 还允许拥有的 native/ACP 子项跨越代理边界。 `agent` 不包括该子异常，因此如果您的工作流程依赖于它，请保持显式 `tree`。
    - 沙箱限制：当当前会话被沙箱化且 `agents.defaults.sandbox.sessionToolsVisibility="spawned"`（默认）时，即使调用者是 main 或 `tools.sessions.visibility="all"`，访问仍仅限于生成的会话。
    - 当不是 `all` 时，`sessions_list` 会包含一个简要的 `visibility` 字段，用于描述生效模式，并警告当前范围之外的某些会话可能会被省略。

  </Accordion>
</AccordionGroup>

环境组监视仍然对活动通知进行排队，并告诉主会话发生了什么事。他们不授予访问权限。默认 `all` 范围已涵盖代理之间的会话，包括与其他用户的对话。每个对等点 `session.dmScope` 分隔 DM 上下文，但不限制会话工具。对于更窄的访问范围，请明确选择 `agent`、`tree` 或 `self`，或限制具有 `tools.agentToAgent.allow` 的代理对。设置`tools.agentToAgent.enabled: false`阻止普通跨代理访问；请求者拥有的本机子代理和 ACP 子会话在 `tree` 或 `all` 下保持可访问。 `tree` 保留主主会话异常； `self` 甚至将 main 限制为其当前会话。

## `tools.sessions_spawn`

控制 `sessions_spawn` 的内联附件支持。

```json5
{
  tools: {
    sessions_spawn: {
      attachments: {
        enabled: false, // opt-in: set true to allow inline file attachments
        maxTotalBytes: 5242880, // 5 MB total across all files
        maxFiles: 50,
        maxFileBytes: 1048576, // 1 MB per file
        retainOnSessionKeep: false, // keep attachments when cleanup="keep"
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion id="attachment-notes" title="附件注释">
    - 附件需要 `enabled: true`。
    - 子代理附件以 `.manifest.json` 的状态暂存在网关拥有的状态；它们永远不会通过子工作区写入。
    - 沙盒儿童仅在 `/openclaw/attachments/<uuid>/` 处接收其会话拥有的只读附件。带有附件的代理范围会话使用专用运行时，因此同级来宾无法继承投影。没有只读资源投影的共享范围沙箱和后端会在暂存之前拒绝带有附件的生成。
    - Unsandboxed 子项接收网关拥有的绝对路径，并可以通过工作区范围的 file/media 工具读取它。
    - ACP 附件仅限图像，并会在通过相同的文件数量、单文件字节数和总字节数限制后以内联方式转发到 ACP 运行时。
    - 转录本持久性中省略了内联附件字节；这是二进制有效负载处理，而不是秘密屏蔽。
    - Base64 输入通过严格的 alphabet/padding 检查和预解码大小保护进行验证。
    - 子代理附件文件权限为目录 `0700`、文件 `0600`。
    - 子代理清理遵循 `cleanup` 策略：`delete` 始终移除附件；`keep` 仅在 `retainOnSessionKeep: true` 时保留它们。
    - 从 `readOnlyResourceMounts` 之前的版本升级：以前暂存的附件保留在 `.openclaw/attachments/<uuid>/` 的子工作区中。它们的注册表记录将在不删除或遍历这些文件的情况下废弃，因此请通过正常的工作区清理来删除剩余的文件。 Gateway 拥有的状态中的新生成阶段；子提示路径是唯一可用的文件系统位置。附件收据的 `relDir` 是保留标识符，不是可用位置，并且不得解析。

  </Accordion>
</AccordionGroup>

## `agents.defaults.subagents`

```json5
{
  agents: {
    defaults: {
      subagents: {
        allowAgents: ["research"],
        model: "minimax/MiniMax-M2.7",
        maxConcurrent: 8,
        runTimeoutSeconds: 900,
        announceTimeoutMs: 120000,
        archiveAfterMinutes: 60,
      },
    },
  },
}
```

- `model`：生成的子代理的默认模型。如果省略，子代理将继承调用者的模型。
- `allowAgents`：当请求者代理未设置自己的 `subagents.allowAgents` 时，`sessions_spawn` 的已配置目标代理 ID 的默认白名单（`["*"]` = 任何配置的目标；默认值：仅限相同代理）。代理配置被删除的过时条目将被 `sessions_spawn` 拒绝，并从 `agents_list` 中省略；运行 `openclaw doctor --fix` 来清理它们。
- `maxConcurrent`：每个即时 spawning/controller 会话运行的最大并发普通子代理程序。默认：`8`；独立会话不分享该预算。 Swarm 收集器子级使用 `tools.swarm.maxConcurrent` 代替。 Codex-native 子代理使用 Codex 的单独调度程序和限制。
- `maxChildrenPerAgent`：每个时段对活跃儿童的单独入场限制。默认：`5`；提高 `maxConcurrent` 不会提高此限制。
- `runTimeoutSeconds`：当调用方未传入自己的覆盖值时，`sessions_spawn` 的超时时间（秒）。默认值：`0`（无超时）；上面显示的 `900` 是常见的可选值，而不是内置默认值。
- `announceTimeoutMs`：网关 `agent` announce 投递尝试的单次调用超时时间（毫秒）。默认值：`120000`。临时重试可能会使总 announce 等待时间长于单个配置的超时时间。
- `archiveAfterMinutes`：子代理会话完成后，在自动归档前等待的分钟数。默认值：`60`；`0` 会禁用自动归档。
- 每个子代理的工具策略：`tools.subagents.tools.allow` / `tools.subagents.tools.deny`。

## `tools.swarm`

默认情况下启用 Swarm。收藏家儿童 （`collect: true`） 在专用的 `subagent:swarm:<schedulerGroupKey>` 车道上奔跑，并带有该组已解决的 `maxConcurrent` 上限。他们让父级的普通子代理通道可用。由收集器生成的普通子级使用该收集器自己的会话通道。

```json5
{
  tools: {
    swarm: {
      maxConcurrent: 32,
      maxChildrenPerGroup: 50,
      maxTotalPerGroup: 200,
    },
  },
}
```

`maxConcurrent` 默认为 `32` 并接受从 `1` 到 `1000` 的整数。每个正在运行的子进程都会花费一个模型流和一个代码模式工作隔离。默认情况下，单独的 `maxChildrenPerGroup` 和 `maxTotalPerGroup` 准入限制仍然是每个组的 `50` 活子级和 `200` 生命周期生成。有关所有设置和每个代理覆盖的信息，请参阅 [Swarm 配置](/tools/swarm#enable-swarm)。
