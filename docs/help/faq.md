---
summary: "关于 OpenClaw 安装、配置和使用的常见问题解答"
read_when:
  - 回答常见的安装、配置、入门或运行时支持问题
  - 在更深入调试前进行用户报告问题的初步筛查
title: "常见问题解答"
---

# 常见问题解答

快速解答以及针对实际环境（本地开发、VPS、多代理、OAuth/API 密钥、模型故障切换）的深入排查。运行时诊断见 [故障排查](/gateway/troubleshooting)。完整配置参考见 [配置指南](/gateway/configuration)。

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

   运行 Gateway 健康检查和提供商探测（需 Gateway 可达），详见 [健康检查](/gateway/health)。

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

<AccordionGroup>
  <Accordion title="我卡住了，最快的脱困方法">
    使用一个能**看到你的机器**的本地 AI 代理。这比在 Discord 里求助有效得多，因为大多数“我卡住了”的情况都是**本地配置或环境问题**，远程帮助者无法检查。

    - **Claude Code**: [https://www.anthropic.com/claude-code/](https://www.anthropic.com/claude-code/)
    - **OpenAI Codex**: [https://openai.com/codex/](https://openai.com/codex/)

    这些工具可以读取仓库、运行命令、检查日志，并帮助修复你的机器级设置（PATH、服务、权限、认证文件）。通过可改造的（git）安装方式，向它们提供**完整的源码检出**：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会从 git 检出版本安装 OpenClaw，因此代理可以读取代码和文档，并推理你正在运行的确切版本。你之后也可以随时通过重新运行安装器、但不带 `--install-method git`，切回稳定版。

    提示：让代理**规划并监督**修复过程（逐步进行），然后只执行必要的命令。这样能保持改动尽量小，也更容易审计。

    如果你发现了真实 bug 或修复方案，请提交 GitHub issue 或 PR：
    [https://github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
    [https://github.com/openclaw/openclaw/pulls](https://github.com/openclaw/openclaw/pulls)

    先从这些命令开始（求助时请分享输出）：

    ```bash
    openclaw status
    openclaw models status
    openclaw doctor
    ```

    它们的作用：

    - `openclaw status`：快速查看 gateway/agent 健康状况 + 基本配置。
    - `openclaw models status`：检查提供商认证 + 模型可用性。
    - `openclaw doctor`：验证并修复常见配置/状态问题。

    其他有用的 CLI 检查：`openclaw status --all`、`openclaw logs --follow`、
    `openclaw gateway status`、`openclaw health --verbose`。

    快速排查循环：[如果出了问题，先做这 60 秒](#如果出了问题-先做这-60-秒)。
    安装文档：[安装](/install)、[安装器参数](/install/installer)、[更新](/install/updating)。

  </Accordion>

  <Accordion title="推荐的 OpenClaw 安装与设置方式">
    仓库建议从源码运行并使用入门引导：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw onboard --install-daemon
    ```

    向导还可以自动构建 UI 资源。完成 onboarding 后，通常会在 **18789** 端口运行 Gateway。

    从源码安装（贡献者/开发者）：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    pnpm ui:build # 首次运行时自动安装 UI 依赖
    openclaw onboard
    ```

    如果你还没有全局安装，可以通过 `pnpm openclaw onboard` 来运行。

  </Accordion>

  <Accordion title="完成 onboarding 后，我该如何打开仪表盘？">
    向导会在 onboarding 结束后立即用一个干净的（未 token 化的）仪表盘 URL 打开你的浏览器，并在摘要中打印该链接。保持那个标签页打开；如果没有自动打开，请在同一台机器上复制/粘贴打印出来的 URL。
  </Accordion>

  <Accordion title="本地 localhost 和远程环境下，如何对仪表盘进行认证（token）？">
    **本地 localhost（同一台机器）：**

    - 打开 `http://127.0.0.1:18789/`。
    - 如果提示认证，把 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）中的 token 粘贴到 Control UI 设置里。
    - 在 gateway 主机上获取：`openclaw config get gateway.auth.token`（或生成一个：`openclaw doctor --generate-gateway-token`）。

    **不在 localhost 上：**

    - **Tailscale Serve**（推荐）：保持绑定 loopback，运行 `openclaw gateway --tailscale serve`，打开 `https://<magicdns>/`。如果 `gateway.auth.allowTailscale` 为 `true`，身份头即可满足 Control UI/WebSocket 认证（无需 token，前提是假设 gateway 主机可信）；HTTP API 仍然需要 token/password。
    - **Tailnet 绑定**：运行 `openclaw gateway --bind tailnet --token "<token>"`，打开 `http://<tailscale-ip>:18789/`，在仪表盘设置中粘贴 token。
    - **SSH 隧道**：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`，并在 Control UI 设置中粘贴 token。

    有关绑定模式和认证细节，请参见 [Dashboard](/web/dashboard) 和 [Web surfaces](/web)。

  </Accordion>

  <Accordion title="我需要什么运行时？">
    需要 Node **>= 22**。推荐使用 `pnpm`。不推荐在 Gateway 上使用 Bun。
  </Accordion>

  <Accordion title="它能在 Raspberry Pi 上运行吗？">
    可以。Gateway 很轻量——文档列出 **512MB-1GB RAM**、**1 核**，以及大约 **500MB**
    磁盘空间就足够个人使用，并指出 **Raspberry Pi 4 可以运行它**。

    如果你想要更多余量（日志、媒体、其他服务），**推荐 2GB**，但这并不是硬性最低要求。

    提示：小型 Pi/VPS 可以托管 Gateway，而你可以在笔记本/手机上配对 **nodes**，
    用于本地屏幕/摄像头/canvas 或命令执行。参见 [Nodes](/nodes)。

  </Accordion>

  <Accordion title="有什么 Raspberry Pi 安装建议吗？">
    简短版：可以用，但要预期会有一些棘手的边缘情况。

    - 使用 **64 位** 操作系统，并保持 Node >= 22。
    - 优先使用 **可折腾（git）安装**，这样你可以查看日志并快速更新。
    - 先不要启用 channels/skills，之后逐个添加。
    - 如果遇到奇怪的二进制问题，通常是 **ARM 兼容性** 问题。

    文档：[Linux](/platforms/linux)，[Install](/install)。

  </Accordion>

  <Accordion title="卡在 wake up my friend / onboarding 无法 hatch，怎么办？">
    这个界面依赖 Gateway 可访问且已认证。TUI 在首次 hatch 时也会自动发送
    “Wake up, my friend!”。如果你看到这行但**没有回复**，
    且 tokens 仍为 0，说明 agent 从未运行。

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

    3. 如果仍然卡住，运行：

    ```bash
    openclaw doctor
    ```

    如果 Gateway 是远程的，请确保 tunnel/Tailscale 连接正常，并且 UI 指向了正确的 Gateway。参见 [Remote access](/gateway/remote)。

  </Accordion>

  <Accordion title="我能把配置迁移到新机器（Mac mini）而不用重新 onboarding 吗？">
    可以。复制 **state 目录** 和 **workspace**，然后运行一次 Doctor。这样可以让你的机器人保持“完全一样”（记忆、会话历史、认证和 channel
    状态），前提是你复制了 **这两个** 位置：

    1. 在新机器上安装 OpenClaw。
    2. 从旧机器复制 `$OPENCLAW_STATE_DIR`（默认：`~/.openclaw`）。
    3. 复制你的 workspace（默认：`~/.openclaw/workspace`）。
    4. 运行 `openclaw doctor` 并重启 Gateway 服务。

    这会保留配置、认证配置文件、WhatsApp 凭据、会话和记忆。如果你处于
    远程模式，请记住 gateway 主机拥有 session store 和 workspace。

    **重要：**如果你只是把 workspace 提交/推送到 GitHub，那么你备份的是
    **记忆 + bootstrap 文件**，但**不是**会话历史或认证。这些内容位于 `~/.openclaw/`
    下（例如 `~/.openclaw/agents/<agentId>/sessions/`）。

    相关：[Migrating](/install/migrating)、[磁盘上各项内容的位置](#where-things-live-on-disk)，
    [Agent workspace](/concepts/agent-workspace)、[Doctor](/gateway/doctor)，
    [Remote mode](/gateway/remote)。

  </Accordion>

  <Accordion title="我在哪能看到最新版本有哪些新内容？">
    查看 GitHub 更新日志：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

    最新条目在最上方。如果顶部部分标记为 **Unreleased**，那么下一个带日期的
    部分就是最新发布版本。条目按 **Highlights**、**Changes** 和
    **Fixes** 分组（需要时还会有 docs/other 等部分）。

  </Accordion>

  <Accordion title="无法访问 docs.openclaw.ai（SSL 错误）">
    某些 Comcast/Xfinity 连接会因 Xfinity Advanced Security 错误地拦截
    `docs.openclaw.ai`。请禁用它或将 `docs.openclaw.ai` 加入允许列表，然后重试。更多
    细节：[Troubleshooting](/help/faq#cannot-access-docsopenclaw-ai-ssl-error)。
    请通过这里报告，帮助我们解除拦截：[https://spa.xfinity.com/check_url_status](https://spa.xfinity.com/check_url_status)。

    如果你仍然无法访问该站点，文档也镜像在 GitHub 上：
    [https://github.com/openclaw/openclaw/tree/main/docs](https://github.com/openclaw/openclaw/tree/main/docs)

  </Accordion>

  <Accordion title="stable 和 beta 有什么区别">
    **Stable** 和 **beta** 是 **npm dist-tags**，不是不同的代码分支：

    - `latest` = stable
    - `beta` = 用于测试的早期构建版本

    我们会先把构建发布到 **beta**，进行测试，等构建稳定后再把
    **同一个版本提升到 `latest`**。这就是为什么 beta 和 stable 可能指向
    **同一个版本**。

    查看变化：
    [https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md](https://github.com/openclaw/openclaw/blob/main/CHANGELOG.md)

  </Accordion>

  <Accordion title="如何安装 beta 版本，beta 和 dev 又有什么区别？">
    **Beta** 是 npm dist-tag `beta`（可能与 `latest` 一致）。
    **Dev** 是 `main`（git）的移动头；发布时会使用 npm dist-tag `dev`。

    一行命令（macOS/Linux）：

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --beta
    ```

    ```bash
    curl -fsSL --proto '=https' --tlsv1.2 https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    Windows 安装程序（PowerShell）：
    [https://openclaw.ai/install.ps1](https://openclaw.ai/install.ps1)

    更多细节：[Development channels](/install/development-channels) 和 [Installer flags](/install/installer)。

  </Accordion>

  <Accordion title="我如何尝试最新的版本内容？">
    有两个选项：

    1. **Dev channel（git checkout）：**

    ```bash
    openclaw update --channel dev
    ```

    这会切换到 `main` 分支并从源码更新。

    2. **可折腾安装（从安装器站点安装）：**

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    这会给你一个本地仓库，你可以编辑，然后通过 git 更新。

    如果你更喜欢手动干净克隆，可以使用：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    ```

    文档：[Update](/cli/update)、[Development channels](/install/development-channels)，
    [Install](/install)。

  </Accordion>

  <Accordion title="安装和 onboarding 通常要多久？">
    大致参考：

    - **安装：** 2-5 分钟
    - **onboarding：** 5-15 分钟，取决于你配置了多少 channels/models

    如果卡住了，请查看 [安装器卡住](#quick-start-and-first-run-setup)
    以及 [我卡住了](#quick-start-and-first-run-setup) 中的快速调试流程。

  </Accordion>

  <Accordion title="安装器卡住了？怎样获得更多反馈？">
    使用 **详细输出** 重新运行安装器：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --verbose
    ```

    带详细输出的 beta 安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --beta --verbose
    ```

    对于可折腾（git）安装：

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --verbose
    ```

    Windows（PowerShell）等价做法：

    ```powershell
    # install.ps1 目前还没有专门的 -Verbose 标志。
    Set-PSDebug -Trace 1
    & ([scriptblock]::Create((iwr -useb https://openclaw.ai/install.ps1))) -NoOnboard
    Set-PSDebug -Trace 0
    ```

    更多选项：[Installer flags](/install/installer)。

  </Accordion>

  <Accordion title="Windows 安装提示找不到 git 或 openclaw 未被识别">
    两个常见的 Windows 问题：

    **1）npm error spawn git / git not found**

    - 安装 **Git for Windows**，并确保 `git` 在你的 PATH 中。
    - 关闭并重新打开 PowerShell，然后重新运行安装器。

    **2）安装后 openclaw 仍未被识别**

    - 你的 npm 全局 bin 目录不在 PATH 中。
    - 检查路径：

      ```powershell
      npm config get prefix
      ```

    - 将该目录添加到用户 PATH（Windows 上不需要 `\bin` 后缀；大多数系统中它是 `%AppData%\npm`）。
    - 更新 PATH 后关闭并重新打开 PowerShell。

    如果你想要最顺畅的 Windows 设置，请使用 **WSL2**，而不是原生 Windows。
    文档：[Windows](/platforms/windows)。

  </Accordion>

  <Accordion title="Windows exec 输出显示乱码中文 - 我该怎么办？">
    这通常是原生 Windows shell 中的控制台代码页不匹配。

    症状：

    - `system.run`/`exec` 输出把中文渲染成乱码
    - 同一个命令在另一个终端配置文件中显示正常

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

    如果在最新 OpenClaw 中仍可复现，请在以下位置跟踪/报告：

    - [Issue #30640](https://github.com/openclaw/openclaw/issues/30640)

  </Accordion>

  <Accordion title="文档没有回答我的问题——我怎样才能得到更好的答案？">
    使用 **可折腾（git）安装**，这样你就能在本地拥有完整源码和文档，然后
    在那个文件夹里询问你的机器人（或 Claude/Codex），它就能读取仓库并给出精确答案。

    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git
    ```

    更多细节：[Install](/install) 和 [Installer flags](/install/installer)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装 OpenClaw？">
    简短答案：先按照 Linux 指南操作，然后运行 onboarding。

    - Linux 快速路径 + 服务安装：[Linux](/platforms/linux)。
    - 完整演练：[Getting Started](/start/getting-started)。
    - 安装器 + 更新：[Install & updates](/install/updating)。

  </Accordion>

  <Accordion title="如何在 VPS 上安装 OpenClaw？">
    任意 Linux VPS 都可以。在服务器上安装，然后通过 SSH/Tailscale 连接到 Gateway。

    指南：[exe.dev](/install/exe-dev)、[Hetzner](/install/hetzner)、[Fly.io](/install/fly)。
    远程访问：[Gateway remote](/gateway/remote)。

  </Accordion>

  <Accordion title="云端/VPS 安装指南在哪里？">
    我们维护了一个包含常见服务商的 **hosting hub**。选一个并按指南操作：

    - [VPS hosting](/vps)（所有服务商都在一个地方）
    - [Fly.io](/install/fly)
    - [Hetzner](/install/hetzner)
    - [exe.dev](/install/exe-dev)

    在云端的工作方式：**Gateway 运行在服务器上**，你通过 Control UI
    （或 Tailscale/SSH）从笔记本/手机访问它。你的 state + workspace
    都在服务器上，所以把宿主机当作事实来源，并做好备份。

    你可以把 **nodes**（Mac/iOS/Android/headless）与这个云端 Gateway 配对，
    以便访问本地屏幕/摄像头/canvas，或者在你的笔记本上运行命令，同时仍把
    Gateway 放在云端。

    Hub：[Platforms](/platforms)。远程访问：[Gateway remote](/gateway/remote)。
    Nodes：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)。

  </Accordion>

  <Accordion title="我可以让 OpenClaw 自己更新自己吗？">
    简短回答：**可以，但不推荐**。更新流程可能会重启
    Gateway（这会断开当前会话），可能需要干净的 git checkout，而且
    也可能需要确认。更安全的做法：在 shell 中由操作者执行更新。

    使用 CLI：

    ```bash
    openclaw update
    openclaw update status
    openclaw update --channel stable|beta|dev
    openclaw update --tag <dist-tag|version>
    openclaw update --no-restart
    ```

    如果你必须从 agent 中自动化：

    ```bash
    openclaw update --yes --no-restart
    openclaw gateway restart
    ```

    文档：[Update](/cli/update)、[Updating](/install/updating)。

  </Accordion>

  <Accordion title="onboarding 实际上做了什么？">
    `openclaw onboard` 是推荐的设置路径。在**本地模式**下，它会引导你完成：

    - **模型/认证设置**（支持 provider OAuth/setup-token 流程和 API keys，以及诸如 LM Studio 之类的本地模型选项）
    - **Workspace** 位置 + bootstrap 文件
    - **Gateway 设置**（bind/port/auth/tailscale）
    - **Providers**（WhatsApp、Telegram、Discord、Mattermost（插件）、Signal、iMessage）
    - **Daemon 安装**（macOS 上是 LaunchAgent；Linux/WSL2 上是 systemd user unit）
    - **健康检查** 和 **skills** 选择

    如果你配置的模型未知或缺少认证，它还会发出警告。

  </Accordion>

  <Accordion title="运行它需要 Claude 或 OpenAI 订阅吗？">
    不需要。你可以使用 **API keys**（Anthropic/OpenAI/其他）来运行 OpenClaw，也可以
    仅使用 **本地模型**，让你的数据保留在设备上。订阅（Claude
    Pro/Max 或 OpenAI Codex）只是用于对这些 provider 进行认证的可选方式。

    如果你选择 Anthropic 订阅认证，请自行决定是否使用：
    Anthropic 过去曾阻止某些在 Claude Code 之外的订阅用法。
    OpenAI Codex OAuth 明确支持像 OpenClaw 这样的外部工具。

    文档：[Anthropic](/providers/anthropic)、[OpenAI](/providers/openai)，
    [Local models](/gateway/local-models)、[Models](/concepts/models)。

  </Accordion>

  <Accordion title="我可以在没有 API key 的情况下使用 Claude Max 订阅吗？">
    可以。你可以使用 **setup-token**
    而不是 API key 进行认证。这就是订阅路径。

    Claude Pro/Max 订阅 **不包含 API key**，所以这是订阅账户的
    技术路径。不过这由你自己决定：Anthropic 过去曾阻止某些在 Claude Code 之外的订阅用法。
    如果你希望在生产环境中采用最清晰、最安全、受支持的路径，请使用 Anthropic API key。

  </Accordion>

  <Accordion title="Anthropic setup-token 认证是如何工作的？">
    `claude setup-token` 通过 Claude Code CLI 生成一个 **token 字符串**（它不在网页控制台中提供）。你可以在**任何机器**上运行它。启动 onboarding 时选择 **Anthropic token（粘贴 setup-token）**，或者用 `openclaw models auth paste-token --provider anthropic` 粘贴它。该 token 会作为 **anthropic** provider 的 auth profile 保存，并像 API key 一样使用（不会自动刷新）。更多细节：[OAuth](/concepts/oauth)。
  </Accordion>

  <Accordion title="我在哪里找到 Anthropic setup-token？">
    它**不在** Anthropic Console 中。setup-token 由 **Claude Code CLI** 在**任何机器**上生成：

    ```bash
    claude setup-token
    ```

    复制它打印出的 token，然后在 onboarding 中选择 **Anthropic token（粘贴 setup-token）**。如果你想在 gateway 主机上运行它，请使用 `openclaw models auth setup-token --provider anthropic`。如果你是在别的地方运行的 `claude setup-token`，请在 gateway 主机上用 `openclaw models auth paste-token --provider anthropic` 粘贴它。参见 [Anthropic](/providers/anthropic)。

  </Accordion>

  <Accordion title="你们支持 Claude 订阅认证（Claude Pro 或 Max）吗？">
    支持——通过 **setup-token**。OpenClaw 不再重用 Claude Code CLI 的 OAuth token；请使用 setup-token 或 Anthropic API key。可以在任意地方生成 token，然后粘贴到 gateway 主机上。参见 [Anthropic](/providers/anthropic) 和 [OAuth](/concepts/oauth)。

    重要说明：这只是技术兼容性，不是政策保证。Anthropic
    过去曾阻止某些在 Claude Code 之外的订阅用法。
    你需要自己决定是否使用，并确认 Anthropic 当前的条款。
    对于生产环境或多用户工作负载，Anthropic API key 认证是更安全、更推荐的选择。

  </Accordion>

  <Accordion title="为什么我会看到来自 Anthropic 的 HTTP 429 rate_limit_error？">
    这意味着你当前窗口的 **Anthropic 配额/速率限制** 已用尽。如果你使用
    **Claude 订阅**（setup-token），请等待窗口
    重置或升级你的套餐。如果你使用 **Anthropic API key**，请在 Anthropic Console
    中检查使用量/计费情况，并根据需要提高限制。

    如果消息具体是：
    `Extra usage is required for long context requests`，那说明请求正在尝试使用
    Anthropic 的 1M 上下文 beta（`context1m: true`）。这只有在你的凭据有资格使用长上下文计费时才可用（API key 计费或启用了 Extra Usage 的订阅）。

    提示：设置一个 **fallback model**，这样当 provider 被限流时 OpenClaw 仍可继续响应。
    参见 [Models](/cli/models)、[OAuth](/concepts/oauth)，以及
    [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context)。

  </Accordion>

  <Accordion title="支持 AWS Bedrock 吗？">
    支持——通过 pi-ai 的 **Amazon Bedrock（Converse）** provider，并使用**手动配置**。你必须在 gateway 主机上提供 AWS 凭据/区域，并在模型配置中添加 Bedrock provider 条目。参见 [Amazon Bedrock](/providers/bedrock) 和 [Model providers](/providers/models)。如果你更喜欢托管 key 流程，在 Bedrock 前面放一个 OpenAI 兼容代理仍然是可行的选择。
  </Accordion>

  <Accordion title="Codex 认证是如何工作的？">
    OpenClaw 通过 OAuth（ChatGPT 登录）支持 **OpenAI Code（Codex）**。onboarding 在合适时可运行 OAuth 流程，并会把默认模型设为 `openai-codex/gpt-5.4`。参见 [Model providers](/concepts/model-providers) 和 [Onboarding (CLI)](/start/wizard)。
  </Accordion>

  <Accordion title="你们支持 OpenAI 订阅认证（Codex OAuth）吗？">
    支持。OpenClaw 完全支持 **OpenAI Code（Codex）订阅 OAuth**。
    OpenAI 明确允许在像 OpenClaw 这样的外部工具/工作流中使用订阅 OAuth。
    onboarding 可以为你运行 OAuth 流程。

    参见 [OAuth](/concepts/oauth)、[Model providers](/concepts/model-providers) 和 [Onboarding (CLI)](/start/wizard)。

  </Accordion>

  <Accordion title="如何设置 Gemini CLI OAuth？">
    Gemini CLI 使用的是 **plugin auth 流程**，不是在 `openclaw.json` 中填写 client id 或 secret。

    步骤：

    1. 启用插件：`openclaw plugins enable google`
    2. 登录：`openclaw models auth login --provider google-gemini-cli --set-default`

    这会把 OAuth token 存到 gateway 主机上的 auth profiles 中。详情：[Model providers](/concepts/model-providers)。

  </Accordion>

  <Accordion title="本地模型适合日常闲聊吗？">
    通常不适合。OpenClaw 需要较大的上下文和更强的安全性；小模型会截断并泄露。如果必须这样做，请在本地运行你能获得的**最大** MiniMax M2.5 构建（LM Studio），并查看 [/gateway/local-models](/gateway/local-models)。更小/量化后的模型会增加 prompt-injection 风险——参见 [Security](/gateway/security)。
  </Accordion>

  <Accordion title="如何让托管模型流量固定在某个地区？">
    选择按地区固定的端点。OpenRouter 提供 MiniMax、Kimi 和 GLM 的美国托管选项；选择美国托管变体可将数据保留在该区域内。你仍然可以把 Anthropic/OpenAI 也列入其中，只需使用 `models.mode: "merge"`，这样在尊重你所选区域 provider 的同时，fallback 也仍然可用。
  </Accordion>

  <Accordion title="我必须买 Mac Mini 才能安装这个吗？">
    不需要。OpenClaw 可以在 macOS 或 Linux 上运行（Windows 通过 WSL2）。Mac mini 只是可选项——有些人会把它作为常开主机，但小型 VPS、家用服务器或 Raspberry Pi 级别的设备也可以。

    只有在你需要 **仅 macOS 工具** 时才需要 Mac。对于 iMessage，请使用 [BlueBubbles](/channels/bluebubbles)（推荐）——BlueBubbles server 可以运行在任何 Mac 上，而 Gateway 可以运行在 Linux 或其他地方。如果你需要其他仅 macOS 工具，可以把 Gateway 运行在 Mac 上，或者配对一个 macOS node。

    文档：[BlueBubbles](/channels/bluebubbles)、[Nodes](/nodes)、[Mac remote mode](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="iMessage 支持需要 Mac mini 吗？">
    你需要某台登录了 Messages 的 **macOS 设备**。它**不必**是 Mac mini——
    任何 Mac 都可以。iMessage 请使用 **[BlueBubbles](/channels/bluebubbles)**（推荐）——BlueBubbles server 运行在 macOS 上，而 Gateway 可以运行在 Linux 或其他地方。

    常见设置：

    - 在 Linux/VPS 上运行 Gateway，并在任意一台已登录 Messages 的 Mac 上运行 BlueBubbles server。
    - 如果你希望最简单的单机方案，也可以把所有东西都运行在 Mac 上。

    文档：[BlueBubbles](/channels/bluebubbles)、[Nodes](/nodes)，
    [Mac remote mode](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="如果我买一台 Mac mini 来运行 OpenClaw，我能把它连接到我的 MacBook Pro 吗？">
    可以。**Mac mini 可以运行 Gateway**，而你的 MacBook Pro 可以作为
    **node**（伴随设备）接入。Nodes 不运行 Gateway——它们提供额外
    能力，比如该设备上的屏幕/摄像头/canvas 和 `system.run`。

    常见模式：

    - Mac mini 上运行 Gateway（常开）。
    - MacBook Pro 运行 macOS app 或 node host，并与 Gateway 配对。
    - 使用 `openclaw nodes status` / `openclaw nodes list` 查看它。

    文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)。

  </Accordion>

  <Accordion title="可以使用 Bun 吗？">
    不推荐使用 Bun。我们观察到运行时 bug，尤其是在 WhatsApp 和 Telegram 上。
    为了稳定的 gateway，请使用 **Node**。

    如果你仍然想用 Bun 试验，请在一个不用于生产、且不启用 WhatsApp/Telegram 的 gateway 上进行。

  </Accordion>

  <Accordion title="Telegram：allowFrom 里应该填什么？">
    `channels.telegram.allowFrom` 是**人类发送者的 Telegram 用户 ID**（数字）。它不是 bot 用户名。

    onboarding 接受 `@username` 输入并将其解析为数字 ID，但 OpenClaw 授权只使用数字 ID。

    更安全的方式（不用第三方 bot）：

    - 给你的 bot 发私信，然后运行 `openclaw logs --follow` 并读取 `from.id`。

    官方 Bot API：

    - 给你的 bot 发私信，然后调用 `https://api.telegram.org/bot<bot_token>/getUpdates` 并读取 `message.from.id`。

    第三方（隐私性较差）：

    - 给 `@userinfobot` 或 `@getidsbot` 发私信。

    参见 [/channels/telegram](/channels/telegram#access-control-and-activation)。

  </Accordion>

  <Accordion title="多个用户可以用同一个 WhatsApp 号码和不同的 OpenClaw 实例吗？">
    可以，通过 **multi-agent routing**。把每个发送者的 WhatsApp **DM**（peer `kind: "direct"`，发送者 E.164 格式如 `+15551234567`）绑定到不同的 `agentId`，这样每个人都会有自己的 workspace 和 session store。回复仍然来自**同一个 WhatsApp 账户**，而 DM 访问控制（`channels.whatsapp.dmPolicy` / `channels.whatsapp.allowFrom`）对每个 WhatsApp 账户是全局的。参见 [Multi-Agent Routing](/concepts/multi-agent) 和 [WhatsApp](/channels/whatsapp)。
  </Accordion>

  <Accordion title='我可以运行一个“快速聊天”agent 和一个“编程用 Opus”agent 吗？'>
    可以。使用 multi-agent routing：为每个 agent 设置各自的默认模型，然后将入站路由（provider 账户或指定 peers）绑定到各自 agent。示例配置见 [Multi-Agent Routing](/concepts/multi-agent)。另见 [Models](/concepts/models) 和 [Configuration](/gateway/configuration)。
  </Accordion>

  <Accordion title="Homebrew 在 Linux 上可用吗？">
    可以。Homebrew 支持 Linux（Linuxbrew）。快速设置：

    ```bash
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    echo 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"' >> ~/.profile
    eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"
    brew install <formula>
    ```

    如果你通过 systemd 运行 OpenClaw，请确保服务 PATH 包含 `/home/linuxbrew/.linuxbrew/bin`（或你的 brew 前缀），这样在非登录 shell 中也能解析由 `brew` 安装的工具。
    最近的构建还会在 Linux systemd 服务中预先添加常见用户 bin 目录（例如 `~/.local/bin`、`~/.npm-global/bin`、`~/.local/share/pnpm`、`~/.bun/bin`），并在设置时遵循 `PNPM_HOME`、`NPM_CONFIG_PREFIX`、`BUN_INSTALL`、`VOLTA_HOME`、`ASDF_DATA_DIR`、`NVM_DIR` 和 `FNM_DIR`。

  </Accordion>

  <Accordion title="可折腾的 git 安装和 npm 安装有什么区别">
    - **可折腾（git）安装：** 完整源码检出，可编辑，最适合贡献者。
      你在本地运行构建，并且可以修补代码/文档。
    - **npm 安装：** 全局 CLI 安装，没有仓库，最适合“只想运行它”。
      更新来自 npm dist-tags。

    文档：[Getting started](/start/getting-started)、[Updating](/install/updating)。

  </Accordion>

  <Accordion title="以后我能在 npm 和 git 安装之间切换吗？">
    可以。先安装另一种版本，再执行 Doctor，让 gateway 服务指向新的入口。
    这**不会删除你的数据**——它只会更改 OpenClaw 的代码安装。你的 state
   （`~/.openclaw`）和 workspace（`~/.openclaw/workspace`）都不会受影响。

    从 npm 切换到 git：

    ```bash
    git clone https://github.com/openclaw/openclaw.git
    cd openclaw
    pnpm install
    pnpm build
    openclaw doctor
    openclaw gateway restart
    ```

    从 git 切换到 npm：

    ```bash
    npm install -g openclaw@latest
    openclaw doctor
    openclaw gateway restart
    ```

    Doctor 会检测 gateway 服务入口点不匹配，并提供重写服务配置以匹配当前安装的选项（在自动化中使用 `--repair`）。

    备份建议：参见 [Backup strategy](#where-things-live-on-disk)。

  </Accordion>

  <Accordion title="Gateway 应该运行在笔记本上还是 VPS 上？">
    简短答案：**如果你想要 24/7 的可靠性，请使用 VPS**。如果你希望
    最低摩擦，并且能接受睡眠/重启，那就本地运行。

    **笔记本（本地 Gateway）**

    - **优点：** 无服务器成本、可直接访问本地文件、可见的浏览器窗口。
    - **缺点：** 睡眠/网络中断会导致断连，OS 更新/重启会中断，必须保持唤醒。

    **VPS / 云端**

    - **优点：** 常开、网络稳定、没有笔记本睡眠问题、更容易持续运行。
    - **缺点：** 通常是无头模式（使用截图），只能远程访问文件，更新时需要 SSH。

    **OpenClaw 特定说明：** WhatsApp/Telegram/Slack/Mattermost（插件）/Discord 都可以很好地在 VPS 上运行。真正的权衡只是**无头浏览器** vs 可见窗口。参见 [Browser](/tools/browser)。

    **推荐默认：** 如果你之前有过 gateway 断连，优先用 VPS。当地使用 Mac、需要本地文件访问或带可见浏览器的 UI 自动化时，本地运行很合适。

  </Accordion>

  <Accordion title="运行 OpenClaw 在专用机器上有多重要？">
    不是必须，但**推荐用于可靠性和隔离性**。

    - **专用主机（VPS/Mac mini/Pi）：** 常开、较少睡眠/重启中断、更干净的权限、更容易保持运行。
    - **共享笔记本/台式机：** 用于测试和日常使用完全没问题，但机器睡眠或更新时会出现暂停。

    如果你想兼得两者的优点，可将 Gateway 放在专用主机上，并把笔记本配对为 **node**，用于本地屏幕/摄像头/exec 工具。参见 [Nodes](/nodes)。
    安全指导请阅读 [Security](/gateway/security)。

  </Accordion>

  <Accordion title="VPS 的最低要求和推荐系统是什么？">
    OpenClaw 很轻量。对于基础 Gateway + 一个聊天 channel：

    - **绝对最低：** 1 vCPU、1GB RAM、约 500MB 磁盘。
    - **推荐：** 1-2 vCPU、2GB RAM 或更多，以获得余量（日志、媒体、多 channel）。Node 工具和浏览器自动化可能很耗资源。

    操作系统：使用 **Ubuntu LTS**（或任何现代 Debian/Ubuntu）。Linux 安装路径在这上面测试得最好。

    文档：[Linux](/platforms/linux)、[VPS hosting](/vps)。

  </Accordion>

  <Accordion title="我可以在 VM 中运行 OpenClaw 吗？需要什么条件？">
    可以。把 VM 当作 VPS 使用：它需要常开、可访问，并且有足够的
    RAM 来运行 Gateway 和你启用的任何 channels。

    基本建议：

    - **绝对最低：** 1 vCPU、1GB RAM。
    - **推荐：** 如果你运行多个 channels、浏览器自动化或媒体工具，则至少 2GB RAM。
    - **系统：** Ubuntu LTS 或其他现代 Debian/Ubuntu。

    如果你使用的是 Windows，**WSL2 是最容易的 VM 风格设置**，并且工具兼容性最好。参见 [Windows](/platforms/windows)、[VPS hosting](/vps)。
    如果你是在 macOS 的 VM 中运行，请参见 [macOS VM](/install/macos-vm)。

  </Accordion>
</AccordionGroup>

## 什么是 OpenClaw？

<AccordionGroup>
  <Accordion title="用一句话解释 OpenClaw 是什么？">
    OpenClaw 是一个运行在你自己设备上的个人 AI 助手。它会在你已经在用的消息平台上回复（WhatsApp、Telegram、Slack、Mattermost（插件）、Discord、Google Chat、Signal、iMessage、WebChat），并且在受支持的平台上还能提供语音和实时 Canvas。**Gateway** 是始终在线的控制平面；助手才是产品本身。
  </Accordion>

  <Accordion title="价值主张">
    OpenClaw 不只是“Claude 的包装器”。它是一个 **local-first 控制平面**，让你可以在
    **自己的硬件** 上运行一个强大的助手，并通过你已经在使用的聊天应用访问它，
    具备有状态会话、记忆和工具——而不是把你的工作流控制权交给托管
    SaaS。

    亮点：

    - **你的设备，你的数据：** 在你想要的地方运行 Gateway（Mac、Linux、VPS），并将
      workspace + 会话历史保留在本地。
    - **真实 channel，而不是网页沙箱：** WhatsApp/Telegram/Slack/Discord/Signal/iMessage 等，
      以及在受支持平台上的移动语音和 Canvas。
    - **模型无关：** 使用 Anthropic、OpenAI、MiniMax、OpenRouter 等，并支持按 agent 路由
      和故障转移。
    - **仅本地选项：** 运行本地模型，让**所有数据都留在你的设备上**。
    - **多 agent 路由：** 按 channel、账户或任务拆分 agent，每个都有自己的
      workspace 和默认设置。
    - **开源且可折腾：** 可以检查、扩展并自托管，而不会被厂商锁定。

    文档：[Gateway](/gateway)、[Channels](/channels)、[Multi-agent](/concepts/multi-agent)，
    [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="我刚设置好——第一步应该做什么？">
    很适合的第一个项目：

    - 搭建一个网站（WordPress、Shopify 或简单的静态站点）。
    - 原型一个移动应用（大纲、界面、API 方案）。
    - 整理文件和文件夹（清理、命名、标记）。
    - 连接 Gmail 并自动生成摘要或后续跟进。

    它可以处理大任务，但如果你把任务拆成多个阶段，并用子 agent 并行工作，效果最好。

  </Accordion>

  <Accordion title="OpenClaw 的前五个日常使用场景是什么？">
    日常收益通常会表现为：

    - **个人简报：** 对你关心的收件箱、日历和新闻进行摘要。
    - **研究与起草：** 为邮件或文档做快速研究、摘要和初稿。
    - **提醒与后续跟进：** 基于 cron 或 heartbeat 的提醒和检查清单。
    - **浏览器自动化：** 填表、收集数据、重复性的网页任务。
    - **跨设备协同：** 通过手机发送任务，让 Gateway 在服务器上执行，再把结果通过聊天返回给你。

  </Accordion>

  <Accordion title="OpenClaw 能帮助 SaaS 的线索生成、外联、广告和博客吗？">
    可以用于**研究、筛选和起草**。它可以扫描网站、建立候选名单、
    总结潜在客户，并撰写外联或广告文案初稿。

    对于**外联或广告投放**，请有人类介入。避免垃圾信息，遵守当地法律和
    平台政策，并在发送前审查任何内容。最安全的模式是让
    OpenClaw 先起草，你来批准。

    文档：[Security](/gateway/security)。

  </Accordion>

  <Accordion title="与 Claude Code 相比，它在 Web 开发上有什么优势？">
    OpenClaw 是一个 **个人助手** 和协调层，不是 IDE 替代品。若想在仓库内获得
    最快的直接编码循环，请使用 Claude Code 或 Codex。若你需要
    持久记忆、跨设备访问和工具编排，请使用 OpenClaw。

    优势：

    - **跨会话的持久记忆 + workspace**
    - **多平台访问**（WhatsApp、Telegram、TUI、WebChat）
    - **工具编排**（浏览器、文件、调度、hooks）
    - **始终在线的 Gateway**（运行在 VPS 上，可从任何地方交互）
    - **nodes** 提供本地浏览器/屏幕/摄像头/执行能力

    展示：[https://openclaw.ai/showcase](https://openclaw.ai/showcase)

  </Accordion>
</AccordionGroup>

## 技能和自动化

<AccordionGroup>
  <Accordion title="如何自定义 skills 而不让仓库变脏？">
    使用受管覆盖，而不是直接编辑仓库副本。把你的更改放在 `~/.openclaw/skills/<name>/SKILL.md`（或者通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加一个文件夹）。优先级是 `<workspace>/skills` > `~/.openclaw/skills` > bundled，因此受管覆盖会生效而不会触碰 git。只有真正应该上游化的修改才应留在仓库中并以 PR 形式提交。
  </Accordion>

  <Accordion title="我可以从自定义文件夹加载 skills 吗？">
    可以。通过 `~/.openclaw/openclaw.json` 中的 `skills.load.extraDirs` 添加额外目录（最低优先级）。默认优先级仍然是：`<workspace>/skills` → `~/.openclaw/skills` → bundled → `skills.load.extraDirs`。`clawhub` 默认会安装到 `./skills`，OpenClaw 会在下一次会话中把它当作 `<workspace>/skills`。
  </Accordion>

  <Accordion title="如何为不同任务使用不同模型？">
    目前支持的模式有：

    - **Cron jobs**：独立任务可以为每个 job 设置 `model` 覆盖。
    - **Sub-agents**：把任务路由到不同默认模型的独立 agent。
    - **按需切换**：随时使用 `/model` 切换当前会话模型。

    参见 [Cron jobs](/automation/cron-jobs)、[Multi-Agent Routing](/concepts/multi-agent) 和 [Slash commands](/tools/slash-commands)。

  </Accordion>

  <Accordion title="机器人在做重活时会卡住，怎么卸载这部分负载？">
    对于长任务或并行任务，使用 **sub-agents**。子 agent 在自己的会话中运行，
    返回摘要，并保持主聊天流畅。

    让你的机器人“为这个任务创建一个 sub-agent”，或者使用 `/subagents`。
    在聊天中使用 `/status` 查看 Gateway 当前在做什么（以及它是否正忙）。

    token 提示：长任务和子 agent 都会消耗 tokens。若你关心成本，可以通过 `agents.defaults.subagents.model`
    为 sub-agents 设置更便宜的模型。

    文档：[Sub-agents](/tools/subagents)。

  </Accordion>

  <Accordion title="Discord 上线程绑定的 subagent 会话是如何工作的？">
    使用线程绑定。你可以把 Discord 线程绑定到某个 subagent 或 session 目标，这样该线程中的后续消息仍会留在那个绑定的会话里。

    基本流程：

    - 使用 `sessions_spawn` 并设置 `thread: true`（可选地再设 `mode: "session"` 以支持持久后续跟进）。
    - 或者手动使用 `/focus <target>` 绑定。
    - 使用 `/agents` 查看绑定状态。
    - 使用 `/session idle <duration|off>` 和 `/session max-age <duration|off>` 控制自动失焦。
    - 使用 `/unfocus` 解除线程绑定。

    必需配置：

    - 全局默认：`session.threadBindings.enabled`、`session.threadBindings.idleHours`、`session.threadBindings.maxAgeHours`。
    - Discord 覆盖：`channels.discord.threadBindings.enabled`、`channels.discord.threadBindings.idleHours`、`channels.discord.threadBindings.maxAgeHours`。
    - 在 spawn 时自动绑定：设置 `channels.discord.threadBindings.spawnSubagentSessions: true`。

    文档：[Sub-agents](/tools/subagents)、[Discord](/channels/discord)、[Configuration Reference](/gateway/configuration-reference)、[Slash commands](/tools/slash-commands)。

  </Accordion>

  <Accordion title="Cron 或提醒没有触发，我该检查什么？">
    Cron 运行在 Gateway 进程内部。如果 Gateway 没有持续运行，
    计划任务就不会执行。

    检查清单：

    - 确认 cron 已启用（`cron.enabled`）且没有设置 `OPENCLAW_SKIP_CRON`。
    - 检查 Gateway 是否 24/7 运行（没有睡眠/重启）。
    - 验证任务的时区设置（`--tz` 与宿主机时区）。

    调试：

    ```bash
    openclaw cron run <jobId> --force
    openclaw cron runs --id <jobId> --limit 50
    ```

    文档：[Cron jobs](/automation/cron-jobs)、[Cron vs Heartbeat](/automation/cron-vs-heartbeat)。

  </Accordion>

  <Accordion title="如何在 Linux 上安装 skills？">
    使用原生 `openclaw skills` 命令，或者将 skills 放入你的 workspace。macOS 的 Skills UI 在 Linux 上不可用。
    在 [https://clawhub.com](https://clawhub.com) 浏览 skills。

    ```bash
    openclaw skills search "calendar"
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    只有当你想发布或同步你自己的 skills 时，才需要安装单独的 `clawhub` CLI。

  </Accordion>

  <Accordion title="OpenClaw 可以按计划运行任务或在后台持续运行吗？">
    可以。使用 Gateway 调度器：

    - **Cron jobs** 用于计划或周期性任务（重启后仍会保留）。
    - **Heartbeat** 用于“主会话”的周期性检查。
    - **Isolated jobs** 用于会发布摘要或投递到聊天中的自治 agent。

    文档：[Cron jobs](/automation/cron-jobs)、[Cron vs Heartbeat](/automation/cron-vs-heartbeat)，
    [Heartbeat](/gateway/heartbeat)。

  </Accordion>

  <Accordion title="我能在 Linux 上运行仅限 Apple macOS 的 skills 吗？">
    不能直接运行。macOS skills 受 `metadata.openclaw.os` 和所需二进制文件约束，并且只有在它们在 **Gateway 主机** 上符合条件时，才会出现在系统提示中。在 Linux 上，`darwin` 专属的 skills（例如 `apple-notes`、`apple-reminders`、`things-mac`）不会加载，除非你覆盖 gating。

    你有三种受支持的模式：

    **选项 A - 将 Gateway 运行在 Mac 上（最简单）。**
    把 Gateway 运行在有 macOS 二进制文件的主机上，然后通过 [remote mode](#gateway-ports-already-running-and-remote-mode) 或 Tailscale 从 Linux 连接。由于 Gateway 主机是 macOS，skills 会正常加载。

    **选项 B - 使用 macOS node（无需 SSH）。**
    将 Gateway 运行在 Linux 上，配对一个 macOS node（菜单栏应用），并把 **Node Run Commands** 在 Mac 上设置为 “Always Ask” 或 “Always Allow”。当所需二进制文件存在于 node 上时，OpenClaw 可以将 macOS 专属 skills 视为可用。agent 会通过 `nodes` 工具执行这些 skills。如果你选择 “Always Ask”，在提示中批准 “Always Allow” 会把该命令加入 allowlist。

    **选项 C - 通过 SSH 代理 macOS 二进制（高级）。**
    保持 Gateway 在 Linux 上运行，但让所需 CLI 二进制解析为在 Mac 上执行的 SSH wrapper。然后覆盖 skill，使 Linux 也被允许，这样它仍然可用。

    1. 为二进制创建一个 SSH wrapper（示例：Apple Notes 的 `memo`）：

       ```bash
       #!/usr/bin/env bash
       set -euo pipefail
       exec ssh -T user@mac-host /opt/homebrew/bin/memo "$@"
       ```

    2. 将该 wrapper 放到 Linux 主机的 `PATH` 中（例如 `~/bin/memo`）。
    3. 覆盖 skill 元数据（workspace 或 `~/.openclaw/skills`），允许 Linux：

       ```markdown
       ---
       name: apple-notes
       description: 使用 macOS 上的 memo CLI 管理 Apple Notes。
       metadata: { "openclaw": { "os": ["darwin", "linux"], "requires": { "bins": ["memo"] } } }
       ---
       ```

    4. 开启一个新会话，让 skills 快照刷新。

  </Accordion>

  <Accordion title="你们有 Notion 或 HeyGen 集成吗？">
    目前没有内置支持。

    选项：

    - **自定义 skill / plugin：** 最适合可靠的 API 访问（Notion/HeyGen 都有 API）。
    - **浏览器自动化：** 不需要代码，但更慢，也更脆弱。

    如果你想为每个客户保留上下文（代理工作流），一个简单模式是：

    - 每个客户一个 Notion 页面（上下文 + 偏好 + 当前工作）。
    - 在会话开始时让 agent 去读取那一页。

    如果你想要原生集成，可以提交功能请求，或者构建一个针对这些 API 的 skill。

    安装 skills：

    ```bash
    openclaw skills install <skill-slug>
    openclaw skills update --all
    ```

    原生安装会落到当前 workspace 的 `skills/` 目录。若要让多个 agents 共享 skills，请把它们放到 `~/.openclaw/skills/<name>/SKILL.md`。某些 skills 需要通过 Homebrew 安装二进制；在 Linux 上这意味着 Linuxbrew（见上面的 Homebrew Linux FAQ 条目）。参见 [Skills](/tools/skills) 和 [ClawHub](/tools/clawhub)。

  </Accordion>

  <Accordion title="如何让 OpenClaw 使用我已登录的 Chrome？">
    使用内置的 `user` 浏览器配置文件，它会通过 Chrome DevTools MCP 连接：

    ```bash
    openclaw browser --browser-profile user tabs
    openclaw browser --browser-profile user snapshot
    ```

    如果你想要自定义名称，可以创建一个显式的 MCP 配置文件：

    ```bash
    openclaw browser create-profile --name chrome-live --driver existing-session
    openclaw browser --browser-profile chrome-live tabs
    ```

    这条路径是主机本地的。如果 Gateway 运行在别处，要么在浏览器机器上运行 node host，要么改用远程 CDP。

  </Accordion>
</AccordionGroup>

## 沙箱与内存

<AccordionGroup>
  <Accordion title="有专门的沙箱文档吗？">
    有。参见 [Sandboxing](/gateway/sandboxing)。如果是 Docker 专用设置（完整 gateway 在 Docker 中运行或沙箱镜像），参见 [Docker](/install/docker)。
  </Accordion>

  <Accordion title="Docker 感觉受限——如何启用完整功能？">
    默认镜像以安全优先方式运行，并以 `node` 用户启动，因此不
    包含系统包、Homebrew 或捆绑浏览器。要获得更完整的设置：

    - 使用 `OPENCLAW_HOME_VOLUME` 持久化 `/home/node`，这样缓存可以保留。
    - 使用 `OPENCLAW_DOCKER_APT_PACKAGES` 将系统依赖烘焙进镜像。
    - 通过捆绑的 CLI 安装 Playwright 浏览器：
      `node /app/node_modules/playwright-core/cli.js install chromium`
    - 设置 `PLAYWRIGHT_BROWSERS_PATH` 并确保该路径已持久化。

    文档：[Docker](/install/docker)、[Browser](/tools/browser)。

  </Accordion>

  <Accordion title="我能保持 DM 私密，同时让群组以公开/沙箱方式由同一个 agent 处理吗？">
    可以——如果你的私密流量是 **DMs**，而公开流量是 **groups**。

    使用 `agents.defaults.sandbox.mode: "non-main"`，这样群组/channel 会话（非 main keys）会在 Docker 中运行，而主 DM 会话仍然留在主机上。然后通过 `tools.sandbox.tools` 限制沙箱会话中可用的工具。

    设置演练 + 示例配置：[Groups: personal DMs + public groups](/channels/groups#pattern-personal-dms-public-groups-single-agent)

    关键配置参考：[Gateway configuration](/gateway/configuration-reference#agentsdefaultssandbox)

  </Accordion>

  <Accordion title="如何把主机文件夹挂载进沙箱？">
    将 `agents.defaults.sandbox.docker.binds` 设置为 `["host:path:mode"]`（例如 `"/home/user/src:/src:ro"`）。全局 + 按 agent 的 bind 会合并；当 `scope: "shared"` 时，会忽略 per-agent bind。对任何敏感内容使用 `:ro`，并记住 bind 会绕过沙箱文件系统边界。示例和安全说明请参见 [Sandboxing](/gateway/sandboxing#custom-bind-mounts) 和 [Sandbox vs Tool Policy vs Elevated](/gateway/sandbox-vs-tool-policy-vs-elevated#bind-mounts-security-quick-check)。
  </Accordion>

  <Accordion title="记忆是如何工作的？">
    OpenClaw 的记忆就是 agent workspace 中的 Markdown 文件：

    - `memory/YYYY-MM-DD.md` 中的每日笔记
    - `MEMORY.md` 中整理过的长期笔记（仅 main/private sessions）

    OpenClaw 还会运行一个**静默的预压缩内存刷新**，提醒模型在自动压缩前
    写入持久化笔记。它只会在 workspace 可写时运行（只读沙箱会跳过）。参见 [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="记忆总是忘东西，怎么让它稳定记住？">
    让机器人**把事实写入 memory**。长期笔记放在 `MEMORY.md` 中，
    短期上下文放在 `memory/YYYY-MM-DD.md` 中。

    这仍是我们在持续改进的领域。提醒模型保存记忆会有帮助；
    它会知道怎么做。如果它还是会忘，检查 Gateway 每次运行是否使用同一个
    workspace。

    文档：[Memory](/concepts/memory)、[Agent workspace](/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="记忆会永久保存吗？有什么限制？">
    Memory 文件存储在磁盘上，除非你删除它们，否则会一直保留。限制来自你的
    存储空间，而不是模型。**会话上下文**仍然受模型上下文窗口限制，因此
    长对话可能会压缩或截断。这就是为什么会有 memory search——它只把相关部分
    拉回上下文中。

    文档：[Memory](/concepts/memory)、[Context](/concepts/context)。

  </Accordion>

  <Accordion title="语义记忆搜索是否需要 OpenAI API key？">
    只有在你使用 **OpenAI embeddings** 时才需要。Codex OAuth 覆盖的是 chat/completions，
    **并不**授予 embeddings 访问权限，所以**使用 Codex 登录（OAuth 或
    Codex CLI 登录）**并不能帮助语义记忆搜索。OpenAI embeddings
    仍然需要真实的 API key（`OPENAI_API_KEY` 或 `models.providers.openai.apiKey`）。

    如果你没有显式设置 provider，OpenClaw 会在能够解析到 API key 时自动选择 provider
    （auth profiles、`models.providers.*.apiKey` 或环境变量）。
    它优先使用 OpenAI key（如果能解析到），否则使用 Gemini，如果也能解析则再用 Voyage，然后是 Mistral。如果没有可用的远程 key，memory
    search 会保持禁用，直到你进行配置。如果你配置并提供了本地模型路径，
    OpenClaw 会优先使用 `local`。如果你显式设置了 `memorySearch.provider = "ollama"`，
    则支持 Ollama。

    如果你想保持本地运行，请设置 `memorySearch.provider = "local"`（可选地
    再设置 `memorySearch.fallback = "none"`）。如果你想使用 Gemini embeddings，设置
    `memorySearch.provider = "gemini"` 并提供 `GEMINI_API_KEY`（或
    `memorySearch.remote.apiKey`）。我们支持 **OpenAI、Gemini、Voyage、Mistral、Ollama 或本地** embedding
    models——详见 [Memory](/concepts/memory) 的设置说明。

  </Accordion>
</AccordionGroup>

### OpenClaw 的所有数据都保存在本地吗？

<AccordionGroup>
  <Accordion title="OpenClaw 使用的所有数据都保存在本地吗？">
    不——**OpenClaw 的 state 是本地的**，但**外部服务仍然能看到你发送给它们的内容**。

    - **默认本地：** 会话、记忆文件、配置和 workspace 都保存在 Gateway 主机上
      （`~/.openclaw` + 你的 workspace 目录）。
    - **按需远程：** 你发送给模型 providers（Anthropic/OpenAI/等）的消息会到
      它们的 API，而聊天平台（WhatsApp/Telegram/Slack/等）会把消息数据存储在它们的
      服务器上。
    - **你可以控制足迹：** 使用本地模型可以让 prompts 保留在你的机器上，但 channel
      流量仍然会经过该 channel 的服务器。

    相关：[Agent workspace](/concepts/agent-workspace)、[Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="OpenClaw 把数据存在哪里？">
    所有内容都位于 `$OPENCLAW_STATE_DIR` 下（默认：`~/.openclaw`）：

    | Path                                                            | 作用                                                            |
    | --------------------------------------------------------------- | ------------------------------------------------------------------ |
    | `$OPENCLAW_STATE_DIR/openclaw.json`                             | 主配置（JSON5）                                                |
    | `$OPENCLAW_STATE_DIR/credentials/oauth.json`                    | 旧版 OAuth 导入（首次使用时复制到 auth profiles 中）       |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth-profiles.json` | Auth profiles（OAuth、API keys，以及可选的 `keyRef`/`tokenRef`）  |
    | `$OPENCLAW_STATE_DIR/secrets.json`                              | 可选的文件化 secret 负载，用于 `file` SecretRef providers |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/agent/auth.json`          | 旧版兼容文件（会清除静态 `api_key` 条目）          |
    | `$OPENCLAW_STATE_DIR/credentials/`                              | Provider 状态（例如 `whatsapp/<accountId>/creds.json`）            |
    | `$OPENCLAW_STATE_DIR/agents/`                                   | 每个 agent 的状态（agentDir + sessions）                              |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/`                | 会话历史和状态（按 agent）                           |
    | `$OPENCLAW_STATE_DIR/agents/<agentId>/sessions/sessions.json`   | 会话元数据（按 agent）                                       |

    旧版单 agent 路径：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）。

    你的 **workspace**（AGENTS.md、memory 文件、skills 等）是独立的，并通过 `agents.defaults.workspace`
    配置（默认：`~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title="AGENTS.md / SOUL.md / USER.md / MEMORY.md 应该放在哪里？">
    这些文件位于 **agent workspace** 中，而不是 `~/.openclaw`。

    - **Workspace（按 agent）**：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`、
      `MEMORY.md`（如果没有 `MEMORY.md`，则回退到旧版 `memory.md`）、
      `memory/YYYY-MM-DD.md`、可选的 `HEARTBEAT.md`。
    - **State dir（`~/.openclaw`）**：配置、凭据、auth profiles、sessions、logs，
      以及共享 skills（`~/.openclaw/skills`）。

    默认 workspace 是 `~/.openclaw/workspace`，可通过以下方式配置：

    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
    }
    ```

    如果机器人在重启后“忘记了”，请确认 Gateway 每次启动都使用同一个
    workspace（并记住：远程模式使用的是**gateway 主机的** workspace，而不是你本地笔记本的）。

    提示：如果你想要持久的行为或偏好，请让机器人**把它写入 AGENTS.md 或 MEMORY.md**
    ，而不是依赖聊天历史。

    参见 [Agent workspace](/concepts/agent-workspace) 和 [Memory](/concepts/memory)。

  </Accordion>

  <Accordion title="推荐的备份策略">
    将你的 **agent workspace** 放入一个**私有** git 仓库，并备份到私有位置
    （例如 GitHub private）。这样可以保存 memory + AGENTS/SOUL/USER
    文件，并让你之后能够恢复这个助手的“脑子”。

    不要提交 `~/.openclaw` 下的任何内容（凭据、会话、token 或加密的 secrets 负载）。
    如果你需要完整恢复，请分别备份 workspace 和 state directory
    （参见上面的迁移问题）。

    文档：[Agent workspace](/concepts/agent-workspace)。

  </Accordion>

  <Accordion title="如何彻底卸载 OpenClaw？">
    参见专门指南：[Uninstall](/install/uninstall)。
  </Accordion>

  <Accordion title="agent 可以在 workspace 之外工作吗？">
    可以。workspace 是**默认 cwd** 和记忆锚点，不是硬性沙箱。
    相对路径会在 workspace 内解析，但绝对路径可以访问其他
    宿主位置，除非启用了沙箱。如果你需要隔离，请使用
    [`agents.defaults.sandbox`](/gateway/sandboxing) 或按 agent 的沙箱设置。如果你
    想让某个仓库成为默认工作目录，请把该 agent 的
    `workspace` 指向仓库根目录。OpenClaw 仓库本身只是源码；除非你有意
    让 agent 在其中工作，否则请把 workspace 保持独立。

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

  <Accordion title="我现在是 remote mode——session store 在哪里？">
    session state 归 **gateway 主机** 所有。如果你处于 remote mode，你关心的 session store
    在远程机器上，而不是你的本地笔记本上。参见 [Session management](/concepts/session)。
  </Accordion>
</AccordionGroup>

## 配置基础

<AccordionGroup>
  <Accordion title="配置是什么格式？放在哪里？">
    OpenClaw 从 `$OPENCLAW_CONFIG_PATH` 读取可选的 **JSON5** 配置（默认：`~/.openclaw/openclaw.json`）：

    ```
    $OPENCLAW_CONFIG_PATH
    ```

    如果文件缺失，则会使用相对安全的默认值（包括默认 workspace 为 `~/.openclaw/workspace`）。

  </Accordion>

  <Accordion title='我设置了 gateway.bind: "lan"（或 "tailnet"），现在什么都不监听 / UI 显示 unauthorized'>
    非 loopback 绑定**需要认证**。请配置 `gateway.auth.mode` + `gateway.auth.token`（或使用 `OPENCLAW_GATEWAY_TOKEN`）。

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

    - `gateway.remote.token` / `.password` 本身**不会**启用本地 gateway 认证。
    - 仅当 `gateway.auth.*` 未设置时，本地调用路径才可以把 `gateway.remote.*` 作为后备。
    - 如果 `gateway.auth.token` / `gateway.auth.password` 通过 SecretRef 显式配置但未解析，则解析会失败并关闭（不会被远程后备遮蔽）。
    - Control UI 通过 `connect.params.auth.token` 进行认证（存储在 app/UI 设置中）。避免把 token 放在 URL 里。

  </Accordion>

  <Accordion title="为什么现在本地 localhost 也需要 token？">
    OpenClaw 默认会强制 token 认证，即使是 loopback 也一样。如果没有配置 token，gateway 启动时会自动生成一个并保存到 `gateway.auth.token`，因此**本地 WS 客户端必须认证**。这可以阻止其他本地进程调用 Gateway。

    如果你**确实**想开放 loopback，请在配置中显式设置 `gateway.auth.mode: "none"`。Doctor 也可以随时为你生成 token：`openclaw doctor --generate-gateway-token`。

  </Accordion>

  <Accordion title="更改 config 后必须重启吗？">
    Gateway 会监视 config，并支持热重载：

    - `gateway.reload.mode: "hybrid"`（默认）：安全变更热应用，关键变更需重启
    - 也支持 `hot`、`restart`、`off`

  </Accordion>

  <Accordion title="如何关闭有趣的 CLI 标语？">
    在 config 中设置 `cli.banner.taglineMode`：

    ```json5
    {
      cli: {
        banner: {
          taglineMode: "off", // random | default | off
        },
      },
    }
    ```

    - `off`：隐藏标语文本，但保留 banner 标题/版本行。
    - `default`：每次都使用 `All your chats, one OpenClaw.`。
    - `random`：轮换显示有趣/季节性标语（默认行为）。
    - 如果你想完全不显示 banner，可设置环境变量 `OPENCLAW_HIDE_BANNER=1`。

  </Accordion>

  <Accordion title="如何启用 web search（和 web fetch）？">
    `web_fetch` 不需要 API key。`web_search` 需要你所选 provider 的 key（Brave、Gemini、Grok、Kimi 或 Perplexity）。
    **推荐：**运行 `openclaw configure --section web` 并选择一个 provider。
    环境变量替代方案：

    - Brave: `BRAVE_API_KEY`
    - Gemini: `GEMINI_API_KEY`
    - Grok: `XAI_API_KEY`
    - Kimi: `KIMI_API_KEY` 或 `MOONSHOT_API_KEY`
    - Perplexity: `PERPLEXITY_API_KEY` 或 `OPENROUTER_API_KEY`

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
          },
        },
      },
    }
    ```

    现在 provider 特定的 web-search 配置位于 `plugins.entries.<plugin>.config.webSearch.*` 下。
    旧的 `tools.web.search.*` provider 路径目前仍会临时加载以保持兼容性，但新配置不应再使用它们。

    说明：

    - 如果你使用 allowlist，请添加 `web_search`/`web_fetch` 或 `group:web`。
    - `web_fetch` 默认启用（除非显式关闭）。
    - Daemon 会从 `~/.openclaw/.env`（或服务环境）读取环境变量。

    文档：[Web tools](/tools/web)。

  </Accordion>

  <Accordion title="config.apply 把我的配置清空了。我该如何恢复并避免？">
    `config.apply` 会替换**整个配置**。如果你发送的是一个部分对象，其余内容都会被移除。

    恢复方法：

    - 从备份恢复（git 或复制保存的 `~/.openclaw/openclaw.json`）。
    - 如果没有备份，重新运行 `openclaw doctor` 并重新配置 channels/models。
    - 如果这是意外情况，请提交 bug，并附上你最后已知的配置或任何备份。
    - 本地编码 agent 通常可以根据日志或历史重建一个可工作的配置。

    避免方法：

    - 对小改动使用 `openclaw config set`。
    - 对交互式编辑使用 `openclaw configure`。

    文档：[Config](/cli/config)、[Configure](/cli/configure)、[Doctor](/gateway/doctor)。

  </Accordion>

  <Accordion title="我如何运行一个中心 Gateway，并在不同设备上使用专门的 worker？">
    常见模式是**一个 Gateway**（例如 Raspberry Pi）加上 **nodes** 和 **agents**：

    - **Gateway（中心）：** 负责 channels（Signal/WhatsApp）、路由和会话。
    - **Nodes（设备）：** Mac/iOS/Android 作为外设连接，并暴露本地工具（`system.run`、`canvas`、`camera`）。
    - **Agents（workers）：** 用于特定角色的独立大脑/workspace（例如“Hetzner ops”、“Personal data”）。
    - **Sub-agents：** 当你需要并行处理时，从主 agent 中派生后台工作。
    - **TUI：** 连接到 Gateway 并切换 agents/sessions。

    文档：[Nodes](/nodes)、[Remote access](/gateway/remote)、[Multi-Agent Routing](/concepts/multi-agent)、[Sub-agents](/tools/subagents)、[TUI](/web/tui)。

  </Accordion>

  <Accordion title="OpenClaw 浏览器可以无头运行吗？">
    可以。这是一个配置选项：

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

    默认是 `false`（有头模式）。无头模式更容易触发某些网站的反机器人检查。参见 [Browser](/tools/browser)。

    无头模式使用**同一个 Chromium 引擎**，适用于大多数自动化场景（表单、点击、抓取、登录）。主要区别：

    - 没有可见浏览器窗口（如果你需要视觉反馈，请使用截图）。
    - 某些网站在无头模式下对自动化更严格（CAPTCHA、反机器人）。
      例如，X/Twitter 经常会阻止无头会话。

  </Accordion>

  <Accordion title="如何用 Brave 来控制浏览器？">
    将 `browser.executablePath` 设置为你的 Brave 二进制路径（或任何基于 Chromium 的浏览器），然后重启 Gateway。
    详细配置示例参见 [Browser](/tools/browser#use-brave-or-another-chromium-based-browser)。
  </Accordion>
</AccordionGroup>

## 远程 Gateways 与节点

<AccordionGroup>
  <Accordion title="Telegram、gateway 和 nodes 之间的命令是如何传递的？">
    Telegram 消息由 **gateway** 处理。gateway 运行 agent，然后在需要 node 工具时通过 **Gateway WebSocket** 调用 nodes：

    Telegram → Gateway → Agent → `node.*` → Node → Gateway → Telegram

    Nodes 不会看到入站 provider 流量；它们只接收 node RPC 调用。

  </Accordion>

  <Accordion title="如果 Gateway 托管在远程，我的 agent 如何访问我的电脑？">
    简短答案：**把你的电脑配对为 node**。Gateway 运行在别处，但它可以通过 Gateway WebSocket 在你的本地机器上调用 `node.*` 工具（屏幕、摄像头、系统）。

    典型设置：

    1. 在常开主机（VPS/家用服务器）上运行 Gateway。
    2. 将 Gateway 主机 + 你的电脑放在同一个 tailnet 中。
    3. 确保 Gateway WS 可达（tailnet 绑定或 SSH 隧道）。
    4. 在本地打开 macOS app，并使用 **Remote over SSH** 模式连接（或直接 tailnet 连接），
       这样它就可以注册为 node。
    5. 在 Gateway 上批准该 node：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    不需要单独的 TCP bridge；nodes 通过 Gateway WebSocket 连接。

    安全提醒：配对 macOS node 会允许在该机器上使用 `system.run`。只配对你信任的设备，并阅读 [Security](/gateway/security)。

    文档：[Nodes](/nodes)、[Gateway protocol](/gateway/protocol)、[macOS remote mode](/platforms/mac/remote)、[Security](/gateway/security)。

  </Accordion>

  <Accordion title="Tailscale 已连接，但我没有收到回复，怎么办？">
    检查基础项：

    - Gateway 正在运行：`openclaw gateway status`
    - Gateway 健康状态：`openclaw status`
    - Channel 健康状态：`openclaw channels status`

    然后验证认证和路由：

    - 如果你使用 Tailscale Serve，请确保 `gateway.auth.allowTailscale` 设置正确。
    - 如果你通过 SSH 隧道连接，请确认本地隧道是开启的，并且指向正确端口。
    - 确认你的 allowlists（DM 或 group）包含你的账户。

    文档：[Tailscale](/gateway/tailscale)、[Remote access](/gateway/remote)、[Channels](/channels)。

  </Accordion>

  <Accordion title="两个 OpenClaw 实例可以互相通信吗（本地 + VPS）？">
    可以。没有内置的“bot-to-bot”桥，但你可以用几种可靠方式把它接起来：

    **最简单：** 使用双方都能访问的普通聊天 channel（Telegram/Slack/WhatsApp）。
    让 Bot A 给 Bot B 发消息，然后让 Bot B 按正常方式回复。

    **CLI 桥接（通用）：** 运行一个脚本，调用另一个 Gateway 的
    `openclaw agent --message ... --deliver`，目标指向另一个 bot 正在监听的聊天。
    如果其中一个 bot 在远程 VPS 上，请通过 SSH/Tailscale 将你的 CLI 指向那个远程 Gateway
    （参见 [Remote access](/gateway/remote)）。

    示例模式（从能访问目标 Gateway 的机器上运行）：

    ```bash
    openclaw agent --message "来自本地 bot 的问候" --deliver --channel telegram --reply-to <chat-id>
    ```

    提示：加一道保护措施，避免两个 bot 无限循环（仅提及、channel allowlists，或“不要回复 bot 消息”的规则）。

    文档：[Remote access](/gateway/remote)、[Agent CLI](/cli/agent)、[Agent send](/tools/agent-send)。

  </Accordion>

  <Accordion title="多个 agent 需要分别使用不同 VPS 吗？">
    不需要。一个 Gateway 可以承载多个 agent，每个都有自己的 workspace、模型默认值
    和路由。这是正常设置方式，也比每个 agent 单独运行一个 VPS 便宜得多、简单得多。

    只有当你需要硬隔离（安全边界）或非常不同且不想共享的配置时，才使用多个 VPS。
    否则，保持一个 Gateway，并使用多个 agents 或 sub-agents。

  </Accordion>

  <Accordion title="在个人笔记本上使用 node 相比从 VPS 用 SSH 有什么好处？">
    有——nodes 是从远程 Gateway 访问你笔记本的首选方式，而且
    不止提供 shell 访问。Gateway 运行在 macOS/Linux（Windows 通过 WSL2），而且
    很轻量（小型 VPS 或 Raspberry Pi 级别机器就够；4 GB RAM 已经很充足），所以常见
    方案是一个常开主机加上你的笔记本作为 node。

    - **不需要入站 SSH。** Nodes 通过 Gateway WebSocket 对外连接，并使用设备配对。
    - **更安全的执行控制。** `system.run` 受该笔记本上的 node allowlists/approvals 约束。
    - **更多设备工具。** Nodes 除了 `system.run` 之外，还暴露 `canvas`、`camera` 和 `screen`。
    - **本地浏览器自动化。** 把 Gateway 留在 VPS 上，但通过笔记本上的 node host 本地运行 Chrome，或者通过 Chrome MCP 附加到宿主机上的本地 Chrome。

    SSH 适合临时 shell 访问，但 nodes 更适合持续的 agent 工作流和
    设备自动化。

    文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)、[Browser](/tools/browser)。

  </Accordion>

  <Accordion title="nodes 会运行 gateway 服务吗？">
    不会。每台主机上通常只应运行**一个 gateway**，除非你有意运行隔离配置（参见 [Multiple gateways](/gateway/multiple-gateways)）。Nodes 是连接到
    gateway 的外设（iOS/Android nodes，或菜单栏应用中的 macOS “node mode”）。对于无头 node
    主机和 CLI 控制，请参见 [Node host CLI](/cli/node)。

    对于 `gateway`、`discovery` 和 `canvasHost` 的更改，需要完整重启。

  </Accordion>

  <Accordion title="有 API / RPC 方式来应用 config 吗？">
    有。`config.apply` 会验证并写入完整配置，并在操作过程中重启 Gateway。
  </Accordion>

  <Accordion title="首次安装时最小且合理的配置">
    ```json5
    {
      agents: { defaults: { workspace: "~/.openclaw/workspace" } },
      channels: { whatsapp: { allowFrom: ["+15555550123"] } },
    }
    ```

    这会设置你的 workspace，并限制谁可以触发机器人。

  </Accordion>

  <Accordion title="如何在 VPS 上设置 Tailscale 并从我的 Mac 连接？">
    最小步骤：

    1. **在 VPS 上安装并登录**

       ```bash
       curl -fsSL https://tailscale.com/install.sh | sh
       sudo tailscale up
       ```

    2. **在你的 Mac 上安装并登录**
       - 使用 Tailscale 应用并登录到同一个 tailnet。
    3. **启用 MagicDNS（推荐）**
       - 在 Tailscale 管理控制台中启用 MagicDNS，这样 VPS 就会有稳定名称。
    4. **使用 tailnet 主机名**
       - SSH：`ssh user@your-vps.tailnet-xxxx.ts.net`
       - Gateway WS：`ws://your-vps.tailnet-xxxx.ts.net:18789`

    如果你想在不使用 SSH 的情况下打开 Control UI，请在 VPS 上使用 Tailscale Serve：

    ```bash
    openclaw gateway --tailscale serve
    ```

    这会让 gateway 绑定到 loopback，并通过 Tailscale 暴露 HTTPS。参见 [Tailscale](/gateway/tailscale)。

  </Accordion>

  <Accordion title="如何把 Mac node 连接到远程 Gateway（Tailscale Serve）？">
    Serve 暴露的是 **Gateway Control UI + WS**。Nodes 通过相同的 Gateway WS 端点连接。

    推荐设置：

    1. **确保 VPS + Mac 在同一个 tailnet 中**。
    2. **在 macOS app 中使用 Remote 模式**（SSH 目标可以是 tailnet 主机名）。
       该 app 会隧道传输 Gateway 端口并作为 node 连接。
    3. **在 gateway 上批准该 node**：

       ```bash
       openclaw devices list
       openclaw devices approve <requestId>
       ```

    文档：[Gateway protocol](/gateway/protocol)、[Discovery](/gateway/discovery)、[macOS remote mode](/platforms/mac/remote)。

  </Accordion>

  <Accordion title="我应该安装到第二台笔记本上，还是只添加一个 node？">
    如果你只需要在第二台笔记本上使用**本地工具**（screen/camera/exec），就把它作为
    **node** 添加。这样可以保持单一 Gateway，避免重复配置。本地 node 工具
    目前仅支持 macOS，但我们计划扩展到其他操作系统。

    只有在你需要**硬隔离**或两个完全独立的 bot 时，才安装第二个 Gateway。

    文档：[Nodes](/nodes)、[Nodes CLI](/cli/nodes)、[Multiple gateways](/gateway/multiple-gateways)。

  </Accordion>
</AccordionGroup>

先安装另一种版本，再执行 `openclaw doctor` 确保 Gateway 指向正确可执行文件。

<AccordionGroup>
  <Accordion title="OpenClaw 如何加载环境变量？">
    OpenClaw 会读取父进程（shell、launchd/systemd、CI 等）中的环境变量，并额外加载：

    - 当前工作目录下的 `.env`
    - 来自 `~/.openclaw/.env` 的全局备用 `.env`（即 `$OPENCLAW_STATE_DIR/.env`）

    这两个 `.env` 文件都不会覆盖已有环境变量。

    你也可以在 config 中定义内联环境变量（仅在进程环境中缺失时应用）：

    ```json5
    {
      env: {
        OPENROUTER_API_KEY: "sk-or-...",
        vars: { GROQ_API_KEY: "gsk-..." },
      },
    }
    ```

    完整的优先级和来源请参见 [/environment](/help/environment)。

  </Accordion>

  <Accordion title="我通过 service 启动了 Gateway，但环境变量不见了，怎么办？">
    两个常见修复方法：

    1. 把缺失的 key 放到 `~/.openclaw/.env`，这样即使 service 没有继承你的 shell 环境也能读取。
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

    这会运行你的登录 shell，并只导入缺失的预期 key（绝不会覆盖已有值）。环境变量等价项：
    `OPENCLAW_LOAD_SHELL_ENV=1`、`OPENCLAW_SHELL_ENV_TIMEOUT_MS=15000`。

  </Accordion>

  <Accordion title='我设置了 COPILOT_GITHUB_TOKEN，但 models status 显示 "Shell env: off."，为什么？'>
    `openclaw models status` 会报告是否启用了**shell env 导入**。“Shell env: off”
    并不意味着你的环境变量缺失——它只是表示 OpenClaw 不会自动加载
    你的登录 shell。

    如果 Gateway 作为 service 运行（launchd/systemd），它不会继承你的 shell
    环境。你可以通过以下方式之一修复：

    1. 把 token 放到 `~/.openclaw/.env`：

       ```
       COPILOT_GITHUB_TOKEN=...
       ```

    2. 或启用 shell 导入（`env.shellEnv.enabled: true`）。
    3. 或把它加入你的 config `env` 块（仅在缺失时应用）。

    然后重启 gateway 并重新检查：

    ```bash
    openclaw models status
    ```

    Copilot token 会从 `COPILOT_GITHUB_TOKEN` 读取（也支持 `GH_TOKEN` / `GITHUB_TOKEN`）。
    参见 [/concepts/model-providers](/concepts/model-providers) 和 [/environment](/help/environment)。

  </Accordion>
</AccordionGroup>

## 会话与多聊天

<AccordionGroup>
  <Accordion title="如何开始一段新的对话？">
    发送 `/new` 或 `/reset` 作为独立消息。参见 [Session management](/concepts/session)。
  </Accordion>

  <Accordion title="如果我一直不发送 /new，session 会自动重置吗？">
    会。sessions 会在 `session.idleMinutes` 之后过期（默认 **60**）。**下一条**
    消息会为该 chat key 开启一个新的 session id。这不会删除
    transcripts——只是开始一个新 session。

    ```json5
    {
      session: {
        idleMinutes: 240,
      },
    }
    ```

  </Accordion>

  <Accordion title="有没有办法创建一个 OpenClaw 实例团队（一个 CEO 和许多 agents）？">
    有，通过 **multi-agent routing** 和 **sub-agents**。你可以创建一个协调
    agent 和若干 worker agents，每个都有自己的 workspace 和模型。

    但话说回来，这更适合作为一个**有趣的实验**。它很耗 tokens，而且通常
    不如使用一个 bot 和多个独立 sessions 高效。我们设想的典型模型是一个你与之对话的 bot，
    并通过不同的 sessions 处理并行工作。这个 bot 也可以在需要时派生 sub-agents。

    文档：[Multi-agent routing](/concepts/multi-agent)、[Sub-agents](/tools/subagents)、[Agents CLI](/cli/agents)。

  </Accordion>

  <Accordion title="为什么 context 在任务中途被截断了？如何避免？">
    session context 受模型窗口限制。长聊天、大工具输出或大量
    文件都可能触发压缩或截断。

    有帮助的方法：

    - 让机器人总结当前状态并写入文件。
    - 在长任务前使用 `/compact`，在切换主题时使用 `/new`。
    - 将重要上下文保存在 workspace 中，并让机器人重新读回。
    - 对长任务或并行工作使用 sub-agents，让主聊天保持更短。
    - 如果这种情况经常发生，选择更大上下文窗口的模型。

  </Accordion>

  <Accordion title="如何彻底重置 OpenClaw 但保留安装？">
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

    - 如果 onboarding 检测到已有配置，也会提供 **Reset**。参见 [Onboarding (CLI)](/start/wizard)。
    - 如果你使用了 profile（`--profile` / `OPENCLAW_PROFILE`），请分别重置每个 state dir（默认是 `~/.openclaw-<profile>`）。
    - Dev reset：`openclaw gateway --dev --reset`（仅限 dev；会清空 dev 配置 + 凭据 + sessions + workspace）。

  </Accordion>

  <Accordion title='我遇到 "context too large" 错误——该如何 reset 或 compact？'>
    使用以下任一方式：

    - **Compact**（保留对话，但会总结较早的轮次）：

      ```
      /compact
      ```

      或 `/compact <instructions>` 来指导摘要。

    - **Reset**（为同一个 chat key 开启新的 session id）：

      ```
      /new
      /reset
      ```

    如果一直发生：

    - 启用或调整 **session pruning**（`agents.defaults.contextPruning`）来裁剪旧的工具输出。
    - 使用更大上下文窗口的模型。

    文档：[Compaction](/concepts/compaction)、[Session pruning](/concepts/session-pruning)、[Session management](/concepts/session)。

  </Accordion>

  <Accordion title='为什么我会看到 "LLM request rejected: messages.content.tool_use.input field required"？'>
    这是一个 provider 校验错误：模型发出了一个 `tool_use` 块，但缺少必需的
    `input`。这通常意味着 session 历史已过时或损坏（常见于长线程
    或工具/模式变更之后）。

    解决办法：使用 `/new`（独立消息）开启新的 session。

  </Accordion>

  <Accordion title="为什么我每 30 分钟会收到 heartbeat 消息？">
    Heartbeats 默认每 **30 分钟** 运行一次。你可以调整或禁用它们：

    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "2h", // 或 "0m" 来禁用
          },
        },
      },
    }
    ```

    如果 `HEARTBEAT.md` 存在但实际上为空（只有空行和类似 `# Heading` 的 markdown
    标题），OpenClaw 会跳过 heartbeat 运行以节省 API 调用。
    如果该文件不存在，heartbeat 仍会运行，由模型决定要做什么。

    按 agent 的覆盖使用 `agents.list[].heartbeat`。文档：[Heartbeat](/gateway/heartbeat)。

  </Accordion>

  <Accordion title='我需要把 "bot account" 添加到 WhatsApp 群组吗？'>
    不需要。OpenClaw 运行在**你自己的账户**上，所以如果你在群里，OpenClaw 就能看到它。
    默认情况下，群组回复会被阻止，直到你允许发送者（`groupPolicy: "allowlist"`）。

    如果你希望只有**你**能触发群组回复：

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
    方案 1（最快）：跟踪日志并在群里发一条测试消息：

    ```bash
    openclaw logs --follow --json
    ```

    查找以 `@g.us` 结尾的 `chatId`（或 `from`），例如：
    `1234567890-1234567890@g.us`。

    方案 2（如果已经配置/加入 allowlist）：从配置中列出群组：

    ```bash
    openclaw directory groups list --channel whatsapp
    ```

    文档：[WhatsApp](/channels/whatsapp)、[Directory](/cli/directory)、[Logs](/cli/logs)。

  </Accordion>

  <Accordion title="为什么 OpenClaw 在群里不回复？">
    两个常见原因：

    - mention gating 开启了（默认）。你必须 @mention 机器人（或匹配 `mentionPatterns`）。
    - 你配置了 `channels.whatsapp.groups` 但没有包含 `"*"`，而该群不在 allowlist 中。

    参见 [Groups](/channels/groups) 和 [Group messages](/channels/group-messages)。

  </Accordion>

  <Accordion title="群组/线程会和 DM 共享上下文吗？">
    直接聊天默认会折叠到主 session。群组/channel 有自己的 session keys，Telegram topics / Discord threads 是独立 sessions。参见 [Groups](/channels/groups) 和 [Group messages](/channels/group-messages)。
  </Accordion>

  <Accordion title="我可以创建多少 workspace 和 agent？">
    没有硬性限制。几十个（甚至几百个）都没问题，但要注意：

    - **磁盘增长：** sessions + transcripts 存放在 `~/.openclaw/agents/<agentId>/sessions/` 下。
    - **token 成本：** 更多 agents 意味着更多并发模型使用。
    - **运维开销：** 每个 agent 的 auth profiles、workspaces 和 channel 路由。

    提示：

    - 每个 agent 保持一个**活跃** workspace（`agents.defaults.workspace`）。
    - 如果磁盘增长，清理旧 sessions（删除 JSONL 或存储条目）。
    - 使用 `openclaw doctor` 找出多余的 workspaces 和 profile 不匹配。

  </Accordion>

  <Accordion title="我可以同时运行多个 bot 或 chats（Slack），应该怎么设置？">
    可以。使用 **Multi-Agent Routing** 运行多个隔离的 agents，并按
    channel/account/peer 路由入站消息。Slack 作为 channel 是受支持的，并且可以绑定到特定 agents。

    浏览器访问很强大，但并不是“人类能做的都能做”——反机器人、CAPTCHA 和 MFA
    仍可能阻止自动化。要获得最可靠的浏览器控制，请在宿主机上使用本地 Chrome MCP，
    或在实际运行浏览器的机器上使用 CDP。

    最佳实践设置：

    - 常开 Gateway 主机（VPS/Mac mini）。
    - 每个角色一个 agent（绑定）。
    - 将 Slack channel 绑定到这些 agents。
    - 需要时通过 Chrome MCP 或 node 使用本地浏览器。

    文档：[Multi-Agent Routing](/concepts/multi-agent)、[Slack](/channels/slack)，
    [Browser](/tools/browser)、[Nodes](/nodes)。

  </Accordion>
</AccordionGroup>

## 模型：默认、选择、别名、切换

<AccordionGroup>
  <Accordion title='“默认模型”是什么？'>
    OpenClaw 的默认模型就是你设置在：

    ```
    agents.defaults.model.primary
    ```

    模型引用格式为 `provider/model`（示例：`anthropic/claude-opus-4-6`）。如果你省略 provider，OpenClaw 目前会临时假定 `anthropic` 作为弃用兼容回退——但你仍然应该**显式**设置 `provider/model`。

  </Accordion>

  <Accordion title="推荐用什么模型？">
    **推荐默认：** 使用你 provider 栈中可用的最强最新一代模型。
    **对于启用工具或输入不可信的 agents：** 优先考虑模型能力而不是成本。
    **对于日常/低风险聊天：** 使用更便宜的 fallback 模型，并按 agent 角色路由。

    MiniMax 有自己的文档：[MiniMax](/providers/minimax) 和
    [Local models](/gateway/local-models)。

    经验法则：高风险工作使用你**能负担得起的最佳模型**，日常聊天或摘要则使用更便宜的
    模型。你可以按 agent 路由模型，并使用 sub-agents 并行处理长任务（每个 sub-agent 都会消耗 tokens）。参见 [Models](/concepts/models) 和
    [Sub-agents](/tools/subagents)。

    强烈警告：较弱/过度量化的模型更容易受到 prompt
    injection 和不安全行为的影响。参见 [Security](/gateway/security)。

    更多背景：[Models](/concepts/models)。

  </Accordion>

  <Accordion title="如何在不清空配置的情况下切换模型？">
    使用 **模型命令** 或仅编辑 **model** 字段。避免整体替换 config。

    安全选项：

    - 聊天中的 `/model`（快速、按会话）
    - `openclaw models set ...`（只更新模型配置）
    - `openclaw configure --section model`（交互式）
    - 编辑 `~/.openclaw/openclaw.json` 中的 `agents.defaults.model`

    避免使用带部分对象的 `config.apply`，除非你确实想替换整个配置。
    如果你不小心覆盖了配置，请从备份恢复，或重新运行 `openclaw doctor` 修复。

    文档：[Models](/concepts/models)、[Configure](/cli/configure)、[Config](/cli/config)、[Doctor](/gateway/doctor)。

  </Accordion>

  <Accordion title="我可以使用自托管模型（llama.cpp、vLLM、Ollama）吗？">
    可以。Ollama 是本地模型最容易的路径。

    最快设置：

    1. 从 `https://ollama.com/download` 安装 Ollama
    2. 拉取一个本地模型，例如 `ollama pull glm-4.7-flash`
    3. 如果你也想使用 Ollama Cloud，运行 `ollama signin`
    4. 运行 `openclaw onboard` 并选择 `Ollama`
    5. 选择 `Local` 或 `Cloud + Local`

    说明：

    - `Cloud + Local` 会同时提供 Ollama Cloud 模型和你的本地 Ollama 模型
    - 像 `kimi-k2.5:cloud` 这样的云模型不需要本地拉取
    - 如需手动切换，可使用 `openclaw models list` 和 `openclaw models set ollama/<model>`

    安全说明：较小或高度量化的模型更容易遭受 prompt
    injection。对于任何可以使用工具的 bot，我们强烈建议使用**大模型**。
    如果你仍然想使用小模型，请启用沙箱和严格的工具 allowlists。

    文档：[Ollama](/providers/ollama)、[Local models](/gateway/local-models)，
    [Model providers](/concepts/model-providers)、[Security](/gateway/security)，
    [Sandboxing](/gateway/sandboxing)。

  </Accordion>

  <Accordion title="OpenClaw、Flawd 和 Krill 使用什么模型？">
    - 这些部署可能不同，并且会随时间变化；没有固定的 provider 推荐。
    - 使用 `openclaw models status` 检查每个 gateway 当前的运行时设置。
    - 对于安全敏感/启用工具的 agents，请使用可获得的最强最新一代模型。
  </Accordion>

  <Accordion title="如何即时切换模型（无需重启）？">
    使用 `/model` 命令作为独立消息：

    ```
    /model sonnet
    /model haiku
    /model opus
    /model gpt
    /model gpt-mini
    /model gemini
    /model gemini-flash
    ```

    你可以通过 `/model`、`/model list` 或 `/model status` 列出可用模型。

    `/model`（和 `/model list`）会显示一个简洁、带编号的选择器。按数字选择：

    ```
    /model 3
    ```

    你也可以为该 provider 强制指定某个 auth profile（按 session）：

    ```
    /model opus@anthropic:default
    /model opus@anthropic:work
    ```

    提示：`/model status` 会显示当前活跃的是哪个 agent、正在使用哪个 `auth-profiles.json`
    文件，以及下一个将尝试哪个 auth profile。
    它还会在可用时显示已配置的 provider endpoint（`baseUrl`）和 API 模式（`api`）。

    **如何取消我用 @profile 固定的 profile？**

    重新运行 `/model`，但不要带 `@profile` 后缀：

    ```
    /model anthropic/claude-opus-4-6
    ```

    如果你想回到默认值，可以从 `/model` 中选择它（或发送 `/model <default provider/model>`）。
    使用 `/model status` 确认当前活跃的 auth profile。

  </Accordion>

  <Accordion title="我能用 GPT 5.2 做日常任务、用 Codex 5.3 编程吗？">
    可以。将一个设为默认，然后按需切换：

    - **快速切换（按会话）：** 日常任务用 `/model gpt-5.2`，使用 Codex OAuth 编程时用 `/model openai-codex/gpt-5.4`。
    - **默认 + 切换：** 将 `agents.defaults.model.primary` 设为 `openai/gpt-5.2`，然后在编程时切换到 `openai-codex/gpt-5.4`（或者反过来）。
    - **Sub-agents：** 将编程任务路由给默认模型不同的 sub-agents。

    参见 [Models](/concepts/models) 和 [Slash commands](/tools/slash-commands)。

  </Accordion>

  <Accordion title='为什么我会看到 "Model ... is not allowed"，然后没有回复？'>
    如果设置了 `agents.defaults.models`，它就会成为 `/model` 和任何
    会话覆盖的**允许列表**。选择不在该列表中的模型会返回：

    ```
    Model "provider/model" is not allowed. Use /model to list available models.
    ```

    该错误会**替代**正常回复。解决方法：将模型添加到
    `agents.defaults.models`，移除 allowlist，或从 `/model list` 中选择一个模型。

  </Accordion>

  <Accordion title='为什么我会看到 "Unknown model: minimax/MiniMax-M2.7"？'>
    这表示**provider 未配置**（未找到 MiniMax provider 配置或 auth
    profile），因此无法解析该模型。

    修复清单：

    1. 升级到当前 OpenClaw 版本（或从源码 `main` 运行），然后重启 gateway。
    2. 确保已配置 MiniMax（向导或 JSON），或者环境/auth profiles 中存在 MiniMax API key，
       以便 provider 可被注入。
    3. 使用精确的 model id（区分大小写）：`minimax/MiniMax-M2.7` 或
       `minimax/MiniMax-M2.7-highspeed`。
    4. 运行：

       ```bash
       openclaw models list
       ```

       然后从列表中选择（或在聊天中使用 `/model list`）。

    参见 [MiniMax](/providers/minimax) 和 [Models](/concepts/models)。

  </Accordion>

  <Accordion title="我可以默认使用 MiniMax，再用 OpenAI 处理复杂任务吗？">
    可以。把 **MiniMax 设为默认**，然后在需要时**按会话**切换模型。
    fallback 用于**错误**，不是“更难的任务”，因此请使用 `/model` 或单独的 agent。

    **选项 A：按会话切换**

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-...", OPENAI_API_KEY: "sk-..." },
      agents: {
        defaults: {
          model: { primary: "minimax/MiniMax-M2.7" },
          models: {
            "minimax/MiniMax-M2.7": { alias: "minimax" },
            "openai/gpt-5.2": { alias: "gpt" },
          },
        },
      },
    }
    ```

    然后：

    ```
    /model gpt
    ```

    **选项 B：分开 agents**

    - Agent A 默认：MiniMax
    - Agent B 默认：OpenAI
    - 按 agent 路由，或使用 `/agent` 切换

    文档：[Models](/concepts/models)、[Multi-Agent Routing](/concepts/multi-agent)、[MiniMax](/providers/minimax)、[OpenAI](/providers/openai)。

  </Accordion>

  <Accordion title="opus / sonnet / gpt 是内置快捷方式吗？">
    是的。OpenClaw 提供了一些默认简写（仅在模型存在于 `agents.defaults.models` 时生效）：

    - `opus` → `anthropic/claude-opus-4-6`
    - `sonnet` → `anthropic/claude-sonnet-4-6`
    - `gpt` → `openai/gpt-5.4`
    - `gpt-mini` → `openai/gpt-5-mini`
    - `gemini` → `google/gemini-3.1-pro-preview`
    - `gemini-flash` → `google/gemini-3-flash-preview`
    - `gemini-flash-lite` → `google/gemini-3.1-flash-lite-preview`

    如果你设置了同名自定义 alias，你的值优先生效。

  </Accordion>

  <Accordion title="如何定义/覆盖模型快捷方式（aliases）？">
    aliases 来自 `agents.defaults.models.<modelId>.alias`。示例：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "anthropic/claude-opus-4-6" },
          models: {
            "anthropic/claude-opus-4-6": { alias: "opus" },
            "anthropic/claude-sonnet-4-6": { alias: "sonnet" },
            "anthropic/claude-haiku-4-5": { alias: "haiku" },
          },
        },
      },
    }
    ```

    然后 `/model sonnet`（或支持时的 `/<alias>`）会解析到该 model ID。

  </Accordion>

  <Accordion title="如何添加 OpenRouter 或 Z.AI 等其他 provider 的模型？">
    OpenRouter（按 token 计费；模型很多）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "openrouter/anthropic/claude-sonnet-4-6" },
          models: { "openrouter/anthropic/claude-sonnet-4-6": {} },
        },
      },
      env: { OPENROUTER_API_KEY: "sk-or-..." },
    }
    ```

    Z.AI（GLM models）：

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "zai/glm-5" },
          models: { "zai/glm-5": {} },
        },
      },
      env: { ZAI_API_KEY: "..." },
    }
    ```

    如果你引用了某个 provider/model 但缺少所需的 provider key，运行时会出现认证错误（例如 `No API key found for provider "zai"`）。

    **为新 agent 添加后提示找不到 provider 的 API key**

    这通常意味着**新 agent** 的 auth store 为空。auth 是按 agent 存储的，
    存放在：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

    修复选项：

    - 运行 `openclaw agents add <id>`，并在向导中配置认证。
    - 或将主 agent 的 `agentDir` 中的 `auth-profiles.json` 复制到新 agent 的 `agentDir` 中。

    不要在多个 agents 之间复用 `agentDir`；那会导致 auth/session 冲突。

  </Accordion>
</AccordionGroup>

## 模型故障转移与“所有模型失效”

<AccordionGroup>
  <Accordion title="故障转移是如何工作的？">
    故障转移分两步：

    1. 同一 provider 内的 **auth profile 轮换**。
    2. 退回到 `agents.defaults.model.fallbacks` 中的下一个模型。

    失败的 profile 会应用冷却时间（指数退避），因此即使 provider 被限流或暂时失败，OpenClaw 仍可继续响应。

  </Accordion>

  <Accordion title='“No credentials found for profile anthropic:default” 是什么意思？'>
    这表示系统尝试使用 auth profile ID `anthropic:default`，但在预期的 auth store 中找不到它的凭据。

    **修复清单：**

    - **确认 auth profiles 存放在哪里**（新路径 vs 旧路径）
      - 当前：`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
      - 旧版：`~/.openclaw/agent/*`（由 `openclaw doctor` 迁移）
    - **确认你的环境变量被 Gateway 读取了**
      - 如果你在 shell 中设置了 `ANTHROPIC_API_KEY`，但通过 systemd/launchd 运行 Gateway，它可能不会继承它。请把它放到 `~/.openclaw/.env`，或启用 `env.shellEnv`。
    - **确保你编辑的是正确的 agent**
      - 多 agent 设置意味着可能有多个 `auth-profiles.json` 文件。
    - **检查模型/auth 状态**
      - 使用 `openclaw models status` 查看已配置模型以及 providers 是否已认证。

    **“No credentials found for profile anthropic” 的修复清单**

    这表示运行被固定到一个 Anthropic auth profile，但 Gateway
    在其 auth store 中找不到它。

    - **使用 setup-token**
      - 运行 `claude setup-token`，然后使用 `openclaw models auth setup-token --provider anthropic` 粘贴它。
      - 如果 token 是在另一台机器上创建的，请使用 `openclaw models auth paste-token --provider anthropic`。
    - **如果你想改用 API key**
      - 将 `ANTHROPIC_API_KEY` 放到 **gateway 主机** 上的 `~/.openclaw/.env` 中。
      - 清除任何强制使用缺失 profile 的固定顺序：

        ```bash
        openclaw models auth order clear --provider anthropic
        ```

    - **确认你是在 gateway 主机上运行命令**
      - 在 remote mode 下，auth profiles 存在于 gateway 机器上，而不是你的笔记本上。

  </Accordion>

  <Accordion title="为什么它还会尝试 Google Gemini 并失败？">
    如果你的模型配置把 Google Gemini 作为 fallback（或者你切换到了 Gemini 简写），OpenClaw 会在模型故障转移时尝试它。如果你没有配置 Google 凭据，你会看到 `No API key found for provider "google"`。

    解决方法：要么提供 Google 认证，要么从 `agents.defaults.model.fallbacks` / aliases 中移除或避免使用 Google models，这样 fallback 就不会路由到那里。

    **LLM request rejected: thinking signature required (Google Antigravity)**

    原因：session 历史中包含**没有签名的 thinking blocks**（通常来自
    中断/部分流）。Google Antigravity 需要 thinking blocks 带签名。

    解决办法：OpenClaw 现在会为 Google Antigravity Claude 剥离未签名的 thinking blocks。如果仍然出现，请开启**新会话**，或为该 agent 设置 `/thinking off`。

  </Accordion>
</AccordionGroup>

OpenClaw 现在会剥离未签名的思考块，若仍出现，开启新会话或用`/thinking off`。

## 认证配置概念与管理

<AccordionGroup>
  <Accordion title="什么是 auth profile？">
    auth profile 是一个绑定到 provider 的命名凭据记录（OAuth 或 API key）。profiles 位于：

    ```
    ~/.openclaw/agents/<agentId>/agent/auth-profiles.json
    ```

  </Accordion>

  <Accordion title="常见的 profile ID 有哪些？">
    OpenClaw 使用带 provider 前缀的 ID，例如：

    - `anthropic:default`（当没有 email identity 时很常见）
    - `anthropic:<email>` 用于 OAuth identities
    - 你自己选择的自定义 ID（例如 `anthropic:work`）

  </Accordion>

  <Accordion title="我可以控制优先尝试哪个 auth profile 吗？">
    可以。配置支持 profiles 的可选元数据以及每个 provider 的排序（`auth.order.<provider>`）。这**不会**存储 secrets；它只把 ID 映射到 provider/mode，并设置轮换顺序。

    如果 profile 处于短暂的**冷却**状态（速率限制/超时/认证失败）或更长的**禁用**状态（计费/额度不足），OpenClaw 可能会临时跳过它。要检查这一点，请运行 `openclaw models status --json` 并查看 `auth.unusableProfiles`。调优项：`auth.cooldowns.billingBackoffHours*`。

    你也可以通过 CLI 设置**按 agent** 的顺序覆盖（存储在该 agent 的 `auth-profiles.json` 中）：

    ```bash
    # 默认为配置中的默认 agent（省略 --agent）
    openclaw models auth order get --provider anthropic

    # 将轮换锁定到单个 profile（只尝试这个）
    openclaw models auth order set --provider anthropic anthropic:default

    # 或设置显式顺序（在 provider 内部回退）
    openclaw models auth order set --provider anthropic anthropic:work anthropic:default

    # 清除覆盖（回退到 config auth.order / round-robin）
    openclaw models auth order clear --provider anthropic
    ```

    要针对特定 agent：

    ```bash
    openclaw models auth order set --provider anthropic --agent main anthropic:default
    ```

  </Accordion>

  <Accordion title="OAuth 和 API key 有什么区别？">
    OpenClaw 两者都支持：

    - **OAuth** 通常利用订阅访问（在适用情况下）。
    - **API keys** 使用按 token 计费。

    向导明确支持 Anthropic setup-token 和 OpenAI Codex OAuth，并可以为你保存 API keys。

  </Accordion>
</AccordionGroup>

## Gateway：端口、“已运行”及远程模式

<AccordionGroup>
  <Accordion title="Gateway 使用哪个端口？">
    `gateway.port` 控制 WebSocket + HTTP（Control UI、hooks 等）的单一复用端口。

    优先级：

    ```
    --port > OPENCLAW_GATEWAY_PORT > gateway.port > default 18789
    ```

  </Accordion>

  <Accordion title='为什么 openclaw gateway status 会显示 "Runtime: running" 但 "RPC probe: failed"？'>
    因为“running”是 **supervisor** 的视角（launchd/systemd/schtasks）。RPC probe 则是 CLI 实际连接到 gateway WebSocket 并调用 `status`。

    使用 `openclaw gateway status` 并信任这些行：

    - `Probe target:`（探测实际使用的 URL）
    - `Listening:`（端口上实际绑定的内容）
    - `Last gateway error:`（进程还活着但端口没监听时的常见根因）

  </Accordion>

  <Accordion title='为什么 openclaw gateway status 显示 "Config (cli)" 和 "Config (service)" 不一样？'>
    你正在编辑一个配置文件，而 service 运行的是另一个（通常是 `--profile` / `OPENCLAW_STATE_DIR` 不匹配）。

    解决办法：

    ```bash
    openclaw gateway install --force
    ```

    请在你希望 service 使用的同一个 `--profile` / 环境中运行它。

  </Accordion>

  <Accordion title='“another gateway instance is already listening” 是什么意思？'>
    OpenClaw 通过在启动时立即绑定 WebSocket 监听器来强制运行时锁定（默认 `ws://127.0.0.1:18789`）。如果绑定失败并报 `EADDRINUSE`，它会抛出 `GatewayLockError`，表示已有另一个实例在监听。

    解决办法：停止另一个实例、释放端口，或使用 `openclaw gateway --port <port>` 运行。

  </Accordion>

  <Accordion title="如何运行远程模式的 OpenClaw（客户端连接到别处的 Gateway）？">
    设置 `gateway.mode: "remote"` 并指向远程 WebSocket URL，必要时带 token/password：

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

    说明：

    - `openclaw gateway` 只有在 `gateway.mode` 为 `local` 时才会启动（或者你传入覆盖标志）。
    - macOS app 会监视配置文件，并在这些值变化时实时切换模式。

  </Accordion>

  <Accordion title='Control UI 显示 "unauthorized"（或一直重连），怎么办？'>
    你的 gateway 已启用认证（`gateway.auth.*`），但 UI 没有发送匹配的 token/password。

    事实（来自代码）：

    - Control UI 会把 token 保存在当前浏览器标签页会话和所选 gateway URL 的 `sessionStorage` 中，因此同一标签页刷新时无需恢复长期的 localStorage token 持久化。
    - 在 `AUTH_TOKEN_MISMATCH` 时，受信任客户端可以在 gateway 返回重试提示（`canRetryWithDeviceToken=true`、`recommendedNextStep=retry_with_device_token`）时，尝试一次有边界的重试，并使用缓存的 device token。

    解决方法：

    - 最快：`openclaw dashboard`（会打印并复制 dashboard URL，尝试打开；如果无头则显示 SSH 提示）。
    - 如果你还没有 token：`openclaw doctor --generate-gateway-token`。
    - 如果是远程连接，先建立隧道：`ssh -N -L 18789:127.0.0.1:18789 user@host`，然后打开 `http://127.0.0.1:18789/`。
    - 在 gateway 主机上设置 `gateway.auth.token`（或 `OPENCLAW_GATEWAY_TOKEN`）。
    - 在 Control UI 设置中粘贴相同的 token。
    - 如果在那次重试后仍然不匹配，请轮换/重新批准配对的 device token：
      - `openclaw devices list`
      - `openclaw devices rotate --device <id> --role operator`
    - 还是卡住？运行 `openclaw status --all` 并查看 [Troubleshooting](/gateway/troubleshooting)。更多认证细节见 [Dashboard](/web/dashboard)。

  </Accordion>

  <Accordion title="我设置了 gateway.bind tailnet，但无法绑定且什么都不监听">
    `tailnet` 绑定会从你的网络接口中选择一个 Tailscale IP（100.64.0.0/10）。如果机器不在 Tailscale 上（或者接口已关闭），就没有可绑定的地址。

    解决办法：

    - 在该主机上启动 Tailscale（这样它就有 100.x 地址），或者
    - 切换为 `gateway.bind: "loopback"` / `"lan"`。

    注意：`tailnet` 是显式模式。`auto` 会优先使用 loopback；当你想要仅 tailnet 绑定时，请使用 `gateway.bind: "tailnet"`。

  </Accordion>

  <Accordion title="我可以在同一台主机上运行多个 Gateways 吗？">
    通常不需要——一个 Gateway 可以运行多个消息 channels 和 agents。只有在你需要冗余（例如救援 bot）或硬隔离时才使用多个 Gateways。

    可以，但你必须隔离：

    - `OPENCLAW_CONFIG_PATH`（每实例配置）
    - `OPENCLAW_STATE_DIR`（每实例状态）
    - `agents.defaults.workspace`（workspace 隔离）
    - `gateway.port`（不同端口）

    快速设置（推荐）：

    - 每个实例使用 `openclaw --profile <name> ...`（会自动创建 `~/.openclaw-<name>`）。
    - 在每个 profile 的配置中设置唯一的 `gateway.port`（或在手动运行时传入 `--port`）。
    - 安装每个 profile 对应的 service：`openclaw --profile <name> gateway install`。

    profiles 也会在 service 名称后添加后缀（`ai.openclaw.<profile>`；旧版为 `com.openclaw.*`、`openclaw-gateway-<profile>.service`、`OpenClaw Gateway (<profile>)`）。
    完整指南：[Multiple gateways](/gateway/multiple-gateways)。

  </Accordion>

  <Accordion title='“invalid handshake” / code 1008 是什么意思？'>
    Gateway 是一个 **WebSocket 服务器**，它期望第一条消息必须是
    `connect` 帧。如果收到其他内容，它会以 **code 1008**（策略违规）关闭连接。

    常见原因：

    - 你在浏览器里打开了 **HTTP** URL（`http://...`），而不是 WS 客户端。
    - 你使用了错误的端口或路径。
    - 代理或隧道剥离了认证头，或者发送了非 Gateway 请求。

    快速修复：

    1. 使用 WS URL：`ws://<host>:18789`（如果是 HTTPS 则用 `wss://...`）。
    2. 不要在普通浏览器标签页里打开 WS 端口。
    3. 如果启用了认证，请在 `connect` 帧中包含 token/password。

    如果你使用 CLI 或 TUI，URL 应该类似：

    ```
    openclaw tui --url ws://<host>:18789 --token <token>
    ```

    协议细节：[Gateway protocol](/gateway/protocol)。

  </Accordion>
</AccordionGroup>

## 日志与调试

<AccordionGroup>
  <Accordion title="日志在哪里？">
    文件日志（结构化）：

    ```
    /tmp/openclaw/openclaw-YYYY-MM-DD.log
    ```

    你可以通过 `logging.file` 设置稳定路径。文件日志级别由 `logging.level` 控制。控制台详细程度由 `--verbose` 和 `logging.consoleLevel` 控制。

    最快查看日志尾部：

    ```bash
    openclaw logs --follow
    ```

    service/supervisor 日志（当 gateway 通过 launchd/systemd 运行时）：

    - macOS：`$OPENCLAW_STATE_DIR/logs/gateway.log` 和 `gateway.err.log`（默认：`~/.openclaw/logs/...`; profiles 使用 `~/.openclaw-<profile>/logs/...`）
    - Linux：`journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`
    - Windows：`schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`

    更多内容见 [Troubleshooting](/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="如何启动/停止/重启 Gateway 服务？">
    使用 gateway 辅助命令：

    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你是手动运行 gateway，`openclaw gateway --force` 可以抢占端口。参见 [Gateway](/gateway)。

  </Accordion>

  <Accordion title="我在 Windows 上关掉了终端——如何重启 OpenClaw？">
    有 **两种 Windows 安装模式**：

    **1）WSL2（推荐）：** Gateway 运行在 Linux 内部。

    打开 PowerShell，进入 WSL，然后重启：

    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你从未安装过 service，请在前台启动它：

    ```bash
    openclaw gateway run
    ```

    **2）原生 Windows（不推荐）：** Gateway 直接运行在 Windows 中。

    打开 PowerShell 并运行：

    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你是手动运行（没有 service），请使用：

    ```powershell
    openclaw gateway run
    ```

    文档：[Windows (WSL2)](/platforms/windows)、[Gateway service runbook](/gateway)。

  </Accordion>

  <Accordion title="Gateway 已启动但回复从未到达，我该检查什么？">
    先做一次快速健康检查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：

    - 模型认证未在 **gateway 主机** 上加载（检查 `models status`）。
    - channel 配对/allowlist 阻止了回复（检查 channel 配置 + 日志）。
    - WebChat/Dashboard 打开了，但没有正确的 token。

    如果你是远程连接，请确认 tunnel/Tailscale 连接正常，并且
    Gateway WebSocket 可达。

    文档：[Channels](/channels)、[Troubleshooting](/gateway/troubleshooting)、[Remote access](/gateway/remote)。

  </Accordion>

  <Accordion title='"Disconnected from gateway: no reason"——现在怎么办？'>
    这通常意味着 UI 丢失了 WebSocket 连接。请检查：

    1. Gateway 是否运行中？`openclaw gateway status`
    2. Gateway 是否健康？`openclaw status`
    3. UI 是否有正确的 token？`openclaw dashboard`
    4. 如果是远程连接，tunnel/Tailscale 是否正常？

    然后跟踪日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[Dashboard](/web/dashboard)、[Remote access](/gateway/remote)、[Troubleshooting](/gateway/troubleshooting)。

  </Accordion>

  <Accordion title="Telegram setMyCommands 失败，我该检查什么？">
    从日志和 channel 状态开始：

    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后匹配错误：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单条目过多。OpenClaw 已经会裁剪到 Telegram 限制并用更少命令重试，但某些菜单项仍需要被删除。减少插件/skills/自定义命令，或者如果不需要菜单就禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!` 或类似网络错误：如果你在 VPS 上或位于代理之后，请确认允许 outbound HTTPS，并且 `api.telegram.org` 的 DNS 正常。

    如果 Gateway 是远程的，请确保你查看的是 gateway 主机上的日志。

    文档：[Telegram](/channels/telegram)、[Channel troubleshooting](/channels/troubleshooting)。

  </Accordion>

  <Accordion title="TUI 没有输出，我该检查什么？">
    首先确认 Gateway 可达且 agent 能运行：

    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看当前状态。如果你期望在聊天 channel 中收到回复，
    请确保 delivery 已启用（`/deliver on`）。

    文档：[TUI](/web/tui)、[Slash commands](/tools/slash-commands)。

  </Accordion>

  <Accordion title="如何彻底停止然后启动 Gateway？">
    如果你安装了 service：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    这会停止/启动**受监督的 service**（macOS 上是 launchd，Linux 上是 systemd）。
    当 Gateway 作为 daemon 在后台运行时使用这个命令。

    如果你是前台运行，先按 Ctrl-C 停止，然后：

    ```bash
    openclaw gateway run
    ```

    文档：[Gateway service runbook](/gateway)。

  </Accordion>

  <Accordion title="通俗解释：openclaw gateway restart 和 openclaw gateway 有什么区别">
    - `openclaw gateway restart`：重启**后台 service**（launchd/systemd）。
    - `openclaw gateway`：在当前终端会话中以前台方式运行 gateway。

    如果你安装了 service，请使用 gateway 命令。只有在你想临时以前台方式运行时，才使用 `openclaw gateway`。

  </Accordion>

  <Accordion title="出问题时最快获得更多细节的方法">
    使用 `--verbose` 启动 Gateway 以获取更多控制台细节。然后检查日志文件中的 channel 认证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>

## 媒体与附件

<AccordionGroup>
  <Accordion title="我的 skill 生成了图片/PDF，但什么都没发送出去">
    来自 agent 的外发附件必须包含一行独立的 `MEDIA:<path-or-url>`。参见 [OpenClaw assistant setup](/start/openclaw) 和 [Agent send](/tools/agent-send)。

    CLI 发送：

    ```bash
    openclaw message send --target +15555550123 --message "Here you go" --media /path/to/file.png
    ```

    还要检查：

    - 目标 channel 支持外发媒体且未被 allowlists 阻止。
    - 文件大小在 provider 限制内（图片会缩放到最大 2048px）。

    参见 [Images](/nodes/images)。

  </Accordion>
</AccordionGroup>

## 安全与访问控制

<AccordionGroup>
  <Accordion title="向入站 DM 暴露 OpenClaw 安全吗？">
    请把入站 DMs 视为不可信输入。默认设置旨在降低风险：

    - 支持 DM 的 channels 上的默认行为是 **pairing**：
      - 未知发送者会收到配对码；机器人不会处理他们的消息。
      - 通过以下命令批准：`openclaw pairing approve --channel <channel> [--account <id>] <code>`
      - 待处理请求上限为每个 channel **3 个**；如果没有收到 code，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公开开启 DMs 需要显式选择加入（`dmPolicy: "open"` 和 allowlist `"*"`）。

    运行 `openclaw doctor` 可以发现有风险的 DM 策略。

  </Accordion>

  <Accordion title="Prompt injection 只有公共 bot 才需要担心吗？">
    不是。Prompt injection 关注的是**不可信内容**，不只是是谁在给 bot 发 DM。
    如果你的助手会读取外部内容（web search/fetch、浏览器页面、邮件、
    文档、附件、粘贴的日志），这些内容都可能包含试图劫持模型的指令。
    即使**只有你一个发送者**，也可能发生这种情况。

    最大风险出现在启用工具时：模型可能被诱导去泄露上下文或代表你调用工具。
    通过以下方式减小影响范围：

    - 使用只读或禁用工具的“reader” agent 来总结不可信内容
    - 对启用工具的 agents 关闭 `web_search` / `web_fetch` / `browser`
    - 使用沙箱和严格的工具 allowlists

    详情：[Security](/gateway/security)。

  </Accordion>

  <Accordion title="我的 bot 应该有自己的邮箱、GitHub 账号或手机号吗？">
    对大多数设置来说，是的。将 bot 与单独的账号和手机号隔离，
    可以在出问题时减小影响范围。这也让你更容易轮换
    凭据或撤销访问，而不影响你的个人账号。

    从小开始。只授予它实际需要的工具和账号，必要时再逐步扩展。

    文档：[Security](/gateway/security)、[Pairing](/channels/pairing)。

  </Accordion>

  <Accordion title="我可以把短信/文字消息的自主权交给它吗？安全吗？">
    我们**不建议**将个人消息完全交给它自主处理。最安全的模式是：

    - 将 DMs 保持在 **pairing mode** 或严格的 allowlist 中。
    - 如果你希望它代表你发消息，请使用**单独的号码或账号**。
    - 让它先起草，然后**在发送前批准**。

    如果你想试验，请在专用账号上进行，并保持隔离。参见
    [Security](/gateway/security)。

  </Accordion>

  <Accordion title="我可以为个人助手任务使用更便宜的模型吗？">
    可以，**前提是**该 agent 只用于聊天且输入可信。较小档位更容易
    遭受 instruction hijacking，因此对于启用工具的 agents
    或读取不可信内容时不应使用它们。如果你必须使用较小模型，请锁定
    工具并在沙箱中运行。参见 [Security](/gateway/security)。
  </Accordion>

  <Accordion title="我在 Telegram 中运行 /start，但没有收到配对码">
    只有当未知发送者给 bot 发消息且启用了
    `dmPolicy: "pairing"` 时才会发送配对码。`/start` 本身不会生成 code。

    检查待处理请求：

    ```bash
    openclaw pairing list telegram
    ```

    如果你想立即获得访问权限，请把你的发送者 id 加入 allowlist，或为该账户设置 `dmPolicy: "open"`。

  </Accordion>

  <Accordion title="WhatsApp：它会给我的联系人发消息吗？配对是怎么工作的？">
    不会。默认 WhatsApp DM 策略是 **pairing**。未知发送者只会收到一个配对码，他们的消息**不会被处理**。OpenClaw 只会回复它收到的聊天，或者你明确触发的发送。

    通过以下命令批准配对：

    ```bash
    openclaw pairing approve whatsapp <code>
    ```

    列出待处理请求：

    ```bash
    openclaw pairing list whatsapp
    ```

    向导中的电话号码提示：它用于设置你的 **allowlist/owner**，这样你自己的 DMs 才会被允许。它不用于自动发送。如果你在自己的 WhatsApp 号码上运行，请使用该号码并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>

## 聊天命令、终止任务，以及“它停不下来”

<AccordionGroup>
  <Accordion title="如何阻止系统内部消息显示在聊天里？">
    大多数内部消息或工具消息只会在该 session 启用了 **verbose** 或 **reasoning** 时显示。

    在出现它的聊天中修复：

    ```
    /verbose off
    /reasoning off
    ```

    如果仍然太吵，请检查 Control UI 中的 session 设置，并将 verbose 设为 **inherit**。同时确认你没有使用在 config 中将 `verboseDefault` 设为 `on` 的 bot profile。

    文档：[Thinking and verbose](/tools/thinking)、[Security](/gateway/security#reasoning-verbose-output-in-groups)。

  </Accordion>

  <Accordion title="如何停止/取消正在运行的任务？">
    发送以下任意内容，作为**独立消息**（不是 slash 命令）：

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

    这些都是终止触发词（不是 slash 命令）。

    对于后台进程（来自 exec 工具），你可以让 agent 运行：

    ```
    process action:kill sessionId:XXX
    ```

    slash 命令概览：参见 [Slash commands](/tools/slash-commands)。

    大多数命令必须作为以 `/` 开头的**独立**消息发送，但少数快捷方式（如 `/status`）在允许名单发送者的 inline 场景下也可用。

  </Accordion>

  <Accordion title='如何从 Telegram 向 Discord 发消息？（“Cross-context messaging denied”）'>
    默认情况下 OpenClaw 会阻止**跨 provider** 消息传递。如果某次工具调用绑定到 Telegram，
    除非你显式允许，否则它不会发送到 Discord。

    为该 agent 启用跨 provider 消息传递：

    ```json5
    {
      agents: {
        defaults: {
          tools: {
            message: {
              crossContext: {
                allowAcrossProviders: true,
                marker: { enabled: true, prefix: "[from {channel}] " },
              },
            },
          },
        },
      },
    }
    ```

    编辑 config 后重启 gateway。如果你只想对单个
    agent 启用，请改为设置在 `agents.list[].tools.message` 下。

  </Accordion>

  <Accordion title='为什么机器人感觉像在“忽略”快速连续消息？'>
    队列模式控制新消息与当前运行中的任务如何交互。使用 `/queue` 来更改模式：

    - `steer` - 新消息会重定向当前任务
    - `followup` - 一次只运行一条消息
    - `collect` - 批量收集消息并只回复一次（默认）
    - `steer-backlog` - 先 steer，然后处理积压
    - `interrupt` - 中止当前运行并重新开始

    你可以在 followup 模式中添加诸如 `debounce:2s cap:25 drop:summarize` 的选项。

  </Accordion>
</AccordionGroup>

## 其他

<AccordionGroup>
  <Accordion title='Anthropic 使用 API key 时的默认模型是什么？'>
    在 OpenClaw 中，凭据和模型选择是分开的。设置 `ANTHROPIC_API_KEY`（或将 Anthropic API key 存入 auth profiles）会启用认证，但实际默认模型是你在 `agents.defaults.model.primary` 中配置的值（例如 `anthropic/claude-sonnet-4-6` 或 `anthropic/claude-opus-4-6`）。如果你看到 `No credentials found for profile "anthropic:default"`，说明 Gateway 无法在正在运行的 agent 对应的预期 `auth-profiles.json` 中找到 Anthropic 凭据。
  </Accordion>
</AccordionGroup>

---

## 精准回答截图/聊天日志的提问

**问：“Anthropic API Key 默认模型是什么？”**

**答：** 在 OpenClaw 中，认证凭据和模型选择是分开的。配置了 `ANTHROPIC_API_KEY`（或将 Anthropic API Key 存到授权配置文件）后，认证就有了，但默认模型由你在配置项 `agents.defaults.model.primary` 设定（比如 `anthropic/claude-sonnet-4-5`、`anthropic/claude-opus-4-6`）。

如果看到 `No credentials found for profile "anthropic:default"`，表示 Gateway 运行时找不到该 Agent 的 Anthropic 授权配置。

---

卡住了？请到[Discord](https://discord.com/invite/clawd)提问或 [GitHub 讨论](https://github.com/openclaw/openclaw/discussions)寻求帮助。