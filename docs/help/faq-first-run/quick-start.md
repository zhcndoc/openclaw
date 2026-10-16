---
summary: "FAQ：安装、入门、首次运行失败、构建和订阅基础知识"
read_when:
  - "新安装、上手卡住，或首次运行错误"
  - "在稳定版、测试版和开发版之间进行选择"
  - "在 macOS、Linux、Windows 或 Pi 上安装或载入失败"
title: "FAQ：快速启动和首次运行设置"
sidebarTitle: "Quick start 和设置"
---

安装、入门和早期故障问答。有关提供商身份验证、硬件以及运行网关的位置，请参阅 [FAQ：提供商、硬件和托管](/help/faq-first-run/providers-and-hosting)。

## <a id="quick-start-and-first-run-setup"></a> Quick start 和首次运行设置

<AccordionGroup>
  <Accordion id="recommended-way-to-install-and-set-up-openclaw" title="推荐的安装和设置 OpenClaw 的方法">
    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash
    ```

    安装程序会为您启动引导引导，因此无需运行单独的引导命令。登录完成后，按 **Ctrl+C** 停止前台网关并安装后台服务：

    ```bash
    openclaw gateway install
    ```

    更喜欢经典的分步向导和一个命令中的服务安装？运行 `openclaw onboard --install-daemon` 而不是上面的两个命令。该标志选择经典流程，因此您看不到引导的 **Quick start** 和 **Custom setup** 选择。

    来自来源（contributors/dev）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build
    openclaw onboard
    ```

    还没有全局安装吗？改为运行 `pnpm openclaw onboard`。如果 Control UI 资产丢失，入门引导会尝试自行构建它们，回退到 `pnpm ui:build`。

  </Accordion>

<a id="i-am-stuck" />

  <Accordion id="i-am-stuck-fastest-way-to-get-unstuck" title="我陷入困境，摆脱困境的最快方法">
    使用可以 **查看您的计算机** 的本地 AI 代理。大多数“我陷入困境”的情况是 **本地配置或环境问题** 远程助手无法检查，因此这比在 Discord 中询问要好。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    通过可破解（git）安装为代理提供完整的源代码检查，以便它可以读取代码+文档并推断您运行的确切版本：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    要求代理逐步计划和监督修复，然后仅执行必要的命令 - 较小的差异更容易审核。

    在寻求帮助时分享这些输出（在 Discord 或 GitHub 问题中）：

    | 命令 | 显示内容 |
    | --- | --- |
    | `openclaw status` | Gateway/agent 健康+基本配置快照 |
    | `openclaw status --all` | 完整只读诊断，可粘贴 |
    | `openclaw models status` | 提供商授权 + 模型可用性 |
    | `openclaw doctor` | 验证并修复常见的 config/state 问题 |
    | `openclaw logs --follow` | 实时日志尾部 |
    | `openclaw gateway status --deep` | 深度gateway/config/plugin健康检查 |
    | `openclaw health --verbose` | 详细的健康报告 |

    发现真正的错误或修复？提出问题或发送 PR：[Issues](https://github.com/openclaw/openclaw/issues) / [Pull 请求](https://github.com/openclaw/openclaw/pulls)。

    快速调试循环：[如果有问题，前 60 秒该做什么](/help/faq#first-60-seconds-if-something-is-broken)。 安装文档：[安装](/install)、[安装器参数](/install/installer)、[更新](/install/updating)。

  </Accordion>

  <Accordion id="how-do-i-open-the-dashboard-after-onboarding" title="入门引导后如何打开仪表板？">
    安装完成后，登录会立即将浏览器打开到一个干净的（非标记化）仪表板 URL，并在摘要中打印链接。保持该选项卡打开；如果它没有启动，则 copy/paste 会在同一台机器上打印 URL。
  </Accordion>

  <Accordion id="how-do-i-authenticate-the-dashboard-on-localhost-vs-remote" title="如何在本地主机和远程上验证仪表板？">
    **Localhost（同一台机器）：**

    - 打开`http://127.0.0.1:18789/`。
    - 如果要求共享秘密身份验证，请将配置的令牌或密码粘贴到 Control UI 设置中。
    - 代币来源：`gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 密码来源：`gateway.auth.password`（或`OPENCLAW_GATEWAY_PASSWORD`）。
    - 尚未配置共享密钥？运行 `openclaw doctor --generate-gateway-token`（或 `openclaw doctor --fix --generate-gateway-token`）。

    **不是 localhost：**

    - **Tailscale Serve**（推荐）：保持绑定环回，运行`openclaw gateway --tailscale serve`，打开`https://<magicdns>/`。使用 `gateway.auth.allowTailscale: true`，身份标头满足 Control UI/WebSocket 身份验证（无粘贴共享密钥，假设可信网关主机）； HTTP API 仍然需要共享秘密身份验证，除非您故意使用私有入口 `none` 或可信代理 HTTP 身份验证。来自同一客户端的并发错误身份验证服务尝试在失败身份验证限制器记录它们之前被序列化，因此第二次错误重试可能已经显示 `retry later`。
    - **身份感知反向代理**：将网关保留在可信代理后面，设置`gateway.auth.mode: "trusted-proxy"`，打开代理URL。同主机环回代理需要显式 `gateway.auth.trustedProxy.allowLoopback: true`。
    - **SSH隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@gateway-host`，然后打开`http://127.0.0.1:18789/`。共享秘密身份验证仍然适用于隧道；如果出现提示，请粘贴配置的令牌或密码。

    有关绑定模式和认证细节，请参阅 [仪表盘](/web/dashboard) 和 [Web 表面](/web)。

  </Accordion>

  <Accordion id="heartbeat-keeps-skipping-what-do-the-skip-reasons-mean" title="心跳不断跳动。跳过原因是什么意思？">
    | 跳过原因 | 含义 |
    | --- | --- |
    | `quiet-hours` | 在配置的活动时间窗口之外 |
    | `empty-heartbeat-file` | 心跳监视器划痕存在，但只有空白、注释、标题、栅栏或空检查表标记 |
    | `alerts-disabled` | 所有心跳可见性均已关闭（`showOk`、`showAlerts` 和 `useIndicator` 均已禁用） |

    旧的心跳 `tasks:` 块迁移到使用 `openclaw doctor --fix` 独立调度的 cron 作业。

    文档：[HHeartbeat](/gateway/heartbeat)、[自动化](/automation)。

  </Accordion>

  <Accordion id="why-are-there-two-exec-approval-configs-for-chat-approvals" title="为什么聊天批准有两个执行批准配置？">
    它们控制的是不同层：

    - `approvals.exec` - 将批准提示转发到聊天目标。
    - `channels.<channel>.execApprovals` - 使该通道成为执行批准的本机批准客户端。

    主机执行策略仍然是真正的批准门；聊天配置仅控制提示出现的位置以及人们如何回答它们。

    你很少需要两者：

    - 如果聊天已支持命令和回复，则相同聊天 `/approve` 通过共享路径工作。
    - 对于支持的本机客户端，设置 `channels.<channel>.execApprovals.enabled: "auto"` 或 `true` 并配置批准者或通道支持的所有者身份。 Discord 和 Slack 需要显式启用； Telegram 将未设置视为 `"auto"`。
    - 当本机批准cards/buttons可用时，UI是主要的；如果工具结果表明聊天批准不可用，则仅提及手动 `/approve` 命令。
    - 仅当提示必须到达其他聊天室或显式操作室时才使用 `approvals.exec`。
    - 仅当您希望将批准提示发布回原始 room/topic. 时，才使用 `channels.<channel>.execApprovals.target: "channel"` 或 `"both"`
    - 插件批准是单独的：默认情况下相同聊天`/approve`，可选的`approvals.plugin`转发，并且只有一些本机频道也保留对这些内容的本机处理。

    简短版本：转发用于路由，本机客户端配置用于更丰富的特定通道 UX。请参见 [Exec Approvals](/tools/exec-approvals)。

  </Accordion>

  <Accordion id="what-runtime-do-i-need" title="我需要什么运行时间？">
    Node **24.16+** 或 **26.1+** 是主要和默认运行时（推荐 Node 26）；有关维护的要求，请参阅 [Node.js](/install/node)。 `pnpm` 是存储库包管理器。 Bun 1.4.3+ 使用 WAL- 重置安全 `node:sqlite` 构建，可以作为显式选择运行 CLI、网关和受管节点主机。
  </Accordion>

  <Accordion id="does-it-run-on-raspberry-pi" title="它可以在 Raspberry Pi 上运行吗？">
    是的，但首先检查 RAM：Pi 5 和 Pi 4 （2 GB+） 是最佳位置； Pi 3B+ （1 GB） 可以工作，但速度很慢；不建议使用 Pi 零 2 W （512 MB）。

    | 模型 | RAM | 合身 |
    | --- | --- | --- |
    | Pi 5 | 4/8 GB | 最佳 |
    | Pi 4 | 4 GB | 良好 |
    | Pi 4 | 2 GB | OK，添加交换 |
    | Pi 4 | 1 GB | 紧张 |
    | Pi 3B+ | 1 GB | 慢 |
    | Pi零2 W | 512 MB | 不推荐 |

    绝对最小值：1 GB RAM，1 核，500 MB 可用磁盘，64 位 OS。由于 Pi 仅运行网关（模型调用云 API），因此即使是中等的 Pi 也能处理负载。

    当您在 laptop/phone 上配对 **nodes** 以进行本地 screen/camera 或命令执行时，小型 Pi/VPS 也可以仅托管网关。配对的 Mac 还可以在其本机面板中显示托管小部件。请参阅 [Nodes](/nodes)。

    完整设置演练：[Raspberry Pi](/install/raspberry-pi)。

  </Accordion>

  <Accordion id="any-tips-for-raspberry-pi-installs" title="Raspberry Pi 安装有什么提示吗？">
    - 使用**64位** OS；不要使用 32 位 Raspberry Pi OS。
    - 在 2 个 GB 或更小的板上添加交换。
    - 就性能和使用寿命而言，优先选择 **USB SSD** 卡，而不是 SD 卡。
    - 更喜欢可破解（git）安装，这样您就可以查看日志并快速更新。
    - 开始没有channels/skills，一一添加。
    - 奇怪的二进制故障（“执行格式错误”）通常是可选技能工具缺少 ARM64 构建。

    完整指南：[Raspberry Pi](/install/raspberry-pi)。另请参见 [Linux](/platforms/linux)。

  </Accordion>

  <Accordion id="it-is-stuck-on-wake-up-my-friend-onboarding-will-not-hatch-what-now" title="它卡在唤醒我的朋友/入门引导不会孵化。现在怎么办？">
    该屏幕取决于网关是否可访问并经过身份验证。 TUI 还发送“醒来，我的朋友！”配置模型提供程序后，会在第一次孵化时自动进行。如果您跳过了 model/auth 设置，则载入会显示“模型身份验证缺失”注释，并打开 TUI 而不发送任何内容 - 通过再次运行 `openclaw onboard` 来添加提供程序。这是用于更改模型提供者或其身份验证的一个命令。如果您看到带有 **no回复** 的唤醒线并且令牌保持为 0，则代理从未运行。

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

    3. 还挂着吗？跑步：

    ```bash
    openclaw doctor
    ```

    如果网关是远程的，请确认 tunnel/Tailscale 连接已启动并且 UI 指向正确的网关。请参阅 [ 远程访问 ](/gateway/remote)。

  </Accordion>

  <Accordion id="can-i-migrate-my-setup-to-a-new-machine-without-redoing-onboarding" title="我可以将我的设置迁移到新机器而不需要重新登录吗？">
    是的。复制**state目录**和**workspace**，然后运行Doctor一次：

    1. 在新机器上安装 OpenClaw。
    2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
    3. 复制你的工作区（默认：`~/.openclaw/workspace`）。
    4. 运行 `openclaw doctor` 并重启 Gateway 服务。

    这会保留配置、身份验证配置文件、WhatsApp 信用、会话和内存 - 只要您复制 **both** 位置，它就会使您的机器人保持完全相同。在远程模式下，网关主机拥有会话存储和工作区。

    **重要提示：** 如果您仅将工作区 commit/push 到 GitHub，则备份 **内存 + 引导文件**，但不备份会话历史记录或身份验证。它们位于 `~/.openclaw/` 下（例如 `~/.openclaw/agents/<agentId>/agent/openclaw-agent.sqlite`）。

    相关： [迁移](/install/migrating)、[磁盘上的文件存放位置](/help/faq#where-things-live-on-disk)、 [代理工作区](/concepts/agent-workspace)、[Doctor](/gateway/doctor)、 [远程模式](/gateway/remote)。

  </Accordion>

  <Accordion id="where-do-i-see-what-is-new-in-the-latest-version" title="在哪里可以看到最新版本的新增内容？">
    查看 GitHub 更新日志： [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新条目位于顶部。如果顶部部分是 **Unreleased**，则下一个注明日期的部分是最新发布的版本。 **Highlights**、**Changes** 和 **Fixes** 下的条目组（需要时加上 docs/other 部分）。

  </Accordion>

  <Accordion id="cannot-access-docs-openclaw-ai-ssl-error" title="无法访问 docs.openclaw.ai（SSL 错误）">
    某些 Comcast/Xfinity 连接通过 Xfinity Advanced Security 错误地阻止 `docs.openclaw.ai`。禁用它或将其列入白名单 `docs.openclaw.ai`，然后重试。帮助我们解锁：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status).

    还被封锁？文档镜像在 GitHub 上：[https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion id="difference-between-stable-and-beta" title="稳定版和测试版之间的区别">
    **Stable** 和 **beta** 是 **npm dist-tag**，不是两条不同的代码线：

    - `latest` = 稳定
    - `beta` = 用于测试的早期版本（当 beta 缺失或早于当前稳定版本时，回退到 `latest`）

    稳定版本通常首先登陆 **beta**，然后显式升级步骤将同一版本移动到 `latest`，而不更改版本号。维护者还可以直接发布到 `latest`。这就是为什么升级后测试版和稳定版可以指向**相同版本**。

    查看发生了什么变化：[CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md).

    对于安装单行以及 beta 和 dev 之间的区别，请参阅下一个手风琴。

  </Accordion>

  <Accordion id="how-do-i-install-the-beta-version-and-what-is-the-difference-between-beta-and-dev" title="如何安装测试版以及测试版和开发版有什么区别？">
    **Beta** 是 npm 远程标签 `beta`（升级后可能与 `latest` 匹配）。 **Dev**是`main`（git）的摇头灯；当发布到 npm 时，它使用 dist-tag `dev`。

    一键命令（macOS/Linux）：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安装程序 （PowerShell）：`iwr -useb https://openclaw.ai/install.ps1 | iex`

    更多细节：[开发渠道](/install/development-channels) 和 [安装器参数](/install/installer)。

  </Accordion>

  <Accordion id="how-do-i-try-the-latest-bits" title="我如何尝试最新的部分？">
    两种方式：

    1. **Dev 通道（现有安装）：**

    ```bash
    openclaw update --channel dev
    ```

    这将切换到 `main` 的 git checkout，在上游重新建立基础，从该签出构建并安装 CLI。

    2. **Hackable （git） 安装（新机）：**

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更喜欢手动克隆：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文档：[更新](/cli/update)、[开发通道](/install/development-channels)、[安装](/install)。

  </Accordion>

  <Accordion id="how-long-does-install-and-onboarding-usually-take" title="安装和入门通常需要多长时间？">
    大致参考：

    - **安装：** 2-5 分钟。
    - **QuickStart 入门：** 几分钟（环回网关、自动令牌、默认工作区）。
    - **Advanced/full 加入：** 当提供商登录、通道配对、守护程序安装、网络下载或技能需要额外设置时，时间会更长。

    向导会预先显示此时间线。跳过可选步骤并稍后使用 `openclaw configure` 返回。

    绞刑？请参阅上面的 [I 卡住了 ](#i-am-stuck)。

  </Accordion>

  <Accordion id="installer-stuck-how-do-i-get-more-feedback" title="安装程序卡住了？我如何获得更多反馈？">
    使用 `--verbose` 重新运行：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --verbose
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    `install.ps1`没有专用的详细开关；将其包裹在 `Set-PSDebug -Trace 1` / `-Trace 0` 中。完整标志参考：[安装程序标志](/install/installer)。

  </Accordion>

  <Accordion id="windows-install-says-git-not-found-or-openclaw-not-recognized" title="Windows 安装说找不到 git 或无法识别 openclaw">
    两个常见的 Windows 问题：

    **1）npm 错误 spawn git / git not found**

    - 为Windows**安装**Git，确保`git`位于PATH上。
    - 关闭并重新打开PowerShell，然后重新运行安装程序。

    **2）安装后 openclaw 未被识别**

    - 您的 npm 全局 bin 文件夹不在 PATH 上。
    - 查看：`npm config get prefix`。
    - 将该目录添加到您的用户 PATH（不需要 `\bin` 后缀；在大多数系统上它是 `%AppData%\npm`）。
    - 关闭并重新打开PowerShell。

    更喜欢桌面应用程序？使用**Windows集线器**。仅终端设置：PowerShell 安装程序和 WSL2 网关路径均受支持。文档：[Windows](/platforms/windows)。

  </Accordion>

  <Accordion id="windows-exec-output-shows-garbled-chinese-text-what-should-i-do" title="Windows exec 输出显示中文乱码 - 我该怎么办？">
    通常，本机 Windows shell 上的控制台代码页不匹配。

    症状：`system.run`/`exec` 输出将中文呈现为 mojibake；相同的命令在另一个终端配置文件中看起来很好。

    PowerShell 中的解决方法：

    ```powershell
    chcp 65001
    [Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
    ```

    然后重新启动网关并重试：

    ```powershell
    openclaw gateway restart
    ```

    还在最新的 OpenClaw 上重现这个吗？ Track/report 它：[问题#30640](https://github.com/openclaw/openclaw/issues/30640)。

  </Accordion>

  <Accordion id="the-docs-did-not-answer-my-question-how-do-i-get-a-better-answer" title="文档没有回答我的问题 - 我如何获得更好的答案？">
    使用可破解（git）安装，以便您在本地拥有完整的源代码和文档，然后从该文件夹中询问您的机器人（或 Claude/Codex）****，以便它可以读取存储库并准确回答。

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多细节：[安装](/install) 和 [安装器参数](/install/installer)。

  </Accordion>

  <Accordion id="how-do-i-install-openclaw-on-linux" title="如何在 Linux 上安装 OpenClaw？">
    - Linux 快速路径+服务安装：[Linux](/platforms/linux)。
    - 完整演练：[获取Started](/start/getting-started)。
    - 安装程序+更新：[安装和更新](/install/updating)。

  </Accordion>

  <Accordion id="how-do-i-install-openclaw-on-a-vps" title="如何在 VPS 上安装 OpenClaw？">
    任何 Linux VPS 都可以。安装在服务器上，然后通过 SSH/Tailscale. 到达网关

    指南：[exe.dev](/install/exe-dev)、[Hetzner](/install/hetzner)、[Fly.io](/install/fly). 远程访问：[网关远程](/gateway/remote)。

  </Accordion>

  <Accordion id="where-are-the-cloud-vps-install-guides" title="cloud/VPS 安装指南在哪里？">
    具有常见提供商的托管中心：

    - [VPS 托管](/vps)（把所有提供商放在一处）
    - [Fly.io](/install/fly)
    - [Hetzner](/install/hetzner)
    - [exe.dev](/install/exe-dev)

    在云中，**Gateway 在服务器** 上运行，您可以通过Control UI（或Tailscale/SSH）从laptop/phone 访问它。您的状态+工作区位于服务器上，因此请将主机视为事实来源并对其进行备份。

    将 **nodes** （Mac/iOS/Android/headless） 与该云网关配对，以便在网关保留在云中时在笔记本电脑上执行本地 screen/camera 或命令。

    中心：[平台](/platforms)。远程访问：[Gateway 远程模式](/gateway/remote)。 节点：[节点](/nodes)、[节点 CLI](/cli/nodes)。

  </Accordion>

  <Accordion id="can-i-ask-openclaw-to-update-itself" title="我可以要求OpenClaw自行更新吗？">
    可能，不推荐。更新流程可以重新启动网关（删除活动会话），可能需要干净的 git checkout，并且可以提示确认。作为操作员从 shell 运行更新更安全。

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel beta
    openclaw update --tag 2026.9.3
    openclaw update --no-restart
    ```

    `--channel` 接受 `stable`、`extended-stable`、`beta` 或 `dev`。 `--tag` 接受 npm dist 标签或精确版本。

    从代理自动化：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文档：[更新](/cli/update)、[更新](/install/updating)。

  </Accordion>

  <Accordion id="what-does-onboarding-actually-do" title="入门引导实际上有什么作用？">
    `openclaw onboard` 是推荐的设置路径。在全新的本地安装中，它在指向 [ 安全指南 ](/gateway/security) 的单行指针后提供两条通道：

    - **Quick start** 检测您已有的 AI 访问权限，等待您选择连接，验证该选择是否真正完成，准备代理工作区，然后在前台启动网关并打开浏览器仪表板。它使用默认代理名称 `main` 和完全访问权限，并跳过内存导入和应用程序建议。在选择器中选择 **暂时跳过** 以准备本地基线并退出，而不启动网关或 AI 聊天。
    - **Custom setup** 运行相同的引导流程，并将遥测选择、代理名称、访问模式和可选设置提示保留为问题。

    在任何实时完成、提供程序安装、模型选择或凭证写入之前，这两个通道都需要明确的提供程序选择。

    经典的分步向导仍然可用。为其工作区、Model/Auth、网关、通道、Web 搜索、技能、守护程序和运行状况检查步骤运行 `openclaw onboard --classic`。步骤列表位于 [Onboarding （CLI）](/start/wizard#what-classic-onboarding-configures) 中。

    Quick start 不适用于配置安装、远程网关聊天设置、非交互式运行或与 `--skip-ui` 或 `--tui` 一起运行。完整细分：[Onboarding （CLI）](/start/wizard)。

  </Accordion>

  <Accordion id="do-i-need-a-claude-or-openai-subscription-to-run-this" title="我是否需要 Claude 或 OpenAI 订阅才能运行此程序？">
    不需要。使用 **API 键** （Anthropic/OpenAI/others） 或 **仅限本地模型** 运行 OpenClaw，以便您的数据保留在您的设备上。订阅（Claude Pro/Max、ChatGPT/Codex）是验证这些提供商的可选方式。

    对于 Anthropic：**API 密钥** 提供标准的即用即付计费方式； **Claude CLI** 重复使用同一主机上的现有 Claude Code 登录名。 Anthropic 目前将 Claude CLI 的非交互式 `claude -p` 路径视为代理 SDK/programmatic 使用情况，该使用情况仍会受到订阅计划限制的影响 - 在依赖订阅行为之前，请检查当前的 Anthropic 计费文档。对于长期存在的网关主机和共享自动化，Anthropic API 密钥是更可预测的选择。

    代理模型完全支持 OpenAI Codex OAuth（ChatGPT/Codex 订阅）。 OpenClaw 还支持托管订阅式选项，包括 **Qwen 云编码计划**、**MiniMax 编码计划** 和 **Z.AI / GLM 编码计划**。

    文档：[Anthropic](/providers/anthropic)、[OpenAI](/providers/openai)、[Qwen Cloud](/providers/qwen)、[MiniMax](/providers/minimax)、[Z.AI （GLM）](/providers/zai)、[本地模型](/gateway/local-models)、[模型](/concepts/models)。

  </Accordion>

  <Accordion id="can-i-use-claude-max-subscription-without-an-api-key" title="我可以在没有 API 密钥的情况下使用 Claude Max 订阅吗？">
    是的。OpenClaw支持Claude CLI重复使用用于Pro/Max/Team/Enterprise计划。Anthropic目前正在治疗`claude -p`小路OpenClaw作为订阅计划使用，但受您的计划限制，而不是单独的免费限额 - 请参阅[人择](/providers/anthropic)了解当前的账单详细信息和链接Anthropic自己的支持文章。对于最可预测的服务器端设置，请使用Anthropic API键代替。
  </Accordion>

  <Accordion id="do-you-support-claude-subscription-auth-claude-pro-or-max" title="是否支持Claude订阅授权（Claude Pro或Max）？">
    是的，通过 Claude CLI 重用。 Anthropic 对 `claude -p`/Agent SDK 使用情况的计费处理随时间而变化；在依赖特定的计费行为之前，请参阅 [Anthropic](/providers/anthropic) 了解 Anthropic 支持文章的当前状态和日期链接。

    Anthropic setup-token auth 仍然是受支持的令牌路径，但 OpenClaw 更喜欢 Claude CLI 重用和 `claude -p`（如果可用）。对于生产或多用户工作负载，Anthropic API 密钥仍然是更安全、更可预测的选择。其他订阅式托管选项：[OpenAI](/providers/openai)、[Qwen Cloud](/providers/qwen)、[MiniMax](/providers/minimax)、[Z.AI （GLM）](/providers/zai)。

  </Accordion>

</AccordionGroup>
