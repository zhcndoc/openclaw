---
summary: "自定义技能、每任务模型、子代理、cron 作业和后台运行"
title: "技能和自动化"
read_when:
  - "您正在定制、加载或安装技能"
  - "cron 作业、提醒或子代理没有表现"
---

## <a id="skills-and-automation"></a> 技能与自动化

<AccordionGroup>
  <Accordion id="how-do-i-customize-skills-without-keeping-the-repo-dirty" title="如何在不弄脏存储库的情况下自定义技能？">
    使用托管覆盖而不是编辑存储库副本。将更改放入 `~/.openclaw/skills/<name>/SKILL.md`（或通过 `skills.load.extraDirs` 在 `~/.openclaw/openclaw.json` 中添加文件夹）。优先级：`<workspace>/skills` -> `<workspace>/.agents/skills` -> `~/.agents/skills` -> `~/.openclaw/skills` -> 捆绑 -> `skills.load.extraDirs`，因此托管覆盖无需触及 git 即可胜过捆绑技能。要全局安装但限制某些代理的可见性，请将共享副本保留在 `~/.openclaw/skills` 中，并使用 `agents.defaults.skills` / `agents.entries.*.skills` 控制可见性。只有值得上游进行的编辑才应该作为针对存储库副本的 PR 发布。
  </Accordion>

  <Accordion id="can-i-load-skills-from-a-custom-folder" title="我可以从自定义文件夹加载技能吗？">
    是：通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加目录（上述顺序中优先级最低）。默认情况下，`clawhub` 安装到 `./skills` 中，OpenClaw 在下一个会话中将其视为 `<workspace>/skills`。要限制某些代理的可见性，请与 `agents.defaults.skills` 或 `agents.entries.*.skills` 配对。
  </Accordion>

  <Accordion id="how-can-i-use-different-models-or-settings-for-different-tasks" title="如何针对不同的任务使用不同的模型或设置？">
    支持的模式：

    - **Cron 任务**：隔离任务可以为每个任务设置 `model` 覆盖。
    - **智能体**：将任务路由到不同的智能体，每个智能体可以拥有不同的默认模型、思考级别和流式传输参数。
    - **仅当前会话**：`/model <model> -s`（或 `--session`）保持配置的默认值不变。
    - **Agent 默认 + 当前会话**：Owner/admin `/model <model> -a`（或 `--agent`）更新所选代理。
    - **全局默认+当前会话**：Owner/admin `/model <model> -g`（或`--global`）更新`agents.defaults.model`。

    除非您设置可选的 [ 模型选择范围 ](/gateway/config-agents/models#agentsdefaultsmodelselectionscope)，否则裸 `/model <model>` 会保持 owner/admin 配置默认持久性。

    示例 - 同一个模型，不同的按智能体设置：

    ```json5
    {
      agents: {
        ownership: "explicit",
        entries: {
          coder: {
            model: "xiaomi/mimo-v2.6-pro",
            thinkingDefault: "high",
            params: { temperature: 0.1 },
          },
          chat: {
            model: "xiaomi/mimo-v2.6-pro",
            thinkingDefault: "off",
            params: { temperature: 0.8 },
          },
        },
      },
    }
    ```

    将每个模型共享的默认值放入 `agents.defaults.models["provider/model"].params` 中。当一名代理需要该模型的不同设置时，请使用 `agents.entries.*.models["provider/model"].params`。 Flat `agents.entries.*.params` 适用于该代理的模型，并胜过每个模型层。

    请参阅 [Cron 作业](/automation/cron-jobs)、[ 多代理 Routing](/concepts/multi-agent)、[ 配置](/gateway/config-agents)、[ 斜线命令](/tools/slash-commands)。

  </Accordion>

  <Accordion id="the-bot-freezes-while-doing-heavy-work-how-do-i-offload-that" title="机器人在进行繁重工作时会冻结。我该如何卸载它？">
    对于耗时或并行任务，请使用**子智能体**：它们在各自独立的会话中运行，返回摘要，并保持主聊天响应流畅。你可以让机器人“为这个任务启动一个子智能体”，或者使用 `/subagents`。使用 `/status` 查看 Gateway 当前是否繁忙。

    长任务和子智能体都会消耗 token；如果成本重要，可通过 `agents.defaults.subagents.model` 为子智能体设置更便宜的模型。

    文档：[子代理](/tools/subagents)。

  </Accordion>

  <Accordion id="how-do-thread-bound-subagent-sessions-work-on-discord" title="线程绑定子代理会话如何在 Discord 上工作？">
    将 Discord 线程绑定到一个子智能体或会话目标，这样后续发到该线程的消息会保留在绑定的会话中。

    - 使用 `sessions_spawn` 并设置 `thread: true` 创建（也可选 `mode: "session"` 以便持续跟进）。
    - `/agents` 可检查绑定状态。
    - `/session idle <duration|off>`和`/session max-age <duration|off>`控制自动过期。
    - `/session unbind` 分离线程而不关闭代理会话。

    配置：`session.threadBindings.enabled`（全局开关）、`session.threadBindings.idleHours`（默认值为 `24`，`0` 表示禁用）、`session.threadBindings.maxAgeHours`（默认值为 `0` = 无硬性上限），以及用于在生成时自动绑定的 `session.threadBindings.spawnSessions`（默认值为 `true`）。

    文档：[子代理](/tools/subagents)、[Discord](/channels/discord)、[配置Reference](/gateway/configuration-reference)、[斜线命令](/tools/slash-commands)。

  </Accordion>

  <Accordion id="a-subagent-finished-but-the-completion-update-went-to-the-wrong-place-or-never-posted-what-should-i-check" title="子代理已完成，但完成更新到了错误的位置或从未发布。我应该检查什么？">
    检查解析后的请求方路由：

    - 完成模式的子智能体投递会优先使用已绑定的线程或会话路由（如果存在）。
    - 如果完成来源只带有一个频道，OpenClaw 会回退到请求方会话中保存的路由（`lastChannel` / `lastTo` / `lastAccountId`），这样仍然可以直接投递成功。
    - 如果没有绑定路由，也没有可用的已保存路由：直接投递可能失败，结果会回退为排队的会话投递，而不是立即发布。
    - 无效或过期的目标也会强制回退到队列，或导致最终投递失败。
    - 对于需要完成的子项，`NO_REPLY` 或空输出是作为 `(no output)` 传递给父项以进行可见处理或重试的缺失可交付成果。记录的完成情况和源交付事实可抑制重复交付；完成的最终结果，而不是过时的早期进展，就满足了义务。

    从请求者与 `/subagents list` 的对话进行调试，然后是 `/subagents info <id|#>` 和 `/subagents log <id|#>`。检查网关日志是否有传送失败；完成的执行本身并不确认其已完成。

    文档：[子代理](/tools/subagents)、[会话Tools](/concepts/session-tool)。

  </Accordion>

  <Accordion id="cron-or-reminders-do-not-fire-what-should-i-check" title="Cron 或提醒不会触发。我应该检查什么？">
    Cron 在 Gateway 进程内运行；如果 Gateway 不是持续运行的，就不会触发。

    - 确认已启用 cron（`cron.enabled`），并且没有设置 `OPENCLAW_SKIP_CRON`。
    - 确认网关正在 24/7 运行（无 sleep/restarts）。
    - 验证任务时区（`--tz` 与宿主时区）。

    调试：
    ```bash
    openclaw automations run <jobId>
    openclaw automations runs <jobId> --limit 50
    ```

    文档：[Cron 任务](/automation/cron-jobs)、[自动化](/automation)。

  </Accordion>

  <Accordion id="cron-fired-but-nothing-was-sent-to-the-channel-why" title="Cron 启动了，但没有任何内容发送到通道。为什么？">
    检查投递模式：

    - `--no-deliver` / `delivery.mode: "none"`：不会期待 runner 进行兜底发送。
    - 缺少或无效的 announce 目标（`channel` / `to`）：runner 会跳过外发投递。
    - 频道认证失败（`unauthorized`、`Forbidden`）：runner 尝试投递了，但凭据阻止了它。
    - A 完成了孤立的最终结果，其整个文本修剪为大写 `NO_REPLY` 是故意不可传递的，因此排队后备传递也被抑制。小写、换行形式和尾随标记仍然可见。

    对于隔离的 cron 任务，只要有聊天路由，智能体仍然可以通过 `message` 工具直接发送。`--announce` 只控制 runner 对智能体本身尚未发送的最终文本进行兜底投递。

    调试：
    ```bash
    openclaw automations runs <jobId> --limit 50
    ```

    文档：[Cron 作业](/automation/cron-jobs)。

  </Accordion>

  <Accordion id="why-did-an-isolated-cron-run-switch-models-or-retry-once" title="为什么孤立的 cron 运行会切换模型或重试一次？">
    这是实时模型切换路径，而不是重复调度。当活动运行抛出 `LiveSessionModelSwitchError` 时，隔离 cron 会持续执行运行时模型切换并重试，在重试之前保留切换的 provider/model（以及任何切换的身份验证配置文件覆盖）。

    模型选择优先级：首先是 Gmail 挂钩模型覆盖 （`hooks.gmail.model`），然后是每个作业 `model`，然后是任何存储的 cron 会话模型覆盖，然后是正常的 agent/default 模型选择。

    重试循环有上限：初始尝试加 2 次切换重试；随后 cron 会中止，而不是无限循环。

    调试：
    ```bash
    openclaw automations runs <jobId> --limit 50
    ```

    文档：[Cron 任务](/automation/cron-jobs)、[cron CLI](/cli/cron)。

  </Accordion>

  <Accordion id="how-do-i-install-skills-on-linux" title="如何在Linux上安装技能？">
    使用本机 `openclaw skills` 命令或将技能放入您的工作区； macOS 技能 UI 在 Linux 上不可用。浏览技能[https://clawhub.ai](https://clawhub.ai).

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install @owner/<skill-slug>
    openclaw skills install @owner/<skill-slug> --version <version>
    openclaw skills install @owner/<skill-slug> --force
    openclaw skills install @owner/<skill-slug> --global
    openclaw skills update --all
    openclaw skills update --all --global
    openclaw skills list --eligible
    openclaw skills check
    ```

    原生的 `openclaw skills install` 默认写入当前工作区的 `skills/` 目录。添加 `--global` 可将技能安装到所有本地智能体共享的托管技能目录中。只有在发布或同步你自己的技能时，才需要单独安装 `clawhub` CLI。使用 `agents.defaults.skills` 或 `agents.entries.*.skills` 限制哪些智能体可以看到共享技能。

  </Accordion>

  <Accordion id="can-openclaw-run-tasks-on-a-schedule-or-continuously-in-the-background" title="OpenClaw 可以按计划或在后台连续运行任务吗？">
    可以，通过 Gateway 调度器：

    - **Cron 任务**：用于定时或周期性任务（重启后仍然保留）。
    - **Heartbeat**：用于主会话的周期性检查。
    - **隔离任务**：用于自主智能体，发布摘要或投递到聊天中。

    文档：[Cron 任务](/automation/cron-jobs)、[自动化](/automation)、[Heartbeat](/gateway/heartbeat)。

  </Accordion>

  <Accordion id="can-i-run-apple-macos-only-skills-from-linux" title="我可以从 Linux 运行 Apple macOS-only 技能吗？">
    不直接。 macOS 技能由 `metadata.openclaw.os` 加上所需的二进制文件进行控制，并且仅在 **网关主机** 上符合条件时才加载。在 Linux、`darwin`- 上，只有技能（`apple-notes`、`apple-reminders`、`things-mac`）不会加载，除非您覆盖门控。

    有三种支持的模式：

    **选项 A - 在 Mac 上运行网关（最简单）**。运行 macOS 二进制文件所在的网关，然后以 [ 远程模式 ](/help/faq/gateway-ports-and-remote-mode#gateway-ports-already-running-and-remote-mode) 或通过 Tailscale 从 Linux 进行连接。由于网关主机为 macOS，因此技能加载正常。

    **选项 B - 使用 macOS 节点（无 SSH）**。在 Linux 上运行网关，配对 macOS 节点（菜单栏应用程序），并将 **Node 运行命令** 在 Mac 上设置为“始终询问”或“始终允许”。当节点上存在所需的二进制文件时，OpenClaw 仅将 macOS- 技能视为合格；代理通过 `nodes` 工具运行它们。对于“始终询问”，在提示中批准“始终允许”会将该命令添加到允许列表中。

    **选项 C - 通过 SSH（高级）** 代理 macOS 二进制文件。将网关保留在 Linux 上，但将所需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 包装器，然后覆盖该技能以允许 Linux，使其保持合格。

    1. 为该二进制文件创建一个 SSH 包装器（示例：Apple Notes 的 `memo`）：
       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```
    2. 将包装器放到 Linux 主机的 `PATH` 中（例如 `~/bin/memo`）。
    3. 覆盖技能元数据（工作区或 `~/.openclaw/skills`），允许 Linux：
       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```
    4. 启动一个新会话，以刷新技能快照。

  </Accordion>

  <Accordion id="do-you-have-a-notion-or-heygen-integration" title="您有 Notion 或 HeyGen 集成吗？">
    目前没有内置。可选方案：

    - **自定义技能/插件**：最适合可靠的API访问（两者都有API）。
    - **浏览器自动化**：无需代码即可工作，但更慢也更脆弱。

    对于类似代理式的按客户上下文：为每个客户保留一页 Notion（上下文 + 偏好 + 当前工作），并让智能体在会话开始时获取该页面。

    对于本机集成，请提出功能请求或针对这些 API 构建技能。

    ```bash
    openclaw skills install @owner/<skill-slug>
    openclaw skills update --all
    ```

    Native安装落地在活动工作空间`skills/`目录下；对所有本地代理使用 `--global`，或配置 `agents.defaults.skills` / `agents.entries.*.skills` 以限制可见性。有些技能需要 Homebrew- 安装的二进制文件；在 Linux 上，这意味着 Linuxbrew。

    请参阅 [Skills](/tools/skills)、[Skills config](/tools/skills-config)、[ClawHub](/clawhub)。

  </Accordion>

  <Accordion id="how-do-i-use-my-existing-signed-in-chrome-with-openclaw" title="如何将我现有的登录 Chrome 与 OpenClaw 一起使用？">
    使用内置的 `user` 浏览器配置文件，它通过 Chrome DevTools MCP 连接：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果想要自定义名称，请创建一个显式的 MCP 配置文件：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    这可以使用本地宿主机上的浏览器，也可以使用已连接的浏览器节点。如果 Gateway 运行在其他地方，可以在浏览器所在机器上运行一个节点主机，或者改用远程 CDP。

    `existing-session` / `user` 配置文件相对于托管的 `openclaw` 配置文件，目前的限制是：

    - `click`、`type`、`hover`、`scrollIntoView`、`drag` 和 `select` 需要 snapshot refs，而不是 CSS 选择器。
    - 上传钩子需要 `ref` 或 `inputRef`，一次只能传一个文件，不能使用 CSS `element`。
    - `responsebody`、PDF 导出、下载拦截和批量操作仍然需要托管浏览器路径。

    有关完整比较，请参阅 [Browser](/tools/browser/existing-session#existing-session-via-chrome-devtools-mcp)。

  </Accordion>
</AccordionGroup>
