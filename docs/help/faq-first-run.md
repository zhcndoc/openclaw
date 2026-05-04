---
summary: "常见问题：快速开始与首次运行设置 — 安装、上手、认证、订阅、初始失败"
read_when:
  - 新安装、上手卡住，或首次运行错误
  - 选择认证和提供商订阅
  - 无法访问 docs.openclaw.ai、无法打开仪表盘、安装卡住
title: "常见问题：首次运行设置"
sidebarTitle: "首次运行 FAQ"
---

快速开始和首次运行问答。关于日常操作、模型、认证、会话和故障排除，请参阅主 [FAQ](/help/faq)。

## 快速开始和首次运行设置

<AccordionGroup>
  <Accordion title="我卡住了，最快的脱困方法">
    使用一个能**看到你的机器**的本地 AI 代理。这比在 Discord 里提问有效得多，因为大多数“我卡住了”的情况都是**本地配置或环境问题**，远程协助者无法检查。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    这些工具可以读取仓库、运行命令、检查日志，并帮助修复机器级别的设置（PATH、服务、权限、认证文件）。通过可折腾的（git）安装把**完整源码检出**提供给它们：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会从 git 检出版本安装 OpenClaw，因此代理可以读取代码和文档，并推理你正在运行的确切版本。以后你总能通过不带 `--install-method git` 重新运行安装程序切回稳定版。

    提示：让代理**规划并监督**修复过程（逐步进行），然后只执行必要的命令。这样能让变更更小，也更容易审计。

    如果你发现了真实 bug 或修复方案，请提交 GitHub issue 或 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    先运行这些命令（求助时请共享输出）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它们的作用：

    - `openclaw status`：快速查看网关/代理健康状态和基础配置。
    - `openclaw models status`：检查提供商认证和模型可用性。
    - `openclaw doctor`：验证并修复常见配置/状态问题。

    其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    Quick debug loop: [First 60 seconds if something is broken](/help/faq#first-60-seconds-if-something-is-broken).
    Install docs: [Install](/install), [Installer flags](/install/installer), [Updating](/install/updating).

  </Accordion>

  <Accordion title="心跳一直被跳过。跳过原因是什么意思？">
    常见的心跳跳过原因：

    - `quiet-hours`：当前不在配置的活跃时间窗口内
    - `empty-heartbeat-file`：`HEARTBEAT.md` 存在，但只包含空白/只有标题的占位内容
    - `no-tasks-due`：`HEARTBEAT.md` 任务模式已启用，但当前还没有任何任务到期
    - `alerts-disabled`：所有心跳可见性都被禁用（`showOk`、`showAlerts` 和 `useIndicator` 都关闭）

    在任务模式下，只有一次真实的心跳运行完成后，到期时间戳才会前进。被跳过的运行不会把任务标记为完成。

    文档：[Heartbeat](/gateway/heartbeat)，[自动化与任务](/automation)。

  </Accordion>

  <Accordion title="推荐的安装和设置 OpenClaw 的方式">
    仓库推荐从源码运行并使用引导：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    向导也可以自动构建 UI 资源。完成引导后，通常会在 **18789** 端口运行 Gateway。

    从源码安装（贡献者/开发者）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build
    openclaw onboard
    ```

    如果你还没有全局安装，可以通过 `pnpm openclaw onboard` 运行。

  </Accordion>

  <Accordion title="引导完成后我怎么打开仪表盘？">
    向导会在引导完成后立即用一个干净的（非 token 化的）仪表盘 URL 打开浏览器，并在摘要中打印该链接。保持那个标签页打开；如果它没有自动启动，请在同一台机器上复制/粘贴打印出的 URL。
  </Accordion>

  <Accordion title="我在 localhost 和远程环境下该如何认证仪表盘？">
    **Localhost（同一台机器）：**

    - 打开 `http://127.0.0.1:18789/`。
    - 如果它要求共享密钥认证，请把已配置的 token 或密码粘贴到 Control UI 设置中。
    - Token 来源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密码来源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果还没有配置共享密钥，可以用 `openclaw doctor --generate-gateway-token` 生成 token。

    **不是 localhost：**

    - **Tailscale Serve**（推荐）：保持绑定 loopback，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 为 `true`，身份头即可满足 Control UI/WebSocket 认证（无需粘贴共享密钥，默认信任网关主机）；HTTP API 仍然需要共享密钥认证，除非你明确使用 private-ingress `none` 或受信任代理的 HTTP 认证。
      来自同一客户端的不良并发 Serve 认证尝试会在失败认证限流器记录之前被串行化，因此第二次错误重试可能已经显示 `retry later`。
    - **Tailnet 绑定**：运行 `openclaw gateway --bind tailnet --token "<token>"`（或配置密码认证），打开 `http://<tailscale-ip>:18789/`，然后在仪表盘设置中粘贴匹配的共享密钥。
    - **具备身份感知的反向代理**：让 Gateway 位于受信任代理后面，配置 `gateway.auth.mode: "trusted-proxy"`，然后打开代理 URL。同主机的 loopback 代理需要显式设置 `gateway.auth.trustedProxy.allowLoopback = true`。
    - **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`。隧道上仍然适用共享密钥认证；如果提示，请粘贴已配置的 token 或密码。

    有关绑定模式和认证细节，请参阅 [仪表盘](/web/dashboard) 和 [Web 表面](/web)。

  </Accordion>

  <Accordion title="为什么聊天审批会有两个 exec approval 配置？">
    它们控制的是不同层：

    - `approvals.exec`：把审批提示转发到聊天目的地
    - `channels.<channel>.execApprovals`：让该频道作为 exec 审批的原生审批客户端

    主机上的 exec 策略仍然是真正的审批门槛。聊天配置只控制审批提示显示在哪里，以及人们如何回复它们。

    在大多数设置里，你**不需要**两者都用：

    - 如果聊天本身支持命令和回复，同一聊天中的 `/approve` 会通过共享路径工作。
    - 如果受支持的原生频道可以安全地推断审批人，OpenClaw 现在会在 `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"` 时自动启用 DM 优先的原生审批。
    - 当原生审批卡片/按钮可用时，那个原生 UI 是主路径；如果工具结果表明聊天审批不可用，或者手动审批是唯一路径，代理才应包含手动 `/approve` 命令。
    - 只有当你明确希望把审批提示也转发到其他聊天或显式运维房间时，才使用 `approvals.exec`。
    - 只有当你明确希望审批提示发回到原始房间/话题时，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 插件审批是另一回事：默认使用同一聊天中的 `/approve`，可选 `approvals.plugin` 转发，且只有某些原生频道会在此基础上保留插件审批原生处理。

    简而言之：转发用于路由，原生客户端配置用于更丰富的频道专属体验。
    参见 [Exec 审批](/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什么运行时？">
    需要 Node **>= 22**。推荐使用 `pnpm`。不推荐在 Gateway 上使用 Bun。
  </Accordion>

  <Accordion title="它能在 Raspberry Pi 上运行吗？">
    可以。Gateway 很轻量——文档列出的个人用途足够配置是 **512MB-1GB RAM**、**1 核**，以及大约 **500MB**
    磁盘，并指出 **Raspberry Pi 4 可以运行它**。

    如果你想要额外余量（日志、媒体、其他服务），**推荐 2GB**，但这不是硬性最低要求。

    提示：小型 Pi/VPS 可以托管 Gateway，而你可以在笔记本/手机上配对**节点**，用于本地屏幕/摄像头/画布或命令执行。参见 [节点](/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安装有什么提示吗？">
    简而言之：能用，但要预期一些粗糙边缘。

    - 使用 **64 位** 操作系统，并保持 Node >= 22。
    - 优先使用**可折腾的（git）安装**，这样你能看到日志并快速更新。
    - 先不启用频道/技能，之后一个一个加。
    - 如果遇到奇怪的二进制问题，通常是 **ARM 兼容性** 问题。

    文档：[Linux](/platforms/linux)、[安装](/install)。

  </Accordion>

  <Accordion title="卡在 wake up my friend / 引导无法 hatch。现在怎么办？">
    这个界面依赖于 Gateway 可达且已认证。TUI 在首次 hatch 时也会自动发送
    “Wake up, my friend!”。如果你看到这行但**没有回复**，并且 token 一直是 0，
    说明代理根本没运行。

    1. 重启 Gateway：

    ```bash
    openclaw gateway restart
    ```

    2. 检查状态和认证：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果还是卡住，运行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 是远程的，请确保隧道/Tailscale 连接已建立，并且 UI 指向的是正确的 Gateway。参见 [远程访问](/gateway/remote)。

  </Accordion>

  <Accordion title="我可以把现有设置迁移到新机器（Mac mini）而不重新做引导吗？">
    可以。复制**状态目录**和**工作区**，然后运行一次 Doctor。只要你把**两个**位置都复制了，这样就能让你的 bot“完全一样”（记忆、会话历史、认证和频道状态）：

    1. 在新机器上安装 OpenClaw。
    2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
    3. 复制你的工作区（默认：`~/.openclaw/workspace`）。
    4. 运行 `openclaw doctor` 并重启 Gateway 服务。

    这样会保留配置、认证配置文件、WhatsApp 凭据、会话和记忆。如果你使用远程模式，请记住网关主机拥有会话存储和工作区。

    **重要：** 如果你只是把工作区提交/推送到 GitHub，你备份的是**记忆 + 引导文件**，但**不是**会话历史或认证。这些都位于 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    Related: [Migrating](/install/migrating), [Where things live on disk](/help/faq#where-things-live-on-disk),
    [Agent workspace](/concepts/agent-workspace), [Doctor](/gateway/doctor),
    [Remote mode](/gateway/remote).

  </Accordion>

  <Accordion title="我在哪里查看最新版本的新内容？">
    查看 GitHub 更新日志：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新条目在最上面。如果顶部部分标记为 **Unreleased**，那么下面第一个带日期的部分就是最新发布的版本。条目按 **Highlights**、**Changes** 和 **Fixes** 分组（在需要时还会有 docs/other 章节）。

  </Accordion>

  <Accordion title="无法访问 docs.openclaw.ai（SSL 错误）">
    某些 Comcast/Xfinity 连接会通过 Xfinity Advanced Security 错误地阻止 `docs.openclaw.ai`。
    请禁用它或将 `docs.openclaw.ai` 加入白名单，然后重试。
    请在这里报告，帮助我们解除封锁：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果你仍然无法访问该站点，文档在 GitHub 上有镜像：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="稳定版和 beta 有什么区别">
    **Stable** 和 **beta** 是 **npm dist-tag**，不是两条不同的代码线：

    - `latest` = stable
    - `beta` = 用于测试的早期构建

    通常，一个稳定版会先进入 **beta**，然后通过一个显式的晋升步骤把同一个版本移动到 `latest`。维护者也可以在需要时直接发布到 `latest`。这就是为什么在晋升后 beta 和 stable 可以指向**同一个版本**。

    查看有哪些变化：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    关于安装一键命令以及 beta 和 dev 的区别，请看下面的折叠项。

  </Accordion>

  <Accordion title="我如何安装 beta 版本，以及 beta 和 dev 有什么区别？">
    **Beta** 是 npm dist-tag `beta`（晋升后可能与 `latest` 相同）。
    **Dev** 是 `main`（git）的移动头；发布时会使用 npm dist-tag `dev`。

    一键命令（macOS/Linux）：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安装器（PowerShell）：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多细节：[开发渠道](/install/development-channels) 和 [安装器参数](/install/installer)。

  </Accordion>

  <Accordion title="我怎样尝试最新内容？">
    两种方式：

    1. **Dev 渠道（git 检出）：**

    ```bash
    openclaw update --channel dev
    ```

    这会切换到 `main` 分支并从源码更新。

    2. **可折腾安装（来自安装器网站）：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会给你一个可以本地编辑的仓库，然后通过 git 更新。

    如果你更喜欢手动干净克隆，使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文档：[更新](/cli/update)、[开发渠道](/install/development-channels)、
    [安装](/install)。

  </Accordion>

  <Accordion title="安装和引导通常要多久？">
    大致参考：

    - **安装：** 2-5 分钟
    - **引导：** 5-15 分钟，取决于你配置了多少频道/模型

    如果卡住了，使用 [安装器卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速调试循环。

  </Accordion>

  <Accordion title="安装器卡住了？我怎样获取更多反馈？">
    重新运行安装器并启用**详细输出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    带详细输出的 beta 安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    对于可折腾的（git）安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    Windows（PowerShell）等效命令：

    ```powershell
    # install.ps1 目前还没有专用的 -Verbose 标志。
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    更多选项：[安装器参数](/install/installer)。

  </Accordion>

  <Accordion title="Windows 安装提示 git 找不到或 openclaw 未被识别">
    两个常见的 Windows 问题：

    **1）npm 错误 spawn git / git not found**

    - 安装 **Git for Windows**，并确保 `git` 在你的 PATH 中。
    - 关闭并重新打开 PowerShell，然后重新运行安装器。

    **2）安装后 openclaw 未被识别**

    - 你的 npm 全局 bin 目录没有加入 PATH。
    - 检查路径：

      ```powershell
      npm config get prefix
      ```

    - 把该目录加入你的用户 PATH（Windows 上不需要 `\bin` 后缀；大多数系统上它是 `%AppData%\npm`）。
    - 更新 PATH 后关闭并重新打开 PowerShell。

    如果你想要最顺滑的 Windows 设置，请改用 **WSL2**，而不是原生 Windows。
    文档：[Windows](/platforms/windows)。

  </Accordion>

  <Accordion title="Windows exec 输出显示乱码中文 - 我该怎么办？">
    这通常是原生 Windows shell 的控制台代码页不匹配导致的。

    症状：

    - `system.run`/`exec` 输出把中文渲染成乱码
    - 同一条命令在另一个终端配置文件里看起来正常

    PowerShell 中的快速解决办法：

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    然后重启 Gateway 并重试你的命令：

    ```powershell
    openclaw gateway restart
    ```

    如果你在最新的 OpenClaw 上仍能复现，请在这里跟踪/报告：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文档没有回答我的问题 - 我怎样获得更好的答案？">
    使用**可折腾的（git）安装**，这样你在本地就有完整的源码和文档，然后在那个文件夹里向你的 bot（或 Claude/Codex）提问，这样它就可以读取仓库并准确回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多细节：[安装](/install) 和 [安装器参数](/install/installer)。

  </Accordion>

  <Accordion title="我如何在 Linux 上安装 OpenClaw？">
    简短答案：先按照 Linux 指南，然后运行引导。

    - Linux 快速路径 + 服务安装：[Linux](/platforms/linux)。
    - 完整流程：[入门指南](/start/getting-started)。
    - 安装器 + 更新：[安装与更新](/install/updating)。

  </Accordion>

  <Accordion title="我如何在 VPS 上安装 OpenClaw？">
    任何 Linux VPS 都可以。先在服务器上安装，然后使用 SSH/Tailscale 访问 Gateway。

    指南：[exe.dev](/install/exe-dev)、[Hetzner](/install/hetzner)、[Fly.io](/install/fly)。
    远程访问：[Gateway 远程模式](/gateway/remote)。

  </Accordion>

  <Accordion title="云/VPS 安装指南在哪里？">
    我们维护了一个包含常见提供商的**托管中心**。选择一个并按指南操作：

    - [VPS 托管](/vps)（把所有提供商放在一处）
    - [Fly.io](/install/fly)
    - [Hetzner](/install/hetzner)
    - [exe.dev](/install/exe-dev)

    云端的工作方式：**Gateway 运行在服务器上**，你通过 Control UI（或 Tailscale/SSH）从笔记本/手机访问它。你的状态和工作区都保存在服务器上，因此应把主机视为唯一事实来源并做好备份。

    你可以把**节点**（Mac/iOS/Android/无头）配对到这个云 Gateway，以访问本地屏幕/摄像头/画布，或在你的笔记本上运行命令，同时让 Gateway 保持在云端。

    中心：[平台](/platforms)。远程访问：[Gateway 远程模式](/gateway/remote)。
    节点：[节点](/nodes)、[节点 CLI](/cli/nodes)。

  </Accordion>

  <Accordion title="我可以让 OpenClaw 自己更新自己吗？">
    简短答案：**可以，但不推荐**。更新流程可能会重启 Gateway（这会断开当前会话），可能需要一个干净的 git 检出，并且可能会提示确认。更安全的做法：由操作员在 shell 中运行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果你必须从代理自动化执行：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文档：[更新](/cli/update)、[更新](/install/updating)。

  </Accordion>

  <Accordion title="引导实际做了什么？">
    `openclaw onboard` 是推荐的设置路径。在**本地模式**下，它会引导你完成：

    - **模型/认证设置**（提供商 OAuth、API key、Anthropic setup-token，以及本地模型选项如 LM Studio）
    - **工作区** 位置 + 引导文件
    - **Gateway 设置**（bind/port/auth/tailscale）
    - **频道**（WhatsApp、Telegram、Discord、Mattermost、Signal、iMessage，以及捆绑的频道插件如 QQ Bot）
    - **守护进程安装**（macOS 上的 LaunchAgent；Linux/WSL2 上的 systemd user unit）
    - **健康检查** 和 **技能** 选择

    它还会在你配置的模型未知或缺少认证时发出警告。

  </Accordion>

  <Accordion title="运行这个需要 Claude 或 OpenAI 订阅吗？">
    不需要。你可以使用 **API keys**（Anthropic/OpenAI/其他）运行 OpenClaw，也可以使用
    **纯本地模型**，这样你的数据就会保留在设备上。订阅（Claude Pro/Max 或 OpenAI Codex）
    只是用于认证这些提供商的可选方式。

    对于 OpenClaw 中的 Anthropic，实际区分是：

    - **Anthropic API key**：正常的 Anthropic API 计费
    - **Claude CLI / OpenClaw 中的 Claude 订阅认证**：Anthropic 员工
      告诉我们这类用法现在再次被允许，而 OpenClaw 会把 `claude -p`
      用法视为该集成的获准用法，除非 Anthropic 发布新政策

    对于长期运行的网关主机，Anthropic API key 仍然是更可预测的设置。OpenAI Codex OAuth 也明确支持像 OpenClaw 这样的外部工具。

    OpenClaw 还支持其他托管的订阅式选项，包括
    **Qwen Cloud Coding Plan**、**MiniMax Coding Plan** 和
    **Z.AI / GLM Coding Plan**。

    文档：[Anthropic](/providers/anthropic)、[OpenAI](/providers/openai)、
    [Qwen Cloud](/providers/qwen)、
    [MiniMax](/providers/minimax)、[GLM 模型](/providers/glm)、
    [本地模型](/gateway/local-models)、[模型](/concepts/models)。

  </Accordion>

  <Accordion title="我可以不用 API key 使用 Claude Max 订阅吗？">
    可以。

    Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用法现在再次被允许，因此
    OpenClaw 会把 Claude 订阅认证和 `claude -p` 用法视为该集成的获准用法，
    除非 Anthropic 发布新政策。如果你想要最可预测的服务端设置，
    还是请使用 Anthropic API key。

  </Accordion>

  <Accordion title="你们支持 Claude 订阅认证（Claude Pro 或 Max）吗？">
    支持。

    Anthropic 员工告诉我们这类用法现在再次被允许，因此 OpenClaw 会把
    Claude CLI 复用和 `claude -p` 用法视为该集成的获准用法，
    除非 Anthropic 发布新政策。

    Anthropic setup-token 仍然是受支持的 OpenClaw token 路径，但在可用时，OpenClaw 现在更倾向于使用 Claude CLI 复用和 `claude -p`。
    对于生产环境或多用户工作负载，Anthropic API key 认证仍然是
    更安全、更可预测的选择。如果你想在 OpenClaw 中使用其他订阅式托管
    选项，请参阅 [OpenAI](/providers/openai)、[Qwen / Model
    Cloud](/providers/qwen)、[MiniMax](/providers/minimax) 和 [GLM
    模型](/providers/glm)。

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="为什么我会看到来自 Anthropic 的 HTTP 429 rate_limit_error？">
    这意味着你当前窗口的 **Anthropic 配额/速率限制** 已耗尽。如果你使用
    **Claude CLI**，请等待窗口重置或升级你的计划。如果你使用
    **Anthropic API key**，请在 Anthropic Console 中检查使用量/账单，
    并根据需要提高限额。

    如果消息具体是：
    `Extra usage is required for long context requests`，说明请求正在尝试使用
    Anthropic 的 1M 上下文 beta（`context1m: true`）。只有当你的凭据有资格
    进行长上下文计费时它才可用（API key 计费或启用了 Extra Usage 的
    OpenClaw Claude 登录路径）。

    提示：设置一个**备用模型**，这样当某个提供商被限流时，OpenClaw 还能继续回复。
    参见 [模型](/cli/models)、[OAuth](/concepts/oauth)，以及
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

  <Accordion title="支持 AWS Bedrock 吗？">
    支持。OpenClaw 内置了 **Amazon Bedrock（Converse）** 提供商。在存在 AWS 环境标记时，OpenClaw 可以自动发现流式/文本 Bedrock 目录并将其作为隐式 `amazon-bedrock` 提供商合并；否则你也可以显式启用 `plugins.entries.amazon-bedrock.config.discovery.enabled` 或添加一个手动提供商条目。参见 [Amazon Bedrock](/providers/bedrock) 和 [模型提供商](/providers/models)。如果你更喜欢受管密钥流，在 Bedrock 前面放一个兼容 OpenAI 的代理仍然是有效选项。
  </Accordion>

  <Accordion title="How does Codex auth work?">
    OpenClaw supports **OpenAI Code (Codex)** via OAuth (ChatGPT sign-in). Use
    `openai/gpt-5.5` with `agentRuntime.id: "codex"` for the common setup:
    ChatGPT/Codex subscription auth plus native Codex app-server execution. Use
    `openai-codex/gpt-5.5` only when you want Codex OAuth through the default
    PI runner. Use `openai/gpt-5.5` without the Codex runtime override for
    direct OpenAI API-key access.
    See [Model providers](/concepts/model-providers) and [Onboarding (CLI)](/start/wizard).
  </Accordion>

  <Accordion title="为什么 OpenClaw 仍然提到 openai-codex？">
    `openai-codex` 是 ChatGPT/Codex OAuth 的提供商和 auth-profile id。
    它也是 Codex OAuth 的显式 PI 模型前缀：

    - `openai/gpt-5.5` + `agentRuntime.id: "codex"` = ChatGPT/Codex subscription auth with native Codex runtime
    - `openai-codex/gpt-5.5` = Codex OAuth route in PI
    - `openai/gpt-5.5` without a Codex runtime override = direct OpenAI API-key route in PI
    - `openai-codex:...` = auth profile id, not a model ref

    If you want the direct OpenAI Platform billing/limit path, set
    `OPENAI_API_KEY`. If you want ChatGPT/Codex subscription auth, sign in with
    `openclaw models auth login --provider openai-codex`. For native Codex
    runtime, keep the model ref as `openai/gpt-5.5` and set
    `agentRuntime.id: "codex"`. Use `openai-codex/*` model refs only for PI
    runs.

  </Accordion>

  <Accordion title="为什么 Codex OAuth 限额可能和 ChatGPT 网页端不同？">
    Codex OAuth 使用的是 OpenAI 管理的、与计划相关的配额窗口。实际上，
    即使它们都绑定同一个账号，这些限额也可能和 ChatGPT 网站/应用体验不同。

    OpenClaw 可以在 `openclaw models status` 中显示当前可见的提供商使用量/配额窗口，
    但它不会把 ChatGPT 网页端的权限伪造成直接 API 访问。如果你想要直接的 OpenAI Platform
    计费/限额路径，请使用带 API key 的 `openai/*`。

  </Accordion>

  <Accordion title="你们支持 OpenAI 订阅认证（Codex OAuth）吗？">
    支持。OpenClaw 完整支持 **OpenAI Code（Codex）订阅 OAuth**。
    OpenAI 明确允许在像 OpenClaw 这样的外部工具/工作流中使用订阅 OAuth。引导流程可以替你运行 OAuth。

    参见 [OAuth](/concepts/oauth)、[模型提供商](/concepts/model-providers) 和 [引导（CLI）](/start/wizard)。

  </Accordion>

  <Accordion title="我如何设置 Gemini CLI OAuth？">
    Gemini CLI 使用的是**插件认证流程**，而不是在 `openclaw.json` 中填 client id 或 secret。

    步骤：

    1. 在本地安装 Gemini CLI，确保 `gemini` 在 `PATH` 中
       - Homebrew: `brew install gemini-cli`
       - npm: `npm install -g @google/gemini-cli`
    2. 启用插件：`openclaw plugins enable google`
    3. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登录后默认模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果请求失败，在 gateway 主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    这会把 OAuth token 存储在 gateway 主机上的认证配置文件中。详情：[模型提供商](/concepts/model-providers)。

  </Accordion>

  <Accordion title="本地模型适合随便聊天吗？">
    通常不适合。OpenClaw 需要大的上下文和强安全性；小模型会截断并泄漏。如果必须使用，请运行你本地能跑的**最大**模型构建（LM Studio），并查看 [/gateway/local-models](/gateway/local-models)。更小/量化模型会增加提示注入风险——参见 [安全性](/gateway/security)。
  </Accordion>

  <Accordion title="如何让托管模型流量保持在特定区域？">
    选择按区域固定的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供美国托管选项；选择美国托管变体可让数据留在该区域。你仍然可以通过使用 `models.mode: "merge"` 将 Anthropic/OpenAI 与这些一起列出，这样在尊重你选择的区域化提供商的同时，备用方案仍然可用。
  </Accordion>

  <Accordion title="我必须买 Mac Mini 才能安装这个吗？">
    不需要。OpenClaw 可在 macOS 或 Linux 上运行（Windows 通过 WSL2）。Mac mini 是可选的——有些人会买它作为常开主机，但小型 VPS、家用服务器或 Raspberry Pi 级别的设备也可以。

    你只在需要**仅 macOS 工具**时才需要 Mac。对于 iMessage，请使用 [BlueBubbles](/channels/bluebubbles)（推荐）——BlueBubbles 服务器可运行在任何 Mac 上，而 Gateway 可以运行在 Linux 或其他地方。如果你想使用其他仅 macOS 的工具，请在 Mac 上运行 Gateway 或配对一个 macOS 节点。

    文档：[BlueBubbles](/channels/bluebubbles)、[节点](/nodes)、[Mac 远程模式](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 才能支持 iMessage 吗？">
    你需要**某台 macOS 设备**登录了 Messages。它**不一定**非得是 Mac mini——任何 Mac 都可以。**使用 [BlueBubbles](/channels/bluebubbles)**（推荐）来支持 iMessage——BlueBubbles 服务器运行在 macOS 上，而 Gateway 可以运行在 Linux 或其他地方。

    常见方案：

    - 在 Linux/VPS 上运行 Gateway，并在任意已登录 Messages 的 Mac 上运行 BlueBubbles 服务器。
    - 如果你想要最简单的单机设置，就把所有东西都运行在 Mac 上。

    文档：[BlueBubbles](/channels/bluebubbles)、[节点](/nodes)、
    [Mac 远程模式](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我买一台 Mac mini 跑 OpenClaw，我能把它连到我的 MacBook Pro 吗？">
    可以。**Mac mini 可以运行 Gateway**，而你的 MacBook Pro 可以作为**节点**（伴随设备）连接。节点不运行 Gateway——它们提供额外能力，比如该设备上的屏幕/摄像头/画布和 `system.run`。

    常见模式：

    - Mac mini 上运行 Gateway（常开）。
    - MacBook Pro 运行 macOS 应用或节点主机，并与 Gateway 配对。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 查看它。

    文档：[节点](/nodes)、[节点 CLI](/cli/nodes)。

  </Accordion>

  <Accordion title="可以使用 Bun 吗？">
    不推荐使用 Bun。我们看到过运行时 bug，尤其是在 WhatsApp 和 Telegram 上。
    稳定的 Gateway 请使用 **Node**。

    如果你仍想用 Bun 做实验，请在非生产 Gateway 上进行，
    不要启用 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram：allowFrom 里填什么？">
    `channels.telegram.allowFrom` 是**人类发送者的 Telegram 用户 ID**（数字），不是机器人用户名。

    设置时只要求数字用户 ID。如果你已经在配置中有旧的 `@username` 条目，`openclaw doctor --fix` 可以尝试解析它们。

    更安全的方式（不使用第三方机器人）：

    - 给你的机器人发私信，然后运行 `openclaw logs --follow` 并读取 `from.id`。

    官方 Bot API：

    - 给你的机器人发私信，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并读取 `message.from.id`。

    第三方（隐私较差）：

    - 给 `@userinfobot` 或 `@getidsbot` 发私信。

    参见 [/channels/telegram](/channels/telegram#access-control-and-activation)。

  </Accordion>

  <Accordion title="多个不同的 OpenClaw 实例可以让多人共用一个 WhatsApp 号码吗？">
    可以，通过**多代理路由**。把每个发送者的 WhatsApp **DM**（peer `kind: "direct"`，发送者 E.164 格式如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都有自己的工作区和会话存储。回复仍然来自**同一个 WhatsApp 账号**，而 DM 访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）在每个 WhatsApp 账号层面是全局的。参见 [多代理路由](/concepts/multi-agent) 和 [WhatsApp](/channels/whatsapp)。
  </Accordion>

  <Accordion title='我可以运行一个“快速聊天”代理和一个“用于编码的 Opus”代理吗？'>
    可以。使用多代理路由：给每个代理分配各自的默认模型，然后把入站路由（提供商账号或特定 peer）绑定到每个代理。示例配置见 [多代理路由](/concepts/multi-agent)。另请参见 [模型](/concepts/models) 和 [配置](/gateway/configuration)。
  </Accordion>

  <Accordion title="Homebrew 在 Linux 上可用吗？">
    可以。Homebrew 支持 Linux（Linuxbrew）。快速设置：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果你通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或你的 brew 前缀），这样 `brew` 安装的工具才能在非登录 shell 中解析。
    最近的构建还会在 Linux systemd 服务中预先添加常见用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置了相关变量时遵循 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可折腾的 git 安装和 npm 安装有什么区别">
    - **可折腾（git）安装：** 完整源码检出，可编辑，最适合贡献者。
      你在本地运行构建，并且可以修改代码/文档。
    - **npm 安装：** 全局 CLI 安装，没有仓库，最适合“直接运行”。
      更新来自 npm dist-tag。

    文档：[开始使用](/start/getting-started)、[更新](/install/updating)。

  </Accordion>

  <Accordion title="以后我可以在 npm 和 git 安装之间切换吗？">
    可以。当 OpenClaw 已经安装好时，使用 `openclaw update --channel ...`。
    这**不会删除你的数据**——它只会更改 OpenClaw 的代码安装方式。
    你的状态（`~/.openclaw`）和工作区（`~/.openclaw/workspace`）都会保持不变。

    从 npm 切到 git：

    ```bash
    openclaw update --channel dev
    ```

    从 git 切到 npm：

    ```bash
    openclaw update --channel stable
    ```

    添加 `--dry-run` 可以先预览计划中的模式切换。更新器会运行
    Doctor 后续处理，为目标渠道刷新插件源，并在你没有传 `--no-restart` 时重启 gateway。

    安装器也可以强制任一模式：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method npm
    ```

    Backup tips: see [Backup strategy](/help/faq#where-things-live-on-disk).

  </Accordion>

  <Accordion title="我应该把 Gateway 运行在笔记本上还是 VPS 上？">
    简而言之：**如果你想要 24/7 可靠性，请用 VPS**。如果你想要
    最低使用门槛，并且能接受睡眠/重启，那就本地运行。

    **笔记本（本地 Gateway）**

    - **优点：** 无服务器成本、直接访问本地文件、可见的浏览器窗口。
    - **缺点：** 睡眠/断网 = 断开连接，系统更新/重启会中断，必须保持唤醒。

    **VPS / 云**

    - **优点：** 常开、网络稳定、没有笔记本睡眠问题、更容易持续运行。
    - **缺点：** 通常无界面运行（用截图），只能远程访问文件，更新时必须通过 SSH。

    **OpenClaw 的特定说明：** WhatsApp/Telegram/Slack/Mattermost/Discord 在 VPS 上都能正常工作。真正的取舍只是**无头浏览器**和可见窗口之间的区别。参见 [浏览器](/tools/browser)。

    **推荐默认值：** 如果你以前遇到过 gateway 断开，就优先用 VPS。若你正在积极使用 Mac，并且想要本地文件访问或带可见浏览器的 UI 自动化，本地方式很棒。

  </Accordion>

  <Accordion title="把 OpenClaw 运行在专用机器上有多重要？">
    不是必须，但**为了可靠性和隔离性，推荐这样做**。

    - **专用主机（VPS/Mac mini/Pi）：** 常开、更少睡眠/重启中断、更干净的权限、更容易持续运行。
    - **共享笔记本/台式机：** 做测试和主动使用完全没问题，但当机器睡眠或更新时要预期暂停。

    如果你想兼得两者，建议把 Gateway 放在专用主机上，并把笔记本作为**节点**配对，以便使用本地屏幕/摄像头/执行工具。参见 [节点](/nodes)。
    安全指导请阅读 [安全性](/gateway/security)。

  </Accordion>

  <Accordion title="VPS 的最低要求和推荐操作系统是什么？">
    OpenClaw 很轻量。对于一个基础 Gateway 加一个聊天频道：

    - **绝对最低：** 1 vCPU、1GB RAM、约 500MB 磁盘。
    - **推荐：** 1-2 vCPU，2GB RAM 或更多，以获得余量（日志、媒体、多频道）。节点工具和浏览器自动化可能比较吃资源。

    操作系统：使用 **Ubuntu LTS**（或任何现代 Debian/Ubuntu）。Linux 安装路径在那里的测试最充分。

    文档：[Linux](/platforms/linux)、[VPS 托管](/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 里运行 OpenClaw 吗？需要什么条件？">
    可以。把 VM 当成 VPS 一样看待：它需要始终在线、可访问，并且有足够
    的内存来运行 Gateway 和你启用的任何频道。

    基本建议：

    - **绝对最低：** 1 vCPU，1GB RAM。
    - **推荐：** 如果你运行多个频道、浏览器自动化或媒体工具，建议 2GB RAM 或更多。
    - **操作系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu。

    如果你在 Windows 上，**WSL2 是最容易的 VM 风格设置**，并且工具兼容性最好。参见 [Windows](/platforms/windows)、[VPS 托管](/vps)。
    如果你在 VM 里运行 macOS，请参见 [macOS VM](/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 相关内容

- [FAQ](/help/faq) — 主 FAQ（模型、会话、网关、安全等）
- [安装概览](/install)
- [入门指南](/start/getting-started)
- [故障排除](/help/troubleshooting)
