---
summary: "常见问题：快速开始和首次运行设置 — 安装、引导、认证、订阅、初始失败"
read_when:
  - 新安装、引导卡住，或首次运行错误
  - 选择认证和提供商订阅
  - 无法访问 docs.openclaw.ai，无法打开仪表板，安装卡住
title: "常见问题：首次运行设置"
sidebarTitle: "首次运行 FAQ"
---

快速开始和首次运行问答。有关日常操作、模型、认证、会话和故障排除，请参见主 [FAQ](/help/faq)。

## 快速开始和首次运行设置

<AccordionGroup>
  <Accordion title="我卡住了，最快的脱困方法是什么">
    使用一个**能够看到你的机器**的本地 AI 代理。这比在 Discord 里询问有效得多，因为大多数“我卡住了”的情况都是**本地配置或环境问题**，远程帮助者无法检查。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    这些工具可以读取仓库、运行命令、检查日志，并帮助修复你的机器级设置（PATH、服务、权限、认证文件）。通过可改造的（git）安装，把**完整源码检出**交给它们：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会从一个 git 检出中安装 OpenClaw，因此代理可以读取代码和文档，并推理你正在运行的确切版本。你始终可以稍后通过重新运行安装器、且不使用 `--install-method git` 切回稳定版。

    提示：让代理**规划并监督**修复过程（逐步进行），然后只执行必要的命令。这样可以让改动更小，也更容易审计。

    如果你发现了真实 bug 或修复，请提交 GitHub issue 或 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    从这些命令开始（在寻求帮助时分享输出）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它们的作用：

    - `openclaw status`：Gateway/agent 健康状况和基本配置的快速快照。
    - `openclaw models status`：检查提供商认证和模型可用性。
    - `openclaw doctor`：验证并修复常见配置/状态问题。

    其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速调试循环：[如果出问题，前 60 秒怎么做](#first-60-seconds-if-something-is-broken)。
    安装文档：[安装](/install)、[安装器标志](/install/installer)、[更新](/install/updating)。

  </Accordion>

  <Accordion title="心跳一直跳过。跳过原因是什么意思？">
    常见的心跳跳过原因：

    - `quiet-hours`：不在配置的活动时间窗口内
    - `empty-heartbeat-file`：`HEARTBEAT.md` 存在，但只包含空白/仅标题的脚手架内容
    - `no-tasks-due`：`HEARTBEAT.md` 任务模式已启用，但还没有任何任务间隔到期
    - `alerts-disabled`：所有心跳可见性都被禁用（`showOk`、`showAlerts` 和 `useIndicator` 都关闭）

    在任务模式中，到期时间戳只会在一次真实的心跳运行完成后前进。
    被跳过的运行不会将任务标记为已完成。

    文档：[心跳](/gateway/heartbeat)、[自动化与任务](/automation)。

  </Accordion>

  <Accordion title="推荐如何安装和设置 OpenClaw">
    仓库推荐从源码运行并使用引导：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    向导也可以自动构建 UI 资源。引导完成后，你通常会在 **18789** 端口上运行 Gateway。

    从源码（贡献者/开发者）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build
    openclaw onboard
    ```

    如果你还没有全局安装，可以通过 `pnpm openclaw onboard` 运行它。

  </Accordion>

  <Accordion title="引导完成后，我如何打开仪表板？">
    向导会在引导完成后立即用一个干净的（未 token 化的）仪表板 URL 打开你的浏览器，并在摘要中打印该链接。保持该标签页打开；如果没有启动，就在同一台机器上复制/粘贴打印出来的 URL。
  </Accordion>

  <Accordion title="我如何在 localhost 和远程环境中认证仪表板？">
    **localhost（同一台机器）：**

    - 打开 `http://127.0.0.1:18789/`。
    - 如果它要求共享密钥认证，请把配置好的 token 或密码粘贴到 Control UI 设置中。
    - token 来源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密码来源：`gateway.auth.password`（或 `OPENCLAW_GATEWAY_PASSWORD`）。
    - 如果还没有配置共享密钥，可用 `openclaw doctor --generate-gateway-token` 生成一个 token。

    **不是 localhost：**

    - **Tailscale Serve**（推荐）：保持绑定 loopback，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 为 `true`，身份头即可满足 Control UI/WebSocket 认证（无需粘贴共享密钥，假定网关主机可信）；HTTP API 仍然需要共享密钥认证，除非你明确使用 private-ingress `none` 或 trusted-proxy HTTP 认证。
      同一客户端发出的不良并发 Serve 认证尝试会在失败认证限流器记录之前被串行化，因此第二次错误重试可能已经显示 `retry later`。
    - **Tailnet 绑定**：运行 `openclaw gateway --bind tailnet --token "<token>"`（或者配置密码认证），打开 `http://<tailscale-ip>:18789/`，然后在仪表板设置中粘贴匹配的共享密钥。
    - **具备身份感知的反向代理**：将 Gateway 保持在非 loopback 的受信任代理后面，配置 `gateway.auth.mode: "trusted-proxy"`，然后打开代理 URL。
    - **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`。通过隧道时仍然适用共享密钥认证；如果提示，请粘贴配置的 token 或密码。

    有关绑定模式和认证细节，参见 [仪表板](/web/dashboard) 和 [Web 界面](/web)。

  </Accordion>

  <Accordion title="为什么聊天审批有两个 exec approval 配置？">
    它们控制不同层：

    - `approvals.exec`：将审批提示转发到聊天目的地
    - `channels.<channel>.execApprovals`：让该频道充当 exec 审批的原生审批客户端

    主机上的 exec 策略仍然是真正的审批门。聊天配置只控制审批提示出现的位置，以及人们如何回复它们。

    在大多数设置中，你**不**需要两者都配置：

    - 如果聊天本身已经支持命令和回复，那么同一聊天中的 `/approve` 会通过共享路径工作。
    - 如果受支持的原生频道能安全地推断审批者，OpenClaw 现在会在 `channels.<channel>.execApprovals.enabled` 未设置或为 `"auto"` 时自动启用 DM 优先的原生审批。
    - 当原生审批卡片/按钮可用时，原生 UI 是主要路径；只有当工具结果表明聊天审批不可用，或手动审批是唯一路径时，代理才应包含手动 `/approve` 命令。
    - 只有当你明确希望将提示也转发到其他聊天或显式的 ops 房间时，才使用 `approvals.exec`。
    - 只有当你明确希望审批提示发回到原始房间/主题时，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`。
    - 插件审批是另一层：它们默认使用同一聊天中的 `/approve`，可选地转发 `approvals.plugin`，且只有某些原生频道会在此基础上保留插件审批的原生处理。

    简短版：转发用于路由，原生客户端配置用于更丰富的频道专属 UX。
    参见 [Exec 审批](/tools/exec-approvals)。

  </Accordion>

  <Accordion title="我需要什么运行时？">
    需要 Node **>= 22**。推荐使用 `pnpm`。不推荐在 Gateway 上使用 Bun。
  </Accordion>

  <Accordion title="它能在 Raspberry Pi 上运行吗？">
    可以。Gateway 很轻量 - 文档列出 **512MB-1GB RAM**、**1 核**，以及大约 **500MB**
    磁盘就足以用于个人使用，并指出 **Raspberry Pi 4 可以运行它**。

    如果你想要更多余量（日志、媒体、其他服务），推荐 **2GB**，但这
    不是硬性最低要求。

    提示：小型 Pi/VPS 可以托管 Gateway，而你可以在笔记本/手机上配对 **nodes**，
    以便进行本地屏幕/摄像头/画布或命令执行。参见 [Nodes](/nodes)。

  </Accordion>

  <Accordion title="Raspberry Pi 安装有什么建议吗？">
    简短版：它能工作，但要预期会有一些粗糙边角。

    - 使用 **64 位** 操作系统，并保持 Node >= 22。
    - 优先使用 **可改造的（git）安装**，这样你可以查看日志并快速更新。
    - 先不启用频道/skills，之后逐个添加。
    - 如果遇到奇怪的二进制问题，通常是 **ARM 兼容性** 问题。

    文档：[Linux](/platforms/linux)、[安装](/install)。

  </Accordion>

  <Accordion title="卡在 wake up my friend / 引导无法孵化。现在怎么办？">
    该界面依赖 Gateway 可达且已认证。TUI 在第一次孵化时也会自动发送
    “Wake up, my friend!”。如果你看到这行但**没有回复**，并且 tokens 一直是 0，
    那就说明代理根本没有运行。

    1. 重启 Gateway：

    ```bash
    openclaw gateway restart
    ```

    2. 检查状态 + 认证：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    3. 如果还是卡住，运行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 是远程的，请确保隧道/Tailscale 连接已建立，并且 UI 指向了正确的 Gateway。参见 [远程访问](/gateway/remote)。

  </Accordion>

  <Accordion title="我可以把我的设置迁移到新机器（Mac mini）而无需重新引导吗？">
    可以。复制**状态目录**和**工作区**，然后运行一次 Doctor。这会让你的 bot “完全一样”（内存、会话历史、认证和频道状态），前提是你复制了**两个**位置：

    1. 在新机器上安装 OpenClaw。
    2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
    3. 复制你的工作区（默认：`~/.openclaw/workspace`）。
    4. 运行 `openclaw doctor` 并重启 Gateway 服务。

    这会保留配置、认证配置文件、WhatsApp 凭据、会话和内存。如果你在
    远程模式下，请记住 gateway 主机拥有会话存储和工作区。

    **重要：**如果你只是把工作区提交/推送到 GitHub，你备份的是
    **内存 + 启动文件**，但**不是**会话历史或认证。这些位于
    `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相关：[迁移](/install/migrating)、[磁盘上的内容位置](#where-things-live-on-disk)、
    [Agent 工作区](/concepts/agent-workspace)、[Doctor](/gateway/doctor)、
    [远程模式](/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪里查看最新版本中的新内容？">
    查看 GitHub 更新日志：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新条目在顶部。如果顶部部分标记为 **Unreleased**，那么下一个带日期的
    部分就是最新发布版本。条目按 **Highlights**、**Changes** 和
    **Fixes** 分组（需要时也会有 docs/other 章节）。

  </Accordion>

  <Accordion title="无法访问 docs.openclaw.ai（SSL 错误）">
    某些 Comcast/Xfinity 连接会通过 Xfinity Advanced Security 错误地阻止
    `docs.openclaw.ai`。请禁用它或将 `docs.openclaw.ai` 加入允许列表，然后重试。
    请通过这里报告，以帮助我们解除封锁：
    [https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果你仍然无法访问该站点，文档也镜像在 GitHub 上：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="stable 和 beta 有什么区别">
    **Stable** 和 **beta** 是 **npm dist-tag**，不是不同的代码线：

    - `latest` = stable
    - `beta` = 用于测试的早期构建

    通常，一个稳定版会先进入 **beta**，然后通过一个显式的
    提升步骤把同一版本移到 `latest`。维护者在需要时也可以
    直接发布到 `latest`。这就是为什么 beta 和 stable 在提升后可以
    指向**同一个版本**。

    查看改动：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    关于安装一行命令以及 beta 和 dev 的区别，请参见下面的折叠项。

  </Accordion>

  <Accordion title="我如何安装 beta 版本，以及 beta 和 dev 有什么区别？">
    **Beta** 是 npm dist-tag `beta`（提升后可能与 `latest` 一致）。
    **Dev** 是 `main`（git）的移动头；发布时，它使用 npm dist-tag `dev`。

    一行命令（macOS/Linux）：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安装器（PowerShell）：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多细节：[开发通道](/install/development-channels) 和 [安装器标志](/install/installer)。

  </Accordion>

  <Accordion title="我如何尝试最新的功能？">
    两种方式：

    1. **Dev 通道（git 检出）：**

    ```bash
    openclaw update --channel dev
    ```

    这会切换到 `main` 分支并从源码更新。

    2. **可改造安装（来自安装器站点）：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会给你一个可在本地编辑的仓库，然后通过 git 更新。

    如果你更喜欢手动的干净克隆，可以使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文档：[更新](/cli/update)、[开发通道](/install/development-channels)、
    [安装](/install)。

  </Accordion>

  <Accordion title="安装和引导通常要多久？">
    大致参考：

    - **安装：** 2-5 分钟
    - **引导：** 5-15 分钟，取决于你配置了多少频道/模型

    如果它卡住了，请使用 [安装器卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速调试循环。

  </Accordion>

  <Accordion title="安装器卡住了？我如何获得更多反馈？">
    重新运行安装器并启用**详细输出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    带详细输出的 beta 安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    对于可改造的（git）安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    Windows（PowerShell）等效命令：

    ```powershell
    # install.ps1 目前还没有专门的 -Verbose 标志。
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    更多选项：[安装器标志](/install/installer)。

  </Accordion>

  <Accordion title="Windows 安装提示 git 未找到或 openclaw 未被识别">
    两个常见的 Windows 问题：

    **1) npm error spawn git / git not found**

    - 安装 **Git for Windows** 并确保 `git` 在你的 PATH 中。
    - 关闭并重新打开 PowerShell，然后重新运行安装器。

    **2) 安装后 openclaw not recognized**

    - 你的 npm 全局 bin 文件夹不在 PATH 中。
    - 检查路径：

      ```powershell
      npm config get prefix
      ```

    - 将该目录添加到你的用户 PATH（在 Windows 上不需要 `\bin` 后缀；在大多数系统上它是 `%AppData%\npm`）。
    - 更新 PATH 后关闭并重新打开 PowerShell。

    如果你想要最顺畅的 Windows 设置，请使用 **WSL2** 代替原生 Windows。
    文档：[Windows](/platforms/windows)。

  </Accordion>

  <Accordion title="Windows exec 输出显示乱码中文 - 我该怎么办？">
    这通常是原生 Windows shell 中的控制台代码页不匹配。

    症状：

    - `system.run`/`exec` 输出把中文渲染成乱码
    - 同一命令在另一个终端配置文件中看起来正常

    PowerShell 中的快速解决方法：

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

    如果你在最新的 OpenClaw 上仍然能复现，请在以下位置跟踪/报告：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文档没有回答我的问题 - 我怎样得到更好的答案？">
    使用**可改造的（git）安装**，这样你就能在本地拥有完整源码和文档，然后
    在那个文件夹里向你的 bot（或 Claude/Codex）提问，这样它就可以读取仓库并精确回答。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多细节：[安装](/install) 和 [安装器标志](/install/installer)。

  </Accordion>

  <Accordion title="我如何在 Linux 上安装 OpenClaw？">
    简短回答：按照 Linux 指南，然后运行引导。

    - Linux 快速路径 + 服务安装：[Linux](/platforms/linux)。
    - 完整演练：[Getting Started](/start/getting-started)。
    - 安装器 + 更新：[安装与更新](/install/updating)。

  </Accordion>

  <Accordion title="我如何在 VPS 上安装 OpenClaw？">
    任何 Linux VPS 都可以。先在服务器上安装，然后通过 SSH/Tailscale 访问 Gateway。

    指南：[exe.dev](/install/exe-dev)、[Hetzner](/install/hetzner)、[Fly.io](/install/fly)。
    远程访问：[Gateway 远程](/gateway/remote)。

  </Accordion>

  <Accordion title="云/VPS 安装指南在哪里？">
    我们维护了一个包含常见提供商的**托管中心**。选择一个并按照指南操作：

    - [VPS 托管](/vps)（所有提供商集中在一处）
    - [Fly.io](/install/fly)
    - [Hetzner](/install/hetzner)
    - [exe.dev](/install/exe-dev)

    它在云中的工作方式：**Gateway 运行在服务器上**，你可以
    通过 Control UI（或 Tailscale/SSH）从你的笔记本/手机访问它。你的状态 + 工作区
    也在服务器上，因此应把主机视为事实来源并做好备份。

    你可以将 **nodes**（Mac/iOS/Android/无头）与该云端 Gateway 配对，以便访问
    本地屏幕/摄像头/画布，或在你自己的笔记本上运行命令，同时把
    Gateway 保持在云端。

    入口：[平台](/platforms)。远程访问：[Gateway 远程](/gateway/remote)。
    Nodes：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)。

  </Accordion>

  <Accordion title="我可以让 OpenClaw 自己更新自己吗？">
    简短回答：**可以，但不推荐**。更新流程可能会重启
    Gateway（这会断开活动会话），可能需要一个干净的 git 检出，而且
    还可能提示确认。更安全的做法：作为操作员在 shell 中运行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果你必须通过代理自动化：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文档：[更新](/cli/update)、[更新中](/install/updating)。

  </Accordion>

  <Accordion title="引导实际做了什么？">
    `openclaw onboard` 是推荐的设置路径。在**本地模式**下，它会引导你完成：

    - **模型/认证设置**（提供商 OAuth、API keys、Anthropic setup-token，以及本地模型选项如 LM Studio）
    - **工作区**位置 + 启动文件
    - **Gateway 设置**（绑定/端口/认证/tailscale）
    - **频道**（WhatsApp、Telegram、Discord、Mattermost、Signal、iMessage，以及捆绑的频道插件如 QQ Bot）
    - **守护进程安装**（macOS 上为 LaunchAgent；Linux/WSL2 上为 systemd 用户单元）
    - **健康检查**和**skills**选择

    如果你配置的模型未知或缺少认证，它也会发出警告。

  </Accordion>

  <Accordion title="我需要 Claude 或 OpenAI 订阅才能运行这个吗？">
    不需要。你可以使用 **API keys**（Anthropic/OpenAI/其他）运行 OpenClaw，或者使用
    **仅本地模型**，这样你的数据就保留在设备上。订阅（Claude
    Pro/Max 或 OpenAI Codex）只是用于认证这些提供商的可选方式。

    对于 OpenClaw 中的 Anthropic，实际区分是：

    - **Anthropic API key**：正常的 Anthropic API 计费
    - **OpenClaw 中的 Claude CLI / Claude 订阅认证**：Anthropic 员工
      告诉我们这种用法现在再次被允许，OpenClaw 会把 `claude -p`
      的使用视为此集成已获授权，除非 Anthropic 发布新政策

    对于长期运行的 gateway 主机，Anthropic API key 仍然是更
    可预测的设置。OpenAI Codex OAuth 对 OpenClaw 这类外部
    工具明确支持。

    OpenClaw 还支持其他托管的订阅式选项，包括
    **Qwen Cloud Coding Plan**、**MiniMax Coding Plan** 和
    **Z.AI / GLM Coding Plan**。

    文档：[Anthropic](/providers/anthropic)、[OpenAI](/providers/openai)、
    [Qwen Cloud](/providers/qwen)、
    [MiniMax](/providers/minimax)、[GLM Models](/providers/glm)、
    [本地模型](/gateway/local-models)、[模型](/concepts/models)。

  </Accordion>

  <Accordion title="我可以不使用 API key 而用 Claude Max 订阅吗？">
    可以。

    Anthropic 员工告诉我们，OpenClaw 风格的 Claude CLI 用法现在再次被允许，因此
    除非 Anthropic 发布新政策，OpenClaw 会将 Claude 订阅认证和 `claude -p`
    的使用视为此集成已获授权。如果你想要
    最可预测的服务器端设置，请改用 Anthropic API key。

  </Accordion>

  <Accordion title="你们支持 Claude 订阅认证（Claude Pro 或 Max）吗？">
    支持。

    Anthropic 员工告诉我们这种用法现在再次被允许，因此除非 Anthropic
    发布新政策，OpenClaw 会将 Claude CLI 复用和 `claude -p` 的使用
    视为此集成已获授权。

    Anthropic setup-token 仍然是 OpenClaw 支持的 token 路径之一，但如果可用，OpenClaw 现在更倾向于 Claude CLI 复用和 `claude -p`。
    对于生产环境或多用户工作负载，Anthropic API key 认证仍然是
    更安全、更可预测的选择。如果你想在 OpenClaw 中使用其他订阅式托管
    选项，请参见 [OpenAI](/providers/openai)、[Qwen / Model
    Cloud](/providers/qwen)、[MiniMax](/providers/minimax) 和 [GLM
    Models](/providers/glm)。

  </Accordion>

</AccordionGroup>

<a id="why-am-i-seeing-http-429-ratelimiterror-from-anthropic"></a>

<AccordionGroup>
  <Accordion title="为什么我会看到来自 Anthropic 的 HTTP 429 rate_limit_error？">
    这意味着你当前窗口的 **Anthropic 配额/速率限制** 已经耗尽。如果你
    使用 **Claude CLI**，请等待窗口重置或升级你的方案。如果你
    使用 **Anthropic API key**，请在 Anthropic Console 中
    检查用量/计费，并根据需要提高限制。

    如果消息具体是：
    `Extra usage is required for long context requests`，则请求正在尝试使用
    Anthropic 的 1M 上下文 beta（`context1m: true`）。只有当你的
    凭据有资格进行长上下文计费时它才会生效（API key 计费或
    启用 Extra Usage 的 OpenClaw Claude 登录路径）。

    提示：设置一个**回退模型**，这样当某个提供商被限速时，OpenClaw 仍然可以继续回复。
    参见 [模型](/cli/models)、[OAuth](/concepts/oauth)，以及
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

  <Accordion title="支持 AWS Bedrock 吗？">
    支持。OpenClaw 内置了 **Amazon Bedrock（Converse）** 提供商。在存在 AWS 环境标记时，OpenClaw 可以自动发现流式/文本 Bedrock 目录，并将其合并为一个隐式的 `amazon-bedrock` 提供商；否则你可以显式启用 `plugins.entries.amazon-bedrock.config.discovery.enabled`，或者添加一个手动提供商条目。参见 [Amazon Bedrock](/providers/bedrock) 和 [模型提供商](/providers/models)。如果你更喜欢托管密钥流程，在 Bedrock 前面放一个 OpenAI 兼容代理仍然是一个有效选项。
  </Accordion>

  <Accordion title="Codex 认证是如何工作的？">
    OpenClaw 通过 OAuth（ChatGPT 登录）支持 **OpenAI Code（Codex）**。通过默认 PI 运行器的 Codex OAuth，请使用
    `openai-codex/gpt-5.5`。对于当前直接的 OpenAI API key 访问，请使用
    `openai/gpt-5.4`。一旦 OpenAI 在公共 API 上启用它，GPT-5.5 的直接
    API key 访问也会得到支持；当前
    GPT-5.5 使用订阅/OAuth，通过 `openai-codex/gpt-5.5` 或原生 Codex
    app-server 运行并配合 `openai/gpt-5.5` 和 `embeddedHarness.runtime: "codex"`。
    参见 [模型提供商](/concepts/model-providers) 和 [引导（CLI）](/start/wizard)。
  </Accordion>

  <Accordion title="为什么 OpenClaw 仍然提到 openai-codex？">
    `openai-codex` 是 ChatGPT/Codex OAuth 的提供商和 auth-profile id。
    它也是 Codex OAuth 的显式 PI 模型前缀：

    - `openai/gpt-5.4` = PI 中当前直接的 OpenAI API key 路径
    - `openai/gpt-5.5` = 一旦 OpenAI 在 API 上启用 GPT-5.5 后的未来直接 API key 路径
    - `openai-codex/gpt-5.5` = PI 中的 Codex OAuth 路径
    - `openai/gpt-5.5` + `embeddedHarness.runtime: "codex"` = 原生 Codex app-server 路径
    - `openai-codex:...` = auth profile id，不是模型引用

    如果你想要直接的 OpenAI Platform 计费/限额路径，请设置
    `OPENAI_API_KEY`。如果你想要 ChatGPT/Codex 订阅认证，请使用
    `openclaw models auth login --provider openai-codex` 登录，并为 PI 运行使用
    `openai-codex/*` 模型引用。

  </Accordion>

  <Accordion title="为什么 Codex OAuth 的限制可能与 ChatGPT 网页端不同？">
    Codex OAuth 使用的是 OpenAI 管理的、与方案相关的配额窗口。实际上，
    即使两者都关联到同一个账号，这些限制也可能与 ChatGPT 网站/应用体验不同。

    OpenClaw 可以在 `openclaw models status` 中显示当前可见的提供商用量/配额窗口，
    但它不会把 ChatGPT 网页端的资格凭证虚构或标准化成直接 API 访问。如果你想要
    直接的 OpenAI Platform 计费/限额路径，请使用带 API key 的 `openai/*`。

  </Accordion>

  <Accordion title="你们支持 OpenAI 订阅认证（Codex OAuth）吗？">
    支持。OpenClaw 完全支持 **OpenAI Code（Codex）订阅 OAuth**。
    OpenAI 明确允许在像 OpenClaw 这样的外部工具/工作流中使用订阅 OAuth。
    引导可以为你运行 OAuth 流程。

    参见 [OAuth](/concepts/oauth)、[模型提供商](/concepts/model-providers) 和 [引导（CLI）](/start/wizard)。

  </Accordion>

  <Accordion title="我该如何设置 Gemini CLI OAuth？">
    Gemini CLI 使用的是 **插件认证流程**，而不是 `openclaw.json` 中的客户端 id 或 secret。

    步骤：

    1. 在本地安装 Gemini CLI，使 `gemini` 位于 `PATH` 中
       - Homebrew: `brew install gemini-cli`
       - npm: `npm install -g @google/gemini-cli`
    2. 启用插件：`openclaw plugins enable google`
    3. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`
    4. 登录后的默认模型：`google-gemini-cli/gemini-3-flash-preview`
    5. 如果请求失败，在 gateway 主机上设置 `GOOGLE_CLOUD_PROJECT` 或 `GOOGLE_CLOUD_PROJECT_ID`

    这会把 OAuth token 存储在 gateway 主机上的认证配置文件中。详情：[模型提供商](/concepts/model-providers)。

  </Accordion>

  <Accordion title="本地模型适合日常聊天吗？">
    通常不适合。OpenClaw 需要大上下文 + 强安全性；小卡片会截断并泄漏。如果你必须这样做，请运行你本地能跑的**最大**模型构建（LM Studio），并参见 [/gateway/local-models](/gateway/local-models)。更小/量化的模型会增加提示注入风险 - 参见 [安全](/gateway/security)。
  </Accordion>

  <Accordion title="我如何将托管模型流量限制在特定区域？">
    选择区域固定的端点。OpenRouter 为 MiniMax、Kimi 和 GLM 提供美国托管选项；选择美国托管变体可以让数据留在区域内。你仍然可以通过使用 `models.mode: "merge"` 将 Anthropic/OpenAI 与这些一起列出，这样在尊重你所选区域化提供商的同时，回退仍然可用。
  </Accordion>

  <Accordion title="我必须买一台 Mac Mini 才能安装这个吗？">
    不需要。OpenClaw 可在 macOS 或 Linux 上运行（Windows 通过 WSL2）。Mac mini 只是可选项——有些人把它买来作为常开主机，但小型 VPS、家用服务器或 Raspberry Pi 级别的机器也可以。

    你只在需要**仅限 macOS 的工具**时才需要 Mac。对于 iMessage，请使用 [BlueBubbles](/channels/bluebubbles)（推荐）——BlueBubbles server 可以运行在任何 Mac 上，而 Gateway 可以运行在 Linux 或其他地方。如果你想使用其他仅限 macOS 的工具，请把 Gateway 运行在 Mac 上或配对一个 macOS node。

    文档：[BlueBubbles](/channels/bluebubbles)、[Nodes](/nodes)、[Mac 远程模式](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我需要 Mac mini 才能支持 iMessage 吗？">
    你需要**某个 macOS 设备**登录了 Messages。它**不必**是 Mac mini——
    任何 Mac 都可以。对于 iMessage，**使用 [BlueBubbles](/channels/bluebubbles)**（推荐）——BlueBubbles server 运行在 macOS 上，而 Gateway 可以运行在 Linux 或其他地方。

    常见设置：

    - 将 Gateway 运行在 Linux/VPS 上，并在任何登录了 Messages 的 Mac 上运行 BlueBubbles server。
    - 如果你想要最简单的单机设置，就把所有东西都运行在 Mac 上。

    文档：[BlueBubbles](/channels/bluebubbles)、[Nodes](/nodes)、
    [Mac 远程模式](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我买一台 Mac mini 来运行 OpenClaw，我能把它连接到我的 MacBook Pro 吗？">
    可以。**Mac mini 可以运行 Gateway**，而你的 MacBook Pro 可以作为
    **node**（伴随设备）连接。nodes 不运行 Gateway——它们提供额外
    功能，比如该设备上的屏幕/摄像头/画布和 `system.run`。

    常见模式：

    - Gateway 运行在 Mac mini 上（常开）。
    - MacBook Pro 运行 macOS 应用或 node 主机，并与 Gateway 配对。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 查看它。

    文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)。

  </Accordion>

  <Accordion title="我可以使用 Bun 吗？">
    不推荐 Bun。我们发现运行时有 bug，尤其是在 WhatsApp 和 Telegram 上。
    稳定的 gateway 请使用 **Node**。

    如果你仍然想尝试 Bun，请在一个不用于生产的 gateway 上进行，
    且不要启用 WhatsApp/Telegram。

  </Accordion>

  <Accordion title="Telegram：allowFrom 里应该填什么？">
    `channels.telegram.allowFrom` 是**人类发送者的 Telegram 用户 ID**（数字）。它不是机器人用户名。

    设置时只询问数字用户 ID。如果你已经在配置中有旧的 `@username` 条目，`openclaw doctor --fix` 可以尝试解析它们。

    更安全的方式（不使用第三方 bot）：

    - 给你的 bot 发私信，然后运行 `openclaw logs --follow` 并读取 `from.id`。

    官方 Bot API：

    - 给你的 bot 发私信，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并读取 `message.from.id`。

    第三方（隐私性较差）：

    - 给 `@userinfobot` 或 `@getidsbot` 发私信。

    参见 [/channels/telegram](/channels/telegram#access-control-and-activation)。

  </Accordion>

  <Accordion title="多个用户能否用同一个 WhatsApp 号码，但对应不同的 OpenClaw 实例？">
    可以，通过**多代理路由**实现。把每个发送者的 WhatsApp **DM**（peer `kind: "direct"`，发送者 E.164 格式如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都有自己的工作区和会话存储。回复仍然来自**同一个 WhatsApp 账号**，并且 DM 访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）对每个 WhatsApp 账号是全局的。参见 [多代理路由](/concepts/multi-agent) 和 [WhatsApp](/channels/whatsapp)。
  </Accordion>

  <Accordion title='我可以运行一个“快速聊天”代理和一个“用于编码的 Opus”代理吗？'>
    可以。使用多代理路由：给每个代理分配各自的默认模型，然后将入站路由（提供商账号或特定 peer）绑定到每个代理。示例配置见 [多代理路由](/concepts/multi-agent)。另见 [模型](/concepts/models) 和 [配置](/gateway/configuration)。
  </Accordion>

  <Accordion title="Homebrew 在 Linux 上可用吗？">
    可以。Homebrew 支持 Linux（Linuxbrew）。快速设置：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果你通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或你的 brew 前缀），这样 `brew` 安装的工具就能在非登录 shell 中解析。
    最近的构建在 Linux systemd 服务上也会预置常见的用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置时尊重 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可改造的 git 安装和 npm 安装有什么区别">
    - **可改造（git）安装：** 完整源码检出，可编辑，最适合贡献者。
      你在本地运行构建，并且可以修补代码/文档。
    - **npm 安装：** 全局 CLI 安装，没有仓库，最适合“只想运行它的人”。
      更新来自 npm dist-tag。

    文档：[开始使用](/start/getting-started)、[更新](/install/updating)。

  </Accordion>

  <Accordion title="以后我可以在 npm 和 git 安装之间切换吗？">
    可以。安装另一种版本，然后运行 Doctor，这样 gateway 服务就会指向新的入口点。
    这**不会删除你的数据**——它只会改变 OpenClaw 代码安装。你的状态
    (`~/.openclaw`) 和工作区 (`~/.openclaw/workspace`) 会保持不变。

    从 npm 切到 git：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    openclaw doctor
    openclaw gateway restart
    ```

    从 git 切到 npm：

    ```bash
    npm install -g openclaw@latest
    openclaw doctor
    openclaw gateway restart
    ```

    Doctor 会检测 gateway 服务入口点不匹配，并提供重写服务配置以匹配当前安装（自动化中使用 `--repair`）。

    备份提示：参见 [备份策略](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="我应该在笔记本还是 VPS 上运行 Gateway？">
    简短回答：**如果你想要 24/7 的可靠性，请使用 VPS**。如果你想要
    最低的使用门槛，并且能接受睡眠/重启，那就本地运行。

    **笔记本（本地 Gateway）**

    - **优点：** 没有服务器成本，可以直接访问本地文件，有可见的浏览器窗口。
    - **缺点：** 睡眠/网络中断 = 断开连接，OS 更新/重启会打断，需要保持唤醒。

    **VPS / 云端**

    - **优点：** 常开、网络稳定、没有笔记本睡眠问题、更容易保持运行。
    - **缺点：** 通常以无头方式运行（使用截图），只能远程文件访问，更新时必须通过 SSH。

    **OpenClaw 特别说明：** WhatsApp/Telegram/Slack/Mattermost/Discord 都可以很好地从 VPS 上运行。唯一真正的取舍是**无头浏览器**与可见窗口之间的差别。参见 [浏览器](/tools/browser)。

    **推荐默认：** 如果你之前有 gateway 断连，优先 VPS。当地使用 Mac、需要本地文件访问或带可见浏览器的 UI 自动化时，本地很棒。

  </Accordion>

  <Accordion title="在专用机器上运行 OpenClaw 有多重要？">
    不是强制，但**推荐用于可靠性和隔离**。

    - **专用主机（VPS/Mac mini/Pi）：** 常开，更少睡眠/重启中断，更干净的权限，更容易保持运行。
    - **共享笔记本/桌面：** 进行测试和主动使用完全没问题，但当机器睡眠或更新时要预期暂停。

    如果你想兼得两者，把 Gateway 放在专用主机上，并将你的笔记本配对为 **node**，用于本地屏幕/摄像头/执行工具。参见 [Nodes](/nodes)。
    有关安全指导，请阅读 [安全](/gateway/security)。

  </Accordion>

  <Accordion title="VPS 的最低要求和推荐操作系统是什么？">
    OpenClaw 很轻量。对于一个基础 Gateway + 一个聊天频道：

    - **绝对最低：** 1 vCPU、1GB RAM、约 500MB 磁盘。
    - **推荐：** 1-2 vCPU、2GB RAM 或更多，以获得余量（日志、媒体、多频道）。node 工具和浏览器自动化可能很吃资源。

    操作系统：使用 **Ubuntu LTS**（或任何现代 Debian/Ubuntu）。Linux 安装路径在这里测试得最好。

    文档：[Linux](/platforms/linux)、[VPS 托管](/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中运行 OpenClaw 吗，要求是什么？">
    可以。把 VM 当作 VPS 来对待：它需要持续运行、可访问，并且有足够的
    RAM 来运行 Gateway 和你启用的任何频道。

    基线指导：

    - **绝对最低：** 1 vCPU、1GB RAM。
    - **推荐：** 如果你运行多个频道、浏览器自动化或媒体工具，则 2GB RAM 或更多。
    - **操作系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu。

    如果你在 Windows 上，**WSL2 是最容易的 VM 式设置**，并且具有最好的工具兼容性。参见 [Windows](/platforms/windows)、[VPS 托管](/vps)。
    如果你是在 macOS 的 VM 中运行，请参见 [macOS VM](/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 相关内容

- [FAQ](/help/faq) — 主 FAQ（模型、会话、Gateway、安全等）
- [安装概览](/install)
- [开始使用](/start/getting-started)
- [故障排除](/help/troubleshooting)
