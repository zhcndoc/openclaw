---
summary: "关于 OpenClaw 设置、配置和使用的常见问题"
read_when:
  - 回答常见的设置、安装、入门或运行时支持问题
  - 在深入调试前先对用户报告的问题进行分流
title: "FAQ"
---

针对真实环境部署的快速回答和更深入的故障排查（本地开发、VPS、多智能体、OAuth/API 密钥、模型故障切换）。运行时诊断请参见 [故障排查](/gateway/troubleshooting)。完整配置参考请参见 [配置](/gateway/configuration)。

## 出问题后的前 60 秒

1. **快速状态（先检查这个）**

   ```bash
   openclaw status
   ```

   本地快速摘要：操作系统 + 更新、网关/服务可达性、智能体/会话、提供商配置 + 运行时问题（当网关可达时）。

2. **可直接粘贴的报告（可安全分享）**

   ```bash
   openclaw status --all
   ```

   只读诊断，带日志尾部内容（令牌已脱敏）。

3. **守护进程 + 端口状态**

   ```bash
   openclaw gateway status
   ```

   显示 supervisor 运行状态与 RPC 可达性的区别、探测目标 URL，以及服务可能使用了哪个配置。

4. **深度探测**

   ```bash
   openclaw status --deep
   ```

   运行实时网关健康探测，包括在支持时的通道探测
   （需要网关可达）。参见 [健康](/gateway/health)。

5. **跟踪最新日志**

   ```bash
   openclaw logs --follow
   ```

   如果 RPC 不可用，改用：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志与服务日志是分开的；参见 [日志](/logging) 和 [故障排查](/gateway/troubleshooting)。

6. **运行 doctor（修复）**

   ```bash
   openclaw doctor
   ```

   修复/迁移配置与状态 + 运行健康检查。参见 [Doctor](/gateway/doctor)。

7. **网关快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # 在出错时显示目标 URL + 配置路径
   ```

   向正在运行的网关请求完整快照（仅 WS）。参见 [健康](/gateway/health)。

## 快速开始与首次运行设置

首次运行问答——安装、上手、认证流程、订阅、初始失败——
都在 [首次运行 FAQ](/help/faq-first-run)。

## 什么是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一句话说，OpenClaw 是什么？">
    OpenClaw 是一个你运行在自己设备上的个人 AI 助手。它会在你已经在用的消息平台上回复（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat，以及诸如 QQ Bot 之类的捆绑频道插件），并且在受支持的平台上还能进行语音 + 实时 Canvas。**Gateway** 是始终在线的控制平面；助手才是产品本身。
  </Accordion>

  <Accordion title="价值主张">
    OpenClaw 并不只是“Claude 的外壳”。它是一个**本地优先的控制平面**，让你能在
    **自己的硬件**上运行一个强大的助手，并通过你已经在用的聊天应用访问它，具备
    有状态会话、记忆和工具——而无需把你的工作流控制权交给托管的
    SaaS。

    亮点：

    - **你的设备，你的数据：** 在你想要的地方运行 Gateway（Mac、Linux、VPS），并将
      工作区 + 会话历史保留在本地。
    - **真实通道，而不是网页沙盒：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，
      以及受支持平台上的移动语音和 Canvas。
    - **模型无关：** 可使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，并支持按智能体路由
      和故障切换。
    - **仅本地选项：** 运行本地模型，这样如果你愿意，**所有数据都可以保留在你的设备上**。
    - **多智能体路由：** 按频道、账号或任务拆分智能体，每个都有自己的
      工作区和默认设置。
    - **开源且可改造：** 可审查、扩展并自行托管，没有供应商锁定。

    文档：[Gateway](/gateway)、[Channels](/channels)、[多智能体](/concepts/multi-agent)、
    [记忆](/concepts/memory)。

  </Accordion>

  <Accordion title="我刚刚设置好——接下来该做什么？">
    适合开始的项目：

    - 搭建网站（WordPress、Shopify 或一个简单的静态站点）。
    - 原型一个移动应用（梳理需求、界面、API 方案）。
    - 整理文件和文件夹（清理、命名、标记）。
    - 连接 Gmail 并自动生成摘要或后续跟进。

    它可以处理大任务，但如果你把任务拆成多个阶段并
    使用子智能体并行工作，效果最好。

  </Accordion>

  <Accordion title="OpenClaw 的五个最常见日常用途是什么？">
    日常中的高价值场景通常包括：

    - **个人简报：** 对你关心的收件箱、日历和新闻进行摘要。
    - **研究与起草：** 快速研究、摘要，以及给邮件或文档写第一版草稿。
    - **提醒与跟进：** 由 cron 或心跳驱动的提醒和检查清单。
    - **浏览器自动化：** 填写表单、收集数据、重复性的网页任务。
    - **跨设备协同：** 从手机发出任务，让 Gateway 在服务器上运行它，然后把结果发回聊天里。

  </Accordion>

  <Accordion title="OpenClaw 能帮助 SaaS 的获客、外联、广告和博客吗？">
    对于**研究、筛选和起草**，可以。它可以扫描网站、建立候选清单、
    总结潜在客户，并撰写外联或广告文案草稿。

    对于**外联或广告投放**，请始终有人类参与审阅。避免垃圾信息，遵守当地法律和
    平台政策，并在发送前检查任何内容。最稳妥的方式是让
    OpenClaw 负责起草，由你来批准。

    文档：[安全](/gateway/security)。

  </Accordion>

  <Accordion title="与 Claude Code 相比，它在网页开发方面有哪些优势？">
    OpenClaw 是一个**个人助手**和协调层，而不是 IDE 替代品。在仓库内部进行最快的直接编码循环时，
    用 Claude Code 或 Codex。你想要持久记忆、跨设备访问和工具编排时，
    用 OpenClaw。

    优势：

    - **持久记忆 + 工作区**，跨会话保留
    - **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
    - **工具编排**（浏览器、文件、调度、钩子）
    - **始终在线的 Gateway**（可运行在 VPS 上，随时从任何地方交互）
    - **节点** 用于本地浏览器/屏幕/摄像头/执行

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能与自动化

<AccordionGroup>
  <Accordion title="如何自定义技能而又不让仓库变脏？">
    使用受管理的覆盖层，而不是直接编辑仓库副本。把你的修改放到 `~/.openclaw/skills/<name>/SKILL.md` 中（或者通过 `~/.openclaw/openclaw.json` 里的 `skills.load.extraDirs` 添加一个文件夹）。优先级是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 内置 → `skills.load.extraDirs`，因此受管理的覆盖层仍然会覆盖内置技能，而不会触碰 git。如果你需要把技能全局安装，但只对某些智能体可见，就把共享副本放在 `~/.openclaw/skills` 中，并通过 `agents.defaults.skills` 和 `agents.list[].skills` 控制可见性。只有值得上游合并的修改才应该留在仓库里并以 PR 形式提交。
  </Accordion>

  <Accordion title="我可以从自定义文件夹加载技能吗？">
    可以。通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外目录（最低优先级）。默认优先级是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → 内置 → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills`，而 OpenClaw 会在下一次会话中将其视为 `<workspace>/skills`。如果某个技能只应对特定智能体可见，就把它与 `agents.defaults.skills` 或 `agents.list[].skills` 配合使用。
  </Accordion>

  <Accordion title="如何针对不同任务使用不同的模型或设置？">
    Today the supported patterns are:

    - **Cron jobs**: isolated jobs can set a `model` override per job.
    - **Agents**: route tasks to separate agents with different default models, thinking levels, and stream params.
    - **On-demand switch**: use `/model` to switch the current session model at any time.

    For example, use the same model with different per-agent settings:

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

    Put shared per-model defaults in `agents.defaults.models["provider/model"].params`, then put agent-specific overrides in flat `agents.list[].params`. Do not define separate nested `agents.list[].models["provider/model"].params` entries for the same model; `agents.list[].models` is for per-agent model catalog and runtime overrides.

    See [Cron jobs](/automation/cron-jobs), [Multi-Agent Routing](/concepts/multi-agent), [Configuration](/gateway/config-agents), and [Slash commands](/tools/slash-commands).

  </Accordion>

  <Accordion title="机器人在执行重任务时卡住了。如何把它卸载出去？">
    使用**子智能体**来处理长时间或并行任务。子智能体在自己的会话中运行，
    返回摘要，并保持主聊天响应流畅。

    让你的机器人“为此任务创建一个子智能体”，或者使用 `/subagents`。
    在聊天中使用 `/status` 查看 Gateway 当前正在做什么（以及它是否繁忙）。

    令牌提示：长任务和子智能体都会消耗令牌。如果成本是个问题，通过 `agents.defaults.subagents.model` 给子智能体设置一个
    更便宜的模型。

    文档：[子智能体](/tools/subagents)、[后台任务](/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 上按线程绑定的子智能体会话是如何工作的？">
    使用线程绑定。你可以把 Discord 线程绑定到一个子智能体或会话目标，这样该线程中的后续消息就会停留在那个绑定的会话上。

    基本流程：

    - 使用 `sessions_spawn` 并设置 `thread: true`（也可以选择 `mode: "session"` 以便持续跟进）。
    - 或者手动使用 `/focus <target>` 绑定。
    - 使用 `/agents` 检查绑定状态。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动取消聚焦。
    - 使用 `/unfocus` 解除线程绑定。

    所需配置：

    - 全局默认值：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆盖项：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 生成时自动绑定：`channels.discord.threadBindings.spawnSessions` 默认为 `true`；将其设置为 `false` 可禁用线程绑定会话生成。

    文档：[子智能体](/tools/subagents)、[Discord](/channels/discord)、[配置参考](/gateway/configuration-reference)、[斜杠命令](/tools/slash-commands)。

  </Accordion>

  <Accordion title="子智能体完成了，但完成更新发到了错误的位置，或者根本没发出去。我该检查什么？">
    先检查解析后的请求方路由：

    - 完成模式下的子智能体投递优先使用任何已绑定的线程或会话路由（如果存在）。
    - 如果完成来源只携带了一个频道，OpenClaw 会回退到请求方会话中存储的路由（`lastChannel` / `lastTo` / `lastAccountId`），以便直接投递仍然可以成功。
    - 如果既没有已绑定路由，也没有可用的已存储路由，直接投递可能失败，结果会回退到排队的会话投递，而不是立即发布到聊天中。
    - 无效或过期的目标仍然可能强制回退到队列，或者导致最终投递失败。
    - 如果子智能体最后一次可见的助手回复是精确的静默令牌 `NO_REPLY` / `no_reply`，或者正好是 `ANNOUNCE_SKIP`，OpenClaw 会故意抑制公告，而不是发布过时的早先进度。
    - tool/toolResult 输出不会提升为子结果文本；结果取的是子智能体最近一次可见的助手回复。

    调试：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[子智能体](/tools/subagents)、[后台任务](/automation/tasks)、[会话工具](/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒没有触发。我该检查什么？">
    Cron 在 Gateway 进程内运行。如果 Gateway 没有持续运行，
    已安排的任务就不会执行。

    检查清单：

    - 确认 cron 已启用（`cron.enabled`）且未设置 `OPENCLAW_SKIP_CRON`。
    - 检查 Gateway 是否 24/7 运行（没有休眠/重启）。
    - 验证任务的时区设置（`--tz` 与主机时区）。

    调试：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron 任务](/automation/cron-jobs)、[自动化](/automation)。

  </Accordion>

  <Accordion title="Cron 已触发，但没有内容发送到频道。为什么？">
    先检查投递模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不应期望 runner 回退发送。
    - 缺少或无效的公告目标（`channel` / `to`）意味着 runner 跳过了外发投递。
    - 频道认证失败（`unauthorized`、`Forbidden`）意味着 runner 尝试投递了，但凭据阻止了它。
    - 静默的隔离结果（仅 `NO_REPLY` / `no_reply`）会被视为有意不可投递，因此 runner 也会抑制排队回退投递。

    对于隔离的 cron 任务，只要有聊天路由可用，智能体仍然可以通过 `message`
    工具直接发送。`--announce` 只控制 runner 对于智能体尚未发送的最终文本的
    回退路径。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron 任务](/automation/cron-jobs)、[后台任务](/automation/tasks)。

  </Accordion>

  <Accordion title="为什么一个隔离的 cron 运行会切换模型或重试一次？">
    那通常是实时模型切换路径，而不是重复调度。

    隔离 cron 可以在当前运行抛出 `LiveSessionModelSwitchError` 时，持久化一个运行时模型接管并进行重试。重试会保留切换后的
    提供商/模型；如果切换带来了新的 auth profile 覆盖，cron
    也会在重试前持久化它。

    相关选择规则：

    - 适用时，Gmail 钩子的模型覆盖优先。
    - 然后是每个任务的 `model`。
    - 然后是任何已保存的 cron 会话模型覆盖。
    - 然后才是正常的智能体/默认模型选择。

    重试循环是有上限的。初次尝试加上 2 次切换重试后，
    cron 会中止，而不是无限循环。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron 任务](/automation/cron-jobs)、[cron CLI](/cli/cron)。

  </Accordion>

  <Accordion title="我如何在 Linux 上安装技能？">
    使用原生的 `openclaw skills` 命令，或者把技能直接放进你的工作区。macOS 的 Skills UI 在 Linux 上不可用。
    在 [https://clawhub.ai](https://clawhub.ai) 浏览技能。

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills install <skill-slug> --global
    openclaw skills update --all
    openclaw skills update --all --global
    openclaw skills list --eligible
    openclaw skills check
    ```

    原生 `openclaw skills install` 默认会写入当前工作区的 `skills/`
    目录。添加 `--global` 可将其安装到共享的受管
    skills 目录，供所有本地代理使用。只有当你想发布或同步自己的 skills 时，
    才安装独立的 `clawhub` CLI。如果你想缩小哪些代理可以看到共享 skills 的范围，请使用
    `agents.defaults.skills` 或 `agents.list[].skills`。

  </Accordion>

  <Accordion title="Can OpenClaw run tasks on a schedule or continuously in the background?">
    可以。使用 Gateway 调度器：

    - **Cron jobs** 用于定时或重复任务（重启后仍会保留）。
    - **Heartbeat** 用于“主会话”的周期性检查。
    - **Isolated jobs** 用于自主代理，向聊天中发送摘要或投递内容。

    文档：[Cron jobs](/automation/cron-jobs), [Automation](/automation),
    [Heartbeat](/gateway/heartbeat).

  </Accordion>

  <Accordion title="Can I run Apple macOS-only skills from Linux?">
    不能直接运行。macOS 技能受 `metadata.openclaw.os` 和所需二进制文件限制，并且只有当它们在 **Gateway 主机** 上符合条件时，技能才会出现在系统提示词中。在 Linux 上，只有 `darwin` 的技能（如 `apple-notes`、`apple-reminders`、`things-mac`）不会加载，除非你覆盖该限制。

    你有三种受支持的模式：

    **选项 A - 在 Mac 上运行 Gateway（最简单）。**
    将 Gateway 运行在存在 macOS 二进制文件的地方，然后从 Linux 通过 [远程模式](#gateway-ports-already-running-and-remote-mode) 或 Tailscale 连接。由于 Gateway 主机是 macOS，技能会正常加载。

    **选项 B - 使用 macOS 节点（无需 SSH）。**
    在 Linux 上运行 Gateway，配对一个 macOS 节点（菜单栏应用），并将 Mac 上的 **Node Run Commands** 设为“Always Ask”或“Always Allow”。当所需二进制文件存在于该节点时，OpenClaw 可以将 macOS 专属技能视为可用。代理通过 `nodes` 工具运行这些技能。如果你选择“Always Ask”，在提示中批准“Always Allow”会把该命令加入允许列表。

    **选项 C - 通过 SSH 代理 macOS 二进制文件（高级）。**
    保持 Gateway 运行在 Linux 上，但让所需的 CLI 二进制文件解析为在 Mac 上运行的 SSH 包装器。然后覆盖该技能以允许 Linux，使其保持可用。

    1. 为该二进制文件创建 SSH 包装器（示例：Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 将包装器放到 Linux 主机的 `PATH` 中（例如 `~/bin/memo`）。
    3. 覆盖技能元数据（工作区或 `~/.openclaw/skills`）以允许 Linux：

       ```markdown
       ---
       name: apple-notes
       description: 通过 macOS 上的 memo CLI 管理 Apple Notes。
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 开启新的会话，让技能快照刷新。

  </Accordion>

  <Accordion title="Do you have a Notion or HeyGen integration?">
    目前没有内置。

    选项：

    - **自定义技能 / 插件：** 最适合可靠的 API 访问（Notion/HeyGen 都有 API）。
    - **浏览器自动化：** 无需代码即可使用，但更慢也更脆弱。

    如果你想为每个客户保留上下文（代理工作流），一个简单模式是：

    - 每个客户一个 Notion 页面（上下文 + 偏好 + 当前工作）。
    - 让代理在会话开始时先抓取该页面。

    如果你想要原生集成，可以提交功能请求，或者构建一个针对这些 API 的技能。

    安装技能：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安装会落到当前工作区的 `skills/` 目录。若要让所有本地代理共享 skills，请使用 `openclaw skills install <slug> --global`（或手动放到 `~/.openclaw/skills/<name>/SKILL.md`）。如果只希望某些代理看到共享安装，请配置 `agents.defaults.skills` 或 `agents.list[].skills`。某些 skills 需要通过 Homebrew 安装二进制文件；在 Linux 上这意味着使用 Linuxbrew（参见上面的 Homebrew Linux FAQ 条目）。参见 [Skills](/tools/skills), [Skills config](/tools/skills-config), 和 [ClawHub](/tools/clawhub)。

  </Accordion>

  <Accordion title="How do I use my existing signed-in Chrome with OpenClaw?">
    使用内置的 `user` 浏览器配置文件，它通过 Chrome DevTools MCP 连接：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果你想要一个自定义名称，创建一个显式的 MCP 配置文件：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    这条路径可以使用本地主机浏览器或连接的浏览器节点。如果 Gateway 运行在别处，
    你可以在浏览器机器上运行节点主机，或者改用远程 CDP。

    `existing-session` / `user` 的当前限制：

    - 操作是基于 ref 的，而不是基于 CSS selector 的
    - 上传需要 `ref` / `inputRef`，并且当前一次只支持一个文件
    - `responsebody`、PDF 导出、下载拦截以及批量操作仍需要受管浏览器或原始 CDP 配置文件

  </Accordion>
</AccordionGroup>

## 沙箱和内存

<AccordionGroup>
  <Accordion title="Is there a dedicated sandboxing doc?">
    有。参见 [Sandboxing](/gateway/sandboxing)。关于 Docker 的特定设置（完整 Gateway 运行在 Docker 中或沙箱镜像），参见 [Docker](/install/docker)。
  </Accordion>

  <Accordion title="Docker feels limited - how do I enable full features?">
    默认镜像以安全优先方式运行，并使用 `node` 用户，因此不包含
    系统包、Homebrew 或捆绑浏览器。若要更完整的设置：

    - 通过 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，这样缓存才能保留。
    - 使用 `OPENCLAW_IMAGE_APT_PACKAGES` 将系统依赖烘焙进镜像。
    - 通过捆绑的 CLI 安装 Playwright 浏览器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保该路径被持久化。

    文档：[Docker](/install/docker), [Browser](/tools/browser)。

  </Accordion>

  <Accordion title="Can I keep DMs personal but make groups public/sandboxed with one agent?">
    可以——前提是你的私有流量是 **DMs**，公共流量是 **groups**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，这样群组/频道会话（非主键）会在配置的沙箱后端中运行，而主 DM 会话则保持在主机上。如果你不选择其他后端，Docker 是默认后端。然后通过 `tools.sandbox.tools` 限制沙箱会话中可用的工具。

    设置流程 + 示例配置：[Groups: personal DMs + public groups](/channels/groups#pattern-personal-dms-public-groups-single-agent)

    关键配置参考：[Gateway configuration](/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="How do I bind a host folder into the sandbox?">
    将 `agents.defaults.sandbox.docker.binds` 设为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局 + 每个代理的 bind 会合并；当 `scope: "shared"` 时，每个代理的 bind 会被忽略。对任何敏感内容请使用 `:ro`，并记住 bind 会绕过沙箱文件系统边界。

    OpenClaw 会通过规范化路径以及通过最深的现有祖先解析得到的规范路径来验证 bind 源。这意味着即使最后一个路径段尚不存在，符号链接父级逃逸也会以失败关闭的方式被阻止，并且在符号链接解析后仍会应用允许根目录检查。

    参见 [Sandboxing](/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check) 获取示例和安全说明。

  </Accordion>

  <Accordion title="How does memory work?">
    OpenClaw 的 memory 只是代理工作区里的 Markdown 文件：

    - `memory/YYYY-MM-DD.md` 中的每日笔记
    - `MEMORY.md` 中整理后的长期笔记（仅主/私有会话）

    OpenClaw 还会运行一次 **静默的压缩前内存刷新**，以提醒模型
    在自动压缩前写入持久笔记。只有当工作区可写时才会运行（只读沙箱会跳过）。
    参见 [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="Memory keeps forgetting things. How do I make it stick?">
    让机器人 **把事实写入 memory**。长期笔记属于 `MEMORY.md`，
    短期上下文放到 `memory/YYYY-MM-DD.md`。

    这仍是我们正在改进的领域。提醒模型存储记忆会有帮助；
    它会知道该怎么做。如果它总是忘记，检查 Gateway 是否每次运行都使用相同的
    工作区。

    文档：[Memory](/concepts/memory), [Agent workspace](/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="Does memory persist forever? What are the limits?">
    Memory 文件保存在磁盘上，并会一直保留，直到你删除它们。限制是你的
    存储空间，而不是模型。**会话上下文**仍受模型上下文窗口限制，因此长对话可能
    会被压缩或截断。这也是为什么存在 memory 搜索——它只会把相关部分重新带回上下文。

    文档：[Memory](/concepts/memory), [Context](/concepts/context)。

  </Accordion>

  <Accordion title="Does semantic memory search require an OpenAI API key?">
    仅当你使用 **OpenAI embeddings** 时才需要。Codex OAuth 仅覆盖聊天/补全，
    并 **不** 授予 embeddings 访问权限，所以使用 Codex 登录（OAuth 或
    Codex CLI 登录）**不会**帮助语义 memory 搜索。OpenAI embeddings
    仍然需要真正的 API key（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    If you don't set a provider explicitly, OpenClaw uses OpenAI embeddings. Legacy
    configs that still say `memorySearch.provider = "auto"` resolve to OpenAI too.
    If no OpenAI API key is available, semantic memory search stays unavailable
    until you configure a key or choose another provider explicitly.

    If you'd rather stay local, set `memorySearch.provider = "local"` (and optionally
    `memorySearch.fallback = "none"`). If you want Gemini embeddings, set
    `memorySearch.provider = "gemini"` and provide `GEMINI_API_KEY` (or
    `memorySearch.remote.apiKey`). We support **OpenAI, OpenAI-compatible, Gemini,
    Voyage, Mistral, Bedrock, Ollama, LM Studio, GitHub Copilot, DeepInfra, or local**
    embedding models - see [Memory](/concepts/memory) for the setup details.

  </Accordion>
</AccordionGroup>

## 磁盘上的内容位置

<AccordionGroup>
  <Accordion title="Is all data used with OpenClaw saved locally?">
    不是——**OpenClaw 的状态是本地的**，但**外部服务仍然能看到你发送给它们的内容**。

    - **默认本地：** 会话、memory 文件、配置和工作区都保存在 Gateway 主机上
      （`~/.openclaw` + 你的工作区目录）。
    - **出于必要而远程：** 你发送给模型提供商（Anthropic/OpenAI 等）的消息会进入
      它们的 API，而聊天平台（WhatsApp/Telegram/Slack 等）会把消息数据存储在它们自己的
      服务器上。
    - **由你控制可见范围：** 使用本地模型可让提示词留在你的机器上，但频道
      流量仍然会经过频道服务器。

    相关：[Agent workspace](/concepts/agent-workspace), [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="Where does OpenClaw store its data?">
    一切都位于 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

    | Path                                                            | Purpose                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主要配置（JSON5）                                                  |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 旧版 OAuth 导入（首次使用时复制到 auth profiles）                  |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | 认证配置文件（OAuth、API keys，以及可选的 `keyRef`/`tokenRef`）   |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 可选的基于文件的 secret 负载，供 `file` SecretRef 提供者使用      |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧版兼容文件（静态 `api_key` 条目会被清理）                        |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | 提供方状态（例如 `whatsapp/<accountId>/creds.json`）              |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每个代理的状态（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 对话历史和状态（每个代理）                                         |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据（每个代理）                                             |

    旧版单代理路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

    你的 **workspace**（AGENTS.md、memory 文件、skills 等）是独立的，通过 `agents.defaults.workspace` 配置（默认：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="Where should AGENTS.md / SOUL.md / USER.md / MEMORY.md live?">
    这些文件应位于 **代理工作区**，而不是 `~/.openclaw`。

    - **Workspace（每个代理）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`、`memory/YYYY-MM-DD.md`、可选的 `HEARTBEAT.md`。
      根目录小写的 `memory.md` 仅作为旧版修复输入；当两个文件都存在时，
      `openclaw doctor --fix` 可以把它合并到 `MEMORY.md` 中。
    - **State dir（`~/.openclaw`）**：配置、频道/提供方状态、认证配置文件、会话、日志，
      以及共享技能（`~/.openclaw/skills`）。

    默认 workspace 是 `~/.openclaw/workspace`，可通过以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后“忘记了”，请确认 Gateway 每次启动都使用相同的
    workspace（并记住：远程模式使用的是 **gateway 主机** 的 workspace，而不是你本地笔记本的）。

    提示：如果你想要持久的行为或偏好，让机器人 **把它写入
    AGENTS.md 或 MEMORY.md**，不要只依赖聊天历史。

    参见 [Agent workspace](/concepts/agent-workspace) 和 [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="Can I make SOUL.md bigger?">
    Yes. `SOUL.md` is one of the workspace bootstrap files injected into the
    agent context. The default per-file injection limit is `20000` characters,
    and the total bootstrap budget across files is `60000` characters.

    Change the shared defaults in your OpenClaw config:

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

    Or override one agent:

    ```json5
    {
      agents: {
        list: [
          {
            id: "main",
            bootstrapMaxChars: 50000,
            bootstrapTotalMaxChars: 300000,
          },
        ],
      },
    }
    ```

    Use `/context` to check raw vs injected sizes and whether truncation happened.
    Keep `SOUL.md` focused on voice, stance, and personality; put operating rules
    in `AGENTS.md` and durable facts in memory.

    See [Context](/concepts/context) and [Agent config](/gateway/config-agents).

  </Accordion>

  <Accordion title="Recommended backup strategy">
    将你的 **代理工作区** 放到一个 **私有** git 仓库中，并备份到某个
    私有位置（例如 GitHub 私有仓库）。这会保存 memory + AGENTS/SOUL/USER
    文件，并让你以后可以恢复这个助手的“记忆”。

    不要提交 `~/.openclaw` 下的任何内容（凭据、会话、令牌或加密的 secret 负载）。
    如果你需要完整恢复，请分别备份工作区和状态目录
    （参见上面的迁移问题）。

    文档：[Agent workspace](/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="How do I completely uninstall OpenClaw?">
    参见专门指南：[Uninstall](/install/uninstall)。
  </Accordion>

  <Accordion title="Can agents work outside the workspace?">
    可以。workspace 是**默认 cwd** 和 memory 锚点，不是硬性沙箱。
    相对路径会在 workspace 内解析，但绝对路径可以访问其他
    主机位置，除非启用了沙箱。如果你需要隔离，请使用
    [`agents.defaults.sandbox`](/gateway/sandboxing) 或每个代理的沙箱设置。如果你
    想让某个仓库成为默认工作目录，可以把该代理的 `workspace`
    指向仓库根目录。OpenClaw 仓库只是源代码；除非你有意让代理在其中工作，
    否则请保持 workspace 独立。

    示例（将仓库作为默认 cwd）：

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

  <Accordion title="Remote mode: where is the session store?">
    会话状态由 **gateway 主机** 管理。如果你处于远程模式，你关心的会话存储就在远程机器上，而不是你本地笔记本上。参见 [Session management](/concepts/session)。
  </Accordion>
</AccordionGroup>

## 配置基础

<AccordionGroup>
  <Accordion title="What format is the config? Where is it?">
    OpenClaw 从 `$OPENCLAW_CONFIG_PATH` 读取一个可选的 **JSON5** 配置（默认：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果文件缺失，它会使用相对安全的默认值（包括默认 workspace 为 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='I set gateway.bind: "lan" (or "tailnet") and now nothing listens / the UI says unauthorized'>
    非回环绑定 **需要有效的 gateway 认证路径**。实际上这意味着：

    - 共享密钥认证：token 或 password
    - `gateway.auth.mode: "trusted-proxy"`，位于配置正确的、具备身份感知的反向代理之后

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

    注意：

    - `gateway.remote.token` / `.password` 本身**不会**启用本地 gateway 认证。
    - 仅当 `gateway.auth.*` 未设置时，本地调用路径才会把 `gateway.remote.*` 作为后备。
    - 对于密码认证，请改为设置 `gateway.auth.mode: "password"` 加上 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置且未解析，解析会以失败关闭的方式终止（不会有远程后备掩盖）。
    - 共享密钥 Control UI 通过 `connect.params.auth.token` 或 `connect.params.auth.password` 进行认证（存储在 app/UI 设置中）。像 Tailscale Serve 或 `trusted-proxy` 这样的身份承载模式则改用请求头。不要把共享密钥放在 URL 中。
    - 使用 `gateway.auth.mode: "trusted-proxy"` 时，同主机回环反向代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`，并且在 `gateway.trustedProxies` 中加入一个回环条目。

  </Accordion>

  <Accordion title="Why do I need a token on localhost now?">
    OpenClaw 默认强制执行 gateway 认证，包括回环。在正常默认路径下，这意味着 token 认证：如果没有配置显式认证路径，gateway 启动会解析为 token 模式，并为该次启动生成一个仅运行时可用的 token，因此**本地 WS 客户端必须认证**。当客户端需要在重启间保持稳定 secret 时，请显式配置 `gateway.auth.token`、`gateway.auth.password`、`OPENCLAW_GATEWAY_TOKEN` 或 `OPENCLAW_GATEWAY_PASSWORD`。这可以阻止其他本地进程调用 Gateway。

    如果你更喜欢其他认证路径，可以显式选择 password 模式（或者对于具备身份感知的反向代理，选择 `trusted-proxy`）。如果你**真的**想开放回环访问，请在配置中显式设置 `gateway.auth.mode: "none"`。你随时可以让 doctor 帮你生成 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="Do I have to restart after changing config?">
    Gateway 会监视配置并支持热重载：

    - `gateway.reload.mode: "hybrid"`（默认）：安全变更热应用，关键变更重启
    - 也支持 `hot`、`restart`、`off`

  </Accordion>

  <Accordion title="How do I disable funny CLI taglines?">
    在配置中设置 `cli.banner.taglineMode`：

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
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：轮换有趣/季节性标语（默认行为）。
    - 如果你想完全不显示 banner，可以设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="How do I enable web search (and web fetch)?">
    `web_fetch` 无需 API key 即可使用。`web_search` 取决于你选择的
    provider：

    - API 驱动的 provider，例如 Brave、Exa、Firecrawl、Gemini、Kimi、MiniMax Search、Perplexity 和 Tavily，需要按其常规方式设置 API key。
    - Grok 可以复用模型认证中的 xAI OAuth，或者回退到 `XAI_API_KEY` / 插件 web-search 配置。
    - Ollama Web Search 不需要 key，但它使用你配置的 Ollama 主机并需要 `ollama signin`。
    - DuckDuckGo 不需要 key，但它是一个非官方的、基于 HTML 的集成。
    - SearXNG 不需要 key/可自托管；请配置 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`。

    **推荐：** 运行 `openclaw configure --section web` 并选择一个 provider。
    环境变量替代项：

    - Brave: `BRAVE_API_KEY`
    - Exa: `EXA_API_KEY`
    - Firecrawl: `FIRECRAWL_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: xAI OAuth, `XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` or `MOONSHOT_API_KEY`
    - MiniMax Search: `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY`, or `MINIMAX_API_KEY`
    - Perplexity: `PERPLEXITY_API_KEY` or `OPENROUTER_API_KEY`
    - SearXNG: `SEARXNG_BASE_URL`
    - Tavily: `TAVILY_API_KEY`

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

    provider-specific 的 web-search 配置现在位于 `plugins.entries.<plugin>.config.webSearch.*`。
    为兼容性保留的旧 `tools.web.search.*` provider 路径仍会临时加载，但新配置不应再使用它们。
    Firecrawl web-fetch 回退配置位于 `plugins.entries.firecrawl.config.webFetch.*`。

    注意：

    - 如果你使用 allowlist，请添加 `web_search`/`web_fetch`/`x_search` 或 `group:web`。
    - `web_fetch` 默认启用（除非显式禁用）。
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 会从可用凭据中自动检测第一个可用的 fetch 回退 provider。当前捆绑的 provider 是 Firecrawl。
    - 守护进程会从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档：[Web tools](/tools/web)。

  </Accordion>

  <Accordion title="config.apply wiped my config. How do I recover and avoid this?">
    `config.apply` 会替换**整个配置**。如果你发送的是部分对象，其余内容都会被移除。

    当前 OpenClaw 已保护许多误删情况：

    - OpenClaw-owned config writes validate the full post-change config before writing.
    - Invalid or destructive OpenClaw-owned writes are rejected and saved as `openclaw.json.rejected.*`.
    - If a direct edit breaks startup or hot reload, Gateway fails closed or skips the reload; it does not rewrite `openclaw.json`.
    - `openclaw doctor --fix` owns repair and can restore last-known-good while saving the rejected file as `openclaw.json.clobbered.*`.

    恢复方法：

    - Check `openclaw logs --follow` for `Invalid config at`, `Config write rejected:`, or `config reload skipped (invalid config)`.
    - Inspect the newest `openclaw.json.clobbered.*` or `openclaw.json.rejected.*` beside the active config.
    - Run `openclaw config validate` and `openclaw doctor --fix`.
    - Copy only the intended keys back with `openclaw config set` or `config.patch`.
    - If you have no last-known-good or rejected payload, restore from backup, or re-run `openclaw doctor` and reconfigure channels/models.
    - If this was unexpected, file a bug and include your last known config or any backup.
    - A local coding agent can often reconstruct a working config from logs or history.

    避免再次发生：

    - Use `openclaw config set` for small changes.
    - Use `openclaw configure` for interactive edits.
    - Use `config.schema.lookup` first when you are not sure about an exact path or field shape; it returns a shallow schema node plus immediate child summaries for drill-down.
    - Use `config.patch` for partial RPC edits; keep `config.apply` for full-config replacement only.
    - If you are using the agent-facing `gateway` tool from an agent run, it will still reject writes to `tools.exec.ask` / `tools.exec.security` (including legacy `tools.bash.*` aliases that normalize to the same protected exec paths).

    Docs: [Config](/cli/config), [Configure](/cli/configure), [Gateway troubleshooting](/gateway/troubleshooting#gateway-rejected-invalid-config), [Doctor](/gateway/doctor).

  </Accordion>

  <Accordion title="How do I run a central Gateway with specialized workers across devices?">
    常见模式是 **一个 Gateway**（例如树莓派）加上 **nodes** 和 **agents**：

    - **Gateway（中心）：** 负责 channels（Signal/WhatsApp）、路由和会话。
    - **Nodes（设备）：** Mac/iOS/Android 作为外围设备连接，并暴露本地工具（`system.run`、`canvas`、`camera`）。
    - **Agents（worker）：** 为特殊角色提供独立的大脑/工作区（例如“Hetzner 运维”、“个人数据”）。
    - **Sub-agents：** 当你需要并行时，从主代理中生成后台工作。
    - **TUI：** 连接到 Gateway 并切换代理/会话。

    文档：[Nodes](/nodes), [Remote access](/gateway/remote), [Multi-Agent Routing](/concepts/multi-agent), [Sub-agents](/tools/subagents), [TUI](/web/tui)。

  </Accordion>

  <Accordion title="Can the OpenClaw browser run headless?">
    可以。这是一个配置项：

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

    默认值是 `false`（有界面模式）。无头模式在某些网站上更容易触发反机器人检查。参见 [Browser](/tools/browser)。

    无头模式使用**相同的 Chromium 引擎**，对大多数自动化（表单、点击、抓取、登录）都有效。主要区别：

    - 没有可见的浏览器窗口（如果你需要可视化，请使用截图）。
    - 某些网站对无头模式下的自动化限制更严格（CAPTCHA、反机器人）。
      例如，X/Twitter 经常会阻止无头会话。

  </Accordion>

  <Accordion title="How do I use Brave for browser control?">
    将 `browser.executablePath` 设为你的 Brave 二进制文件（或任何基于 Chromium 的浏览器），并重启 Gateway。
    详见 [Browser](/tools/browser#use-brave-or-another-chromium-based-browser) 中的完整配置示例。
  </Accordion>
</AccordionGroup>

## 远程 gateway 和节点

<AccordionGroup>
  <Accordion title="How do commands propagate between Telegram, the gateway, and nodes?">
    Telegram 消息由 **gateway** 处理。gateway 先运行代理，
    只有在需要 node 工具时才通过 **Gateway WebSocket** 调用 nodes：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    Nodes 不会看到入站 provider 流量；它们只接收 node RPC 调用。

  </Accordion>

  <Accordion title="How can my agent access my computer if the Gateway is hosted remotely?">
    简短答案：**把你的电脑配对为一个 node**。Gateway 运行在别处，但它可以通过 Gateway WebSocket 在你的本地机器上调用 `node.*` 工具（屏幕、摄像头、系统）。

    典型设置：

    1. 在始终在线的主机（VPS/家用服务器）上运行 Gateway。
    2. 将 Gateway 主机和你的电脑放在同一个 tailnet 中。
    3. 确保 Gateway WS 可达（tailnet bind 或 SSH 隧道）。
    4. 在本地打开 macOS 应用，并以 **Remote over SSH** 模式（或直接 tailnet）
       连接，使其可以注册为一个 node。
    5. 在 Gateway 上批准该 node：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP bridge；nodes 通过 Gateway WebSocket 连接。

    安全提醒：配对 macOS node 会允许在那台机器上使用 `system.run`。只
    配对你信任的设备，并查看 [Security](/gateway/security)。

    文档：[Nodes](/nodes), [Gateway protocol](/gateway/protocol), [macOS remote mode](/platforms/mac/remote), [Security](/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale is connected but I get no replies. What now?">
    检查基础项：

    - Gateway 正在运行：`openclaw gateway status`
    - Gateway 健康状态：`openclaw status`
    - Channel 健康状态：`openclaw channels status`

    然后验证认证和路由：

    - 如果你使用 Tailscale Serve，确保 `gateway.auth.allowTailscale` 设置正确。
    - 如果你通过 SSH 隧道连接，确认本地隧道已建立且指向正确端口。
    - 确认你的 allowlist（DM 或 group）包含你的账号。

    文档：[Tailscale](/gateway/tailscale), [Remote access](/gateway/remote), [Channels](/channels)。

  </Accordion>

  <Accordion title="Can two OpenClaw instances talk to each other (local + VPS)?">
    可以。没有内置的“bot-to-bot”桥接，但你可以用几种可靠方式把它接起来：

    **最简单：** 使用一个两个机器人都能访问的正常聊天渠道（Telegram/Slack/WhatsApp）。
    让 Bot A 给 Bot B 发消息，然后让 Bot B 像平常一样回复。

    **CLI bridge（通用）：** 运行一个脚本，用
    `openclaw agent --message ... --deliver` 调用另一个 Gateway，目标是一个
    另一个机器人监听的聊天。若其中一个机器人在远程 VPS 上，则通过 SSH/Tailscale
    将 CLI 指向该远程 Gateway（参见 [Remote access](/gateway/remote)）。

    示例模式（从能连接目标 Gateway 的机器上运行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：添加一个防护措施，避免两个机器人无限循环（仅在被提及时回复、channel
    allowlist，或“不要回复机器人消息”的规则）。

    文档：[Remote access](/gateway/remote), [Agent CLI](/cli/agent), [Agent send](/tools/agent-send)。

  </Accordion>

  <Accordion title="Do I need separate VPSes for multiple agents?">
    不需要。一个 Gateway 可以托管多个 agents，每个 agent 都有自己的 workspace、模型默认值
    和路由。这是正常设置，而且比每个 agent 跑一个 VPS 便宜且简单得多。

    只有当你需要硬隔离（安全边界）或非常不同、且不想共享的配置时，才使用多个 VPS。
    否则，保持一个 Gateway，使用多个 agents 或 sub-agents。

  </Accordion>

  <Accordion title="Is there a benefit to using a node on my personal laptop instead of SSH from a VPS?">
    有——nodes 是从远程 Gateway 访问你笔记本的首选方式，而且不只是 shell 访问。Gateway 运行在 macOS/Linux（Windows 通过 WSL2）上，并且非常轻量（小型 VPS 或树莓派级别的机器都可以；4 GB RAM 就足够），因此常见方案是一个常驻主机加上你的笔记本作为 node。

    - **不需要入站 SSH。** nodes 通过 Gateway WebSocket 外连，并使用设备配对。
    - **更安全的执行控制。** `system.run` 会在该笔记本上受到 node allowlist/审批的限制。
    - **更多设备工具。** nodes 除了 `system.run` 之外，还暴露 `canvas`、`camera` 和 `screen`。
    - **本地浏览器自动化。** 保持 Gateway 在 VPS 上运行，但通过笔记本上的 node host 本地运行 Chrome，或通过 Chrome MCP 连接到主机上的本地 Chrome。

    SSH 适合临时 shell 访问，但对于持续的代理工作流和设备自动化，nodes 更简单。

    文档：[Nodes](/nodes), [Nodes CLI](/cli/nodes), [Browser](/tools/browser)。

  </Accordion>

  <Accordion title="Do nodes run a gateway service?">
    不。除非你有意运行隔离配置文件（参见 [Multiple gateways](/gateway/multiple-gateways)），否则每台主机上只应运行 **一个 gateway**。Nodes 是连接到 gateway 的外围设备（iOS/Android nodes，或菜单栏应用中的 macOS“node mode”）。对于无头 node 主机和 CLI 控制，参见 [Node host CLI](/cli/node)。

    完整的重启对于 `gateway`、`discovery` 和托管插件表面的更改是必需的。

  </Accordion>

  <Accordion title="Is there an API / RPC way to apply config?">
    有。

    - `config.schema.lookup`: 在写入前，检查一个配置子树及其浅层 schema 节点、匹配的 UI 提示和直接子摘要
    - `config.get`: 获取当前快照 + hash
    - `config.patch`: 安全的部分更新（大多数 RPC 编辑的首选）；在可能时热重载，必要时重启
    - `config.apply`: 验证并替换完整配置；在可能时热重载，必要时重启
    - 面向代理的 `gateway` 运行时工具仍然会拒绝重写 `tools.exec.ask` / `tools.exec.security`；旧的 `tools.bash.*` 别名会规范化为相同的受保护 exec 路径

  </Accordion>

  <Accordion title="Minimal sane config for a first install">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这会设置你的 workspace，并限制谁可以触发机器人。

  </Accordion>

  <Accordion title="How do I set up Tailscale on a VPS and connect from my Mac?">
    最小步骤：

    1. **在 VPS 上安装 + 登录**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在你的 Mac 上安装 + 登录**
       - 使用 Tailscale 应用并登录到同一个 tailnet。
    3. **启用 MagicDNS（推荐）**
       - 在 Tailscale 管理控制台中启用 MagicDNS，这样 VPS 会有稳定名称。
    4. **使用 tailnet 主机名**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果你想在不使用 SSH 的情况下使用 Control UI，请在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这会让 gateway 绑定到回环地址，并通过 Tailscale 暴露 HTTPS。参见 [Tailscale](/gateway/tailscale)。

  </Accordion>

  <Accordion title="How do I connect a Mac node to a remote Gateway (Tailscale Serve)?">
    Serve 暴露的是 **Gateway Control UI + WS**。Nodes 通过同一个 Gateway WS 端点连接。

    推荐设置：

    1. **确保 VPS + Mac 在同一个 tailnet 上**。
    2. **在 Remote 模式下使用 macOS 应用**（SSH 目标可以是 tailnet 主机名）。
       应用会隧道转发 Gateway 端口并作为 node 连接。
    3. **在 gateway 上批准 node**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档：[Gateway protocol](/gateway/protocol), [Discovery](/gateway/discovery), [macOS remote mode](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="Should I install on a second laptop or just add a node?">
    如果你只需要第二台笔记本上的**本地工具**（screen/camera/exec），把它添加为一个
    **node**。这样可以保持单个 Gateway，避免重复配置。本地 node 工具
    目前仅支持 macOS，但我们计划将其扩展到其他操作系统。

    只有在你需要**硬隔离**或两个完全独立的机器人时，才安装第二个 Gateway。

    文档：[Nodes](/nodes), [Nodes CLI](/cli/nodes), [Multiple gateways](/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 环境变量和 .env 加载

<AccordionGroup>
  <Accordion title="How does OpenClaw load environment variables?">
    OpenClaw 会从父进程（shell、launchd/systemd、CI 等）读取环境变量，并额外加载：

    - 当前工作目录下的 `.env`
    - `~/.openclaw/.env`（即 `$OPENCLAW_STATE_DIR/.env`）中的全局后备 `.env`

    Neither `.env` file overrides existing env vars.
    Provider credential variables are an exception for workspace `.env`: keys such as
    `GEMINI_API_KEY`, `XAI_API_KEY`, or `MISTRAL_API_KEY` are ignored from workspace
    `.env` and should live in the process environment, `~/.openclaw/.env`, or config `env`.

    你也可以在配置中定义内联环境变量（仅在进程环境中缺失时应用）：

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

  <Accordion title="I started the Gateway via the service and my env vars disappeared. What now?">
    两个常见修复方法：

    1. 把缺失的键放到 `~/.openclaw/.env` 中，这样即使服务没有继承你的 shell 环境，它们也会被加载。
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

    这会运行你的登录 shell，并且只导入缺失的预期键（绝不会覆盖）。环境变量等价项：
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='I set COPILOT_GITHUB_TOKEN, but models status shows "Shell env: off." Why?'>
    `openclaw models status` 报告的是**shell 环境导入**是否启用。“Shell env: off”
    并 **不** 表示你的环境变量缺失——它只是表示 OpenClaw 不会自动加载
    你的登录 shell。

    如果 Gateway 作为服务（launchd/systemd）运行，它不会继承你的 shell
    环境。请通过以下任一方式修复：

    1. 将 token 放入 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或启用 shell 导入（`env.shellEnv.enabled: true`）。
    3. 或把它加入配置中的 `env` 区块（仅在缺失时生效）。

    然后重启 gateway 并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot token 从 `COPILOT_GITHUB_TOKEN` 读取（也支持 `GH_TOKEN` / `GITHUB_TOKEN`）。
    参见 [/concepts/model-providers](/concepts/model-providers) 和 [/environment](/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话和多个聊天

<AccordionGroup>
  <Accordion title="How do I start a fresh conversation?">
    发送 `/new` 或 `/reset` 作为独立消息。参见 [Session management](/concepts/session)。
  </Accordion>

  <Accordion title="Do sessions reset automatically if I never send /new?">
    会话可能在 `session.idleMinutes` 后过期，但这**默认禁用**（默认值 **0**）。
    将其设为正值即可启用空闲过期。启用后，空闲期之后的**下一条**
    消息会为该 chat key 开启一个新的会话 id。
    这不会删除转录——它只是开始一个新会话。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="Is there a way to make a team of OpenClaw instances (one CEO and many agents)?">
    可以，通过 **multi-agent routing** 和 **sub-agents**。你可以创建一个协调
    代理和多个 worker 代理，它们各自拥有自己的工作区和模型。

    话虽如此，这最好被视为一个**有趣的实验**。它非常耗 token，而且
    往往不如使用一个带独立会话的机器人高效。我们设想的典型模式是一个你与之对话的机器人，
    通过不同会话处理并行工作。该机器人在需要时也可以生成 sub-agents。

    文档：[Multi-agent routing](/concepts/multi-agent), [Sub-agents](/tools/subagents), [Agents CLI](/cli/agents)。

  </Accordion>

  <Accordion title="Why did context get truncated mid-task? How do I prevent it?">
    会话上下文受模型窗口限制。长聊天、大量工具输出或许多
    文件都可能触发压缩或截断。

    有帮助的方法：

    - 让机器人总结当前状态并写入文件。
    - 在长任务前使用 `/compact`，切换话题时使用 `/new`。
    - 把重要上下文保存在工作区中，并让机器人把它读回来。
    - 对长时间或并行工作使用 sub-agents，让主聊天保持更小。
    - 如果这经常发生，选择上下文窗口更大的模型。

  </Accordion>

  <Accordion title="How do I completely reset OpenClaw but keep it installed?">
    使用 reset 命令：

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

    注意：

    - Onboarding 在检测到现有配置时也会提供 **Reset**。参见 [Onboarding (CLI)](/start/wizard)。
    - 如果你使用了 profiles（`--profile` / `OPENCLAW_PROFILE`），请为每个 state dir 单独重置（默认是 `~/.openclaw-<profile>`）。
    - 开发重置：`openclaw gateway --dev --reset`（仅开发可用；会清除开发配置 + 凭据 + 会话 + 工作区）。

  </Accordion>

  <Accordion title='I am getting "context too large" errors - how do I reset or compact?'>
    使用以下任一方式：

    - **Compact**（保留对话，但总结更早的轮次）：

      ```
      /compact
      ```

      或使用 `/compact <instructions>` 来引导摘要。

    - **Reset**（为同一个 chat key 开启新的会话 id）：

      ```
      /new
      /reset
      ```

    如果持续发生：

    - 启用或调整 **session pruning**（`agents.defaults.contextPruning`）以裁剪旧的工具输出。
    - 使用上下文窗口更大的模型。

    文档：[Compaction](/concepts/compaction), [Session pruning](/concepts/session-pruning), [Session management](/concepts/session)。

  </Accordion>

  <Accordion title='Why am I seeing "LLM request rejected: messages.content.tool_use.input field required"?'>
    这是一个 provider 验证错误：模型输出了一个 `tool_use` 块，但缺少必需的
    `input`。这通常意味着会话历史过旧或损坏（通常发生在长线程之后
    或工具/schema 变更之后）。

    修复：使用 `/new`（独立消息）开启一个新会话。

  </Accordion>

  <Accordion title="Why am I getting heartbeat messages every 30 minutes?">
    Heartbeats 默认每 **30 分钟** 运行一次（使用 OAuth auth 时为 **1 小时**）。你可以调整或禁用它们：

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

    If `HEARTBEAT.md` exists but is effectively empty (only blank lines,
    Markdown/HTML comments, Markdown headings like `# Heading`, fence markers,
    or empty checklist stubs), OpenClaw skips the heartbeat run to save API calls.
    If the file is missing, the heartbeat still runs and the model decides what to do.

    每个代理的覆盖项使用 `agents.list[].heartbeat`。文档：[Heartbeat](/gateway/heartbeat)。

  </Accordion>

  <Accordion title='Do I need to add a "bot account" to a WhatsApp group?'>
    不需要。OpenClaw 运行在**你自己的账号**上，所以如果你在群里，OpenClaw 就能看到。
    默认情况下，在群组中回复会被阻止，直到你允许发送者（`groupPolicy: "allowlist"`）。

    如果你希望只有**你**可以触发群组回复：

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

  <Accordion title="How do I get the JID of a WhatsApp group?">
    选项 1（最快）：尾随日志并在群里发送一条测试消息：

    ```bash
    openclaw logs --follow --json
    ```

    查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    选项 2（如果已配置/已加入 allowlist）：从配置中列出群组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/channels/whatsapp), [Directory](/cli/directory), [Logs](/cli/logs)。

  </Accordion>

  <Accordion title="Why does OpenClaw not reply in a group?">
    两个常见原因：

    - 已开启 mention gating（默认）。你必须 @mention 机器人（或匹配 `mentionPatterns`）。
    - 你配置了 `channels.whatsapp.groups` 但没有 `"*"`，而该群不在 allowlist 中。

    参见 [Groups](/channels/groups) 和 [Group messages](/channels/group-messages)。

  </Accordion>

  <Accordion title="Do groups/threads share context with DMs?">
    默认情况下，直接聊天会折叠到主会话。群组/频道有各自的会话键，而 Telegram topics / Discord threads 是独立会话。参见 [Groups](/channels/groups) 和 [Group messages](/channels/group-messages)。
  </Accordion>

  <Accordion title="How many workspaces and agents can I create?">
    没有硬性限制。几十个（甚至几百个）都可以，但要注意：

    - **磁盘增长：** 会话 + 转录存储在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **Token 成本：** 更多代理意味着更多并发模型使用。
    - **运维开销：** 每个代理的认证配置、工作区和频道路由。

    提示：

    - 每个代理保持一个**活跃** workspace（`agents.defaults.workspace`）。
    - 如果磁盘增长，清理旧会话（删除 JSONL 或 store 条目）。
    - 使用 `openclaw doctor` 查找多余的工作区和 profile 不匹配。

  </Accordion>

  <Accordion title="Can I run multiple bots or chats at the same time (Slack), and how should I set that up?">
    可以。使用 **Multi-Agent Routing** 运行多个隔离的代理，并按
    channel/account/peer 路由入站消息。Slack 作为一个 channel 是受支持的，并且可以绑定到特定代理。

    浏览器访问很强大，但并不是“人类能做的它都能做”——反机器人、CAPTCHA 和 MFA 仍然可能
    阻止自动化。要获得最可靠的浏览器控制，请在主机上使用本地 Chrome MCP，
    或在实际运行浏览器的机器上使用 CDP。

    最佳实践设置：

    - 始终在线的 Gateway 主机（VPS/Mac mini）。
    - 每个角色一个代理（绑定）。
    - 绑定到这些代理的 Slack channel。
    - 需要时通过 Chrome MCP 或 node 使用本地浏览器。

    文档：[Multi-Agent Routing](/concepts/multi-agent), [Slack](/channels/slack),
    [Browser](/tools/browser), [Nodes](/nodes)。

  </Accordion>
</AccordionGroup>

## 模型、故障转移和认证配置文件

模型问答——默认值、选择、别名、切换、故障转移、认证配置文件——
位于 [Models FAQ](/help/faq-models)。

## Gateway：端口、“already running”和远程模式

<AccordionGroup>
  <Accordion title="What port does the Gateway use?">
    `gateway.port` 控制 WebSocket + HTTP（Control UI、hooks 等）使用的单一复用端口。

    优先级：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='Why does openclaw gateway status say "Runtime: running" but "Connectivity probe: failed"?'>
    因为“running”是**监督器**的视角（launchd/systemd/schtasks）。connectivity probe 是 CLI 实际连接到 gateway WebSocket。

    使用 `openclaw gateway status` 并信任这些行：

    - `Probe target:`（探测实际使用的 URL）
    - `Listening:`（端口上实际绑定的内容）
    - `Last gateway error:`（进程活着但端口没在监听时的常见根因）

  </Accordion>

  <Accordion title='Why does openclaw gateway status show "Config (cli)" and "Config (service)" different?'>
    你正在编辑一个配置文件，而服务运行的是另一个（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    修复：

    ```bash
    openclaw gateway install --force
    ```

    请在你希望服务使用的同一个 `--profile` / 环境下运行它。

  </Accordion>

  <Accordion title='What does "another gateway instance is already listening" mean?'>
    OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制执行运行时锁（默认 `ws://127.0.0.1:18789`）。如果绑定失败并出现 `EADDRINUSE`，它会抛出 `GatewayLockError`，表示已有另一个实例在监听。

    修复：停止另一个实例、释放端口，或使用 `openclaw gateway --port <port>` 运行。

  </Accordion>

  <Accordion title="How do I run OpenClaw in remote mode (client connects to a Gateway elsewhere)?">
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

    注意：

    - 仅当 `gateway.mode` 为 `local`（或你传入覆盖标志）时，`openclaw gateway` 才会启动。
    - macOS 应用会监视配置文件，并在这些值变化时实时切换模式。
    - `gateway.remote.token` / `.password` 只是客户端侧远程凭据；它们本身不会启用本地 gateway 认证。

  </Accordion>

  <Accordion title='The Control UI says "unauthorized" (or keeps reconnecting). What now?'>
    你的 gateway 认证路径与 UI 的认证方式不匹配。

    事实（来自代码）：

    - The Control UI keeps the token in `sessionStorage` for the current browser tab session and selected gateway URL, so same-tab refreshes keep working without restoring long-lived localStorage token persistence.
    - On `AUTH_TOKEN_MISMATCH`, trusted clients can attempt one bounded retry with a cached device token when the gateway returns retry hints (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).
    - That cached-token retry now reuses the cached approved scopes stored with the device token. Explicit `deviceToken` / explicit `scopes` callers still keep their requested scope set instead of inheriting cached scopes.
    - Outside that retry path, connect auth precedence is explicit shared token/password first, then explicit `deviceToken`, then stored device token, then bootstrap token.
    - Built-in setup-code bootstrap is node-only. After approval, it returns a node device token with `scopes: []` and does not return a handed-off operator token.

    修复：

    - 最快方式：`openclaw dashboard`（打印并复制 dashboard URL，尝试打开；无头时会显示 SSH 提示）。
    - 如果你还没有 token：`openclaw doctor --generate-gateway-token`。
    - 如果是远程，先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`。
    - 共享密钥模式：设置 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然后在 Control UI 设置中粘贴匹配的密钥。
    - Tailscale Serve 模式：确保 `gateway.auth.allowTailscale` 已启用，并且你打开的是 Serve URL，而不是绕过 Tailscale 身份头的原始回环/tailnet URL。
    - trusted-proxy 模式：确保你是通过已配置的、具备身份感知的代理进入，而不是原始 gateway URL。同主机回环代理还需要 `gateway.auth.trustedProxy.allowLoopback = true`。
    - 如果在那一次重试后仍然不匹配，轮换/重新批准配对设备 token：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果该 rotate 调用显示被拒绝，请检查两件事：
      - 配对设备会话只能轮换它们自己的设备，除非它们还拥有 `operator.admin`
      - 显式 `--scope` 值不能超过调用者当前的 operator scopes
    - 仍然卡住？运行 `openclaw status --all` 并遵循 [Troubleshooting](/gateway/troubleshooting)。有关认证细节，请参见 [Dashboard](/web/dashboard)。

  </Accordion>

  <Accordion title="I set gateway.bind tailnet but it cannot bind and nothing listens">
    `tailnet` 绑定会从你的网络接口中选择一个 Tailscale IP（100.64.0.0/10）。如果机器没有连接 Tailscale（或者接口已关闭），就没有可绑定的地址。

    修复：

    - 在该主机上启动 Tailscale（使其拥有 100.x 地址），或者
    - 切换到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是显式设置。`auto` 默认优先 loopback；当你想要仅 tailnet 绑定时，请使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="Can I run multiple Gateways on the same host?">
    通常不行——一个 Gateway 就可以运行多个消息 channel 和 agents。只有在你需要冗余（例如：救援机器人）或硬隔离时才使用多个 Gateway。

    可以，但你必须隔离：

    - `OPENCLAW_CONFIG_PATH`（每个实例的配置）
    - `OPENCLAW_STATE_DIR`（每个实例的状态）
    - `agents.defaults.workspace`（workspace 隔离）
    - `gateway.port`（唯一端口）

    快速设置（推荐）：

    - 每个实例使用 `openclaw --profile <name> ...`（会自动创建 `~/.openclaw-<name>`）。
    - 在每个 profile 的配置中设置唯一的 `gateway.port`（或者在手动运行时传入 `--port`）。
    - 安装每个 profile 的服务：`openclaw --profile <name> gateway install`。

    profiles 也会给服务名称加后缀（`ai.openclaw.<profile>`；旧版 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='What does "invalid handshake" / code 1008 mean?'>
    Gateway 是一个 **WebSocket 服务器**，它期望收到的第一条消息是
    `connect` 帧。如果收到其他内容，它会以 **code 1008**（策略违规）关闭连接。

    常见原因：

    - 你在浏览器中打开了 **HTTP** URL（`http://...`），而不是使用 WS 客户端。
    - 你使用了错误的端口或路径。
    - 代理或隧道去掉了认证头，或者发送了非 Gateway 请求。

    快速修复：

    1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS，则用 `wss://...`）。
    2. 不要在普通浏览器标签页中打开 WS 端口。
    3. 如果启用了认证，请在 `connect` 帧中包含 token/password。

    如果你使用 CLI 或 TUI，URL 应该类似这样：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    协议细节：[Gateway protocol](/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日志和调试

<AccordionGroup>
  <Accordion title="Where are logs?">
    文件日志（结构化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    你可以通过 `logging.file` 设置稳定路径。文件日志级别由 `logging.level` 控制。控制台详细程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快的日志尾随方式：

    ```bash
    openclaw logs --follow
    ```

    服务/监督器日志（当 gateway 通过 launchd/systemd 运行时）：

    - macOS launchd stdout: `~/Library/Logs/openclaw/gateway.log` (profiles use `gateway-<profile>.log`; stderr is suppressed)
    - Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多内容参见 [Troubleshooting](/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="How do I start/stop/restart the Gateway service?">
    使用 gateway 辅助命令：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你手动运行 gateway，`openclaw gateway --force` 可以重新占用端口。参见 [Gateway](/gateway)。

  </Accordion>

  <Accordion title="I closed my terminal on Windows - how do I restart OpenClaw?">
    There are **three Windows install modes**:

    **1) Windows Hub local setup:** the native app manages a local app-owned WSL Gateway.

    Open **OpenClaw Companion** from the Start menu or tray, then use
    **Gateway Setup** or the Connections tab.

    **2) Manual WSL2 Gateway:** the Gateway runs inside Linux.

    打开 PowerShell，进入 WSL，然后重启：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你从未安装过服务，请在前台启动它：

    ```bash
    openclaw gateway run
    ```

    **3) Native Windows CLI/Gateway:** the Gateway runs directly in Windows.

    打开 PowerShell 并运行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你手动运行它（没有服务），请使用：

    ```powershell
    openclaw gateway run
    ```

    Docs: [Windows](/platforms/windows), [Gateway service runbook](/gateway).

  </Accordion>

  <Accordion title="The Gateway is up but replies never arrive. What should I check?">
    先做一次快速健康检查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：

    - 模型认证未在**gateway 主机**上加载（检查 `models status`）。
    - channel 配对/allowlist 阻止了回复（检查 channel 配置 + 日志）。
    - WebChat/Dashboard 在没有正确 token 的情况下打开。

    如果你在远程，请确认隧道/Tailscale 连接已建立，并且
    Gateway WebSocket 可达。

    文档：[Channels](/channels), [Troubleshooting](/gateway/troubleshooting), [Remote access](/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" - what now?'>
    这通常意味着 UI 丢失了 WebSocket 连接。检查：

    1. Gateway 是否在运行？`openclaw gateway status`
    2. Gateway 是否健康？`openclaw status`
    3. UI 是否有正确的 token？`openclaw dashboard`
    4. 如果是远程，隧道/Tailscale 链接是否已建立？

    然后尾随日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[Dashboard](/web/dashboard), [Remote access](/gateway/remote), [Troubleshooting](/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands fails. What should I check?">
    先查看日志和 channel 状态：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后匹配错误：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单条目太多。OpenClaw 已经会裁剪到 Telegram 限制并用更少命令重试，但仍然需要丢弃一些菜单条目。减少插件/技能/自定义命令，或者如果你不需要菜单，请禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似网络错误：如果你在 VPS 上或处于代理后面，请确认允许出站 HTTPS，并且 `api.telegram.org` 的 DNS 正常。

    如果 Gateway 是远程的，请确保你查看的是 Gateway 主机上的日志。

    文档：[Telegram](/channels/telegram), [Channel troubleshooting](/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI shows no output. What should I check?">
    先确认 Gateway 可达且代理可运行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看当前状态。如果你期望在聊天渠道中收到回复，
    请确保已启用投递（`/deliver on`）。

    文档：[TUI](/web/tui), [Slash commands](/tools/slash-commands)。

  </Accordion>

  <Accordion title="How do I completely stop then start the Gateway?">
    如果你安装了服务：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    这会停止/启动**受监督的服务**（macOS 上的 launchd，Linux 上的 systemd）。
    当 Gateway 作为后台守护进程运行时使用这个方法。

    如果你是在前台运行，先用 Ctrl-C 停止，然后：

    ```bash
    openclaw gateway run
    ```

    文档：[Gateway service runbook](/gateway)。

  </Accordion>

  <Accordion title="ELI5: openclaw gateway restart vs openclaw gateway">
    - `openclaw gateway restart`：重启**后台服务**（launchd/systemd）。
    - `openclaw gateway`：在这个终端会话中以前台方式运行 gateway。

    如果你安装了服务，请使用 gateway 命令。只有当你想进行一次性的前台运行时，
    才使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="Fastest way to get more details when something fails">
    使用 `--verbose` 启动 Gateway 以获得更多控制台细节。然后检查日志文件以获取 channel 认证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>

## 媒体和附件

<AccordionGroup>
  <Accordion title="My skill generated an image/PDF, but nothing was sent">
    Outbound attachments from the agent must use structured media fields such as `media`, `mediaUrl`, `path`, or `filePath`. See [OpenClaw assistant setup](/start/openclaw) and [Agent send](/tools/agent-send).

    CLI 发送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    另外还要检查：

    - The target channel supports outbound media and isn't blocked by allowlists.
    - The file is within the provider's size limits (images are resized to max 2048px).
    - `tools.fs.workspaceOnly=true` keeps local-path sends limited to workspace, temp/media-store, and sandbox-validated files.
    - `tools.fs.workspaceOnly=false` lets structured local media sends use host-local files the agent can already read, but only for media plus safe document types (images, audio, video, PDF, Office docs, and validated text documents such as Markdown/MD, TXT, JSON, YAML, and YML). This is not a secret scanner: an agent-readable `secret.txt` or `config.json` can be attached when the extension and content validation match. Keep sensitive files outside agent-readable paths, or keep `tools.fs.workspaceOnly=true` for stricter local-path sends.

    参见 [Images](/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全与访问控制

<AccordionGroup>
  <Accordion title="Is it safe to expose OpenClaw to inbound DMs?">
    将入站 DMs 视为不可信输入。默认设置旨在降低风险：

    - 支持 DM 的 channel 上的默认行为是 **pairing**：
      - 未知发送者会收到配对码；机器人不会处理其消息。
      - 使用以下命令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待处理请求上限为每个 channel **3 个**；如果代码没有到达，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公开开放 DMs 需要显式选择加入（`dmPolicy: "open"` 且 allowlist 为 `"*"`）。

    运行 `openclaw doctor` 可以发现有风险的 DM 策略。

  </Accordion>

  <Accordion title="Is prompt injection only a concern for public bots?">
    不是。Prompt injection 关乎的是**不可信内容**，不仅仅是谁给机器人发了 DM。
    如果你的助手读取外部内容（web 搜索/抓取、浏览器页面、邮件、
    文档、附件、粘贴的日志），这些内容都可能包含试图
    劫持模型的指令。即使**只有你一个发送者**，这种情况也可能发生。

    最大的风险出现在工具启用时：模型可能被诱导泄露上下文或代表你调用工具。
    通过以下方式降低影响范围：

    - 使用只读或禁用工具的“reader”代理来总结不可信内容
    - 对启用工具的代理关闭 `web_search` / `web_fetch` / `browser`
    - 同样把解码后的文件/文档文本视为不可信：OpenResponses
      `input_file` 和媒体附件提取都会把提取出的文本包裹在
      显式的外部内容边界标记中，而不是传递原始文件文本
    - 沙箱和严格的工具 allowlist

    细节：[Security](/gateway/security)。

  </Accordion>

  <Accordion title="Is OpenClaw less safe because it uses TypeScript/Node instead of Rust/WASM?">
    语言和运行时很重要，但它们并不是个人代理的主要风险。
    OpenClaw 的实际风险是 gateway 暴露范围、谁可以给 bot 发消息、
    prompt injection、工具范围、凭据处理、浏览器访问、exec
    访问，以及第三方 skill 或插件的信任问题。

    Rust 和 WASM 可以为某些代码类别提供更强的隔离，但
    它们并不能解决 prompt injection、糟糕的 allowlist、公开的 gateway 暴露、
    过宽的工具权限，或已经登录到敏感账号的浏览器配置文件。请把这些视为主要控制项：

    - 保持 Gateway 私有或经过认证
    - 对 DMs 和 groups 使用 pairing 和 allowlist
    - 对不可信输入拒绝或沙箱化高风险工具
    - 仅安装可信的 plugins 和 skills
    - 在配置变更后运行 `openclaw security audit --deep`

    详情：[Security](/gateway/security), [Sandboxing](/gateway/sandboxing)。

  </Accordion>

  <Accordion title="I saw reports about exposed OpenClaw instances. What should I check?">
    首先检查你的实际部署：

    ```bash
    openclaw security audit --deep
    openclaw gateway status
    ```

    更安全的基线是：

    - Gateway 绑定到 `loopback`，或仅通过经过认证的私有
      访问方式暴露，例如 tailnet、SSH 隧道、token/password 认证，或正确
      配置的 trusted proxy
    - DMs 处于 `pairing` 或 `allowlist` 模式
    - groups 使用 allowlist，并启用 mention gate，除非每个成员都可信
    - 对读取不可信内容的代理，拒绝高风险工具（`exec`、`browser`、`gateway`、`cron`）或严格
      限制其范围
    - 在工具执行需要更小爆炸半径时启用沙箱

    没有认证的公开绑定、带工具的开放 DMs/groups，以及暴露的浏览器
    控制，都是应首先修复的问题。详情：
    [Security audit checklist](/gateway/security#security-audit-checklist)。

  </Accordion>

  <Accordion title="Are ClawHub skills and third-party plugins safe to install?">
    Treat third-party skills and plugins as code you are choosing to trust.
    ClawHub skill pages expose scan state before install, but scans are not a
    complete security boundary. OpenClaw does not run built-in local
    dangerous-code blocking during plugin or skill install/update flows; use
    operator-owned `security.installPolicy` for local allow/block decisions.

    更安全的模式：

    - 优先选择可信作者和固定版本
    - 在启用 skill 或 plugin 前先阅读它
    - 保持插件和 skills 的 allowlist 尽可能窄
    - 将不可信输入工作流放到工具最少的沙箱中运行
    - 避免给第三方代码过宽的文件系统、exec、浏览器或 secret 访问权限

    详情：[Skills](/tools/skills), [Plugins](/tools/plugin),
    [Security](/gateway/security)。

  </Accordion>

  <Accordion title="Should my bot have its own email, GitHub account, or phone number?">
    对大多数设置来说，是的。将机器人与单独的账号和电话号码隔离，
    可以在出问题时减少影响范围。这也让你更容易轮换
    凭据或撤销访问，而不会影响你的个人账号。

    先从小开始。只授予它实际需要的工具和账号，之后如有必要再扩展。

    文档：[Security](/gateway/security), [Pairing](/channels/pairing)。

  </Accordion>

  <Accordion title="Can I give it autonomy over my text messages and is that safe?">
    我们**不**建议让它完全自主处理你的个人消息。最安全的模式是：

    - 将 DMs 保持在**配对模式**或严格 allowlist 中。
    - 如果你希望它代表你发消息，请使用**单独的号码或账号**。
    - 让它先起草，然后**在发送前批准**。

    如果你想实验，请在专用账号上进行，并保持隔离。参见
    [Security](/gateway/security)。

  </Accordion>

  <Accordion title="Can I use cheaper models for personal assistant tasks?">
    可以，**前提是**代理只做聊天且输入是可信的。较小的模型层更容易
    遭受指令劫持，所以不要把它们用于启用工具的代理，或者用于读取不可信内容时。
    如果你必须使用较小模型，请锁定工具并在沙箱中运行。参见 [Security](/gateway/security)。
  </Accordion>

  <Accordion title="I ran /start in Telegram but did not get a pairing code">
    只有当未知发送者给机器人发消息且启用了
    `dmPolicy: "pairing"` 时，才会发送配对码。单独发送 `/start`
    不会生成代码。

    检查待处理请求：

    ```bash
    openclaw pairing list telegram
    ```

    如果你想立即访问，请将你的 sender id 加入 allowlist，或为该账号设置 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp: will it message my contacts? How does pairing work?">
    不会。默认的 WhatsApp DM 策略是 **pairing**。未知发送者只会收到配对码，
    其消息**不会被处理**。OpenClaw 只会回复它收到的聊天，或你触发的显式发送。

    通过以下命令批准配对：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待处理请求：

    ```bash
    openclaw pairing list whatsapp
    ```

    向导中的手机号提示：它用于设置你的**allowlist/owner**，以便你的 DMs 被允许。
    它不会用于自动发送。如果你在自己的 WhatsApp 号码上运行，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、中止任务和“它不会停止”

<AccordionGroup>
  <Accordion title="How do I stop internal system messages from showing in chat?">
    大多数内部或工具消息只会在该会话启用了**verbose**、**trace** 或 **reasoning**
    时出现。

    在你看到它的聊天中修复：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果仍然太吵，请在 Control UI 中检查会话设置，并将 verbose 设为
    **inherit**。同时确认你没有使用在配置中将 `verboseDefault` 设为
    `on` 的机器人配置文件。

    Docs: [Thinking and verbose](/tools/thinking), [Security](/gateway/security/index#reasoning-and-verbose-output-in-groups).

  </Accordion>

  <Accordion title="How do I stop/cancel a running task?">
    发送以下任意内容，**作为独立消息**（不要带斜杠）：

    ```
    stop
    stop action
    stop current action
    stop run
    stop current run
    stop agent
    stop the agent
    stop openclaw
    openclaw stop
    stop don't do anything
    stop do not do anything
    stop doing anything
    please stop
    stop please
    abort
    esc
    wait
    exit
    interrupt
    ```

    这些是中止触发词（不是 slash 命令）。

    对于后台进程（来自 exec 工具），你可以让代理运行：

    ```
    process action:kill sessionId:XXX
    ```

    Slash 命令概览：参见 [Slash commands](/tools/slash-commands)。

    大多数命令必须作为以 `/` 开头的**独立**消息发送，但少数快捷方式（如 `/status`）对于允许列表内发送者也可以内联工作。

  </Accordion>

  <Accordion title='How do I send a Discord message from Telegram? ("Cross-context messaging denied")'>
    OpenClaw 默认会阻止**跨提供商**消息发送。如果某个工具调用绑定到 Telegram，
    除非你显式允许，否则它不会发送到 Discord。

    为该代理启用跨提供商消息：

    ```json5
    {
      tools: {
        message: {
          crossContext: {
            allowAcrossProviders: true,
            marker: { enabled: true, prefix: "[from {channel}] " },
          },
        },
      },
    }
    ```

    编辑配置后重启 gateway。

  </Accordion>

  <Accordion title='Why does it feel like the bot "ignores" rapid-fire messages?'>
    Mid-run prompts are steered into the active run by default. Use `/queue` to choose active-run behavior：

    - `steer` - guide the active run at the next model boundary
    - `followup` - queue messages and run them one at a time after the current run ends
    - `collect` - queue compatible messages and reply once after the current run ends
    - `interrupt` - abort current run and start fresh

    Default mode is `steer`. You can add options like `debounce:0.5s cap:25 drop:summarize` for queued modes. See [Command queue](/concepts/queue) and [Steering queue](/concepts/queue-steering).

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title='What is the default model for Anthropic with an API key?'>
    在 OpenClaw 中，凭据和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或在认证配置文件中存储 Anthropic API key）会启用认证，但实际默认模型是你在 `agents.defaults.model.primary` 中配置的那个（例如，`anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果你看到 `No credentials found for profile "anthropic:default"`，这意味着 Gateway 在运行该代理的预期 `auth-profiles.json` 中找不到 Anthropic 凭据。
  </Accordion>
</AccordionGroup>

---

Still stuck? 请在 [Discord](https://discord.com/invite/clawd) 提问，或打开一个 [GitHub discussion](https://github.com/openclaw/openclaw/discussions)。

## Related- [首次运行常见问题](/help/faq-first-run) — 安装、入门、认证、订阅、早期故障- [模型常见问题](/help/faq-models) — 模型选择、故障切换、认证配置文件- [故障排除](/help/troubleshooting) — 先看症状的分诊