---
summary: "发现、导入并继续网关和配对节点上的本机会话记录"
read_when:
  - "浏览另一台计算机上的 Codex 或 Claude 会话"
  - "在其所属终端中恢复本机 CLI 会话"
  - "在源清理之前在 OpenClaw 中保留本机转录本"
  - "配置会话目录可见性或关闭开关"
title: "Node 会话目录"
sidebarTitle: "会话目录"
---

每个提供商的冷目录列表同时等待最多一秒。在该预算范围内完成的提供商通常会返回。当某个页面已可用于同一调用者和查询时，列表会立即返回该页面，同时发现会在后台刷新；已解决的刷新将返回其新页面。速度慢的提供者返回 `catalog.error.code: "catalog_pending"`；当可用时，同一调用者和查询的最新可用页面包含在标记为 `pending: true` 的主机和陈旧结果消息中。失败的目录枚举同样可以返回带有 `catalog.error.code: "catalog_stale"` 的页面及其消息中的潜在错误。填写的主机结果具有权威性，包括离线或不可用的主机；即使另一台主机处于待处理状态，网关也不会用较旧的行替换这些结果。提供商拥有其主机快照的新鲜度和失效性。其他提供商仍然可用。较晚的结果刷新页面以获取下一个列表；现有主机进度更新仍受支持。

这些后备页面受内存限制，并因配置或提供程序注册更改以及目录存档操作而失效。每次交付都会重新检查当前可见性和本地会话身份。一秒预算涵盖提供者发现和排队，而不是会话投影准备或等待网关事件循环所花费的时间。

启用诊断后，慢速提供者警告会报告经过的时间，包括排队和异步 I/O. `isMainThread` 识别调用线程；它不测量 CPU 时间。每个提供商注册时，调试日志记录都会发出每个提供商 ID 及其 `providerIdHash` 一次，因此可以在不记录会话内容的情况下归因警告。

## <a id="import-transcripts"></a> 导入成绩单

将本机转录本导入到 OpenClaw 的持久会话存储中，以便在源工具清理其历史记录或源计算机变得不可用后保留它。在会话侧栏中，打开目录行的菜单并选择 **导入到 OpenClaw**。当副本准备就绪时，成功通知会提供 **Open 导入的会话**。

从 CLI 导入一份转录本或所有可见目录行：

```bash
openclaw sessions import claude <thread-id>
openclaw sessions import codex <thread-id> --host <host-id>
openclaw sessions import --all --dry-run
openclaw sessions import --all --json
```

捆绑提供程序的目录 ID 为 `claude`、`codex`、`openclaw`、`opencode` 和 `pi`。使用 `--catalog <id>` 过滤批量导入，使用 `--source-home <id>` 从特定源主目录选择单个转录本。有关连接选项和批量导入输出，请参阅 [sessions CLI](/cli/sessions)。

导入适用于任何可读目录，包括网关上的源、无头配对节点、macOS 应用程序和 Linux 应用程序。导入期间必须可以访问源。导入的副本是所选代理拥有的普通 OpenClaw 会话，具有源出处和不受信任的引用通知。导入的副本以 [drafts](/concepts/multi-user#drafts) 开头，仅对其创建者和网关管理员可见。通过现有会话共享控件发布副本以与其他人共享。重新导入会保留副本的当前可见性，包括明确发布的副本。禁用草稿后，导入的副本将遵循网关的默认可见性。 Control UI 和 CLI `--all` 提供目录行的名称作为初始标题（如果可用）。单会话 CLI 导入使用通用 `Imported <catalog label> session` 标题。 RPC 调用者可以为新导入的会话提供 `displayName`（1–500 个字符）；重新导入永远不会重命名现有会话。它没有本机模型锁或节点执行绑定，并且导入不会恢复或分叉本机会话。源记录保持不变。

重新导入该代理的相同目录、主机、源主目录和线程会更新相同的 OpenClaw 会话。仅附加以前未见过的成绩单项目；未更改的源添加零个项目。这是显式同步：当您再次导入时，稍后的本机消息将被保留。

导入会保留目录的预计转录文本，而不是原始本机文件或原始提供者记录。每次导入最多保留 50,000 个转录项目或 64 MiB 的预计历史记录，以先到者为准，从最近的历史记录开始。提供程序截断和现有的每项文本限制仍然适用。如果历史记录上限忽略较旧的项目，则结果为 `complete: false`，并且 CLI 警告副本不完整。 `importedItems` 统计新添加的源项目； `totalItems` 计数在此导入期间读取的源项目，包括已保留的项目。 Claude和Codex提供稳定的物品ID；对于项目缺少 ID 的目录，重新导入会按内容识别项目，因此一旦副本超过历史记录上限，就可以跳过相同的重复项目。较小的延续种子仍然限于 200 个项目和 512 KiB。

导入需要 `operator.write` 以及与读取目录记录相同的行可见性。在多用户模式下，非管理员调用者只能导入他们可以读取的行。通过每个目标写入来检查源读取访问；撤销会停止进一步复制，而已提交的内容仍保留在导入的会话中。导入副本不会采用本机会话或更改单击其目录行打开的内容。

## <a id="codex-sessions-and-transcripts"></a> Codex 会话和成绩单

官方 `codex` 插件可以在无头节点主机或本机 macOS 节点上公开非存档的 Codex 会话。目录注册不再依赖`supervision.enabled`；该选项控制面向代理的监督工具。在 Codex 插件配置中设置 `sessionCatalog.enabled: false` 以禁用操作员目录和配对节点目录命令，而不禁用提供程序或harness。该插件必须在两台计算机上仍然处于活动状态，并且节点设置保持本地同意：仅启用网关无法读取另一台计算机的 Codex 状态。

节点会公布带版本的只读 `codex.appServer.threads.list.v1` 和 `codex.appServer.thread.turns.list.v1` 命令。可使用 Codex CLI 的原生节点主机还会公布 `codex.terminal.resume.v1`。当这些命令首次出现时，请批准节点配对升级。Gateway 会通过正常的插件节点策略调用它们，并按主机隔离故障。

配对节点行在正常会话侧栏中显示为 **Codex** 组。在每个主机中，行默认按项目文件夹分组； `.claude/worktrees/<name>` 下的工作目录折叠到其原始存储库中，项目组像其他侧边栏部分一样折叠。使用目录标题中的文件夹图标来展平或恢复项目组。相同的分组适用于 Claude 会话目录。默认情况下，选择一行会打开普通的聊天窗格，并通过带有完整项目投影的有界、光标分页的 `thread/turns/list` 调用读取其持久记录。使用行菜单、查看器标题或 **在** 首选项中打开 Codex/Claude 会话在拥有会话的计算机上的操作员终端中启动 `codex resume <thread-id>`。配对节点终端路径是 Codex 插件拥有的允许列表 PTY 中继，而不是任意节点命令执行。

终端中继与配对节点聊天延续是分开的。通告并允许目录命令和 `codex.cli.session.resume` 的连接节点可以为具有 `operator.admin` 的操作员继续存储或空闲的交互式线程。聊天反映了有限的可见历史；后续消息针对该节点上的确切线程运行本机 Codex CLI 恢复并返回最终文本，而无需流应用程序服务器harness桥。没有所需命令的节点在不继续聊天的情况下仍然可读。配对节点 **Archive** 不可用。

在网关计算机上，存储行和空闲行可以启动不同的模型锁定聊天分支。只有在操作员确认没有其他 Codex 客户端在使用后才可以存档；存储行的实时活动仍然未知。活动行不能分支或归档。

有关设置、分页、本地和配对节点延续以及元数据安全边界的信息，请参阅 [Supervise Codex 会话](/plugins/codex-supervision)。

## <a id="claude-sessions-and-transcripts"></a> Claude 会话和成绩单

默认情况下，捆绑的 `anthropic` 插件会发现网关和配对节点上的非存档 Claude CLI 和 Claude 桌面会话。设置 `plugins.entries.anthropic.config.sessionCatalog.enabled: false` 以禁用操作员目录和配对节点目录命令，而不禁用 Anthropic 模型或 Claude CLI 后端。当启用 Anthropic 插件且其 Claude 项目目录存在时，远程 macOS 应用程序节点会通告 `anthropic.claude.sessions.list.v1` 和 `anthropic.claude.sessions.read.v1`：当应用程序环境设置 `CLAUDE_CONFIG_DIR` 时为 `$CLAUDE_CONFIG_DIR/projects/`，否则为 `~/.claude/projects/`。 Claude 桌面元数据始终来自用户的主目录。当这些命令首次出现时批准节点配对升级。

如果可用 Claude CLI，本机节点主机还会声明 `anthropic.claude.terminal.resume.v1`。符合条件的 CLI 和 Desktop 行可以在其所属主机上的操作员终端中打开 `claude --resume <session-id>`。这会接管本地会话；与 OpenClaw 采用不同，它不会先分叉 Claude 会话。

该目录将有效的 Claude CLI 项目索引记录与未索引的 JSONL 转录本的有界元数据回退结合起来。该回退可识别并发非侧链交互 （`cli`） 和无头代理 SDK CLI （`sdk-cli`） 会话。 Claude Desktop 的本地元数据提供 Desktop 标题和存档状态。当两个源引用相同的 Claude Code 会话 ID 时，桌面元数据获胜； CLI- 只有转录本保持可见，因为 CLI 没有存档标志。转录读取使用不透明字节偏移游标和有界向后文件读取，因此选择大型会话或加载较旧的页面不会将整个 JSONL 历史记录读取到一个网关响应中。

目录 RPC 保留其正常方法范围：`sessions.catalog.list` 和 `sessions.catalog.read` 需要 `operator.read`； `sessions.catalog.continue`、`sessions.catalog.import` 和 `sessions.catalog.archive` 需要 `operator.write`。

目录可见性还遵循经过身份验证的调用者。 `operator.admin` 连接可以看到每个发现的行。当网关拥有少于两人的持久配置文件时，目录可见性不会改变，行也不会被过滤。在多用户网关上，非管理员连接只能看到并只能读取、继续、导入或归档记录的 `createdActor.id` 与调用者的网关配置文件匹配的行。未归属的主机 CLI 或桌面会话对这些呼叫者隐藏。这是一个受信任网关域内的隐私和协调边界，而不是敌对用户隔离；当人们不得共享对文件、凭据或工具的访问权限时，请使用单独的代理或 Gateway/host 信任边界。请参见 [ 多用户模式](/concepts/multi-user)。

网关本地 Claude CLI 行可以从普通的聊天编辑器中采用：OpenClaw 导入有界可见历史记录，在第一轮以 `--fork-session` 恢复，并保持源记录不变。

无头节点主机可以选择接入相同的续接流程：

```json5
{
  nodeHost: {
    agentRuns: {
      claude: { enabled: true },
    },
  },
}
```

仅当启用此节点本地设置并且 `claude` 可执行文件在该节点上解析时，节点才会通告 `agent.cli.claude.run.v1`。网关无法远程启用它。该命令还会通过节点现有的执行批准策略。当网关的节点命令策略通告并允许所有三个 Claude 命令时，该节点上的 Claude CLI 行变得可连续：OpenClaw 导入有界历史记录，将采用的会话绑定到该节点及其目录报告工作目录，并在那里运行每个一次性 `claude -p`。第一回合仍使用 `--fork-session`，保留源转录本。

Node-placed 依次使用节点的 Claude 默认值。在 v1 中，他们不会收到网关环回 MCP 配置或网关技能插件，无法从网关脚本重新播种，也无法拒绝附件和图像。 Claude 不通告运行命令的桌面行和节点仍仅供查看。 macOS 应用程序节点尚未通告此命令，因此其行仍仅供查看。

## <a id="opencode-and-pi-sessions"></a> OpenCode 和 Pi 会话

捆绑的 OpenCode 和 ACPX 插件还会发现网关和配对节点上的只读本机会话目录。当安装了`opencode` CLI时，节点发布`opencode.sessions.list.v1` / `opencode.sessions.read.v1`；当Pi的会话目录存在时，节点发布`acpx.pi.sessions.list.v1` / `acpx.pi.sessions.read.v1`。当新命令首次出现时批准节点配对升级。当匹配的CLI也有时，节点添加`opencode.terminal.resume.v1`或`acpx.pi.terminal.resume.v1`；然后，现有的行菜单和查看器标题可以使用 `opencode --session <id>` 或 `pi --session <id>` 在其所属终端中重新打开选定的会话。

OpenCode 通过其官方 CLI JSON/export 接口读取。Pi 读取其文档化的 JSONL 会话存储，包括项目和全局 `settings.json` 会话目录，以及 `PI_CODING_AGENT_DIR` 和 `PI_CODING_AGENT_SESSION_DIR` 覆盖项。两个目录默认都启用； 可在 Web UI 的 **Config > Plugins** 下将其关闭。

终端恢复使用存储的会话工作目录，以及与 Codex 和 Claude 相同的允许列表双工 PTY 中继。它不会暴露任意节点命令执行。

## <a id="openclaw-sessions-and-transcripts"></a> OpenClaw 会话和成绩单

捆绑的 [Session 共享插件 ](/plugins/session-share) 将选定的本机 OpenClaw 会话从源网关发布到配对的接收者网关。源节点主机以与源网关的状态目录相同的用户身份运行。双方启用插件，选择源会话组，仅与`--commands`中的`openclaw.sessions.list.v1`和`openclaw.sessions.read.v1`连接。

接收器在 **OpenClaw 会话** 中的源节点下显示只读行。查看者需要获得权限才能在角色限制网关上查看其他人的会话。这不允许在源上继续、终端访问或工作执行。它与在节点上托管新会话是分开的，如 [ 会话托管 ](/nodes/session-hosting) 中所述。
