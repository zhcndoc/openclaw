---
summary: "跨提供商消息传递、控制平面工具、节点执行、插件、沙箱和每个代理访问配置文件"
read_when:
  - "决定代理可以调用​​哪些工具"
  - "限制跨对话或渠道提供商的消息传递"
  - "对代理或委托的子代理运行进行沙箱处理"
  - "在一个网关上为多个代理提供不同级别的访问权限"
title: "工具和代理权限"
sidebarTitle: "工具权限"
---

## <a id="control-plane-tools"></a> Control 平面工具

仍有两个内置工具对控制平面敏感：

- `gateway` 使用 `config.schema.lookup` / `config.get` 读取配置，并使用 `update.run` 启动所有者请求的 OpenClaw 更新。它没有配置写入或独立重启操作；更新重新启动和完成通知是自动的。
- `cron` 创建在原始 chat/task 结束后继续运行的计划作业。

`gateway` 工具仅供所有者使用，因为配置读取可能会暴露机密和主机拓扑，并且 `update.run` 会更改正在运行的安装。更新需要明确的用户请求。代理通过 `openclaw` 委托工具请求其他持久配置或生命周期更改。 OpenClaw 将它们映射到键入的操作并应用请求运行的有效权限策略：完全访问，包括默认（完全访问），授权允许的更改，无需批准提示；限制运行需要人工批准。独立工具、文件系统、沙箱和操作限制仍然适用，并且主机在执行之前重新验证实时权限。请参见[会话权限模式](/gateway/permission-modes#delegated-setup-and-repair)和[OpenClaw设置代理](/cli/openclaw#operations-and-approval)。

对于任何处理不受信任内容的 agent/surface，默认拒绝这些：

```json5
{
  tools: {
    deny: ["gateway", "cron", "sessions_spawn", "sessions_send"],
  },
}
```

`commands.restart=false` 禁用 `/restart` 和外部 `SIGUSR2` 重启请求。 `gateway` 代理工具没有重新启动操作。

## <a id="cross-provider-messaging"></a> 跨提供商消息传递

默认情况下，具有消息工具访问权限的代理可以跨对话和渠道提供商发送。例如，WebChat 会话可以发送到配置的 Discord 通道，而无需选择跨提供商传送。工具访问、消息操作白名单、channel/account 策略和提供商自己的权限仍然适用。

`tools.message.crossContext.allowAcrossProviders` 默认为 `true`。省略设置时升级采用此默认值；显式 `false` 继续阻止受保护的消息操作跨越绑定的源提供程序。如果您的部署依赖于该限制，请将其设置为 `false`。

`allowWithinProvider` 也默认为 `true` 并独立控制针对同一提供商上的另一个对话的操作。要将受保护的消息操作限制在当前绑定的对话中，请将两个选项设置为 `false`：

```json5
{
  tools: {
    message: {
      crossContext: {
        allowWithinProvider: false,
        allowAcrossProviders: false,
      },
    },
  },
}
```

要将此策略应用于一个代理，请将相同的 `message` 块放在 `agents.entries.<agentId>.tools` 下。每个代理值会覆盖匹配的全局设置；省略的字段继承它们。

这些控件保护消息突变，例如发送、回复、编辑、删除和线程创建。它们并不限制每个通道操作：读取和管理操作具有单独的权限。它们也不会在没有绑定源对话的情况下限制 CLI 调用，也不会替换文件系统、shell 或沙箱限制。相关控制请参见[工具策略](/gateway/config-tools/tool-policy)和[每代理访问配置文件](/gateway/security/tool-permissions#per-agent-access-profiles-multi-agent)。

## <a id="node-execution-(system.run)"></a><a id="node-execution-system-run"></a> Node 执行 （`system.run`）

如果一个 macOS 节点已配对，Gateway 可以在其上调用 `system.run`——这就是在该 Mac 上的远程代码执行。

- 需要节点配对（批准+令牌）。配对建立节点identity/trust并发行代币；它不是每个命令的批准表面。
- Gateway 通过 `gateway.nodes.commands.allow` / `gateway.nodes.commands.deny` 应用粗粒度的全局节点命令策略。拒绝列表仅匹配精确的节点命令名称（例如 `system.run`），不会匹配命令负载中的 shell 文本——如果重新连接的节点声明了不同的命令列表，只要 Gateway 全局策略和节点自身的执行批准仍然强制执行边界，这本身并不是漏洞。
- 每个节点的 `system.run` 策略由节点自身的执行批准文件（`exec.approvals.node.*`）决定，可在 Mac 上通过“设置 -> 执行批准”（安全性 + 询问 + 允许列表）进行控制；它可以比 Gateway 的全局命令 ID 策略更严格，也可以更宽松。
- 运行在 `security="full"` 且 `ask="off"` 配置下的节点遵循默认的受信任操作者模型——这是预期行为，而不是错误，除非你的部署需要更严格的安全策略。
- Approval 模式绑定精确的请求上下文，并在可能的情况下绑定一个具体的本地 script/file 操作数。如果 OpenClaw 无法准确识别 interpreter/runtime 命令的一个直接本地文件，则批准支持的执行将被拒绝，而不是承诺完整的语义覆盖。
- 对于 `host=node`，批准支持的运行还存储准备好的 `systemRunPlan`；稍后批准转发重用该存储的计划，并且网关验证在创建批准请求后拒绝调用者对 command/cwd/session 上下文的编辑。
- 如需完全禁用远程执行：将安全策略设置为 `deny`，并移除该 Mac 的节点配对。

## <a id="dynamic-skills-(watcher-%2F-remote-nodes)"></a><a id="dynamic-skills-watcher-/-remote-nodes"></a> 动态技能（watcher / 远程节点）

OpenClaw 可以在会话中刷新技能列表：当 `SKILL.md` 更改时，技能观察器会在下一个代理回合更新快照，并且连接 macOS 节点可以使 macOS- 只有技能符合资格（基于 bin 检查）。将技能文件夹视为可信代码并限制谁可以修改它们。

## <a id="plugins"></a> 插件

插件与 Gateway 在同一进程中运行——请将它们视为受信任的代码。

- 仅从您信任的来源安装；更喜欢明确的 `plugins.allow` 允许名单；在启用之前检查插件配置。插件代码、元数据或发现根更改后重新启动网关。使用默认的混合重新加载模式，普通配置和启用会更改热重新加载，除非插件声明重新启动触发前缀。
- Installing/updating 插件运行可执行代码：
  - 安装路径是活动插件安装根目录下的每个插件目录。
  - ClawHub 软件包和 OpenClaw 的 bundled/official 目录是可信来源。新的任意 npm、`npm-pack:`、git、本地 path/archive 或市场源在安装前发出警告；在您查看并信任该来源后，非交互式安装需要 `--force`。 `--force` 确认出处并允许覆盖；它不会绕过 `security.installPolicy` 或剩余的安装安全检查。更新重用已选择的源。
  - OpenClaw 在 install/update. 期间不运行内置本地危险代码阻止使用 `security.installPolicy` 进行操作员拥有的本地 allow/warn/block 决策，使用 `openclaw security audit --deep` 进行诊断扫描。
  - npm 和 git 插件安装仅在显式 install/update 流程期间运行包管理器依赖项收敛。本地路径和档案被视为独立的包； OpenClaw copies/references 它们无需运行 `npm install`。
  - 优先使用固定的精确版本（`@scope/pkg@1.2.3`），并在启用前检查解压后的代码。
  - `security.installPolicy` 允许操作员运行受信任的本地命令来返回 `allow`、`warn` 或 `block` 进行技能和插件安装。它在源材料准备好之后但在安装继续之前运行，并且也适用于 ClawHub 技能。
  - A `warn` 结果在提交之前停止。交互式 CLI 命令要求操作员使用与可疑 ClawHub 版本相同的措辞键入插件或技能名称，然后在继续之前重新评估策略。超过 4,000 个字符的渲染审查会在提示之前阻止安装。在检查该命令调用中的每个警告后，拒绝的和非交互式直接 CLI 命令可以使用 `--acknowledge-install-policy-warning` 作为明确批准。 Control UI 通过 **Install 无论如何** 公开相同的调用范围批准用于插件安装。其他网关支持的自动安装在没有操作员确认流程时仍会被阻止。每个批准的警告都会在继续之前重新评估。 `block` 和策略失败仍然是最终的。 `--force` 和已弃用的插件 install/update 标志 `--dangerously-force-unsafe-install` 都不批准策略警告。

详细信息：[插件](/tools/plugin)

## <a id="sandboxing"></a> 沙箱

专门文档：[沙箱](/gateway/sandboxing)

两种互补的方法：

- **Docker 中的完整网关**（容器边界）：[Docker](/install/docker)
- **工具沙箱**（`agents.defaults.sandbox`；主机网关 + 沙箱隔离工具；内置 Docker 和 Podman 后端）：[沙箱](/gateway/sandboxing)

<Note>
为防止跨代理访问，请将 `agents.defaults.sandbox.scope` 保持为 `"agent"`（默认值），或使用 `"session"` 以实现更严格的按会话隔离。`scope: "shared"` 会使用单个容器或工作区。
</Note>

沙箱内的代理工作区访问（`agents.defaults.sandbox.workspaceAccess`）：

- `"none"`（默认）：工具会看到位于 `~/.openclaw/sandboxes` 下的沙箱工作区；代理工作区不可访问。
- `"ro"`：将代理工作区以只读方式挂载到 `/agent`（禁用 `write`/`edit`/`apply_patch`）。
- `"rw"`：将代理工作区 read/write 安装在 `/workspace` 处。

额外的 `sandbox.docker.binds` 根据已解析符号链接的规范化源路径进行验证。阻止路径拒绝列表涵盖 `/etc`、`/private/etc`、`/proc`、`/sys`、`/dev`、`/root`、`/boot` 以及通常包含或别名 Docker 套接字的目录（`/run`、`/var/run` 和 `docker.sock` 位于其下），加上 HOME 凭证子路径（`.aws`、`.cargo`、`.config`、`.docker`、 `.gnupg`、`.netrc`、`.npm`、`.ssh`）。父符号链接技巧和主目录别名是通过现有祖先解析并重新检查的，因此如果它们解析为阻止的根，它们仍然会被拒绝。

<Note>
`tools.elevated` 是全局基线逃生口，可在沙箱外运行 exec。默认情况下，有效主机是 `gateway`；当 exec 目标配置为 `node` 时，则为 `node`。请严格限制 `tools.elevated.allowFrom`，不要为陌生人启用它。还可通过 `agents.entries.*.tools.elevated` 对每个代理进行进一步限制。请参阅[提升模式](/tools/elevated)。
</Note>

### <a id="sub-agent-delegation-guardrail"></a> 子代理委派防护

如果你允许会话工具，请将委派的子代理运行视为另一项边界决策：

- 除非代理确实需要委派，否则拒绝 `sessions_spawn`。
- 将 `agents.defaults.subagents.allowAgents` 以及任何针对代理的 `agents.entries.*.subagents.allowAgents` 覆盖项限制为已知安全的目标代理。
- 对于必须保持沙盒状态的工作流程，请使用 `sandbox: "require"` 调用 `sessions_spawn`（默认为 `"inherit"`）；当目标子运行时未沙箱化时，`"require"` 会快速失败。

### <a id="read-only-mode"></a> 只读模式

通过将 `agents.defaults.sandbox.workspaceAccess: "ro"`（或 `"none"`，无工作区访问权限）与阻止 `write`、`edit`、`apply_patch`、`exec`、`process` 等的工具 allow/deny 列表相结合，构建只读配置文件。

- `tools.exec.applyPatch.workspaceOnly: true`（默认）：即使关闭沙箱，也将 `apply_patch` 和 writing/deleting 保留在工作区目录之外。仅当您有意希望 `apply_patch` 接触工作区之外的文件时才设置 `false`。
- `tools.fs.workspaceOnly: true`（可选）：将 `read`/`write`/`edit`/`apply_patch` 路径以及原生提示图片自动加载路径限制在工作区目录内。
- 保持文件系统根目录狭窄 - 避免像 agent/sandbox 工作空间的主目录那样宽的根目录，这可能会将敏感的本地文件（例如 `~/.openclaw` 下的 state/config）暴露给文件系统工具。

## <a id="per-agent-access-profiles-(multi-agent)"></a><a id="per-agent-access-profiles-multi-agent"></a> 每个代理的访问配置文件（多代理）

每个代理可以有自己的沙箱+工具策略：完全访问、只读或无访问。请参阅 [Multi-Agent Sandbox 和 Tools](/tools/multi-agent-sandbox-tools) 了解优先规则。

常见模式：个人代理（完全访问，无沙箱）、family/work 代理（沙盒 + 只读工具）、公共代理（沙盒 + 无 filesystem/shell 工具）。

工具配置文件不会缩小会话工具的范围，沙箱仅将沙箱调用者限制在其生成树上；非沙盒代理仍然可以读取沙盒代理的会话。会话可见性是网关范围内的，并且默认情况下处于开启座席到座席消息传递的状态，因此当一个网关上的座席不应互相看到或发送消息时，请将角色配置文件与 `tools.sessions.visibility` 和 `tools.agentToAgent` 配对（请参阅下面的最后一个示例）。

要允许没有跨代理历史记录访​​问的请求，请缩小可见性并将请求者的 `agents.entries.<agentId>.tools.agentToAgent.send` 设置为选定的目标 ID 或 `*` 模式。这仅授予 `sessions_send` 和授权回合的回复，而不授予读取、状态、会话控制或其他隐藏的监视访问权限。它不会覆盖全局代理到代理的限制或仅生成沙箱的限制。请参阅 [ 仅发送示例和信任限制 ](/gateway/config-tools/sessions-and-subagents#per-agent-send-only-access)。

### <a id="full-access-(no-sandbox)"></a><a id="full-access-no-sandbox"></a> 完全访问（无沙箱）

```json5
{
  agents: {
    entries: {
      personal: {
        workspace: "~/.openclaw/workspace-personal",
        sandbox: { mode: "off" },
      },
    },
  },
}
```

### <a id="read-only-tools-%2B-read-only-workspace"></a><a id="read-only-tools-+-read-only-workspace"></a> 只读工具 + 只读工作区

```json5
{
  agents: {
    entries: {
      family: {
        workspace: "~/.openclaw/workspace-family",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "ro" },
        tools: {
          allow: ["read"],
          deny: ["write", "edit", "apply_patch", "exec", "process", "browser"],
        },
      },
    },
  },
}
```

### <a id="no-filesystem%2Fshell-access-(provider-messaging-allowed)"></a><a id="no-filesystem/shell-access-provider-messaging-allowed"></a> 无 filesystem/shell 访问权限（允许提供者消息传递）

```json5
{
  // The default "all" covers every session on the Gateway, including other agents' and other users' transcripts.
  // Explicit tree scope limits non-main callers to current + spawned sessions.
  // Use visibility: "self" for strict current-session access, including main.
  tools: { sessions: { visibility: "tree" } }, // self | tree | agent | all
  agents: {
    entries: {
      public: {
        workspace: "~/.openclaw/workspace-public",
        sandbox: { mode: "all", scope: "agent", workspaceAccess: "none" },
        tools: {
          allow: [
            "sessions_list",
            "sessions_history",
            "sessions_send",
            "sessions_spawn",
            "session_status",
            "discord",
            "slack",
            "telegram",
            "whatsapp",
          ],
          deny: [
            "apply_patch",
            "browser",
            "canvas",
            "cron",
            "edit",
            "exec",
            "gateway",
            "image",
            "nodes",
            "process",
            "read",
            "write",
          ],
        },
      },
    },
  },
}
```
