---
summary: "关于 OpenClaw 安装、配置和使用的常见问题解答"
read_when:
  - 回答常见的安装、配置、入门或运行时支持问题
  - 在更深入调试前进行用户报告问题的初步筛查
title: "常见问题解答"
---

针对真实环境部署的快速解答与更深入排障（本地开发、VPS、多 agent、OAuth/API 密钥、模型故障切换）。运行时诊断请参见 [故障排查](/gateway/troubleshooting)。完整配置参考请参见 [配置](/gateway/configuration)。

## 如果出了问题，先做这 60 秒

1. **快速状态检查（首选）**

   ```bash
   openclaw status
   ```

   快速本地汇总：操作系统与版本，gateway/服务可达性，代理/会话概况，提供商配置及运行时问题（当 Gateway 可达时）。

2. **可粘贴报告（安全共享）**

   ```bash
   openclaw status --all
   ```

   只读诊断，含日志尾部（敏感令牌已遮蔽）。

3. **守护进程与端口状态**

   ```bash
   openclaw gateway status
   ```

   显示守护运行状况与 RPC 可达性、探针目标 URL，以及服务实际使用的配置文件。

4. **深度探针**

   ```bash
   openclaw status --deep
   ```

   运行实时网关健康探测，支持时包含通道探测（需要网关可达）。详见 [健康检查](/gateway/health)。

5. **监控最新日志**

   ```bash
   openclaw logs --follow
   ```

   若 RPC 不通，退回：

   ```bash
   tail -f "$(ls -t /tmp/openclaw/openclaw-*.log | head -1)"
   ```

   文件日志和服务日志分开，详细见 [日志](/logging) 和 [故障排查](/gateway/troubleshooting)。

6. **运行诊断修复**

   ```bash
   openclaw doctor
   ```

   校验并修复配置/状态，运行健康检查，详见 [诊断](/gateway/doctor)。

7. **Gateway 快照**

   ```bash
   openclaw health --json
   openclaw health --verbose   # 错误时显示目标 URL 和配置路径
   ```

   请求正在运行的 Gateway 全量状态，仅限 WebSocket，详见 [健康检查](/gateway/health)。

## 快速开始与首次运行安装

首次运行问答——安装、入门、认证路径、订阅、初始失败——请参见 [首次运行 FAQ](/help/faq-first-run)。

## 什么是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一段话介绍什么是 OpenClaw？">
    OpenClaw 是一个运行在你自己设备上的个人 AI 助手。它可以在你已经在用的消息平台上回复你（WhatsApp、Telegram、Slack、Mattermost、Discord、Google Chat、Signal、iMessage、WebChat，以及 QQ Bot 等捆绑频道插件），在支持的平台上也可以处理语音和实时 Canvas。**Gateway** 是始终在线的控制平面，而助手本身才是产品体验。
  </Accordion>

  <Accordion title="核心价值是什么？">
    OpenClaw 不是“又一个 Claude 包装壳”。它是一个 **本地优先的控制平面**，让你可以在**自己的硬件**上运行一个能力完整的助手，并通过你已经在用的聊天应用访问它，同时拥有有状态会话、记忆和工具能力，而不需要把整个工作流的控制权交给托管式 SaaS。

    亮点：

    - **你的设备，你的数据：**Gateway 可以运行在任何你想要的地方（Mac、Linux、VPS），workspace 和会话历史保留在本地。
    - **真实频道，而不是网页沙盒：**支持 WhatsApp、Telegram、Slack、Discord、Signal、iMessage 等，在支持的平台上还支持移动端语音和 Canvas。
    - **模型无关：**可使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，并支持按 agent 路由和故障切换。
    - **可完全本地化：**如果你愿意，可以只跑本地模型，让**所有数据都留在自己的设备上**。
    - **多 agent 路由：**可按频道、账号或任务拆分 agent，每个 agent 都有自己的 workspace 和默认配置。
    - **开源且可改造：**可审查、扩展和自托管，不受单一厂商锁定。

    文档：[Gateway](/gateway)、[Channels](/channels)、[Multi-agent](/concepts/multi-agent)、
    [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="我刚装好，第一步该做什么？">
    适合作为起步项目的事情有：

    - 搭一个网站（WordPress、Shopify，或者简单的静态站）。
    - 做一个移动应用原型（需求大纲、页面草图、API 计划）。
    - 整理文件和目录（清理、重命名、打标签）。
    - 接入 Gmail，自动生成摘要或跟进提醒。

    它能处理大型任务，但最适合的方式仍然是把任务拆成阶段，并用 sub-agent 并行推进。

  </Accordion>

  <Accordion title="OpenClaw 最常见的五种日常用法是什么？">
    日常最容易带来价值的场景通常是：

    - **个人简报：**汇总你的收件箱、日历和关心的新闻。
    - **调研和起草：**做快速研究、整理摘要、产出邮件或文档初稿。
    - **提醒与跟进：**通过 cron 或 heartbeat 做周期性提醒和清单推进。
    - **浏览器自动化：**填写表单、采集数据、重复执行网页任务。
    - **跨设备协作：**在手机上发起任务，让 Gateway 在服务器上执行，再把结果发回聊天里。

  </Accordion>

  <Accordion title="OpenClaw 能帮助 SaaS 做获客、外联、广告和博客吗？">
    可以，尤其适合做**调研、筛选和起草**。它可以扫描网站、整理候选名单、
    总结潜在客户信息，并撰写外联文案或广告文案草稿。

    但对于**真正的外联发送或广告投放**，应始终保留人工审批。避免垃圾信息，遵守当地法律和平台政策，并在发送前人工检查。最安全的模式是让 OpenClaw 起草，由你批准。

    文档：[Security](/gateway/security)。

  </Accordion>

  <Accordion title="对于 Web 开发，相比 Claude Code 有什么优势？">
    OpenClaw 是一个**个人助理**和协同层，不是 IDE 替代品。如果你想在仓库里获得最快的直接编码闭环，就用 Claude Code 或 Codex；如果你想要持久记忆、跨设备访问和工具编排，则更适合用 OpenClaw。

    优势包括：

    - **跨会话持久记忆和 workspace**
    - **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
    - **工具编排**（浏览器、文件、调度、hooks）
    - **常在线 Gateway**（可跑在 VPS 上，随时随地交互）
    - **Nodes** 提供本地浏览器、屏幕、摄像头和 exec 能力

    演示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## Skills 与自动化

<AccordionGroup>
  <Accordion title="怎样自定义 skills 又不把仓库弄脏？">
    用托管覆盖，而不是直接改仓库里的副本。把改动放到 `~/.openclaw/skills/<name>/SKILL.md`（或者通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加目录）。优先级为 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`，所以不碰 git 也能让托管覆盖优先于内置 skills。如果你需要全局安装某个 skill、但只想让部分 agent 可见，就把共享副本放在 `~/.openclaw/skills`，再用 `agents.defaults.skills` 和 `agents.list[].skills` 控制可见性。只有值得上游合并的修改，才应该留在仓库里并作为 PR 提交。
  </Accordion>

  <Accordion title="可以从自定义文件夹加载 skills 吗？">
    可以。在 `~/.openclaw/openclaw.json` 里通过 `skills.load.extraDirs` 添加额外目录（最低优先级）。默认优先级是 `<workspace>/skills` → `<workspace>/.agents/skills` → `~/.agents/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 默认安装到 `./skills`，OpenClaw 会在下一次会话中把它当作 `<workspace>/skills`。如果某个 skill 只该对特定 agent 可见，就配合 `agents.defaults.skills` 或 `agents.list[].skills` 使用。
  </Accordion>

  <Accordion title="不同任务如何使用不同模型？">
    目前支持的模式有：

    - **Cron jobs：**隔离任务可为每个 job 单独设置 `model` 覆盖。
    - **Sub-agents：**把任务路由给默认模型不同的独立 agent。
    - **按需切换：**随时用 `/model` 切换当前会话模型。

    参见 [Cron jobs](/automation/cron-jobs)、[Multi-Agent Routing](/concepts/multi-agent) 和 [Slash commands](/tools/slash-commands)。

  </Accordion>

  <Accordion title="机器人在做重任务时会卡住，怎么卸载压力？">
    长任务或并行任务请用 **sub-agents**。Sub-agent 会在自己的会话里运行，
    返回摘要，同时让主聊天保持可响应。

    你可以直接让机器人“为这个任务启动一个 sub-agent”，或者使用 `/subagents`。
    也可以在聊天里用 `/status` 查看 Gateway 当前在做什么，以及它是否正忙。

    Token 提示：长任务和 sub-agent 都会消耗 token。如果成本敏感，可通过 `agents.defaults.subagents.model` 给 sub-agent 配置更便宜的模型。

    文档：[Sub-agents](/tools/subagents)、[Background Tasks](/automation/tasks)。

  </Accordion>

  <Accordion title="Discord 中线程绑定的 sub-agent 会话如何工作？">
    使用线程绑定。你可以把 Discord 线程绑定到某个 sub-agent 或会话目标，这样该线程里的后续消息都会留在这个绑定会话中。

    基本流程：

    - 用 `sessions_spawn` 启动，并设置 `thread: true`（如果需要持续跟进，也可加 `mode: "session"`）。
    - 或者手动使用 `/focus <target>` 绑定。
    - 用 `/agents` 查看当前绑定状态。
    - 用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动取消聚焦。
    - 用 `/unfocus` 解除线程绑定。

    必需配置：

    - 全局默认：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`
    - Discord 覆盖：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`
    - 启动时自动绑定：设置 `channels.discord.threadBindings.spawnSubagentSessions: true`

    文档：[Sub-agents](/tools/subagents)、[Discord](/channels/discord)、[Configuration Reference](/gateway/configuration-reference)、[Slash commands](/tools/slash-commands)。

  </Accordion>

  <Accordion title="sub-agent 已经完成，但完成通知发错地方了，或者根本没发，我该检查什么？">
    先检查最终解析出来的请求者路由：

    - 完成模式的 sub-agent 在投递结果时，会优先使用已绑定的线程或会话路由。
    - 如果完成来源只带了频道信息，OpenClaw 会退回到请求者会话里保存的路由（`lastChannel` / `lastTo` / `lastAccountId`），从而仍可直接投递。
    - 如果既没有绑定路由，也没有可用的已存路由，直接投递可能失败，结果就会退回到排队式会话投递，而不是立即发到聊天里。
    - 目标失效或过期也可能强制退回队列，或导致最终投递失败。
    - 如果子会话最后一个可见 assistant 回复正好是静默标记 `NO_REPLY` / `no_reply`，或正好是 `ANNOUNCE_SKIP`，OpenClaw 会故意抑制通知，避免把更早的过期进度发出来。
    - 如果子会话在只执行了工具调用后超时，通知可能会折叠成一个简短的部分进度摘要，而不是原样回放工具输出。

    调试：

    ```bash
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Sub-agents](/tools/subagents)、[Background Tasks](/automation/tasks)、[Session Tools](/concepts/session-tool)。

  </Accordion>

  <Accordion title="Cron 或提醒没有触发，我该检查什么？">
    Cron 是在 Gateway 进程内部运行的。如果 Gateway 没有持续运行，
    定时任务就不会执行。

    检查清单：

    - 确认 cron 已启用（`cron.enabled`），并且没有设置 `OPENCLAW_SKIP_CRON`
    - 检查 Gateway 是否 24/7 运行（没有休眠或重启）
    - 核对 job 的时区设置（`--tz` 与主机时区）

    调试：

    ```bash
    openclaw cron run <jobId>
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron jobs](/automation/cron-jobs)、[Automation & Tasks](/automation)。

  </Accordion>

  <Accordion title="Cron 触发了，但没有往频道里发送任何内容，为什么？">
    先检查投递模式：

    - `--no-deliver` / `delivery.mode: "none"` 表示不期望有 runner 回退发送。
    - 缺失或无效的通知目标（`channel` / `to`）意味着运行器跳过了外发传递。
    - 通道认证失败（`unauthorized`、`Forbidden`）表示运行器尝试投递，但凭据阻止了它。
    - 静默的孤立结果（仅 `NO_REPLY` / `no_reply`）将被视为故意不可送达，因此运行器也会抑制已排队的回退投递。

    对于独立的 cron 作业，当聊天路由可用时，代理仍然可以直接使用 `message` 工具发送。`--announce` 仅控制运行器的回退路径，用于处理代理尚未发送的最终文本。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron jobs](/automation/cron-jobs)、[Background Tasks](/automation/tasks)。

  </Accordion>

  <Accordion title="为什么一个隔离的 cron 运行会切换模型，或者重试一次？">
    这通常是运行时模型切换路径，而不是重复调度。

    当当前运行抛出 `LiveSessionModelSwitchError` 时，隔离 cron 可以持久化运行时模型切换并重试。重试会保留切换后的 provider/model；如果切换还带来了新的 auth profile 覆盖，cron 也会在重试前一并持久化。

    相关选择规则：

    - 如果适用，先使用 Gmail hook 的模型覆盖
    - 然后是每个 job 自己的 `model`
    - 然后是已存储的 cron-session 模型覆盖
    - 最后才是正常的 agent/default 模型选择

    重试循环是有上限的。初次尝试加上 2 次切换重试后，cron 会中止，而不会无限循环。

    调试：

    ```bash
    openclaw cron runs --id <jobId> --limit 50
    openclaw tasks show <runId-or-sessionKey>
    ```

    文档：[Cron jobs](/automation/cron-jobs)、[cron CLI](/cli/cron)。

  </Accordion>

  <Accordion title="Linux 上如何安装 skills？">
    使用原生的 `openclaw skills` 命令，或者直接把 skills 放进你的 workspace。macOS 的 Skills UI 在 Linux 上不可用。
    可在 [https://clawhub.ai](https://clawhub.ai) 浏览技能。

    ```bash
    openclaw skills search "calendar"
    openclaw skills search --limit 20
    openclaw skills install <skill-slug>
    openclaw skills install <skill-slug> --version <version>
    openclaw skills install <skill-slug> --force
    openclaw skills update --all
    openclaw skills list --eligible
    openclaw skills check
    ```

    原生的 `openclaw skills install` 会把内容写入当前活动 workspace 的 `skills/`
    目录。只有当你想发布或同步自己的 skills 时，才需要额外安装 `clawhub` CLI。对于跨 agent 共享的安装，把 skill 放到 `~/.openclaw/skills` 下；如果你想限制哪些 agent 能看到它，再使用 `agents.defaults.skills` 或 `agents.list[].skills`。

  </Accordion>

  <Accordion title="OpenClaw 能定时运行任务，或在后台持续工作吗？">
    可以。使用 Gateway 的调度能力：

    - **Cron jobs**：用于定时或周期性任务（重启后也会保留）
    - **Heartbeat**：用于“主会话”的周期检查
    - **Isolated jobs**：用于自主 agent，在完成后发布摘要或投递到聊天

    文档：[Cron jobs](/automation/cron-jobs)、[Automation & Tasks](/automation)、
    [Heartbeat](/gateway/heartbeat)。

  </Accordion>

  <Accordion title="可以在 Linux 上运行仅限 Apple macOS 的 skills 吗？">
    不能直接运行。macOS skills 受 `metadata.openclaw.os` 和所需二进制约束控制，只有当它们在 **Gateway 主机** 上满足条件时，才会进入系统提示词。在 Linux 上，`darwin` 专属的 skills（如 `apple-notes`、`apple-reminders`、`things-mac`）默认不会加载，除非你手动覆盖这层限制。

    目前支持三种模式：

    **方案 A - 把 Gateway 运行在 Mac 上（最简单）。**
    在存在这些 macOS 二进制的机器上运行 Gateway，然后从 Linux 通过 [远程模式](#gateway-ports-already-running-and-remote-mode) 或 Tailscale 连接。因为 Gateway 主机本身是 macOS，所以这些 skills 会正常加载。

    **方案 B - 使用 macOS node（无需 SSH）。**
    在 Linux 上运行 Gateway，再配对一个 macOS node（菜单栏 app），并在 Mac 上把 **Node Run Commands** 设为 “Always Ask” 或 “Always Allow”。只要 node 上存在所需二进制，OpenClaw 就可以把这些仅限 macOS 的 skills 视为可用。Agent 会通过 `nodes` 工具运行这些技能。如果你选择 “Always Ask”，并在提示中批准 “Always Allow”，该命令就会被加入 allowlist。

    **方案 C - 通过 SSH 代理 macOS 二进制（进阶）。**
    把 Gateway 继续放在 Linux 上，但让所需 CLI 二进制解析为 SSH 包装脚本，实际在 Mac 上执行。然后覆盖该 skill 的元数据，允许它在 Linux 上保持可用。

    1. 为该二进制创建一个 SSH 包装脚本（例如 Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 把这个包装脚本放到 Linux 主机的 `PATH` 中（例如 `~/bin/memo`）。
    3. 覆盖 skill 元数据（workspace 或 `~/.openclaw/skills`），允许 Linux：

       ```markdown
       ---
       name: apple-notes
       description: Manage Apple Notes via the memo CLI on macOS.
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 启动一个新会话，让 skills 快照刷新。

  </Accordion>

  <Accordion title="有 Notion 或 HeyGen 集成吗？">
    目前没有内置集成。

    可选方案：

    - **自定义 skill / plugin：**最适合做稳定的 API 接入（Notion 和 HeyGen 都有 API）
    - **浏览器自动化：**不用写代码，但更慢，也更脆弱

    如果你想按客户保留上下文（例如 agency 工作流），一个简单模式是：

    - 每个客户一页 Notion（上下文、偏好、当前工作）
    - 在每次会话开始时让 agent 先读取那一页

    如果你想要原生集成，可以提功能请求，或者自己针对这些 API 做一个 skill。

    安装 skills：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安装会落到当前活动 workspace 的 `skills/` 目录。对于跨 agent 共享的 skills，请放在 `~/.openclaw/skills/<name>/SKILL.md`。如果共享安装只应对部分 agent 可见，就配置 `agents.defaults.skills` 或 `agents.list[].skills`。有些 skills 依赖通过 Homebrew 安装的二进制；在 Linux 上这就意味着 Linuxbrew（见上面的 Homebrew Linux FAQ）。参见 [Skills](/tools/skills)、[Skills config](/tools/skills-config) 和 [ClawHub](/tools/clawhub)。

  </Accordion>

  <Accordion title="如何在 OpenClaw 中使用我已经登录过的 Chrome？">
    使用内置的 `user` 浏览器 profile，它会通过 Chrome DevTools MCP 进行附着：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果你想自定义名称，就创建一个显式的 MCP profile：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    这条路径既可以使用本地主机上的浏览器，也可以使用已连接的 browser node。如果 Gateway 运行在别处，那就在浏览器所在机器上跑一个 node host，或者改用远程 CDP。

    `existing-session` / `user` 当前的限制：

    - 操作基于 `ref`，而不是基于 CSS selector
    - 上传需要 `ref` / `inputRef`，目前一次只支持一个文件
    - `responsebody`、PDF 导出、下载拦截和批量操作仍然需要托管浏览器或原始 CDP profile

  </Accordion>
</AccordionGroup>

## 沙箱与记忆

<AccordionGroup>
  <Accordion title="有专门讲沙箱的文档吗？">
    有。参见 [Sandboxing](/gateway/sandboxing)。如果你关心 Docker 场景下的配置（在 Docker 中运行完整 gateway，或构建沙箱镜像），参见 [Docker](/install/docker)。
  </Accordion>

  <Accordion title="Docker 感觉功能受限，怎么开启完整能力？">
    默认镜像以安全优先为设计目标，并以 `node` 用户运行，因此它不包含系统包、Homebrew 或捆绑浏览器。要获得更完整的能力：

    - 用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，让缓存保留下来
    - 用 `OPENCLAW_DOCKER_APT_PACKAGES` 把系统依赖烘焙进镜像
    - 用内置 CLI 安装 Playwright 浏览器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 设置 `PLAYWRIGHT_BROWSERS_PATH`，并确保这个路径也被持久化

    文档：[Docker](/install/docker)、[Browser](/tools/browser)。

  </Accordion>

  <Accordion title="能否用一个 agent 让私聊保持个人化，同时把群组设为公开或沙箱化？">
    可以，前提是你的私密流量主要来自 **DM**，公开流量主要来自**群组**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，这样群组/频道会话（非主键）会在配置的沙箱后端中运行，而主 DM 会话则保留在主机上。如果你不选择后端，Docker 是默认后端。然后通过 `tools.sandbox.tools` 限制沙箱会话中可用的工具。

    配置演练和示例见：[Groups: personal DMs + public groups](/channels/groups#pattern-personal-dms-public-groups-single-agent)

    Key config reference: [Gateway configuration](/gateway/config-agents#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何把主机目录挂载进沙箱？">
    把 `agents.defaults.sandbox.docker.binds` 设成 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局和每个 agent 的 bind 会合并；当 `scope: "shared"` 时，每个 agent 自己的 bind 会被忽略。敏感目录请使用 `:ro`，同时记住 bind mount 会绕过沙箱的文件系统边界。

    OpenClaw 会同时用规范化路径和通过最深已存在祖先路径解析出的真实路径来校验 bind 来源。这意味着即使最后一段路径还不存在，通过父级 symlink 逃逸也仍然会被拒绝；在 symlink 解析之后，allowed-root 检查依然生效。

    示例和安全说明参见 [Sandboxing](/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。

  </Accordion>

  <Accordion title="记忆是怎么工作的？">
    OpenClaw 的记忆本质上就是 agent workspace 里的 Markdown 文件：

    - 每日笔记在 `memory/YYYY-MM-DD.md`
    - 整理过的长期记忆在 `MEMORY.md`（仅 main/private 会话）

    OpenClaw 还会在自动压缩前执行一次**静默的预压缩记忆刷写**，提醒模型在自动 compact 之前把持久信息写成笔记。这个过程只会在 workspace 可写时运行（只读沙箱会跳过）。参见 [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="记忆总是忘东西，怎样才能让它记住？">
    直接让机器人**把事实写进 memory**。长期信息应写入 `MEMORY.md`，
    短期上下文则写到 `memory/YYYY-MM-DD.md`。

    这块能力我们还在持续改进。提醒模型“把这件事记下来”通常会有帮助，它会知道怎么做。如果它还是总忘，检查 Gateway 每次运行时是否都在使用同一个 workspace。

    文档：[Memory](/concepts/memory)、[Agent workspace](/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="记忆会永久保存吗？上限是什么？">
    记忆文件保存在磁盘上，除非你手动删除，否则会一直存在。上限取决于你的存储空间，而不是模型本身。不过**会话上下文**仍受模型上下文窗口限制，因此长对话仍可能被 compact 或截断。这也是 memory search 存在的原因：它只把相关部分重新拉回上下文。

    文档：[Memory](/concepts/memory)、[Context](/concepts/context)。

  </Accordion>

  <Accordion title="语义记忆搜索必须要 OpenAI API key 吗？">
    只有在你使用 **OpenAI embeddings** 时才需要。Codex OAuth 只覆盖聊天/补全，
    **不提供** embeddings 访问，因此**登录 Codex（无论是 OAuth 还是 Codex CLI 登录）**都不能帮助你启用语义记忆搜索。OpenAI embeddings 仍然需要真正的 API key（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果你没有显式指定 provider，只要 OpenClaw 能解析出 API key（来自 auth profiles、`models.providers.*.apiKey` 或环境变量），它就会自动选 provider。优先顺序是：先 OpenAI，其次 Gemini，再到 Voyage，然后 Mistral。如果没有可用的远程 key，memory search 会保持禁用，直到你完成配置。如果你配置了本地模型路径且该路径存在，OpenClaw 会优先使用 `local`。Ollama 也受支持，显式设置 `memorySearch.provider = "ollama"` 即可。

    如果你想尽量保持本地化，可设置 `memorySearch.provider = "local"`（可选再加 `memorySearch.fallback = "none"`）。如果你想使用 Gemini embeddings，请设置 `memorySearch.provider = "gemini"`，并提供 `GEMINI_API_KEY`（或 `memorySearch.remote.apiKey`）。我们支持 **OpenAI、Gemini、Voyage、Mistral、Ollama 或 local** embedding 模型，具体配置见 [Memory](/concepts/memory)。

  </Accordion>
</AccordionGroup>

<a id="where-things-live-on-disk"></a>

## 数据在磁盘上的位置

<AccordionGroup>
  <Accordion title="OpenClaw 使用的数据都会保存在本地吗？">
    不会。**OpenClaw 自身的状态是本地的**，但**外部服务仍然会看到你发给它们的内容**。

    - **默认本地：**会话、记忆文件、配置和 workspace 都存放在 Gateway 主机上（`~/.openclaw` 加上你的 workspace 目录）
    - **天然远程：**你发给模型 provider（Anthropic、OpenAI 等）的消息会发往它们的 API；聊天平台（WhatsApp、Telegram、Slack 等）也会在它们自己的服务器上保存消息数据
    - **数据暴露范围由你控制：**使用本地模型可以让 prompt 留在你自己的机器上，但频道流量仍会经过对应频道的服务器

    相关文档：[Agent workspace](/concepts/agent-workspace)、[Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 把数据存在哪里？">
    所有内容都位于 `$OPENCLAW_STATE_DIR` 下（默认是 `~/.openclaw`）：

    | Path                                                            | 用途 |
    | --------------------------------------------------------------- | --- |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置（JSON5） |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 旧版 OAuth 导入文件（首次使用时会复制到 auth profiles） |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Auth profiles（OAuth、API keys，以及可选的 `keyRef` / `tokenRef`） |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 面向 `file` SecretRef provider 的可选文件型 secret 负载 |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧版兼容文件（静态 `api_key` 条目会被清理） |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | Provider 状态（例如 `whatsapp/<accountId>/creds.json`） |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每个 agent 的状态（agentDir + sessions） |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 会话历史和状态（按 agent） |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据（按 agent） |

    旧版单 agent 路径：`~/.openclaw/agent/*`（会由 `openclaw doctor` 迁移）。

    你的 **workspace**（AGENTS.md、memory 文件、skills 等）是独立的，通过 `agents.defaults.workspace` 配置（默认：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？">
    这些文件应该放在 **agent workspace** 里，而不是 `~/.openclaw`。

    - **Workspace (per agent)**: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`,
      `MEMORY.md`, `memory/YYYY-MM-DD.md`, 可选 `HEARTBEAT.md`。
      小写根目录 `memory.md` 仅作为旧版修复输入；当两个文件都存在时，`openclaw doctor --fix`
      可以把它合并进 `MEMORY.md`。
    - **State dir (`~/.openclaw`)**：配置、channel/provider 状态、auth profiles、会话、日志，
      以及共享 skills（`~/.openclaw/skills`）。

    默认 workspace 是 `~/.openclaw/workspace`，可以通过下面方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后“失忆”，请确认 Gateway 每次启动都在使用同一个 workspace（同时记住：远程模式用的是**gateway 主机上的** workspace，不是你本地笔记本上的）。

    提示：如果你希望某种行为或偏好长期保留，最好让机器人**把它写进 AGENTS.md 或 MEMORY.md**，而不是只依赖聊天历史。

    参见 [Agent workspace](/concepts/agent-workspace) 和 [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="推荐的备份策略">
    把你的 **agent workspace** 放进一个**私有** git 仓库，并备份到私密位置（例如 GitHub 私有仓库）。这样可以保留 memory 和 AGENTS/SOUL/USER 等文件，之后也能恢复这个助手的“心智”。

    **不要**把 `~/.openclaw` 下的内容提交进仓库（包括凭据、会话、token 或加密的 secrets 负载）。
    如果你需要做完整恢复，就把 workspace 和 state 目录分别备份（可参考上面的迁移问题）。

    文档：[Agent workspace](/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="怎样彻底卸载 OpenClaw？">
    参见专门的卸载指南：[Uninstall](/install/uninstall)。
  </Accordion>

  <Accordion title="agent 可以在 workspace 之外工作吗？">
    可以。workspace 只是**默认工作目录**和记忆锚点，不是硬沙箱。
    相对路径会解析到 workspace 内，但绝对路径在未启用沙箱时仍可访问主机其他位置。如果你需要隔离，请使用 [`agents.defaults.sandbox`](/gateway/sandboxing) 或每个 agent 自己的沙箱设置。如果你想让某个仓库成为默认工作目录，就把该 agent 的 `workspace` 指到仓库根目录。OpenClaw 仓库本身只是源码，除非你有意让 agent 在里面工作，否则最好让 workspace 和它分开。

    示例（把仓库作为默认 cwd）：

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

  <Accordion title="远程模式下，session store 在哪里？">
    Session 状态归 **gateway 主机** 所有。如果你处于远程模式，你真正关心的 session store 在远程机器上，而不是本地笔记本。参见 [Session management](/concepts/session)。
  </Accordion>
</AccordionGroup>

## 配置基础

<AccordionGroup>
  <Accordion title="配置文件是什么格式？在哪里？">
    OpenClaw 会从 `$OPENCLAW_CONFIG_PATH` 读取可选的 **JSON5** 配置（默认：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果文件不存在，它会使用相对安全的默认值（包括默认 workspace `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我把 `gateway.bind` 设成 "lan"（或 "tailnet"）后，现在没有监听 / UI 说 unauthorized'>
    非 loopback 的 bind **必须配置有效的 gateway 认证路径**。实际含义通常是：

    - 共享密钥认证：token 或 password
    - 在正确配置的非 loopback 身份感知反向代理后面使用 `gateway.auth.mode: "trusted-proxy"`

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

    说明：

    - `gateway.remote.token` / `.password` **不会**单独启用本地 gateway 认证
    - 只有当 `gateway.auth.*` 未设置时，本地调用路径才会把 `gateway.remote.*` 当作回退值
    - 如果要用密码认证，请设置 `gateway.auth.mode: "password"` 和 `gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）
    - 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但解析失败，系统会以失败关闭处理，不会再用远程回退值遮蔽问题
    - 共享密钥模式下，Control UI 通过 `connect.params.auth.token` 或 `connect.params.auth.password` 认证（保存在 app/UI 设置中）；Tailscale Serve 或 `trusted-proxy` 这类带身份的模式则依赖请求头。不要把共享密钥放进 URL
    - 当 `gateway.auth.mode: "trusted-proxy"` 时，同主机上的 loopback 反向代理**仍然不能**满足 trusted-proxy 认证。可信代理必须是一个已配置的非 loopback 来源

  </Accordion>

  <Accordion title="为什么现在在 localhost 上也需要 token？">
    OpenClaw 默认强制启用 gateway 认证，包括 loopback。在普通默认路径下，这意味着 token 认证：如果没有显式配置认证路径，gateway 启动时会解析到 token 模式并自动生成一个 token，保存到 `gateway.auth.token` 中，因此**本地 WS 客户端也必须认证**。这样可以阻止同机上的其他进程随意调用 Gateway。

    如果你更偏好其他认证路径，可以显式选择密码模式（或者在非 loopback 身份感知反向代理场景下选择 `trusted-proxy`）。如果你**确实**想开放 loopback，请在配置里显式设置 `gateway.auth.mode: "none"`。Doctor 随时都能为你生成 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="修改配置后必须重启吗？">
    Gateway 会监听配置文件，并支持热重载：

    - `gateway.reload.mode: "hybrid"`（默认）：安全变更热应用，关键变更重启
    - 也支持 `hot`、`restart`、`off`

  </Accordion>

  <Accordion title="怎样关闭 CLI 里那些搞笑标语？">
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

    - `off`：隐藏标语文字，但保留 banner 标题/版本行
    - `default`：每次都使用 `All your chats, one OpenClaw.`
    - `random`：轮换有趣或季节性的标语（默认行为）
    - 如果你连 banner 都不想要，可以设置环境变量 `OPENCLAW_HIDE_BANNER=1`

  </Accordion>

  <Accordion title="如何启用 web search（以及 web fetch）？">
    `web_fetch` 不需要 API key。`web_search` 是否可用取决于你选择的
    provider：

    - Brave、Exa、Firecrawl、Gemini、Grok、Kimi、MiniMax Search、Perplexity、Tavily 这类 API 型 provider 需要各自正常的 API key 配置
    - Ollama Web Search 不需要 key，但它会使用你配置的 Ollama 主机，并要求先执行 `ollama signin`
    - DuckDuckGo 不需要 key，但它是一个基于 HTML 的非官方集成
    - SearXNG 不需要 key，且可自托管；请配置 `SEARXNG_BASE_URL` 或 `plugins.entries.searxng.config.webSearch.baseUrl`

    **推荐方式：**运行 `openclaw configure --section web` 并选择一个 provider。
    也可以通过环境变量配置：

    - Brave: `BRAVE_API_KEY`
    - Exa: `EXA_API_KEY`
    - Firecrawl: `FIRECRAWL_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: `XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
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
              provider: "firecrawl", // optional; omit for auto-detect
            },
          },
        },
    }
    ```

    provider 专属的 web-search 配置现在位于 `plugins.entries.<plugin>.config.webSearch.*` 下。
    旧版 `tools.web.search.*` provider 路径暂时仍会为了兼容性继续加载，但新配置不应再使用它们。
    Firecrawl 的 web-fetch 回退配置位于 `plugins.entries.firecrawl.config.webFetch.*`。

    说明：

    - 如果你使用 allowlist，请加入 `web_search` / `web_fetch` / `x_search`，或者 `group:web`
    - `web_fetch` 默认启用（除非你显式关闭）
    - 如果省略 `tools.web.fetch.provider`，OpenClaw 会从可用凭据中自动检测第一个可用的 fetch 回退 provider。目前内置 provider 是 Firecrawl
    - 守护进程会从 `~/.openclaw/.env`（或服务环境）读取环境变量

    文档：[Web tools](/tools/web)。

  </Accordion>

  <Accordion title="`config.apply` 把我的配置清空了，怎么恢复并避免再次发生？">
    `config.apply` 会替换**整个配置**。如果你传入的是一个局部对象，其它内容都会被删除。

    当前的 OpenClaw 可以防止许多意外覆盖：

    - OpenClaw 拥有的配置写入会在写入前验证变更后的完整配置。
    - 无效或破坏性的 OpenClaw 拥有写入会被拒绝，并保存为 `openclaw.json.rejected.*`。
    - 如果直接编辑破坏了启动或热重载，Gateway 会恢复到最近已知良好的配置，并将被拒绝的文件保存为 `openclaw.json.clobbered.*`。
    - 恢复后，主 agent 会收到启动警告，因此不会再次盲目写入错误配置。

    恢复：

    - 检查 `openclaw logs --follow` 中是否有 `Config auto-restored from last-known-good`、`Config write rejected:` 或 `config reload restored last-known-good config`。
    - 检查当前活动配置旁边最新的 `openclaw.json.clobbered.*` 或 `openclaw.json.rejected.*`。
    - 如果恢复后的活动配置可用，就保留它，然后仅使用 `openclaw config set` 或 `config.patch` 将需要的键复制回去。
    - 运行 `openclaw config validate` 和 `openclaw doctor`。
    - 如果没有最近已知良好配置或被拒绝的负载，请从备份恢复，或者重新运行 `openclaw doctor` 并重新配置通道/模型。
    - 如果这是意外情况，请提交 bug，并附上你最后已知的配置或任何备份。
    - 本地编码 agent 通常可以根据日志或历史记录重建一个可工作的配置。

    避免方法：

    - 小改动请用 `openclaw config set`
    - 交互式编辑请用 `openclaw configure`
    - 如果你不确定精确路径或字段结构，先用 `config.schema.lookup`；它会返回浅层 schema 节点和直接子节点摘要，便于逐层下钻
    - 局部 RPC 修改请用 `config.patch`；`config.apply` 只适合做整份配置替换
    - 如果你在 agent 运行里使用 owner-only 的 `gateway` 工具，它仍会拒绝写入 `tools.exec.ask` / `tools.exec.security`（包括会被归一化到同一保护路径的旧版 `tools.bash.*` 别名）

    文档：[Config](/cli/config)，[Configure](/cli/configure)，[网关故障排除](/gateway/troubleshooting#gateway-restored-last-known-good-config)，[Doctor](/gateway/doctor)。

  </Accordion>

  <Accordion title="如何让一个中心 Gateway 跨设备调度专门化 worker？">
    常见模式是 **一个 Gateway**（例如 Raspberry Pi）加上 **nodes** 和 **agents**：

    - **Gateway（中心）：**负责 channels（Signal / WhatsApp）、路由和会话
    - **Nodes（设备）：**Mac、iOS、Android 作为外设接入，暴露本地工具（`system.run`、`canvas`、`camera`）
    - **Agents（worker）：**为特殊角色提供独立“大脑”和 workspace（例如 “Hetzner ops”“Personal data”）
    - **Sub-agents：**当你需要并行时，从主 agent 派生后台工作
    - **TUI：**连接到 Gateway，并在 agents / sessions 之间切换

    文档：[Nodes](/nodes)、[Remote access](/gateway/remote)、[Multi-Agent Routing](/concepts/multi-agent)、[Sub-agents](/tools/subagents)、[TUI](/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 浏览器可以无头运行吗？">
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

    默认值是 `false`（有头模式）。无头模式在一些网站上更容易触发反机器人检查。参见 [Browser](/tools/browser)。

    无头模式使用的是**同一个 Chromium 引擎**，对大多数自动化任务（表单、点击、抓取、登录）都可用。主要区别是：

    - 没有可见浏览器窗口（如果你需要视觉反馈，请用截图）
    - 有些网站对无头自动化更严格（CAPTCHA、反机器人）
      例如 X/Twitter 往往会拦截无头会话

  </Accordion>

  <Accordion title="如何用 Brave 做浏览器控制？">
    把 `browser.executablePath` 设置为你的 Brave 二进制路径（或任意 Chromium 内核浏览器），然后重启 Gateway。
    完整配置示例见 [Browser](/tools/browser#use-brave-or-another-chromium-based-browser)。
  </Accordion>
</AccordionGroup>

## 远程 Gateway 与 Nodes

<AccordionGroup>
  <Accordion title="命令如何在 Telegram、gateway 和 nodes 之间流转？">
    Telegram 消息由 **gateway** 处理。Gateway 先运行 agent，
    只有在需要 node 工具时，才会通过 **Gateway WebSocket** 调用 nodes：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    Nodes 不会看到入站 provider 流量；它们只接收 node RPC 调用。

  </Accordion>

  <Accordion title="如果 Gateway 托管在远程，我的 agent 怎么访问我的电脑？">
    简短答案：**把你的电脑配对成一个 node**。Gateway 可以运行在别处，但它仍然能通过 Gateway WebSocket 调用你本机上的 `node.*` 工具（屏幕、摄像头、系统）。

    典型配置：

    1. 在常开主机（VPS/家用服务器）上运行 Gateway。
    2. 把 Gateway 主机和你的电脑放在同一个 tailnet 里。
    3. 确保 Gateway WS 可达（tailnet 绑定或 SSH 隧道）。
    4. 在本机打开 macOS app，并以 **Remote over SSH** 模式连接（或直接通过 tailnet）
       以便它可以注册为 node。
    5. 在 Gateway 上批准该 node：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP bridge；nodes 直接通过 Gateway WebSocket 连接。

    安全提醒：把 macOS node 配对进来，就意味着允许在该机器上执行 `system.run`。只配对你信任的设备，并阅读 [Security](/gateway/security)。

    文档：[Nodes](/nodes)、[Gateway protocol](/gateway/protocol)、[macOS remote mode](/platforms/mac/remote)、[Security](/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已连接，但我收不到回复，怎么办？">
    先检查基础项：

    - Gateway 正在运行：`openclaw gateway status`
    - Gateway 健康状态：`openclaw status`
    - Channel 健康状态：`openclaw channels status`

    然后检查认证和路由：

    - 如果你使用 Tailscale Serve，请确保 `gateway.auth.allowTailscale` 配置正确。
    - 如果你通过 SSH 隧道连接，请确认本地隧道已建立并指向正确端口。
    - 确认你的 allowlist（DM 或 group）包含你的账号。

    文档：[Tailscale](/gateway/tailscale)、[Remote access](/gateway/remote)、[Channels](/channels)。

  </Accordion>

  <Accordion title="两个 OpenClaw 实例可以彼此对话吗（本地 + VPS）？">
    可以。虽然没有内置的“bot-to-bot”桥，但你可以用几种可靠方式把它接起来：

    **最简单：**使用两个 bot 都能访问的普通聊天频道（Telegram / Slack / WhatsApp）。
    让 Bot A 给 Bot B 发消息，然后让 Bot B 正常回复。

    **CLI 桥接（通用）：**运行一个脚本，通过
    `openclaw agent --message ... --deliver` 调用另一个 Gateway，把消息投递到那个 bot 正在监听的聊天里。如果其中一个 bot 在远程 VPS 上，就通过 SSH / Tailscale 让你的 CLI 指向那个远程 Gateway（见 [Remote access](/gateway/remote)）。

    示例模式（从能访问目标 Gateway 的机器运行）：

    ```bash
    openclaw agent --message "Hello from local bot" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加一道护栏，防止两个 bot 无限互相回复（例如仅响应 mention、设置 channel allowlist，或者加一条“不要回复 bot 消息”的规则）。

    文档：[Remote access](/gateway/remote)、[Agent CLI](/cli/agent)、[Agent send](/tools/agent-send)。

  </Accordion>

  <Accordion title="多个 agent 需要分别用不同 VPS 吗？">
    不需要。一个 Gateway 就可以承载多个 agent，每个 agent 都有自己的 workspace、模型默认值和路由。这才是常规配置，也比“一 agent 一台 VPS”便宜和简单得多。

    只有在你需要硬隔离（安全边界）或有完全不想共享的配置时，才需要多台 VPS。否则就保持一个 Gateway，用多个 agents 或 sub-agents 即可。

  </Accordion>

  <Accordion title="相比从 VPS 直接 SSH，用我个人笔记本上的 node 有什么好处？">
    有。Node 是远程 Gateway 访问你笔记本的第一等方式，而且它提供的不只是 shell 访问。Gateway 可运行在 macOS / Linux（Windows 通过 WSL2）上，而且很轻量（小型 VPS 或 Raspberry Pi 级设备都够用；4GB 内存已经很充足），所以一个常见配置就是“常在线主机 + 你的笔记本作为 node”。

    - **无需开放入站 SSH。**Nodes 会主动连出到 Gateway WebSocket，并使用设备配对
    - **更安全的执行控制。**你笔记本上的 `system.run` 会受到 node allowlist / 审批控制
    - **更多设备工具。**Nodes 除了 `system.run`，还暴露 `canvas`、`camera` 和 `screen`
    - **本地浏览器自动化。**Gateway 可以继续放在 VPS 上，而 Chrome 在你笔记本上本地运行，通过 node host 调用；或者直接通过 Chrome MCP 连接主机上的本地 Chrome

    SSH 适合临时性的 shell 访问，但对于持续性的 agent 工作流和设备自动化，nodes 更简单。

    文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)、[Browser](/tools/browser)。

  </Accordion>

  <Accordion title="nodes 会运行 gateway 服务吗？">
    不会。除非你有意运行隔离 profile（见 [Multiple gateways](/gateway/multiple-gateways)），否则每台主机上只应该运行**一个 gateway**。Nodes 是连接到 gateway 的外设（iOS / Android nodes，或 macOS 菜单栏 app 的 “node mode”）。如果你需要无头 node host 或 CLI 控制，请参见 [Node host CLI](/cli/node)。

    修改 `gateway`、`discovery` 和 `canvasHost` 相关配置后，需要完整重启。

  </Accordion>

  <Accordion title="有通过 API / RPC 应用配置的方式吗？">
    有。

    - `config.schema.lookup`：在写入前检查某个配置子树，返回浅层 schema 节点、匹配到的 UI 提示以及直接子节点摘要
    - `config.get`：获取当前配置快照和 hash
    - `config.patch`：安全的局部更新（大多数 RPC 编辑优先用它）；能热重载时就热重载，需要重启时就重启
    - `config.apply`：校验并替换整份配置；能热重载时就热重载，需要重启时就重启
    - owner-only 的 `gateway` 运行时工具仍会拒绝改写 `tools.exec.ask` / `tools.exec.security`；旧版 `tools.bash.*` 别名也会归一化到同一组受保护路径

  </Accordion>

  <Accordion title="首次安装时，一个够用的最小配置是什么？">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这会设置你的 workspace，并限制谁可以触发这个 bot。

  </Accordion>

  <Accordion title="如何在 VPS 上配置 Tailscale，并从我的 Mac 连接过去？">
    最小步骤：

    1. **在 VPS 上安装并登录**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在你的 Mac 上安装并登录**
       - 使用 Tailscale app，并登录到同一个 tailnet
    3. **启用 MagicDNS（推荐）**
       - 在 Tailscale 管理控制台中启用 MagicDNS，让 VPS 获得稳定主机名
    4. **使用 tailnet 主机名**
       - SSH: `ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS: `ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果你想在不走 SSH 的情况下访问 Control UI，请在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这样会让 gateway 继续绑定在 loopback 上，同时通过 Tailscale 暴露 HTTPS。参见 [Tailscale](/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何把 Mac node 连接到远程 Gateway（Tailscale Serve）？">
    Serve 会暴露 **Gateway Control UI + WS**。Nodes 通过同一个 Gateway WS 端点连接。

    推荐配置：

    1. **确认 VPS 和 Mac 在同一个 tailnet 上**
    2. **在 macOS app 中使用 Remote mode**（SSH 目标可以直接写 tailnet 主机名）
       app 会把 Gateway 端口隧道出来，并作为 node 连接
    3. **在 gateway 上批准该 node：**

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档：[Gateway protocol](/gateway/protocol)、[Discovery](/gateway/discovery)、[macOS remote mode](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我应该在第二台笔记本上完整安装，还是只加一个 node？">
    如果你在第二台笔记本上只需要**本地工具**（screen / camera / exec），那就把它加成一个 **node**。这样可以保持单一 Gateway，避免重复配置。当前本地 node 工具仍然只支持 macOS，但我们计划扩展到更多操作系统。

    只有当你需要**硬隔离**或两个完全独立的 bot 时，才需要再装第二个 Gateway。

    文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)、[Multiple gateways](/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

## 环境变量与 `.env` 加载

<AccordionGroup>
  <Accordion title="OpenClaw 如何加载环境变量？">
    OpenClaw 会从父进程（shell、launchd / systemd、CI 等）读取环境变量，并额外加载：

    - 当前工作目录中的 `.env`
    - 来自 `~/.openclaw/.env` 的全局回退 `.env`（也就是 `$OPENCLAW_STATE_DIR/.env`）

    这两个 `.env` 文件都不会覆盖已有的环境变量。

    你也可以在配置里定义内联环境变量（仅在进程环境中缺失时生效）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    完整的优先级和来源见 [/environment](/help/environment)。

  </Accordion>

  <Accordion title="我通过服务启动了 Gateway，但环境变量消失了，怎么办？">
    两种常见修复方式：

    1. 把缺失的 key 写进 `~/.openclaw/.env`，这样即使服务没有继承你的 shell 环境也能加载到
    2. 启用 shell 导入（可选的便利功能）：

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

    这会运行你的登录 shell，并只导入缺失的预期 key（绝不覆盖已存在值）。等价环境变量为：
    `OPENCLAW_LOAD_SHELL_ENV=1`, `OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`.

  </Accordion>

  <Accordion title='我设置了 `COPILOT_GITHUB_TOKEN`，但 `models status` 显示 "Shell env: off."，为什么？'>
    `openclaw models status` 显示的是**shell 环境导入**是否启用。`Shell env: off` **并不**表示你的环境变量缺失，它只是说明 OpenClaw 不会自动读取你的登录 shell。

    如果 Gateway 作为服务运行（launchd / systemd），它不会继承你的 shell 环境。可用以下任一方式修复：

    1. 把 token 放进 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或启用 shell 导入（`env.shellEnv.enabled: true`）
    3. 或把它加入配置里的 `env` 块（仅在缺失时生效）

    然后重启 gateway 并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot token 读取自 `COPILOT_GITHUB_TOKEN`（也支持 `GH_TOKEN` / `GITHUB_TOKEN`）。
    参见 [/concepts/model-providers](/concepts/model-providers) 和 [/environment](/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话与多聊天

<AccordionGroup>
  <Accordion title="如何开始一段全新的对话？">
    发送单独一条 `/new` 或 `/reset` 即可。参见 [Session management](/concepts/session)。
  </Accordion>

  <Accordion title="如果我从不发送 `/new`，会话会自动重置吗？">
    会话可以在 `session.idleMinutes` 之后过期，但这个功能**默认关闭**（默认值是 **0**）。
    把它设为正数即可启用空闲过期。启用后，该聊天 key 在空闲期结束后的**下一条**
    消息会开启一个新的 session id。
    这不会删除历史记录，只是开始一个新会话。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="能不能做一个 OpenClaw 团队（一个 CEO 加很多 agents）？">
    可以，通过 **multi-agent routing** 和 **sub-agents**。你可以创建一个协调者 agent，
    再加几个拥有各自 workspace 和模型的 worker agent。

    不过，这更适合作为一种**有趣的实验**。它很耗 token，而且通常不如“一个 bot + 多个独立会话”高效。我们更推荐的典型模式是：你和一个 bot 交流，但为并行工作开不同会话；需要时，这个 bot 再自行派生 sub-agent。

    文档：[Multi-agent routing](/concepts/multi-agent)、[Sub-agents](/tools/subagents)、[Agents CLI](/cli/agents)。

  </Accordion>

  <Accordion title="为什么任务做到一半上下文被截断了？怎样避免？">
    会话上下文受模型上下文窗口限制。长聊天、大量工具输出或过多文件都可能触发 compact 或截断。

    有帮助的做法：

    - 让 bot 把当前状态总结后写入文件
    - 长任务前先用 `/compact`，切换话题时用 `/new`
    - 把重要上下文保存在 workspace 中，并让 bot 重新读取
    - 对长任务或并行工作使用 sub-agent，让主聊天保持更小
    - 如果这种情况经常发生，换一个上下文窗口更大的模型

  </Accordion>

  <Accordion title="如何彻底重置 OpenClaw，但保留安装本身？">
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

    说明：

    - 如果 onboarding 检测到已有配置，也会提供 **Reset** 选项。参见 [Onboarding (CLI)](/start/wizard)
    - 如果你使用了 profile（`--profile` / `OPENCLAW_PROFILE`），需要分别重置每个 state 目录（默认是 `~/.openclaw-<profile>`）
    - 开发环境重置：`openclaw gateway --dev --reset`（仅 dev 用；会清空 dev 配置、凭据、会话和 workspace）

  </Accordion>

  <Accordion title='我遇到了 "context too large" 错误，应该如何 reset 或 compact？'>
    可以使用以下任一方式：

    - **Compact**（保留当前对话，但总结较早轮次）：

      ```
      /compact
      ```

      或者用 `/compact <instructions>` 来指导摘要内容。

    - **Reset**（为同一个聊天 key 启动新的 session ID）：

      ```
      /new
      /reset
      ```

    如果还是频繁发生：

    - 启用或调整 **session pruning**（`agents.defaults.contextPruning`），裁剪旧的工具输出
    - 使用上下文窗口更大的模型

    文档：[Compaction](/concepts/compaction)、[Session pruning](/concepts/session-pruning)、[Session management](/concepts/session)。

  </Accordion>

  <Accordion title='为什么我会看到 "LLM request rejected: messages.content.tool_use.input field required"？'>
    这是 provider 的校验错误：模型生成了一个 `tool_use` block，但缺少必需的
    `input`。这通常意味着会话历史已经陈旧或损坏（常见于长线程之后，或工具/schema 发生变更之后）。

    修复方法：发送一条单独的 `/new`，开启全新会话。

  </Accordion>

  <Accordion title="为什么我每 30 分钟都会收到 heartbeat 消息？">
    Heartbeat 默认每 **30m** 运行一次（使用 OAuth 认证时是 **1h**）。你可以调整或禁用它：

    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "2h", // or "0m" to disable
          },
        },
      },
    }
    ```

    如果 `HEARTBEAT.md` 存在，但实际上是空的（只有空行或类似 `# Heading` 的 Markdown 标题），OpenClaw 会跳过 heartbeat 运行以节省 API 调用。
    如果文件不存在，heartbeat 仍会运行，由模型决定该做什么。

    每个 agent 的覆盖配置使用 `agents.list[].heartbeat`。文档：[Heartbeat](/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我需要把一个“bot 账号”拉进 WhatsApp 群吗？'>
    不需要。OpenClaw 运行在**你自己的账号**上，所以只要你在群里，OpenClaw 就能看到这个群。
    默认情况下，群回复会被阻止，直到你放行发送者（`groupPolicy: "allowlist"`）。

    如果你只想让**你自己**能触发群回复：

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

  <Accordion title="如何获取 WhatsApp 群的 JID？">
    方法 1（最快）：tail 日志，然后往群里发一条测试消息：

    ```bash
    openclaw logs --follow --json
    ```

    找出以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`.

    方法 2（如果已经配置/加入 allowlist）：从配置里列出群：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/channels/whatsapp)、[Directory](/cli/directory)、[Logs](/cli/logs)。

  </Accordion>

  <Accordion title="为什么 OpenClaw 在群里不回复？">
    两个常见原因：

    - Mention gating 已开启（默认就是开启的）。你必须 @mention 这个 bot（或命中 `mentionPatterns`）
    - 你配置了 `channels.whatsapp.groups`，但没有包含 `"*"`，且该群不在 allowlist 中

    参见 [Groups](/channels/groups) 和 [Group messages](/channels/group-messages)。

  </Accordion>

  <Accordion title="群组/线程会和私聊共享上下文吗？">
    默认情况下，直接聊天会折叠到 main session。群组/频道有各自的 session key，Telegram topics / Discord threads 也都是独立会话。参见 [Groups](/channels/groups) 和 [Group messages](/channels/group-messages)。
  </Accordion>

  <Accordion title="我可以创建多少个 workspace 和 agent？">
    没有硬限制。几十个、甚至几百个都可以，但要注意：

    - **磁盘增长：**sessions 和 transcript 存在 `~/.openclaw/agents/<agentId>/sessions/` 下
    - **Token 成本：**更多 agent 意味着更多并发模型调用
    - **运维开销：**每个 agent 都有自己的 auth profile、workspace 和 channel 路由

    提示：

    - 每个 agent 保持一个**活动中的** workspace（`agents.defaults.workspace`）
    - 如果磁盘增大，就清理旧会话（删除 JSONL 或 store 条目）
    - 使用 `openclaw doctor` 检查游离 workspace 和 profile 不匹配问题

  </Accordion>

  <Accordion title="我可以同时运行多个 bot 或多个聊天（Slack）吗？应该怎么配？">
    可以。使用 **Multi-Agent Routing** 运行多个相互隔离的 agent，并按
    channel / account / peer 路由入站消息。Slack 作为 channel 是受支持的，也可以绑定到特定 agent。

    浏览器访问能力很强，但它并不是“人能做什么它都能做”。
    反机器人、CAPTCHA 和 MFA 仍然会阻止自动化。想获得最稳定的浏览器控制，请在主机上使用本地 Chrome MCP，或者在真正运行浏览器的机器上使用 CDP。

    最佳实践配置：

    - 常在线 Gateway 主机（VPS / Mac mini）
    - 每种角色一个 agent（通过 bindings 绑定）
    - 将 Slack 频道绑定到对应 agents
    - 需要时，通过 Chrome MCP 或 node 提供本地浏览器

    文档：[Multi-Agent Routing](/concepts/multi-agent)、[Slack](/channels/slack)、
    [Browser](/tools/browser)、[Nodes](/nodes)。

  </Accordion>
</AccordionGroup>

## Models, failover, and auth profiles

Model Q&A — defaults, selection, aliases, switching, failover, auth profiles —
lives on the [Models FAQ](/help/faq-models).

## Gateway：端口、“已在运行”和远程模式

<AccordionGroup>
  <Accordion title="Gateway 使用哪个端口？">
    `gateway.port` 控制 WebSocket + HTTP 复用的单一端口（Control UI、hooks 等都走这里）。

    优先级：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='为什么 openclaw 网关状态显示“Runtime: running”，但“Connectivity probe: failed”？'>
    因为“running”是**监督程序**的视角（launchd/systemd/schtasks）。连通性探测则是 CLI 实际连接到网关 WebSocket。

    使用 `openclaw gateway status` 时，重点看这些字段：

    - `Probe target:`（probe 实际使用的 URL）
    - `Listening:`（端口上实际绑定的内容）
    - `Last gateway error:`（进程还活着但端口没监听时的常见根因）

  </Accordion>

  <Accordion title='为什么 `openclaw gateway status` 里的 "Config (cli)" 和 "Config (service)" 不一样？'>
    你改的是一个配置文件，但服务实际运行的是另一个，常见原因是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配。

    处理方法：

    ```bash
    openclaw gateway install --force
    ```

    请在你希望服务使用的同一个 `--profile` / 环境里执行。

  </Accordion>

  <Accordion title='“another gateway instance is already listening” 是什么意思？'>
    OpenClaw 会在启动时立刻绑定 WebSocket 监听器（默认 `ws://127.0.0.1:18789`）来强制运行时锁。如果绑定失败并报 `EADDRINUSE`，就会抛出 `GatewayLockError`，表示已经有另一个实例在监听。

    处理方法：停止另一个实例、释放端口，或者用 `openclaw gateway --port <port>` 启动。

  </Accordion>

  <Accordion title="如何以远程模式运行 OpenClaw（客户端连接到别处的 Gateway）？">
    将 `gateway.mode` 设为 `"remote"`，并指向远程 WebSocket URL，也可以可选地配置共享密钥远程凭据：

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

    - `openclaw gateway` 只会在 `gateway.mode` 为 `local` 时启动，或者你显式传了覆盖参数。
    - macOS 应用会监听配置文件，在这些值变化时实时切换模式。
    - `gateway.remote.token` / `.password` 只是客户端侧的远程凭据，本身不会开启本地 gateway 认证。

  </Accordion>

  <Accordion title='Control UI 显示 "unauthorized"（或一直重连），怎么办？'>
    你的 gateway 认证方式和 UI 使用的认证方法不一致。

    代码里的事实：

    - The Control UI keeps the token in `sessionStorage` for the current browser tab session and selected gateway URL, so same-tab refreshes keep working without restoring long-lived localStorage token persistence.
    - On `AUTH_TOKEN_MISMATCH`, trusted clients can attempt one bounded retry with a cached device token when the gateway returns retry hints (`canRetryWithDeviceToken=true`, `recommendedNextStep=retry_with_device_token`).
    - That cached-token retry now reuses the cached approved scopes stored with the device token. Explicit `deviceToken` / explicit `scopes` callers still keep their requested scope set instead of inheriting cached scopes.
    - Outside that retry path, connect auth precedence is explicit shared token/password first, then explicit `deviceToken`, then stored device token, then bootstrap token.
    - Bootstrap token scope checks are role-prefixed. The built-in bootstrap operator allowlist only satisfies operator requests; node or other non-operator roles still need scopes under their own role prefix.

    处理方法：

    - 最快方式：`openclaw dashboard`（会打印并复制 dashboard URL，尝试自动打开；在无界面环境下会显示 SSH 提示）。
    - 如果你还没有 token：运行 `openclaw doctor --generate-gateway-token`。
    - 远程场景先建隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`。
    - 共享密钥模式：设置 `gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` 或 `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`，然后在 Control UI 设置里粘贴对应密钥。
    - Tailscale Serve 模式：确认已启用 `gateway.auth.allowTailscale`，并且打开的是 Serve URL，而不是绕过 Tailscale 身份头的原始 loopback/tailnet URL。
    - Trusted-proxy 模式：确认你是通过已配置的、非 loopback 的身份感知代理访问，而不是同机 loopback 代理或原始 gateway URL。
    - 如果一次重试后仍不匹配，轮换/重新批准配对的设备 token：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 如果轮换时提示被拒绝，检查两点：
      - 配对设备会话只能轮换自己的设备，除非它们还拥有 `operator.admin`
      - 显式 `--scope` 的范围不能超过调用者当前的 operator scopes
    - 还是卡住的话，运行 `openclaw status --all` 并按 [故障排查](/gateway/troubleshooting) 处理。认证细节见 [Dashboard](/web/dashboard)。

  </Accordion>

  <Accordion title="我设置了 `gateway.bind` 为 `tailnet`，但绑定失败、也没有监听">
    `tailnet` 绑定会从你的网络接口里挑一个 Tailscale IP（100.64.0.0/10）。如果机器没有接入 Tailscale，或者接口挂了，就没有可绑定的地址。

    处理方法：

    - 在该主机上启动 Tailscale（让它有 100.x 地址），或者
    - 切换到 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是显式模式。`auto` 会优先 loopback；如果你想只绑定到 tailnet，请使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="可以在同一台主机上运行多个 Gateway 吗？">
    通常不需要，一个 Gateway 就能跑多个消息频道和 agent。只有在你需要冗余（例如救援 bot）或强隔离时，才考虑多个 Gateway。

    可以，但必须隔离：

    - `OPENCLAW_CONFIG_PATH` (per-instance config)
    - `OPENCLAW_STATE_DIR` (per-instance state)
    - `agents.defaults.workspace` (workspace isolation)
    - `gateway.port` (unique ports)

    快速配置（推荐）：

    - 每个实例使用 `openclaw --profile <name> ...`（会自动创建 `~/.openclaw-<name>`）。
    - 在每个 profile 配置里设置唯一的 `gateway.port`（或手动运行时传 `--port`）。
    - 为每个 profile 安装服务：`openclaw --profile <name> gateway install`。

    profile 也会作为服务名后缀（`ai.openclaw.<profile>`；兼容旧格式的还有 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='“invalid handshake” / code 1008 是什么意思？'>
    Gateway 是一个 **WebSocket server**，它期望收到的第一条消息必须是 `connect` 帧。如果收到别的内容，就会以 **code 1008**（policy violation）关闭连接。

    常见原因：

    - 你在浏览器里打开了 **HTTP** URL（`http://...`），而不是 WS 客户端。
    - 你用了错误的端口或路径。
    - 代理或隧道移除了认证头，或发送了非 Gateway 请求。

    快速修复：

    1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS，则用 `wss://...`）。
    2. 不要把 WS 端口直接打开在普通浏览器标签页里。
    3. 如果启用了认证，请在 `connect` 帧里带上 token/password。

    如果你用的是 CLI 或 TUI，URL 应该类似：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    协议细节见：[Gateway protocol](/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日志与调试

<AccordionGroup>
  <Accordion title="日志在哪里？">
    文件日志（结构化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    你可以通过 `logging.file` 设置固定路径。文件日志级别由 `logging.level` 控制。控制台详细程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快查看日志尾部：

    ```bash
    openclaw logs --follow
    ```

    服务/监督器日志（当 gateway 通过 launchd/systemd 运行时）：

    - macOS: `$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`；profiles 使用 `~/.openclaw-<profile>/logs/...`）
    - Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多内容见 [Troubleshooting](/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何启动、停止或重启 Gateway 服务？">
    使用 gateway 辅助命令：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你手动运行 gateway，`openclaw gateway --force` 可以重新抢占端口。参见 [Gateway](/gateway)。

  </Accordion>

  <Accordion title="我把 Windows 终端关了，如何重启 OpenClaw？">
    Windows 有 **两种安装模式**：

    **1) WSL2（推荐）：**Gateway 运行在 Linux 中。

    打开 PowerShell，进入 WSL，然后重启：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你从未安装过服务，就以前台方式启动：

    ```bash
    openclaw gateway run
    ```

    **2) 原生 Windows（不推荐）：**Gateway 直接运行在 Windows 中。

    打开 PowerShell 并运行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你手动运行它（没有服务），请使用：

    ```powershell
    openclaw gateway run
    ```

    文档：[Windows (WSL2)](/platforms/windows), [Gateway service runbook](/gateway).

  </Accordion>

  <Accordion title="Gateway 已经启动，但回复一直没到，我该检查什么？">
    先做一次快速健康检查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：

    - 模型认证未在 **gateway 主机** 上加载（检查 `models status`）。
    - Channel 配对/allowlist 阻止了回复（检查 channel 配置 + 日志）。
    - WebChat/Dashboard 打开时没有使用正确的 token。

    如果你是远程连接，请确认 tunnel/Tailscale 连接正常，并且 Gateway WebSocket 可达。

    文档：[Channels](/channels), [Troubleshooting](/gateway/troubleshooting), [Remote access](/gateway/remote).

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason" - what now?'>
    这通常表示 UI 丢失了 WebSocket 连接。检查：

    1. Gateway 是否在运行？`openclaw gateway status`
    2. Gateway 是否健康？`openclaw status`
    3. UI 是否使用了正确的 token？`openclaw dashboard`
    4. 如果是远程连接，tunnel/Tailscale 链接是否正常？

    然后跟踪日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[Dashboard](/web/dashboard), [Remote access](/gateway/remote), [Troubleshooting](/gateway/troubleshooting).

  </Accordion>

  <Accordion title="Telegram 的 setMyCommands 失败了，我该检查什么？">
    从日志和 channel 状态开始：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后对照错误类型：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单条目太多。OpenClaw 已经会按 Telegram 限制裁剪并用更少命令重试，但仍可能需要删掉一些菜单项。减少插件/skill/自定义命令，或者如果你不需要菜单，就关闭 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似网络错误：如果你在 VPS 上或处于代理后面，请确认允许 outbound HTTPS，且 `api.telegram.org` 的 DNS 可用。

    如果 Gateway 是远程的，请确保你查看的是 Gateway 主机上的日志。

    文档：[Telegram](/channels/telegram), [Channel troubleshooting](/channels/troubleshooting).

  </Accordion>

  <Accordion title="TUI 没有任何输出，我该检查什么？">
    先确认 Gateway 可达，且 agent 可以运行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 里用 `/status` 查看当前状态。如果你期待在聊天 channel 中收到回复，请确保 delivery 已启用（`/deliver on`）。

    文档：[TUI](/web/tui), [Slash commands](/tools/slash-commands).

  </Accordion>

  <Accordion title="如何彻底停止后再启动 Gateway？">
    如果你安装了服务：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    这会停止/启动**受监督的服务**（macOS 上是 launchd，Linux 上是 systemd）。
    当 Gateway 作为后台守护进程运行时就用这个。

    如果你是在前台运行，先用 Ctrl-C 停止，然后：

    ```bash
    openclaw gateway run
    ```

    文档：[Gateway service runbook](/gateway).

  </Accordion>

  <Accordion title="小白版：`openclaw gateway restart` 和 `openclaw gateway` 有什么区别？">
    - `openclaw gateway restart`：重启**后台服务**（launchd/systemd）。
    - `openclaw gateway`：在当前终端会话中以前台方式运行 gateway。

    如果你安装了服务，就用 gateway 命令。只有当你想临时以前台运行一次时，才用 `openclaw gateway`。

  </Accordion>

  <Accordion title="出现故障时，怎样最快获取更多细节？">
    用 `--verbose` 启动 Gateway 以获得更多控制台细节。然后检查日志文件中的 channel 认证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>

## 媒体与附件

<AccordionGroup>
  <Accordion title="我的 skill 生成了图片/PDF，但没有发送出去">
    agent 发出的外部附件必须包含一行 `MEDIA:<path-or-url>`（单独一行）。参见 [OpenClaw assistant setup](/start/openclaw) 和 [Agent send](/tools/agent-send)。

    CLI 发送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    还要检查：

    - 目标 channel 支持外发媒体，而且没有被 allowlist 阻止。
    - 文件大小在 provider 限制内（图片会缩放到最大 2048px）。
    - `tools.fs.workspaceOnly=true` 会把本地路径发送限制在 workspace、temp/media-store 和经过沙箱验证的文件内。
    - `tools.fs.workspaceOnly=false` 时，`MEDIA:` 可以发送 agent 本来就能读取的主机本地文件，但只限媒体和安全文档类型（图片、音频、视频、PDF 和 Office 文档）。纯文本和疑似 secret 的文件仍会被阻止。

    参见 [Images](/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全与访问控制

<AccordionGroup>
  <Accordion title="把 OpenClaw 暴露给入站私信安全吗？">
    把入站私信视为不可信输入。默认设置就是为了降低风险：

    - DM 可用 channel 的默认行为是 **配对**：
      - 未知发送者会收到配对码；bot 不会处理他们的消息。
      - 批准方式：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 未处理请求上限为每个 channel **3 个**；如果没有收到 code，请检查 `openclaw pairing list --channel <channel> [--account <id>]`
    - 公共开放 DM 需要显式选择加入（`dmPolicy: "open"` 且 allowlist 为 `"*"`）。

    运行 `openclaw doctor` 可以找出有风险的 DM 策略。

  </Accordion>

  <Accordion title="Prompt injection 只是公开 bot 才需要担心吗？">
    不是。Prompt injection 关注的是**不可信内容**，不只是谁能给 bot 发私信。
    如果你的 assistant 会读取外部内容（web search/fetch、浏览器页面、邮件、文档、附件、粘贴的日志），这些内容都可能包含试图劫持模型的指令。即使**你是唯一发送者**，也可能发生。

    最大的风险出现在工具启用时：模型可能被诱导外泄上下文，或代表你调用工具。可以这样缩小影响范围：

    - 使用只读或禁用工具的“reader” agent 来总结不可信内容
    - 对启用工具的 agent 关闭 `web_search` / `web_fetch` / `browser`
    - 也把解码后的文件/文档文本视为不可信：OpenResponses 的 `input_file` 和媒体附件提取都会把提取文本包在明确的外部内容边界标记里，而不是直接传递原始文件文本
    - 使用沙箱和严格的工具 allowlist

    详情：[Security](/gateway/security)。

  </Accordion>

  <Accordion title="我的 bot 应该有独立的邮箱、GitHub 账号或手机号吗？">
    对大多数场景来说，应该有。用独立账号和手机号隔离 bot，可以降低出问题时的影响范围，也更容易轮换凭据或撤销访问，而不影响你的个人账号。

    先从小权限开始，只给它实际需要的工具和账号，之后再按需扩展。

    文档：[Security](/gateway/security), [Pairing](/channels/pairing)。

  </Accordion>

  <Accordion title="我可以让它自动处理短信吗？这样安全吗？">
    我们**不**建议让它对你的个人消息拥有完全自主权。最安全的模式是：

    - 将 DM 保持在 **配对模式** 或严格的 allowlist 中。
    - 如果你想让它代表你发消息，请使用**单独的号码或账号**。
    - 先让它起草，然后**发送前审批**。

    如果你想试验，请在专用账号上进行，并保持隔离。参见 [Security](/gateway/security)。

  </Accordion>

  <Accordion title="做个人助理任务时，可以用更便宜的模型吗？">
    可以，**前提是**这个 agent 只做聊天，且输入可信。小模型更容易被指令劫持，所以不要把它们用于启用工具的 agent 或读取不可信内容的场景。如果必须用小模型，就锁定工具并运行在沙箱里。参见 [Security](/gateway/security)。
  </Accordion>

  <Accordion title="我在 Telegram 里运行了 /start，但没有收到配对码">
    配对码**只会**在未知发送者给 bot 发消息且启用了 `dmPolicy: "pairing"` 时发送。单独运行 `/start` 不会生成配对码。

    查看待处理请求：

    ```bash
    openclaw pairing list telegram
    ```

    如果你想立即访问，就把你的 sender id 加入 allowlist，或者给那个账号设置 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它会给我的联系人发消息吗？配对机制怎么运作？">
    不会。WhatsApp 默认的 DM 策略是 **配对**。未知发送者只会收到配对码，他们的消息**不会被处理**。OpenClaw 只会回复它收到的聊天，或者你明确触发的发送。

    批准配对：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    查看待处理请求：

    ```bash
    openclaw pairing list whatsapp
    ```

    向导里的手机号提示：它是用来设置你的 **allowlist/owner**，这样你自己的私信才会被允许。它不是用来自动发送的。如果你运行在自己的 WhatsApp 号码上，就填那个号码，并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、中止任务与“它停不下来”

<AccordionGroup>
  <Accordion title="怎样让内部系统消息不要显示在聊天里？">
    大多数内部消息或工具消息只会在该会话启用了 **verbose**、**trace** 或 **reasoning** 时出现。

    在你看到它的那个聊天里这样修复：

    ```
    /verbose off
    /trace off
    /reasoning off
    ```

    如果还是太吵，检查 Control UI 中的会话设置，把 verbose 设为 **inherit**。也确认你没有在配置里使用一个把 `verboseDefault` 设为 `on` 的 bot profile。

    文档：[Thinking and verbose](/tools/thinking), [Security](/gateway/security#reasoning-verbose-output-in-groups).

  </Accordion>

  <Accordion title="如何停止或取消正在运行的任务？">
    把以下任意内容**单独作为一条消息发送**（不要带斜杠）：

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

    这些都是中止触发器（不是 slash 命令）。

    对于后台进程（来自 exec 工具），你可以让 agent 运行：

    ```
    process action:kill sessionId:XXX
    ```

    Slash 命令总览见 [Slash commands](/tools/slash-commands)。

    大多数命令必须作为以 `/` 开头的**独立**消息发送，但少数快捷方式（比如 `/status`）对允许列表中的发送者也可以内联使用。

  </Accordion>

  <Accordion title='如何从 Telegram 给 Discord 发送消息？（"Cross-context messaging denied"）'>
    OpenClaw 默认会阻止 **cross-provider** 消息。如果某个工具调用绑定到 Telegram，除非你显式允许，否则它不会发到 Discord。

    为这个 agent 启用 cross-provider 消息：

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

    修改配置后重启 gateway。

  </Accordion>

  <Accordion title='为什么感觉 bot 会“忽略”连发消息？'>
    Queue mode 决定新消息如何与正在进行的运行交互。用 `/queue` 可以切换模式：

    - `steer` - 新消息会重定向当前任务
    - `followup` - 一次运行一条消息
    - `collect` - 批量收集消息并只回复一次（默认）
    - `steer-backlog` - 先 steer，然后处理 backlog
    - `interrupt` - 中止当前运行并重新开始

    在 followup 模式下，你还可以加上 `debounce:2s cap:25 drop:summarize` 之类的选项。

  </Accordion>
</AccordionGroup>

## 其他问题

<AccordionGroup>
  <Accordion title='使用 Anthropic API key 时，默认模型是什么？'>
    在 OpenClaw 里，凭据和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或把 Anthropic API key 存进 auth profiles）只会启用认证，真正的默认模型仍然是你在 `agents.defaults.model.primary` 里配置的值（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果你看到 `No credentials found for profile "anthropic:default"`，说明 Gateway 在正在运行的那个 agent 对应的 `auth-profiles.json` 里找不到 Anthropic 凭据。
  </Accordion>
</AccordionGroup>

---

Still stuck? Ask in [Discord](https://discord.com/invite/clawd) or open a [GitHub discussion](https://github.com/openclaw/openclaw/discussions).

## Related- [首次运行常见问题](/help/faq-first-run) — 安装、入门、认证、订阅、早期故障
- [模型常见问题](/help/faq-models) — 模型选择、故障切换、认证配置文件
- [故障排查](/help/troubleshooting) — 先按症状进行分诊
