---
summary: "关于 OpenClaw 设置、配置和使用的常见问题"
read_when:
  - 回答常见的设置、安装、入门或运行时支持问题
  - 在深入调试前先对用户报告的问题进行分流
title: "常见问题"
---

针对真实环境部署的快速回答和更深入的故障排查（本地开发、VPS、多智能体、OAuth/API 密钥、模型故障切换）。运行时诊断请参见 [故障排查](/gateway/troubleshooting)。完整配置参考请参见 [配置](/gateway/configuration)。

## 出问题后的前 60 秒

<Steps>
  <Step title="快速状态">
    ```bash
    openclaw status
    ```
    快速本地摘要：操作系统 + 更新、网关/服务可达性、代理/会话、提供方配置 + 运行时问题（当网关可达时）。
  </Step>
  <Step title="可直接粘贴的报告（可安全分享）">
    ```bash
    openclaw status --all
    ```
    只读诊断，附带日志尾部（令牌已脱敏）。
  </Step>
  <Step title="守护进程 + 端口状态">
    ```bash
    openclaw gateway status
    ```
    显示监督器运行状态与 RPC 可达性、探测目标 URL，以及服务可能使用的配置。
  </Step>
  <Step title="深度探测">
    ```bash
    openclaw status --deep
    ```
    实时网关健康探测，包括在支持时的通道探测（需要可达的网关）。参见 [Health](/gateway/health)。
  </Step>
  <Step title="查看最新日志尾部">
    ```bash
    openclaw logs --follow
    ```
    如果 RPC 挂了，可改用：
    ```bash
    tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
    ```
    文件日志与服务日志是分开的；参见 [Logging](/logging) 和 [Troubleshooting](/gateway/troubleshooting)。
  </Step>
  <Step title="运行诊断修复程序（修复）">
    ```bash
    openclaw doctor
    ```
    修复/迁移配置和状态，然后运行健康检查。参见 [Doctor](/gateway/doctor)。
  </Step>
  <Step title="网关快照（仅 WS）">
    ```bash
    openclaw health --json
    openclaw health --verbose   # 在出错时显示目标 URL + 配置路径
    ```
    向正在运行的网关请求完整快照。参见 [Health](/gateway/health)。
  </Step>
</Steps>

## 快速开始与首次运行设置

首次运行问答——安装、入职、认证路由、订阅、初始失败——请参阅 [首次运行常见问题](/help/faq-first-run)。

## 什么是 OpenClaw？

<AccordionGroup>
  <Accordion title="OpenClaw 是什么，用一段话概括？">
    OpenClaw 是一个你在自己的设备上运行的个人 AI 助手。它会在你已经在使用的消息平台上回复你（Discord、Google Chat、iMessage、Mattermost、Signal、Slack、Telegram、WebChat、WhatsApp，以及捆绑的频道插件，例如 QQ Bot），并且在受支持的平台上还可以进行语音交互和实时 Canvas。**Gateway** 是始终在线的控制平面；助手才是产品本身。
  </Accordion>

  <Accordion title="价值主张">
    OpenClaw 不是“只是一个 Claude 包装器”。它是一个 **local-first 控制平面**，在 **你自己的硬件** 上运行一个能力强大的助手，可从你已经在使用的聊天应用中访问，具备有状态会话、记忆和工具能力 - 而不必把你的工作流交给托管式 SaaS。

    - **你的设备，你的数据**：可在任何你想要的地方运行 Gateway（Mac、Linux、VPS），并将工作区和会话历史保留在本地。
    - **真实渠道，而不是网页沙盒**：Discord/iMessage/Signal/Slack/Telegram/WhatsApp 等，以及在受支持平台上的移动端语音和 Canvas。
    - **模型无关**：可使用 Anthropic、MiniMax、OpenAI、OpenRouter 等，并支持按代理路由和故障转移。
    - **仅本地选项**：运行本地模型，使所有数据都能留在你的设备上。
    - **多代理路由**：按频道、账号或任务分别设置代理，每个代理都有自己的工作区和默认配置。
    - **开源且可改造**：可检查、扩展并自托管，不受供应商锁定。

    文档：[Gateway](/gateway)、[Channels](/channels)、[多代理](/concepts/multi-agent)、[记忆](/concepts/memory)。

  </Accordion>

  <Accordion title="我刚刚完成设置 - 第一件该做什么？">
    比较适合的入门项目：搭建一个网站（WordPress、Shopify 或静态站点）；制作一个移动应用原型（大纲、界面、API 规划）；整理文件和文件夹；连接 Gmail 并自动化摘要或跟进。

    它可以处理大型任务，但最佳实践是将其拆分为多个阶段，并使用子代理并行工作。

  </Accordion>

  <Accordion title="OpenClaw 最常见的五个日常使用场景是什么？">
    - **个人简报**：汇总你关心的收件箱、日历和新闻。
    - **研究与起草**：快速研究、摘要，以及邮件或文档的初稿。
    - **提醒与跟进**：由 cron 或 heartbeat 驱动的提醒和检查清单。
    - **浏览器自动化**：填写表单、收集数据、重复执行网页任务。
    - **跨设备协作**：从手机发送任务，让 Gateway 在服务器上运行，再把结果通过聊天返回给你。

  </Accordion>

  <Accordion title="OpenClaw 能帮助 SaaS 做潜在客户开发、外联、广告和博客吗？">
    可以，适用于 **研究、资格筛选和起草**：扫描网站、建立候选名单、总结潜在客户、撰写外联或广告文案初稿。

    对于 **外联或广告投放**，请保留人工介入。避免垃圾信息，遵守当地法律和平台政策，并在发送前审查任何内容。让 OpenClaw 负责起草；由你来批准。

    文档：[安全](/gateway/security)。

  </Accordion>

  <Accordion title="与 Claude Code 相比，它在网页开发方面有哪些优势？">
    OpenClaw 是一个 **个人助手** 和协调层，而不是 IDE 替代品。若要在仓库内进行最快的直接编码循环，请使用 Claude Code 或 Codex。若需要持久记忆、跨设备访问和工具编排，请使用 OpenClaw。

    - 会话之间保留持久记忆和工作区。
    - 多平台访问（Telegram、WhatsApp、TUI、WebChat）。
    - 工具编排（浏览器、文件、调度、hooks）。
    - 始终在线的 Gateway（可运行在 VPS 上，并从任何地方交互）。
    - 用于本地浏览器/屏幕/摄像头/exec 的节点。

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)。

  </Accordion>
</AccordionGroup>

## 技能与自动化

<AccordionGroup>
  <Accordion title="如何在不让仓库变脏的情况下自定义技能？">
    使用托管覆盖，而不是直接编辑仓库副本。将更改放在 `~/.openclaw/skills/<name>/SKILL.md` 中（或者在 `~/.openclaw/openclaw.json` 里通过 `skills.load.extraDirs` 添加一个文件夹）。优先级顺序为：`<workspace>/skills` -> `<workspace>/.agents/skills` -> `~/.agents/skills` -> `~/.openclaw/skills` -> bundled -> `skills.load.extraDirs`，因此托管覆盖会优先于内置技能，而不会触碰 git。若要全局安装但仅限制部分智能体可见，请将共享副本保存在 `~/.openclaw/skills`，并通过 `agents.defaults.skills` / `agents.list[].skills` 控制可见性。只有确实需要上游采纳的改动才应作为 PR 提交到仓库副本。
  </Accordion>

  <Accordion title="我可以从自定义文件夹加载技能吗？">
    可以：通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加目录（在上面的顺序里优先级最低）。`clawhub` 默认安装到 `./skills`，OpenClaw 会在下个会话中将其视为 `<workspace>/skills`。若要限制某些智能体可见，可配合 `agents.defaults.skills` 或 `agents.list[].skills`。
  </Accordion>

  <Accordion title="如何为不同任务使用不同的模型或设置？">
    支持的模式：

    - **Cron 任务**：隔离任务可以为每个任务设置一个 `model` 覆盖。
    - **智能体**：将任务路由到不同的智能体，并为其设置不同的默认模型、思考级别和流式参数。
    - **按需切换**：`/model` 可在任何时候切换当前会话模型。

    示例 - 同一个模型，不同的按智能体设置：

    ```json5
    {
      agents: {
        list: [
          {
            id: "coder",
            model: "xiaomi/mimo-v2.5-pro",
            thinkingDefault: "high",
            params: { temperature: 0.1 },
          },
          {
            id: "chat",
            model: "xiaomi/mimo-v2.5-pro",
            thinkingDefault: "off",
            params: { temperature: 0.8 },
          },
        ],
      },
    }
    ```

    将共享的按模型默认值放在 `agents.defaults.models["provider/model"].params` 中，然后在扁平的 `agents.list[].params` 中放入智能体特定覆盖。不要在嵌套的 `agents.list[].models["provider/model"].params` 下重复同一个模型；该路径用于按智能体的模型目录和运行时覆盖。

    参见 [Cron 任务](/automation/cron-jobs)、[多智能体路由](/concepts/multi-agent)、[配置](/gateway/config-agents)、[斜杠命令](/tools/slash-commands)。

  </Accordion>

  <Accordion title="机器人在执行重任务时卡住了。如何把这部分卸载出去？">
    对于耗时或并行任务，请使用**子智能体**：它们在各自独立的会话中运行，返回摘要，并保持主聊天响应流畅。你可以让机器人“为这个任务启动一个子智能体”，或者使用 `/subagents`。使用 `/status` 查看 Gateway 当前是否繁忙。

    长任务和子智能体都会消耗 token；如果成本重要，可通过 `agents.defaults.subagents.model` 为子智能体设置更便宜的模型。

    文档：[子智能体](/tools/subagents)、[后台任务](/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上绑定线程的子智能体会话是如何工作的？">
    将 Discord 线程绑定到一个子智能体或会话目标，这样后续发到该线程的消息会保留在绑定的会话中。

    - 使用 `sessions_spawn` 并设置 `thread: true` 创建（也可选 `mode: "session"` 以便持续跟进）。
    - 或者用 `/focus <target>` 手动绑定。
    - `/agents` 可检查绑定状态。
    - `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动取消聚焦。
    - `/unfocus` 会解除线程绑定。

    配置：`session.threadBindings.enabled`（全局开关）、`session.threadBindings.idleHours`（默认 `24`，`0` 表示禁用）、`session.threadBindings.maxAgeHours`（默认 `0` = 无硬性上限），以及按频道覆盖的 `channels.discord.threadBindings.{enabled,idleHours,maxAgeHours}`。`channels.discord.threadBindings.spawnSessions` 控制在 spawn 时是否自动绑定（默认 `true`）。

    文档：[子智能体](/tools/subagents)、[Discord](/channels/discord)、[配置参考](/gateway/configuration-reference)、[斜杠命令](/tools/slash-commands)。

  </Accordion>

  <Accordion title="子智能体完成了，但完成更新发到了错误的位置，或者根本没有发送。该检查什么？">
    检查解析后的请求方路由：

    - 完成模式的子智能体投递会优先使用已绑定的线程或会话路由（如果存在）。
    - 如果完成来源只带有一个频道，OpenClaw 会回退到请求方会话中保存的路由（`lastChannel` / `lastTo` / `lastAccountId`），这样仍然可以直接投递成功。
    - 如果没有绑定路由，也没有可用的已保存路由：直接投递可能失败，结果会回退为排队的会话投递，而不是立即发布。
    - 无效或过期的目标也会强制回退到队列，或导致最终投递失败。
    - 如果子任务最后一次可见的 assistant 回复恰好是 `NO_REPLY` / `no_reply` 或 `ANNOUNCE_SKIP`，OpenClaw 会故意抑制 announce，而不是发布过时的较早进度。

    调试：`openclaw tasks show <lookup>`，其中 `<lookup>` 可以是任务 id、运行 id 或会话 key。

    文档：[子智能体](/tools/subagents)、[后台任务](/automation/tasks)、[会话工具](/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒没有触发。我该检查什么？">
    Cron 在 Gateway 进程内运行；如果 Gateway 不是持续运行的，就不会触发。

    - 确认已启用 cron（`cron.enabled`），并且没有设置 `OPENCLAW_SKIP_CRON`。
    - 确认 Gateway 24/7 运行（没有睡眠/重启）。
    - 验证任务时区（`--tz` 与宿主时区）。

    调试：
    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron 任务](/automation/cron-jobs)、[自动化](/automation)。

  </Accordion>

  <Accordion title="Cron 触发了，但没有任何内容发送到频道。为什么？">
    检查投递模式：

    - `--no-deliver` / `delivery.mode: "none"`：不会期待 runner 进行兜底发送。
    - 缺少或无效的 announce 目标（`channel` / `to`）：runner 会跳过外发投递。
    - 频道认证失败（`unauthorized`、`Forbidden`）：runner 尝试投递了，但凭据阻止了它。
    - 无声的隔离结果（仅 `NO_REPLY` / `no_reply`）会被视为有意不可投递，因此也会抑制排队的兜底投递。

    对于隔离的 cron 任务，只要有聊天路由，智能体仍然可以通过 `message` 工具直接发送。`--announce` 只控制 runner 对智能体本身尚未发送的最终文本进行兜底投递。

    调试：
    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <lookup>
    ```

    文档：[Cron 任务](/automation/cron-jobs)、[后台任务](/automation/tasks)。

  </Accordion>

  <Accordion title="为什么一个隔离的 cron 运行会切换模型或重试一次？">
    这是实时模型切换路径，不是重复调度。隔离 cron 会持久化一次运行时模型切换，并在当前运行抛出 `LiveSessionModelSwitchError` 时重试，在重试前保留已切换的提供方/模型（以及任何已切换的认证配置文件覆盖）。

    模型选择优先级：先看 Gmail 钩子的模型覆盖（`hooks.gmail.model`），然后是按任务的 `model`，然后是已保存的 cron 会话模型覆盖，最后才是正常的智能体/默认模型选择。

    重试循环有上限：初始尝试加 2 次切换重试；随后 cron 会中止，而不是无限循环。

    调试：
    ```bash
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron 任务](/automation/cron-jobs)、[cron CLI](/cli/cron)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装技能？">
    使用原生的 `openclaw skills` 命令，或者把技能直接放入你的工作区；macOS 的 Skills UI 在 Linux 上不可用。可在 [https://clawhub.ai](https://clawhub.ai) 浏览技能。

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

    原生的 `openclaw skills install` 默认会写入当前工作区的 `skills/` 目录。添加 `--global` 可安装到为所有本地智能体共享的托管技能目录。只有在你想发布或同步自己技能时，才需要单独安装 `clawhub` CLI。使用 `agents.defaults.skills` 或 `agents.list[].skills` 缩小可见这些共享技能的智能体范围。

  </Accordion>

  <Accordion title="OpenClaw 可以按计划或在后台持续运行任务吗？">
    可以，通过 Gateway 调度器：

    - **Cron 任务**：用于定时或周期性任务（重启后仍然保留）。
    - **Heartbeat**：用于主会话的周期性检查。
    - **隔离任务**：用于自主智能体，发布摘要或投递到聊天中。

    文档：[Cron 任务](/automation/cron-jobs)、[自动化](/automation)、[Heartbeat](/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我可以在 Linux 上运行仅适用于 Apple macOS 的技能吗？">
    不能直接运行。macOS 技能受 `metadata.openclaw.os` 以及所需二进制文件限制，并且只会在 **Gateway 主机** 满足条件时加载。在 Linux 上，`darwin` 专用技能（`apple-notes`、`apple-reminders`、`things-mac`）不会加载，除非你覆盖该限制。

    有三种支持的模式：

    **方案 A - 在 Mac 上运行 Gateway（最简单）**。在具备 macOS 二进制文件的机器上运行 Gateway，然后通过 [远程模式](#gateway-ports-already-running-and-remote-mode) 或 Tailscale 从 Linux 连接。由于 Gateway 主机是 macOS，技能会正常加载。

    **方案 B - 使用 macOS 节点（无需 SSH）**。在 Linux 上运行 Gateway，配对一个 macOS 节点（菜单栏应用），并在 Mac 上将 **Node Run Commands** 设置为 “Always Ask” 或 “Always Allow”。当所需二进制文件存在于节点上时，OpenClaw 会将 macOS 专用技能视为可用；智能体会通过 `nodes` 工具运行它们。若选择 “Always Ask”，在提示中批准 “Always Allow” 会将该命令加入允许列表。

    **方案 C - 通过 SSH 代理 macOS 二进制文件（高级）**。保持 Gateway 在 Linux 上运行，但让所需的 CLI 二进制文件解析为在 Mac 上执行的 SSH 包装器，然后覆盖技能以允许 Linux，这样它仍会保持可用。

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
       description: 通过 macOS 上的 memo CLI 管理 Apple Notes。
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```
    4. 启动一个新会话，以刷新技能快照。

  </Accordion>

  <Accordion title="你们有 Notion 或 HeyGen 集成吗？">
    目前没有内置。可选方案：

    - **自定义技能 / 插件**：最适合稳定的 API 访问（两者都有 API）。
    - **浏览器自动化**：无需代码即可工作，但更慢也更脆弱。

    对于类似代理式的按客户上下文：为每个客户保留一页 Notion（上下文 + 偏好 + 当前工作），并让智能体在会话开始时获取该页面。

    如果需要原生集成，可以提交功能请求，或者基于这些 API 自行构建一个技能。

    ```bash
    openclaw skills install @owner/<skill-slug>
    openclaw skills update --all
    ```

    原生安装会落在当前工作区的 `skills/` 目录；使用 `--global` 可供所有本地智能体使用，或者通过配置 `agents.defaults.skills` / `agents.list[].skills` 限制可见性。某些技能需要通过 Homebrew 安装的二进制文件；在 Linux 上则意味着 Linuxbrew。

    参见 [技能](/tools/skills)、[技能配置](/tools/skills-config)、[ClawHub](/tools/clawhub)。

  </Accordion>

  <Accordion title="如何让 OpenClaw 使用我已经登录的 Chrome？">
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

    完整对比请参见 [Browser](/tools/browser#existing-session-via-chrome-devtools-mcp)。
  </Accordion>
</AccordionGroup>

## 沙箱和内存

<AccordionGroup>
  <Accordion title="是否有专门的沙箱文档？">
    有：[Sandboxing](/gateway/sandboxing)。关于 Docker 的具体设置（Docker 中的完整 gateway 或沙箱镜像），请参见 [Docker](/install/docker)。
  </Accordion>

  <Accordion title="Docker 感觉受限 - 我该如何启用完整功能？">
    默认镜像以安全优先运行，并且以 `node` 用户身份运行，因此不包含系统包、Homebrew 和捆绑浏览器。要获得更完整的设置：

    - 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，这样缓存就能保留。
    - 使用 `OPENCLAW_IMAGE_APT_PACKAGES` 将系统依赖打包进镜像。
    - 通过捆绑的 CLI 安装 Playwright 浏览器：`node /app/node_modules/playwright-core/cli.js install chromium`。
    - 设置 `PLAYWRIGHT_BROWSERS_PATH` 并持久化该路径。

    文档：[Docker](/install/docker), [Browser](/tools/browser)。

  </Accordion>

  <Accordion title="我能否在使用一个 agent 的情况下，让私聊保持私密，但把群组设为公开/沙箱化？">
    可以，如果私有流量是 **DMs**，公开流量是 **groups**。将 `agents.defaults.sandbox.mode` 设为 `"non-main"`，这样群组/频道会话（non-main keys）会在配置的沙箱后端中运行，而主 DM 会话仍保留在主机上。启用沙箱后，Docker 是默认后端。可通过 `tools.sandbox.tools` 限制沙箱会话中可用的工具。

    操作指南：[Groups: personal DMs + public groups](/channels/groups#pattern-personal-dms-public-groups-single-agent)。关键参考：[Gateway configuration](/gateway/config-agents#agentsdefaultssandbox)。

  </Accordion>

  <Accordion title="如何把主机文件夹挂载到沙箱中？">
    将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:container:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局和按 agent 的挂载会合并；当 `scope: "shared"` 时，会忽略按 agent 的挂载。对任何敏感内容都使用 `:ro`；挂载会绕过沙箱文件系统边界。

    OpenClaw 会同时根据规范化路径和通过最深的已存在祖先解析出的规范路径来验证挂载源，因此即使最终路径段尚不存在，符号链接父级逃逸也会被阻止。

    参见 [Sandboxing](/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

  </Accordion>

  <Accordion title="内存是如何工作的？">
    OpenClaw 的内存是 agent 工作区中的 Markdown 文件：`memory/YYYY-MM-DD.md` 中的每日笔记，以及 `MEMORY.md` 中整理过的长期笔记（仅主/私有会话）。

    OpenClaw 还会在压缩总结对话之前静默执行一次 **压缩前内存刷新**，提醒模型先写入持久化笔记。它只会在工作区可写时运行（只读沙箱会跳过）；可通过 `agents.defaults.compaction.memoryFlush.enabled: false` 关闭。参见 [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="Memory 总是忘记事情。我该如何让它记住？">
    让 bot **把事实写入 memory**：长期笔记放在 `MEMORY.md` 中，短期上下文放在 `memory/YYYY-MM-DD.md` 中。提醒模型存储记忆通常就能解决问题。如果它仍然忘记，请确认 Gateway 每次运行时使用的是同一个工作区。

    文档：[Memory](/concepts/memory), [Agent workspace](/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="Memory 会永久保留吗？有哪些限制？">
    Memory 文件保存在磁盘上，会一直保留直到被删除；限制取决于你的存储空间，而不是模型。**会话上下文**仍受模型上下文窗口限制，因此长对话可能会被压缩或截断——这就是为什么需要 memory search：它只把相关部分重新拉回上下文中。

    文档：[Memory](/concepts/memory), [Context](/concepts/context)。

  </Accordion>

  <Accordion title="语义 memory search 需要 OpenAI API key 吗？">
    只有在你使用 **OpenAI embeddings** 时才需要，而这也是默认提供方。Codex OAuth 只覆盖 chat/completions，并**不会**授予 embeddings 访问权限，因此使用 Codex 登录（OAuth 或 Codex CLI 登录）不会启用语义 memory search。OpenAI embeddings 仍然需要真实的 API key（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    若想保持本地运行，可将 `agents.defaults.memorySearch.provider: "local"`（GGUF/llama.cpp）。其他受支持的提供方包括：Bedrock、DeepInfra、Gemini（`GEMINI_API_KEY` 或 `memorySearch.remote.apiKey`）、GitHub Copilot、LM Studio、Mistral、Ollama、OpenAI-compatible 和 Voyage。设置详情请参见 [Memory](/concepts/memory) 和 [Memory search](/concepts/memory-search)。

  </Accordion>
</AccordionGroup>

## 磁盘上的内容位置

<AccordionGroup>
  <Accordion title="OpenClaw 使用的所有数据都会保存在本地吗？">
    不是：**OpenClaw 自身的状态保存在本地**，但**外部服务仍然能看到你发送给它们的内容**。

    - **默认本地存储**：会话、记忆文件、配置和工作区都位于 Gateway 主机上（`~/.openclaw` 以及你的工作区目录）。
    - **因需求而远程**：发送给模型提供方（Anthropic/OpenAI 等）的消息会传到它们的 API，而聊天平台（Slack/Telegram/WhatsApp 等）会将消息数据存储在它们自己的服务器上。
    - **你可以控制足迹**：本地模型会把提示词保留在你的机器上，但通道流量仍会经过该通道的服务器。

    相关：[Agent workspace](/concepts/agent-workspace), [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 把数据存储在哪里？">
    一切都位于 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

    | Path                                                               | Purpose                                                            |
    | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                                 | 主配置（JSON5）                                                     |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                        | 旧版 OAuth 导入（首次使用时复制到 auth profiles 中）                |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json`     | 身份验证配置文件（OAuth、API keys、可选 `keyRef`/`tokenRef`）      |
    | `$OPENCLAW_STATE_DIR/secrets.json`                                  | 用于 `file` SecretRef 提供方的可选文件后端密钥载荷                 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`              | 旧版兼容文件（静态 `api_key` 条目会被清理）                         |
    | `$OPENCLAW_STATE_DIR/credentials/`                                  | 提供方状态（例如 `whatsapp/<accountId>/creds.json`）               |
    | `$OPENCLAW_STATE_DIR/agents/`                                       | 每个 agent 的状态（agentDir + 旧版/归档会话工件）                  |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/openclaw-agent.sqlite`  | 每个 agent 的 SQLite 状态，包括会话行和转录内容                    |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                    | 旧版会话迁移来源以及归档/支持工件                                  |

    旧版单 agent 路径 `~/.openclaw/agent/*` 会由 `openclaw doctor` 迁移。

    你的**工作区**（AGENTS.md、memory 文件、skills 等）是单独的，通过 `agents.defaults.workspace` 配置（默认：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？">
    它们位于**agent 工作区**中，而不是 `~/.openclaw`。

    - **工作区（每个 agent 一个）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、`MEMORY.md`、`memory/YYYY-MM-DD.md`、可选的 `HEARTBEAT.md`。根目录小写的 `memory.md` 只是旧版修复输入；当两者都存在时，`openclaw doctor --fix` 可以将其合并到 `MEMORY.md` 中。
    - **状态目录（`~/.openclaw`）**：配置、通道/提供方状态、身份验证配置文件、会话、日志、共享 skills（`~/.openclaw/skills`）。

    默认工作区是 `~/.openclaw/workspace`，可配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后“忘记”了内容，请确认 Gateway 每次启动都使用相同的工作区（远程模式使用的是**gateway 主机**上的工作区，而不是你本地笔记本上的）。

    提示：如果需要持久行为或偏好，最好让机器人把它**写入 AGENTS.md 或 MEMORY.md**，而不是依赖聊天历史。

    参见 [Agent workspace](/concepts/agent-workspace) 和 [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="SOUL.md 可以变得更大吗？">
    可以。`SOUL.md` 是注入到 agent 上下文中的工作区启动文件之一。默认单文件注入上限为 `20000` 个字符；跨文件的总启动预算为 `60000` 个字符。

    更改共享默认值：

    ```json5
    {
      agents: {
        defaults: {
          bootstrapMaxChars: 50000,
          bootstrapTotalMaxChars: 300000,
        },
      },
    }
    ```

    或者在 `agents.list[].bootstrapMaxChars` / `bootstrapTotalMaxChars` 下为某个 agent 单独覆盖。

    使用 `/context` 查看原始大小与注入后大小，以及是否发生了截断。保持 `SOUL.md` 重点描述语气、立场和个性；把操作规则放在 `AGENTS.md` 中，把持久事实放在 memory 中。

    参见 [Context](/concepts/context) 和 [Agent config](/gateway/config-agents)。

  </Accordion>

  <Accordion title="推荐的备份策略">
    将你的**agent 工作区**放在一个**私有**的 git 仓库中，并把它备份到某个私有位置（例如 GitHub private）。这样可以保存 memory 以及 AGENTS/SOUL/USER 文件，并允许你以后恢复助手的“思维”。

    不要提交 `~/.openclaw` 下的任何内容（凭证、会话、令牌、加密的密钥载荷）。要进行完整恢复，请分别备份工作区和状态目录。

    文档：[Agent workspace](/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="如何彻底卸载 OpenClaw？">
    参见 [Uninstall](/install/uninstall)。
  </Accordion>

  <Accordion title="agent 可以在工作区之外工作吗？">
    可以。工作区是**默认 cwd** 和记忆锚点，而不是硬性沙箱。相对路径会解析到工作区内；如果未启用沙箱，绝对路径可以访问主机上的其他位置。若要隔离，请使用 [`agents.defaults.sandbox`](/gateway/sandboxing) 或每个 agent 的沙箱设置。要把某个仓库设为默认工作目录，请把该 agent 的 `workspace` 指向仓库根目录——OpenClaw 仓库本身只是源代码，所以除非你有意让 agent 在其中工作，否则应保持工作区分离。

    ```json5
    {
      agents: {
        defaults: {
          workspace: "~/Projects/my-repo",
        },
      },
    }
    ```
    
  </Accordion>

  <Accordion title="远程模式：会话存储在哪里？">
    会话状态归**gateway 主机**所有。在远程模式下，你关心的会话存储位于远程机器上，而不是你本地的笔记本上。参见 [Session management](/concepts/session)。
  </Accordion>
</AccordionGroup>

## 配置基础

<AccordionGroup>
  <Accordion title="配置格式是什么？它在哪里？">
    OpenClaw 会从 `$OPENCLAW_CONFIG_PATH` 读取一个可选的 **JSON5** 配置（默认：`~/.openclaw/openclaw.json`）。如果文件缺失，它会使用相对安全的默认值，包括默认工作区 `~/.openclaw/workspace`。
  </Accordion>

  <Accordion title='我设置了 gateway.bind: "lan"（或 "tailnet"），但现在没有任何东西在监听 / UI 显示未授权'>
    非回环绑定 **需要有效的 gateway 认证路径**：共享密钥认证（token 或 password），或者在配置正确的支持身份感知的反向代理后使用 `gateway.auth.mode: "trusted-proxy"`。

    ```json5
    {
      gateway: {
        bind: "lan",
        auth: {
          mode: "token",
          token: "replace-me",
        },
      },
    }
    ```

    - `gateway.remote.token` / `.password` **不会**单独启用本地 gateway 认证；只有在 `gateway.auth.*` 未设置时，本地调用路径才可以将 `gateway.remote.*` 作为后备。
    - 对于密码认证，请设置 `gateway.auth.mode: "password"` 以及 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果通过 SecretRef 显式配置了 `gateway.auth.token` / `.password` 但未解析成功，则解析会失败并关闭（不会被远程后备路径掩盖）。
    - 共享密钥的 Control UI 设置通过 `connect.params.auth.token` 或 `connect.params.auth.password` 进行认证（存储在应用/UI 设置中）。像 Tailscale Serve 或 `trusted-proxy` 这样的身份携带模式则改为使用请求头——避免在 URL 中放置共享密钥。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 时，同主机回环反向代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`，并在 `gateway.trustedProxies` 中添加一个回环条目。

  </Accordion>

  <Accordion title="为什么我现在在 localhost 上也需要 token？">
    OpenClaw 默认强制启用 gateway 认证，包括回环。若未配置显式认证路径，启动时会解析为 token 模式，并为该次启动生成仅运行时可用的 token，因此本地 WS 客户端必须进行认证。这会阻止其他本地进程调用 Gateway。

    当客户端需要跨重启保持稳定密钥时，请显式配置 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。你也可以选择密码模式，或者为支持身份感知的反向代理使用 `trusted-proxy`。如果希望开放回环访问，请显式设置 `gateway.auth.mode: "none"`。`openclaw doctor --generate-gateway-token` 可以随时生成一个 token。

  </Accordion>

  <Accordion title="修改配置后必须重启吗？">
    Gateway 会监视配置并支持热重载：`gateway.reload.mode: "hybrid"`（默认）会热应用安全的更改，并在关键更改时重启。`hot`、`restart` 和 `off` 也受支持。大多数 `tools.*`、`agents.*` 策略、`session.*` 和 `messages.*` 的更改会立即生效，完全不需要任何重载操作；`gateway.*` 的绑定/端口更改则需要重启。
  </Accordion>

  <Accordion title="如何禁用有趣的 CLI 标语？">
    设置 `cli.banner.taglineMode`：

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off`：隐藏标语文本，但保留横幅标题/版本行。
    - `default`：始终使用 `All your chats, one OpenClaw.`。
    - `random`：轮换显示有趣/季节性标语（默认行为）。
    - 如果连横幅也不要，设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何启用网页搜索（以及网页抓取）？">
    `web_fetch` 不需要 API key。`web_search` 取决于你选择的提供商：

    | 提供商 | 无需 key | 环境变量 |
    | --- | --- | --- |
    | Brave | 否 | `BRAVE_API_KEY` |
    | DuckDuckGo | 是（非官方、基于 HTML） | - |
    | Exa | 否 | `EXA_API_KEY` |
    | Firecrawl | 否 | `FIRECRAWL_API_KEY` |
    | Gemini | 否 | `GEMINI_API_KEY` |
    | Grok | 否（xAI OAuth 或 key） | `XAI_API_KEY` |
    | Kimi | 否 | `KIMI_API_KEY` 或 `MOONSHOT_API_KEY` |
    | MiniMax Search | 否 | `MINIMAX_CODE_PLAN_KEY`、`MINIMAX_CODING_API_KEY` 或 `MINIMAX_API_KEY` |
    | Ollama Web Search | 是（需要 `ollama signin`） | - |
    | Perplexity | 否 | `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY` |
    | SearXNG | 是（自托管） | `SEARXNG_BASE_URL` |
    | Tavily | 否 | `TAVILY_API_KEY` |

    Grok 还可以复用模型认证中的 xAI OAuth（`openclaw onboard --auth-choice xai-oauth`）。

    **推荐**：运行 `openclaw configure --section web` 并选择一个提供商。

    ```json5
    {
      plugins: {
        entries: {
          brave: {
            config: {
              webSearch: {
                apiKey: "BRAVE_API_KEY_HERE",
              },
            },
          },
        },
      },
      tools: {
        web: {
          search: {
            enabled: true,
            provider: "brave",
            maxResults: 5,
          },
          fetch: {
            enabled: true,
            provider: "firecrawl", // 可选；省略则自动检测
          },
        },
      },
    }
    ```

    各提供商特定的网页搜索配置位于 `plugins.entries.<plugin>.config.webSearch.*` 下。为兼容旧版，`tools.web.search.*` 的提供商路径仍会加载，但新配置中不应再使用。Firecrawl 的网页抓取后备配置位于 `plugins.entries.firecrawl.config.webFetch.*` 下。

    - 白名单：添加 `web_search`/`web_fetch`/`x_search`，或者使用 `group:web` 同时允许这三者。
    - `web_fetch` 默认启用。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 会从可用凭据中自动检测第一个可用的抓取后备提供商；官方 Firecrawl 插件提供该后备。
    - 守护进程会从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档：[Web tools](/tools/web)。

  </Accordion>

  <Accordion title="config.apply 把我的配置清空了。我该如何恢复并避免这种情况？">
    `config.apply` 会替换**整个配置**；只提供部分对象会删除其他所有内容。

    目前 OpenClaw 已尽量防止大多数意外覆盖：

    - OpenClaw 自己写入的配置会在写入前验证完整的变更后配置。
    - 无效或破坏性的 OpenClaw 写入会被拒绝，并保存为 `openclaw.json.rejected.*`。
    - 直接编辑导致启动或热重载失败时，Gateway 会 fail closed 或跳过重载；它不会重写 `openclaw.json`。
    - `openclaw doctor --fix` 负责修复，能够恢复最近已知良好版本，并将被拒绝的文件保存为 `openclaw.json.clobbered.*`。

    恢复方法：

    - 查看 `openclaw logs --follow` 中的 `Invalid config at`、`Config write rejected:` 或 `config reload skipped (invalid config)`。
    - 检查活动配置旁边最新的 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 运行 `openclaw config validate` 和 `openclaw doctor --fix`。
    - 仅使用 `openclaw config set` 或 `config.patch` 把需要的键复制回去。
    - 如果没有 last-known-good 或 rejected 负载：从备份恢复，或者重新运行 `openclaw doctor` 并重新配置 channels/models。
    - 如果出现意外丢失：带上你最后已知的配置或备份提交 bug。本地编码代理通常可以根据日志或历史重建可工作的配置。

    避免方法：小改动用 `openclaw config set`，交互式编辑用 `openclaw configure`，用 `config.schema.lookup` 查看不熟悉的路径（会返回一个浅层 schema 节点及其直接子项摘要），用 `config.patch` 做部分 RPC 编辑——将 `config.apply` 保留给完整配置替换。面向代理的 `gateway` 运行时工具即使通过旧的 `tools.bash.*` 别名，也拒绝重写 `tools.exec.ask` / `tools.exec.security`。

    文档：[Config](/cli/config)、[Configure](/cli/configure)、[Gateway troubleshooting](/gateway/troubleshooting#gateway-rejected-invalid-config)、[Doctor](/gateway/doctor)。

  </Accordion>

  <Accordion title="如何在多个设备上运行一个中心 Gateway，并配合专门的 worker？">
    常见模式：**一个 Gateway**（例如树莓派）加上 **nodes** 和 **agents**。

    - **Gateway（中心）**：负责 channels（Signal/WhatsApp）、路由、会话。
    - **Nodes（设备）**：Mac/iOS/Android 作为外设连接，并暴露本地工具（`system.run`、`canvas`、`camera`）。
    - **Agents（worker）**：为特殊角色（例如运维 vs 个人数据）分离出的不同“大脑/工作区”。
    - **Sub-agents**：从主 agent 派生后台工作以实现并行。
    - **TUI**：连接到 Gateway 并切换 agents/sessions。

    文档：[Nodes](/nodes)、[Remote access](/gateway/remote)、[Multi-Agent Routing](/concepts/multi-agent)、[Sub-agents](/tools/subagents)、[TUI](/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 浏览器可以无头运行吗？">
    可以：

    ```json5
    {
      browser: { headless: true },
      agents: {
        defaults: {
          sandbox: { browser: { headless: true } },
        },
      },
    }
    ```

    默认值为 `false`（有头模式）。无头模式更容易在某些站点触发反机器人检测（X/Twitter 常常会阻止无头会话）。它使用相同的 Chromium 引擎，并适用于大多数自动化；主要区别是没有可见的浏览器窗口（需要视觉效果时请使用截图）。参见 [Browser](/tools/browser)。

  </Accordion>

  <Accordion title="如何使用 Brave 进行浏览器控制？">
    将 `browser.executablePath` 设置为你的 Brave 二进制文件（或任何基于 Chromium 的浏览器），然后重启 Gateway。参见 [Browser](/tools/browser#use-brave-or-another-chromium-based-browser)。
  </Accordion>
</AccordionGroup>

## 远程 gateway 和节点

<AccordionGroup>
  <Accordion title="Telegram、gateway 和节点之间的命令是如何传递的？">
    Telegram 消息由 **gateway** 处理，gateway 会运行 agent，只有在需要节点工具时才通过 **Gateway WebSocket** 调用节点：

    Telegram -> Gateway -> Agent -> `node.*` -> Node -> Gateway -> Telegram

    节点看不到来自提供方的入站流量；它们只接收 node RPC 调用。

  </Accordion>

  <Accordion title="如果 Gateway 托管在远程，agent 如何访问我的电脑？">
    将你的电脑配对为一个 **node**。Gateway 运行在别处，但可以通过 Gateway WebSocket 在你的本地机器上调用 `node.*` 工具（屏幕、摄像头、系统）。

    1. 在始终在线的主机（VPS/家用服务器）上运行 Gateway。
    2. 将 Gateway 主机和你的电脑放在同一个 tailnet 中。
    3. 确保 Gateway WS 可达（tailnet 绑定或 SSH 隧道）。
    4. 在本地打开 macOS 应用，并以 **通过 SSH 远程** 模式连接（或直接 tailnet 连接），这样它就会注册为 node。
    5. 批准该 node：
       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP bridge；nodes 通过 Gateway WebSocket 连接。

    安全提示：配对一个 macOS node 会允许在那台机器上执行 `system.run`。只配对你信任的设备；请查看 [安全](/gateway/security)。

    文档：[Nodes](/nodes), [Gateway 协议](/gateway/protocol), [macOS 远程模式](/platforms/mac/remote), [安全](/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已连接但没有任何回复。现在怎么办？">
    检查基础项：

    ```bash
    openclaw gateway status
    openclaw status
    openclaw channels status
    ```

    然后验证认证和路由：如果你使用 Tailscale Serve，确认 `gateway.auth.allowTailscale` 已正确设置；如果你通过 SSH 隧道连接，确认隧道已启动并指向正确的端口；确认你的 DM/群组 allowlist 包含你的账号。

    文档：[Tailscale](/gateway/tailscale), [远程访问](/gateway/remote), [Channels](/channels)。

  </Accordion>

  <Accordion title="两个 OpenClaw 实例可以互相通信吗（本地 + VPS）？">
    可以，不过没有内置的 bot-to-bot 桥接。

    **最简单**：使用两个 bot 都能访问的普通聊天频道（Slack/Telegram/WhatsApp）。让 Bot A 给 Bot B 发消息，然后让 Bot B 按常规回复。

    **CLI bridge（通用）**：运行一个脚本，使用 `openclaw agent --message ... --deliver` 调用另一个 Gateway，并把目标指向另一个 bot 监听的聊天。若其中一个 bot 在远程 VPS 上，通过 SSH/Tailscale 将你的 CLI 指向那个远程 Gateway（见 [远程访问](/gateway/remote)）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    加一个保护措施，防止两个 bot 无限制地循环（仅提及、channel allowlist，或“不要回复 bot 消息”的规则）。

    文档：[远程访问](/gateway/remote), [Agent CLI](/cli/agent), [Agent send](/tools/agent-send)。

  </Accordion>

  <Accordion title="多个 agent 需要分别使用不同的 VPS 吗？">
    不需要。一个 Gateway 可以托管多个 agent，每个 agent 都有自己的 workspace、模型默认值和路由——这才是正常方案，也比每个 agent 一个 VPS 更便宜、更简单。只有在需要硬隔离（安全边界）或你不希望共享的非常不同配置时，才使用多个 VPS。
  </Accordion>

  <Accordion title="在个人笔记本上使用 node，相比从 VPS 通过 SSH 连接有什么好处？">
    有：node 是从远程 Gateway 访问你的笔记本的首选方式，而且解锁的不只是 shell 访问。Gateway 运行在 macOS/Linux（Windows 通过 WSL2）上，且非常轻量（小型 VPS 或树莓派级别设备即可；4 GB RAM 就足够），因此常见架构是一个始终在线的主机加上你的笔记本作为 node。

    - **不需要入站 SSH** - nodes 通过设备配对主动连接到 Gateway WebSocket。
    - **更安全的执行控制** - `system.run` 受该笔记本上的 node allowlist/审批控制。
    - **更多设备工具** - 除了 `system.run`，nodes 还提供 `canvas`、`camera` 和 `screen`。
    - **本地浏览器自动化** - 保持 Gateway 在 VPS 上运行，但通过 node 主机在本地运行 Chrome，或者通过 Chrome MCP 连接本地 Chrome。

    SSH 适合临时的 shell 访问；nodes 更适合持续性的 agent 工作流和设备自动化。

    文档：[Nodes](/nodes), [Nodes CLI](/cli/nodes), [Browser](/tools/browser)。

  </Accordion>

  <Accordion title="node 会运行 gateway 服务吗？">
    不会。除非你有意运行隔离的配置文件（见 [多个 gateways](/gateway/multiple-gateways)），否则每台主机上只应运行 **一个 gateway**。Nodes 是连接到 gateway 的外设（iOS/Android nodes，或 menubar 应用中的 macOS“node 模式”）。对于无头 node 主机和 CLI 控制，请参见 [Node 主机 CLI](/cli/node)。

    对 `gateway`、`discovery` 和托管插件表面的更改需要完整重启。

  </Accordion>

  <Accordion title="有没有通过 API / RPC 应用配置的方式？">
    有：

    - `config.schema.lookup`：在写入前，查看一个配置子树及其浅层 schema 节点、匹配的 UI 提示和直接子项摘要。
    - `config.get`：获取当前快照及其 hash。
    - `config.patch`：安全的局部更新（对大多数 RPC 编辑推荐使用）；在可能时热重载，必要时重启。
    - `config.apply`：验证并替换完整配置；在可能时热重载，必要时重启。
    - 面向 agent 的 `gateway` 运行时工具仍然拒绝重写 `tools.exec.ask` / `tools.exec.security`；旧的 `tools.bash.*` 别名会归一化到同一受保护路径。

  </Accordion>

  <Accordion title="首次安装时最小且合理的配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这会设置你的 workspace，并限制谁可以触发 bot。

  </Accordion>

  <Accordion title="如何在 VPS 上设置 Tailscale，并从我的 Mac 连接？">
    1. **在 VPS 上安装并登录**：
       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```
    2. **在你的 Mac 上安装并登录**，使用 Tailscale 应用，并确保在同一个 tailnet 中。
    3. **在 Tailscale 管理控制台启用 MagicDNS**，这样 VPS 就会有一个稳定名称。
    4. **使用 tailnet 主机名**：SSH `ssh user@your-vps.tailnet-xxxx.ts.net`; Gateway WS `ws://your-vps.tailnet-xxxx.ts.net:18789`。

    如果不使用 SSH，而要访问 Control UI，请在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这会让 gateway 绑定到回环地址，并通过 Tailscale 暴露 HTTPS。参见 [Tailscale](/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何将 Mac node 连接到远程 Gateway（Tailscale Serve）？">
    Serve 暴露的是 **Gateway Control UI + WS**；nodes 通过同一个 Gateway WS 端点连接。

    1. 确保 VPS 和 Mac 在同一个 tailnet 中。
    2. 在 macOS 应用中使用 Remote 模式（SSH 目标可以是 tailnet 主机名）——它会隧道转发 Gateway 端口并作为 node 连接。
    3. 批准该 node：
       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档：[Gateway 协议](/gateway/protocol), [Discovery](/gateway/discovery), [macOS 远程模式](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我应该安装在第二台笔记本上，还是只添加一个 node？">
    如果第二台笔记本上只需要 **本地工具**（screen/camera/exec），那就把它添加为 **node**——一个 Gateway，不需要重复配置。目前本地 node 工具仅支持 macOS。只有在需要 **硬隔离** 或两个完全独立的 bot 时，才安装第二个 Gateway。

    文档：[Nodes](/nodes), [Nodes CLI](/cli/nodes), [多个 gateways](/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 环境变量和 .env 加载

<AccordionGroup>
  <Accordion title="OpenClaw 如何加载环境变量？">
    OpenClaw 会从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

    - 来自当前工作目录的 `.env`。
    - 来自 `~/.openclaw/.env`（`$OPENCLAW_STATE_DIR/.env`）的全局兜底 `.env`。

    这两个 `.env` 文件都不会覆盖已存在的环境变量。提供商凭据和端点路由键对工作区 `.env` 是例外：像 `GEMINI_API_KEY`、`XAI_API_KEY`、`MISTRAL_API_KEY`，或任何以 `_ENDPOINT` 结尾的键（以及其他捆绑提供商的认证或端点环境变量）都会被工作区 `.env` 忽略，应该放在进程环境、`~/.openclaw/.env` 或配置 `env` 中。

    配置中的内联环境变量仅在进程环境中缺失时才会生效：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    完整优先级和来源请参见 [/environment](/help/environment)。

  </Accordion>

  <Accordion title="我通过 service 启动了 Gateway，但我的环境变量不见了。现在怎么办？">
    两种修复方法：

    1. 将缺失的键放到 `~/.openclaw/.env` 中，这样即使 service 没有继承你的 shell 环境也会加载。
    2. 启用 shell 导入（可选便利功能）：
       ```json5
       {
         env: {
           shellEnv: {
             enabled: true,
             timeoutMs: 15000,
           },
         },
       }
       ```
       这会运行你的登录 shell，并且只导入缺失的预期键（绝不会覆盖）。对应的环境变量为：`OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我设置了 COPILOT_GITHUB_TOKEN，但 models status 显示 "Shell env: off." 为什么？'>
    `openclaw models status` 会报告是否启用了**shell 环境导入**。"Shell env: off" 并**不**意味着你的环境变量丢失了——它只是表示 OpenClaw 不会自动加载你的登录 shell。

    如果 Gateway 作为 service（launchd/systemd）运行，它不会继承你的 shell 环境。解决方法是把 token 放到 `~/.openclaw/.env`，启用 `env.shellEnv.enabled: true`，或者将其添加到配置 `env` 中（仅在缺失时生效），然后重启 gateway 并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot token 的解析顺序是：`OPENCLAW_GITHUB_TOKEN`，然后是 `COPILOT_GITHUB_TOKEN`，然后是 `GH_TOKEN`，最后是 `GITHUB_TOKEN`。

    参见 [/concepts/model-providers](/concepts/model-providers) 和 [/environment](/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话和多个聊天

<AccordionGroup>
  <Accordion title="如何开始一个全新的对话？">
    发送 `/new` 或 `/reset` 作为独立消息。参见 [Session management](/concepts/session)。
  </Accordion>

  <Accordion title="如果我从不发送 /new，会话会自动重置吗？">
    会。默认重置策略是 **daily**：会话会在网关主机上配置的本地小时数重置（`session.reset.atHour`，默认 `4`，取值 0-23），具体取决于当前会话开始的时间。也可以改为基于空闲时间的重置，使用 `mode: "idle"` 和 `session.reset.idleMinutes`；它会在一段不活动时间后使会话过期（基于最近一次真实交互，而不是 heartbeat/cron/exec 系统事件）。

    ```json5
    {
      session: {
        reset: { mode: "daily", atHour: 4 },
        resetByType: {
          group: { mode: "idle", idleMinutes: 120 },
          thread: { mode: "daily", atHour: 6 },
        },
        resetByChannel: {
          discord: { mode: "idle", idleMinutes: 10080 },
        },
      },
    }
    ```

    `resetByType` 支持 `direct`（旧别名 `dm`）、`group` 和 `thread`。如果未设置 `session.reset`/`resetByType` 配置块，顶层旧配置 `session.idleMinutes` 仍可作为空闲模式默认值的兼容别名使用。对于具有活跃的、由提供方拥有的 CLI 会话的会话，不会被隐式的 daily 默认策略切断。完整生命周期见 [Session management](/concepts/session)。

  </Accordion>

  <Accordion title="有没有办法让多个 OpenClaw 实例组成一个团队（一个 CEO 和多个代理）？">
    有，通过 **multi-agent routing** 和 **sub-agents**：一个协调代理，加上多个拥有各自工作区和模型的工作代理。

    最好把它看作一个有趣的实验——它很耗 token，通常也不如一个带多个独立会话的 bot 高效。典型模式是：你只和一个 bot 交互，用不同会话并行处理工作，需要时再生成 sub-agents。

    文档：[Multi-agent routing](/concepts/multi-agent), [Sub-agents](/tools/subagents), [Agents CLI](/cli/agents)。

  </Accordion>

  <Accordion title="为什么上下文在任务中途被截断？我该如何防止？">
    会话上下文受模型窗口限制。长对话、大量工具输出或许多文件都可能触发压缩或截断。

    - 让 bot 总结当前状态并写入文件。
    - 长任务前使用 `/compact`，切换主题时使用 `/new`。
    - 将重要上下文保存在工作区中，并让 bot 重新读取。
    - 对于长时间或并行工作使用 sub-agents，让主聊天保持更小。
    - 如果经常发生，选择上下文窗口更大的模型。

  </Accordion>

  <Accordion title="如何在保留已安装状态的同时彻底重置 OpenClaw？">
    ```bash
    openclaw reset
    ```

    非交互式完整重置：

    ```bash
    openclaw reset --scope full --yes --non-interactive
    ```

    然后重新运行设置：

    ```bash
    openclaw onboard --install-daemon
    ```

    如果检测到现有配置，Onboarding 也会提供 **Reset**；参见 [Onboarding (CLI)](/start/wizard)。如果你使用了 profile（`--profile` / `OPENCLAW_PROFILE`），请重置每个状态目录（默认 `~/.openclaw-<profile>`）。仅开发环境重置：`openclaw gateway --dev --reset` 会清除开发配置、凭证、会话和工作区。

  </Accordion>

  <Accordion title='我遇到 "context too large" 错误 - 如何重置或压缩？'>
    - **Compact**（保留对话，概括较早轮次）：使用 `/compact` 或 `/compact <instructions>` 来引导摘要。
    - **Reset**（为同一聊天键创建新的会话 ID）：使用 `/new` 或 `/reset`。

    如果问题持续发生，请调整 **session pruning**（`agents.defaults.contextPruning`）以裁剪旧的工具输出，或者使用上下文窗口更大的模型。

    文档：[Compaction](/concepts/compaction), [Session pruning](/concepts/session-pruning), [Session management](/concepts/session)。

  </Accordion>

  <Accordion title='为什么我会看到 "LLM request rejected: messages.content.tool_use.input field required"？'>
    提供方校验错误：模型输出了一个缺少必需 `input` 的 `tool_use` 块。通常意味着会话历史已过时或已损坏（常见于长线程或工具/模式变更之后）。

    修复：使用 `/new`（独立消息）开启一个新会话。

  </Accordion>

  <Accordion title="为什么我每 30 分钟会看到一次 heartbeat 消息？">
    Heartbeat 默认每 **30m** 运行一次；如果解析出的认证模式是 Anthropic OAuth/token auth（包括 Claude CLI 复用）且未设置 `heartbeat.every`，则为 **1h**。可按需调整或禁用：

    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "2h", // 或 "0m" 以禁用
          },
        },
      },
    }
    ```

    如果存在 `HEARTBEAT.md`，但它实际上是空的（只有空白行、Markdown/HTML 注释、ATX 标题、代码块围栏标记或空的列表项占位），OpenClaw 会跳过 heartbeat 运行以节省 API 调用。如果文件缺失，heartbeat 仍会运行，由模型决定要做什么。

    每个代理的覆盖项使用 `agents.list[].heartbeat`。文档：[Heartbeat](/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我需要在 WhatsApp 群组里添加一个 "bot account" 吗？'>
    不需要。OpenClaw 运行在**你自己的账号**上——如果你在群里，OpenClaw 就能看到。默认情况下，群组回复会被阻止，直到你允许发送者（`groupPolicy: "allowlist"`）。

    若只允许你自己在群组中触发回复：

    ```json5
    {
      channels: {
        whatsapp: {
          groupPolicy: "allowlist",
          groupAllowFrom: ["+15551234567"],
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="如何获取 WhatsApp 群组的 JID？">
    最快的方法：跟踪日志，并在群里发送一条测试消息。

    ```bash
    openclaw logs --follow --json
    ```

    查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如 `1234567890-1234567890@g.us`。

    如果已经配置/加入允许列表，可从配置中列出群组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/channels/whatsapp), [Directory](/cli/directory), [Logs](/cli/logs)。

  </Accordion>

  <Accordion title="为什么 OpenClaw 在群里不回复？">
    两个常见原因：默认启用了 mention gating（你必须 @mention bot，或匹配 `mentionPatterns`），或者你配置了 `channels.whatsapp.groups` 但没有包含 `"*"`，而该群不在允许列表中。

    参见 [Groups](/channels/groups) 和 [Group messages](/channels/group-messages)。

  </Accordion>

  <Accordion title="群组/线程会和私聊共享上下文吗？">
    默认情况下，直接聊天会折叠到主会话。群组/频道有各自的会话键，而 Telegram topics / Discord threads 是独立会话。参见 [Groups](/channels/groups) 和 [Group messages](/channels/group-messages)。
  </Accordion>

  <Accordion title="我可以创建多少个工作区和代理？">
    没有硬性限制——几十个甚至几百个都可以，但要注意：

    - **磁盘增长**：活跃会话和转录内容保存在每个代理的 SQLite 数据库中；旧版/归档工件仍可能累积在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本**：代理越多，并发模型使用越多。
    - **运维开销**：每个代理的认证 profile、工作区和频道路由。

    每个代理只保留一个**活跃**工作区（`agents.defaults.workspace`），如果磁盘增长，使用 `openclaw sessions cleanup` 清理旧会话（不要手动编辑活跃的 SQLite 状态），并使用 `openclaw doctor` 找出多余的工作区和 profile 不匹配。

  </Accordion>

  <Accordion title="我可以同时运行多个 bot 或聊天吗（Slack），该如何设置？">
    可以，通过 **Multi-Agent Routing**：运行多个隔离的代理，并按 channel/account/peer 路由入站消息。Slack 作为 channel 被支持，并且可以绑定到特定代理。

    浏览器访问很强大，但并不意味着“凡是人能做的都能做”——反机器人、CAPTCHA 和 MFA 仍然可能阻止自动化。为了获得最可靠的控制，在主机上使用本地 Chrome MCP，或者在实际运行浏览器的机器上使用 CDP。

    最佳实践配置：始终在线的 Gateway 主机（VPS/Mac mini）、每个角色一个代理（bindings）、绑定到这些代理的 Slack channel，以及在需要时通过 Chrome MCP 或 node 使用本地浏览器。

    文档：[Multi-Agent Routing](/concepts/multi-agent), [Slack](/channels/slack), [Browser](/tools/browser), [Nodes](/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障转移和认证配置文件

模型问答 - 默认值、选择、别名、切换、故障转移、认证配置文件 - 详见 [Models FAQ](/help/faq-models)。

## Gateway：端口、“已在运行”和远程模式

<AccordionGroup>
  <Accordion title="Gateway 使用哪个端口？">
    `gateway.port` 控制 WebSocket + HTTP（控制界面、hooks 等）的单一多路复用端口。优先级：

    ```text
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='为什么 openclaw gateway status 显示 "Runtime: running"，但 "Connectivity probe: failed"？'>
    "Running" 是 **supervisor** 的视角（launchd/systemd/schtasks）；connectivity probe 才是 CLI 实际连接到 gateway WebSocket。请信任 `openclaw gateway status` 里的这些行：`Probe target:`（探测使用的 URL）、`Listening:`（端口上实际绑定的内容）、`Last gateway error:`（进程还活着但端口未监听时的常见根因）。
  </Accordion>

  <Accordion title='为什么 openclaw gateway status 显示的 "Config (cli)" 和 "Config (service)" 不一样？'>
    你正在编辑一个配置文件，而服务运行的是另一个（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修复方法：从服务应使用的同一个 `--profile` / 环境中运行：

    ```bash
    openclaw gateway install --force
    ```

  </Accordion>

  <Accordion title='“another gateway instance is already listening” 是什么意思？'>
    OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制执行运行时锁（默认 `ws://127.0.0.1:18789`）。如果绑定因 `EADDRINUSE` 失败，就会抛出 `GatewayLockError`（“another gateway instance is already listening”）。

    修复：停止另一个实例、释放端口，或使用 `openclaw gateway --port <port>` 运行。

  </Accordion>

  <Accordion title="如何以远程模式运行 OpenClaw（客户端连接到其他地方的 Gateway）？">
    将 `gateway.mode: "remote"` 并指向一个远程 WebSocket URL，也可以附带共享密钥远程凭据：

    ```json5
    {
      gateway: {
        mode: "remote",
        remote: {
          url: "ws://gateway.tailnet:18789",
          token: "your-token",
          password: "your-password",
        },
      },
    }
    ```

    - `openclaw gateway` 仅在 `gateway.mode` 为 `local` 时启动（或你传入覆盖标志时）。
    - macOS 应用会监视配置文件，并在这些值变化时实时切换模式。
    - `gateway.remote.token` / `.password` 只是客户端侧的远程凭据；它们本身不会启用本地 gateway 认证。

  </Accordion>

  <Accordion title='Control UI 显示 "unauthorized"（或一直在重连）。现在怎么办？'>
    你的 gateway 认证路径与 UI 的认证方式不匹配。

    事实（来自代码）：

    - Control UI 将 token 保存在 `sessionStorage` 中，作用域限定为当前浏览器标签页和所选 gateway URL，因此同一标签页刷新时仍可工作，而不依赖长期的 localStorage token 持久化。
    - 在 `AUTH_TOKEN_MISMATCH` 时，受信任客户端在 gateway 返回重试提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）时，可使用缓存的设备 token 进行一次有界重试。
    - 该缓存 token 重试会复用与设备 token 一起存储的已批准 scopes；显式传入 `deviceToken` / 显式 `scopes` 的调用者会保留其请求的 scope 集，而不是继承缓存 scopes。
    - 在该重试路径之外，连接认证优先级依次是：显式共享 token/password、显式 `deviceToken`、存储的 device token、bootstrap token。
    - 内置 setup-code bootstrap 会返回一个带 `scopes: []` 的节点 device token，以及一个用于受信任移动端引导的有界 operator handoff token。operator handoff 可以读取设置时的原生配置，但不会授予 pairing mutation scopes 或 `operator.admin`。

    修复：

    - 最快方式：`openclaw dashboard`（打印并复制 dashboard URL，尝试打开；在无头环境下会显示 SSH 提示）。
    - 还没有 token：`openclaw doctor --generate-gateway-token`。
    - 远程：先通过 `ssh -N -L 18789:127.0.0.1:18789 user@host` 建立隧道，然后打开 `http://127.0.0.1:18789/`。
    - 共享密钥模式：设置 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然后在 Control UI 设置中粘贴匹配的密钥。
    - Tailscale Serve 模式：确认已启用 `gateway.auth.allowTailscale`，并且你打开的是 Serve URL，而不是绕过 Tailscale 身份标头的原始 loopback/tailnet URL。
    - 受信任代理模式：确认你是通过配置的 identity-aware proxy 访问的。同主机 loopback 代理也需要 `gateway.auth.trustedProxy.allowLoopback = true`。
    - 由于一次重试后仍然不匹配：轮换/重新批准已配对的设备 token：
      ```bash
      openclaw devices list
      openclaw devices rotate --device <id> --role operator
      ```
    - 轮换被拒绝：配对设备会话只能轮换它们**自己的**设备，除非它们也拥有 `operator.admin`，且显式 `--scope` 值不能超过调用者当前的 operator scopes。
    - 仍然卡住：`openclaw status --all` 再加上 [Troubleshooting](/gateway/troubleshooting)。认证细节见 [Dashboard](/web/dashboard)。

  </Accordion>

  <Accordion title="我设置了 gateway.bind tailnet，但它只监听在 loopback">
    `tailnet` 绑定会从你的网络接口中选择一个 Tailscale IP（100.64.0.0/10）。如果机器不在 Tailscale 上（或接口已关闭），Gateway 会回退到 loopback，而不是暴露另一个网络接口。

    修复：在该主机上启动 Tailscale 并重启 Gateway，或者明确切换为 `gateway.bind: "loopback"` / `"lan"`。

    `tailnet` 是显式的；`auto` 优先选择 loopback。使用 `gateway.bind: "tailnet"` 可将非 loopback 暴露限制在 Tailnet 内，同时保留所需的同主机 `127.0.0.1` 监听。

  </Accordion>

  <Accordion title="我可以在同一台主机上运行多个 Gateway 吗？">
    通常不行——一个 Gateway 可以运行多个消息通道和 agents。只有在需要冗余（例如一个救援 bot）或硬隔离时才使用多个 Gateway，并且要为每个实例隔离各自的 `OPENCLAW_CONFIG_PATH`、`OPENCLAW_STATE_DIR`、`agents.defaults.workspace` 和唯一的 `gateway.port`。

    推荐：每个实例使用 `openclaw --profile <name> ...`（会自动创建 `~/.openclaw-<name>`），每个 profile 配置使用唯一的 `gateway.port`（或手动运行时使用 `--port`），并通过 `openclaw --profile <name> gateway install` 为每个 profile 安装独立服务。

    Profiles 也会作为服务名后缀：launchd `ai.openclaw.<profile>`、systemd `openclaw-gateway-<profile>.service`、Windows `OpenClaw Gateway (<profile>)`。未限定的 `openclaw-gateway` systemd 单元只存在于默认 profile；旧的、重命名前的 systemd 单元名 `clawdbot-gateway` 会自动迁移。

    完整指南：[Multiple gateways](/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='“invalid handshake” / code 1008 是什么意思？'>
    Gateway 是一个 **WebSocket server**，并且期望第一条消息是 `connect` 帧。任何其他内容都会以 **code 1008**（policy violation）关闭连接。

    常见原因：你在浏览器中打开了 **HTTP** URL，而不是使用 WS 客户端；使用了错误的端口/路径；或者代理/隧道剥离了认证头，或发送了非 Gateway 请求。

    修复：使用 WS URL（`ws://<host>:18789`，或通过 HTTPS 使用 `wss://...`），不要在普通浏览器标签页中打开 WS 端口，并在启用认证时在 `connect` 帧中包含 token/password。CLI/TUI 示例：

    ```bash
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    协议细节：[Gateway protocol](/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日志和调试

<AccordionGroup>
  <Accordion title="日志在哪里？">
    文件日志（结构化）：`/tmp/openclaw/openclaw-YYYY-MM-DD.log`。通过 `logging.file` 设置稳定路径；通过 `logging.level` 设置文件日志级别；通过 `--verbose` 和 `logging.consoleLevel` 设置控制台详细程度。

    最快的尾随查看：

    ```bash
    openclaw logs --follow
    ```

    服务/监督器日志（当 gateway 通过 launchd/systemd 运行时）：

    - macOS launchd stdout: `~/Library/Logs/openclaw/gateway.log`（profiles 使用 `gateway-<profile>.log`；stderr 被抑制）。
    - Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`.
    - Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`.

    更多内容参见 [Troubleshooting](/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="我该如何启动/停止/重启 Gateway 服务？">
    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你手动运行 gateway，`openclaw gateway --force` 可以重新占用端口。参见 [Gateway](/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上关闭了终端 - 如何重启 OpenClaw？">
    三种 Windows 安装模式：

    **1) Windows Hub 本地设置**：原生应用管理一个本地、应用所有的 WSL Gateway。请从开始菜单或托盘打开 **OpenClaw Companion**，然后使用 **Gateway Setup** 或 Connections 选项卡。

    **2) 手动 WSL2 Gateway**：Gateway 在 Linux 内运行。
    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```
    如果你从未安装过服务，请在前台启动：`openclaw gateway run`。

    **3) 原生 Windows CLI/Gateway**：直接在 Windows 中运行。
    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```
    如果你手动运行它（没有服务）：`openclaw gateway run`。

    文档：[Windows](/platforms/windows), [Gateway service runbook](/gateway)。

  </Accordion>

  <Accordion title="Gateway 已启动，但回复始终没有到达。我该检查什么？">
    快速健康检查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：模型认证未在 **gateway 主机** 上加载（检查 `models status`），频道配对/允许列表阻止了回复（检查频道配置和日志），或者 WebChat/Dashboard 打开时没有正确的 token。如果是远程连接，请确认隧道/Tailscale 连接已建立，并且 Gateway WebSocket 可达。

    文档：[Channels](/channels), [Troubleshooting](/gateway/troubleshooting), [Remote access](/gateway/remote)。

  </Accordion>

  <Accordion title='"已与 gateway 断开连接：无原因" - 现在怎么办？'>
    通常意味着 UI 丢失了 WebSocket 连接。请检查：Gateway 是否正在运行（`openclaw gateway status`）？它是否健康（`openclaw status`）？UI 是否有正确的 token（`openclaw dashboard`）？如果是远程连接，隧道/Tailscale 链接是否已建立？

    然后尾随日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[Dashboard](/web/dashboard), [Remote access](/gateway/remote), [Troubleshooting](/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失败。我该检查什么？">
    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后匹配错误：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单条目太多。OpenClaw 已经会裁剪到 Telegram 限制并以更少的命令重试，但某些菜单项仍可能被丢弃。请减少插件/技能/自定义命令，或者如果你不需要菜单，请禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!`，或类似的网络错误：在 VPS 上或代理之后，请确认允许外发 HTTPS，并且 `api.telegram.org` 的 DNS 正常工作。

    如果 Gateway 是远程的，请检查 Gateway 主机上的日志。

    文档：[Telegram](/channels/telegram), [Channel troubleshooting](/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 没有输出。我该检查什么？">
    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看当前状态。如果你期望在聊天频道中收到回复，请确认已启用投递（`/deliver on`）。

    文档：[TUI](/web/tui), [Slash commands](/tools/slash-commands)。

  </Accordion>

  <Accordion title="我该如何彻底停止然后再启动 Gateway？">
    如果你已安装服务（macOS 上为 launchd，Linux 上为 systemd）：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    在前台运行时，先按 Ctrl-C 停止，然后执行 `openclaw gateway run`。

    文档：[Gateway service runbook](/gateway)。

  </Accordion>

  <Accordion title="ELI5：openclaw gateway restart 和 openclaw gateway 有什么区别">
    `openclaw gateway restart` 会重启**后台服务**（launchd/systemd）。`openclaw gateway` 会在当前终端会话中以前台方式运行 gateway。若你已安装服务，请使用 gateway 子命令；若只是临时运行一次，请使用前台直接运行。
  </Accordion>

  <Accordion title="出问题时，最快获取更多细节的方法">
    使用 `--verbose` 启动 Gateway 以获取更多控制台细节，然后检查日志文件中的频道认证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>

## 媒体和附件

<AccordionGroup>
  <Accordion title="我的技能生成了图片/PDF，但没有发送出去">
    来自代理的外发附件必须使用结构化媒体字段，例如 `media`、`mediaUrl`、`path` 或 `filePath`。请参见 [OpenClaw 助手设置](/start/openclaw) 和 [Agent send](/tools/agent-send)。

    ```bash
    openclaw message send --target +15555550123 --message "给你" --media /path/to/file.png
    ```

    还请检查：目标渠道支持外发媒体且未被允许列表阻止；文件在提供方的大小限制内（图片会缩放至最大边 2048px）；`tools.fs.workspaceOnly=true` 会将本地路径发送限制为 workspace、temp/media-store 和沙箱验证文件；`tools.fs.workspaceOnly=false`（默认）允许结构化本地媒体发送使用代理已可读取的主机本地文件，包括媒体以及安全文档类型（图片、音频、视频、PDF、Office 文档，以及经过验证的文本文档，如 Markdown/MD、TXT、JSON、YAML/YML）。这不是秘密扫描器——只要扩展名和内容校验匹配，代理可读取的 `secret.txt` 或 `config.json` 也可以附加。请将敏感文件保留在代理不可读的路径之外，或者保持 `tools.fs.workspaceOnly=true` 以获得更严格的本地路径发送限制。

    参见 [图片](/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全与访问控制

<AccordionGroup>
  <Accordion title="向传入的 DM 暴露 OpenClaw 安全吗？">
    将传入的 DM 视为不可信输入。默认设置会降低风险：

    - 在支持 DM 的渠道上，默认行为是 **配对**：未知发送者会收到配对码，其消息不会被处理。使用 `openclaw pairing approve --channel <channel> [--account <id>] <code>` 批准。待处理请求上限为每个频道 **3 个**；如果没有收到代码，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公开开放 DM 需要显式选择加入（`dmPolicy: "open"` 且允许名单为 `"*"`）。

    运行 `openclaw doctor` 可以发现有风险的 DM 策略。

  </Accordion>

  <Accordion title="提示注入只会影响公开机器人吗？">
    不是。提示注入针对的是**不可信内容**，而不只是是谁在给机器人发消息。如果你的助手会读取外部内容（网页搜索/抓取、浏览器页面、邮件、文档、附件、粘贴的日志），即使你是唯一的发送者，这些内容也可能携带试图劫持模型的指令。

    最大的风险在启用工具时：模型可能被诱导泄露上下文或代表你调用工具。降低影响范围：

    - 使用只读或禁用工具的“reader”代理来总结不可信内容
    - 对启用工具的代理关闭 `web_search` / `web_fetch` / `browser`
    - 同样将解码后的文件/文档文本视为不可信：OpenResponses 的 `input_file` 和媒体附件提取都会将提取出的文本包裹在显式的外部内容边界标记中，而不是直接传递原始文件文本
    - 进行沙箱隔离并使用严格的工具允许名单

    细节：[Security](/gateway/security)。

  </Accordion>

  <Accordion title="因为 OpenClaw 使用 TypeScript/Node 而不是 Rust/WASM，所以它不那么安全吗？">
    语言和运行时很重要，但对个人代理来说并不是主要风险。实际风险包括网关暴露、谁可以给机器人发消息、提示注入、工具范围、凭证处理、浏览器访问、执行访问，以及第三方技能/插件的信任问题。

    Rust 和 WASM 对某些代码类别可以提供更强的隔离，但并不能解决提示注入、不良允许名单、公开网关暴露、过宽的工具权限，或者已经登录到敏感账户的浏览器配置文件。应将以下内容视为主要控制手段：保持 Gateway 私有或经身份验证，针对 DM/群组使用配对和允许名单，对不可信输入拒绝或沙箱化高风险工具，只安装可信的插件和技能，并在配置变更后运行 `openclaw security audit --deep`。

    详情：[Security](/gateway/security), [Sandboxing](/gateway/sandboxing)。

  </Accordion>

  <Accordion title="我看到关于暴露的 OpenClaw 实例的报告。我应该检查什么？">
    ```bash
    openclaw security audit --deep
    openclaw gateway status
    ```

    更安全的基线：Gateway 绑定到 `loopback`，或仅通过经过身份验证的私有访问暴露（tailnet、SSH 隧道、token/password 认证，或正确配置的可信代理）；DM 处于 `pairing` 或 `allowlist` 模式；群组已加入允许名单并进行提及门控，除非每个成员都可信；对于读取不可信内容的代理，高风险工具（`exec`、`browser`、`gateway`、`cron`）被拒绝或严格限定作用范围；在需要更小影响范围的工具执行场景中启用沙箱。

    没有认证的公开绑定、带工具的开放 DM/群组，以及暴露的浏览器控制，是首先要修复的发现项。详情：[openclaw security audit](/gateway/security#openclaw-security-audit)。

  </Accordion>

  <Accordion title="ClawHub 技能和第三方插件安装安全吗？">
    请将第三方技能和插件视为你选择信任的代码。ClawHub 技能页面会在安装前展示扫描状态，但扫描并不是完整的安全边界。OpenClaw 在插件/技能安装或更新期间不会运行内置的本地危险代码阻止机制；请使用由操作员拥有的 `security.installPolicy` 来做本地允许/阻止决策。

    更安全的做法：优先选择可信作者和固定版本，在启用前阅读技能/插件内容，保持插件/技能允许名单尽可能窄，将不可信输入工作流放在工具最少的沙箱中运行，并避免授予第三方代码过宽的文件系统、exec、浏览器或密钥访问权限。

    详情：[Skills](/tools/skills), [Plugins](/tools/plugin), [Security](/gateway/security)。

  </Accordion>

  <Accordion title="我应该给机器人单独的邮箱、GitHub 账号或电话号码吗？">
    是的，对大多数配置来说都应该。将机器人与单独的账号和电话号码隔离，可以在出问题时减少影响范围，也更容易轮换凭证或撤销访问，而不会影响你的个人账号。

    从小开始：只授予它实际需要的工具和账号权限，之后如果需要再扩展。

    文档：[Security](/gateway/security), [Pairing](/channels/pairing)。

  </Accordion>

  <Accordion title="我可以让它自动处理我的短信吗？这样安全吗？">
    我们**不**建议让它对你的个人消息拥有完全自主权。最安全的模式是：将 DM 保持在 **配对模式** 或严格的允许名单中，如果它需要代表你发消息，就使用**单独的号码或账号**，并让它先起草内容，再由你**在发送前批准**。

    如果想试验，请在专用的隔离账号上进行。参见 [Security](/gateway/security)。

  </Accordion>

  <Accordion title="我可以使用更便宜的模型来处理个人助理任务吗？">
    可以，**前提是**代理只进行聊天且输入是可信的。较小的模型更容易受到指令劫持，因此当代理启用工具或读取不可信内容时，不要使用它们。如果你必须使用较小的模型，请锁定工具并在沙箱中运行。参见 [Security](/gateway/security)。
  </Accordion>

  <Accordion title="我在 Telegram 里运行了 /start，但没有收到配对码">
    只有当未知发送者向机器人发消息且启用了 `dmPolicy: "pairing"` 时，才会发送配对码；单独运行 `/start` 不会生成代码。

    检查待处理请求：

    ```bash
    openclaw pairing list telegram
    ```

    若要立即访问，请将你的发送者 id 加入允许名单，或为该账号设置 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它会给我的联系人发消息吗？配对是如何工作的？">
    不会。默认的 WhatsApp DM 策略是 **配对**。未知发送者只会收到配对码；他们的消息**不会被处理**。OpenClaw 只会回复它收到的聊天，或你触发的显式发送。

    ```bash
    openclaw pairing approve whatsapp <code>
    openclaw pairing list whatsapp
    ```

    向导中的电话号码提示会设置你的**允许名单/所有者**，以便允许你自己的 DM——它不会用于自动发送。在你的个人 WhatsApp 号码上，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、中止任务和“它不会停止”

<AccordionGroup>
  <Accordion title="我如何阻止内部系统消息显示在聊天中？">
    大多数内部/工具消息仅在该会话启用 **verbose**、**trace** 或 **reasoning** 时才会显示。

    在你看到它的聊天中修复：

    ```text
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然很吵：检查 Control UI 中的会话设置，将 verbose 设为 **inherit**；确认你没有在配置中使用带有 `verboseDefault: "on"` 的 bot profile。

    文档：[Thinking and verbose](/tools/thinking)，[Security](/gateway/security/index#reasoning-and-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="我如何停止/取消正在运行的任务？">
    以**独立消息**（不带斜杠）发送以下任意内容即可触发中止：`stop`、`stop action`、`stop current action`、`stop run`、`stop current run`、`stop agent`、`stop the agent`、`stop openclaw`、`openclaw stop`、`stop don't do anything`、`stop do not do anything`、`stop doing anything`、`do not do that`、`please stop`、`stop please`、`abort`、`esc`、`exit`、`interrupt`、`halt`。常见的非英语触发词（法语、德语、西班牙语、中文、日语、印地语、阿拉伯语、俄语）也同样有效。

    对于由 exec 工具启动的后台进程，让 agent 运行：

    ```text
    process action:kill sessionId:XXX
    ```

    大多数斜杠命令必须作为以 `/` 开头的**独立**消息发送，但少数快捷方式（例如 `/status`）也可以由允许名单中的发送者以内联方式使用。请参阅 [Slash commands](/tools/slash-commands)。

  </Accordion>

  <Accordion title='我如何从 Telegram 向 Discord 发送消息？（"Cross-context messaging denied"）'>
    OpenClaw 默认会阻止**跨提供方**消息传递。如果某个工具调用绑定到 Telegram，除非你明确允许，否则它不会发送到 Discord——而且这一更改会立即生效，无需重启网关：

    ```json5
    {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[来自 {channel}] " },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title='为什么机器人会感觉像“忽略”了快速连续消息？'>
    运行中的提示默认会被转入当前活动运行。使用 `/queue` 来选择活动运行行为：

    - `steer`（默认）- 在下一个模型边界引导当前活动运行。
    - `followup` - 将消息排队，并在当前运行结束后一次处理一个。
    - `collect` - 将兼容消息排队，并在当前运行结束后只回复一次。
    - `interrupt` - 中止当前运行并重新开始。

    可为排队模式添加选项，例如 `debounce:0.5s cap:25 drop:summarize`。请参阅 [Command queue](/concepts/queue) 和 [Steering queue](/concepts/queue-steering)。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title='带有 API 密钥时 Anthropic 的默认模型是什么？'>
    凭据和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或将 Anthropic API 密钥存储在 auth profiles 中）会启用身份验证，但实际的默认模型是你在 `agents.defaults.model.primary` 中配置的内容（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。`No credentials found for profile "anthropic:default"` 意味着 Gateway 无法在当前运行的 agent 预期的 `auth-profiles.json` 中找到 Anthropic 凭据。
  </Accordion>
</AccordionGroup>

---

Still stuck? 请在 [Discord](https://discord.com/invite/clawd) 提问，或打开一个 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

## 相关内容

- [首次运行常见问题](/help/faq-first-run) - 安装、入门、认证、订阅、早期故障
- [模型常见问题](/help/faq-models) - 模型选择、故障切换、认证配置文件
- [故障排查](/help/troubleshooting) - 以症状为先的分诊
