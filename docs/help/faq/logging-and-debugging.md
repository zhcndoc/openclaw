---
summary: "日志在哪里，服务启动和重新启动，以及回复从未到达时要检查的内容"
title: "日志记录和调试"
read_when:
  - "您需要日志或重新启动网关服务"
  - "网关已启动但回复从未到达"
---

## <a id="logging-and-debugging"></a> 日志和调试

<AccordionGroup>
  <Accordion id="where-are-logs" title="日志在哪里？">
    文件日志（结构化）：默认配置文件为 `/tmp/openclaw/openclaw-YYYY-MM-DD.log`，命名配置文件为 `/tmp/openclaw/openclaw-<profile>-YYYY-MM-DD.log`。通过 `logging.file` 设置固定路径；通过 `logging.level` 设置文件日志级别；通过 `--verbose` 和 `logging.consoleLevel` 设置控制台详细程度。

    最快的尾随查看：

    ```bash
    openclaw logs --follow
    ```

    Service/supervisor日志（当网关通过launchd/systemd运行时）：

    - macOS launchd stdout 和 stderr：`~/Library/Logs/openclaw/gateway.log`（配置文件使用 `gateway-<profile>.log`；两个流共享此文件，因此记录器启动之前发生的启动失败也会记录在这里）。
    - Linux: `journalctl --user -u openclaw-gateway[-<profile>].service -n 200 --no-pager`.
    - Windows: `schtasks /Query /TN "OpenClaw Gateway (<profile>)" /V /FO LIST`.

    更多内容参见 [故障排除](/gateway/troubleshooting)。

  </Accordion>

  <Accordion id="how-do-i-start-stop-restart-the-gateway-service" title="我如何使用start/stop/restart网关服务？">
    ```bash
    openclaw gateway status
    openclaw gateway restart
    ```

    如果你手动运行 gateway，`openclaw gateway --force` 可以重新占用端口。参见 [Gateway](/gateway)。

  </Accordion>

  <Accordion id="i-closed-my-terminal-on-windows-how-do-i-restart-openclaw" title="我关闭了 Windows 上的终端 - 如何重新启动 OpenClaw？">
    三种 Windows 安装模式：

    **1） Windows 集线器本地设置**：本机应用程序管理本地应用程序拥有的 WSL 网关。从“开始”菜单或托盘中打开 **OpenClaw Companion**，然后使用 **Gateway Setup** 或“连接”选项卡。

    **2）手动 WSL2 Gateway**：Gateway 在 Linux 内运行。
    ```powershell
    wsl
    openclaw gateway status
    openclaw gateway restart
    ```
    如果你从未安装过服务，请在前台启动：`openclaw gateway run`。

    **3）原生 Windows CLI/Gateway**：直接在 Windows 中运行。
    ```powershell
    openclaw gateway status
    openclaw gateway restart
    ```
    如果你手动运行它（没有服务）：`openclaw gateway run`。

    文档：[Windows](/platforms/windows)、[Gateway 服务运行手册](/gateway)。

  </Accordion>

  <Accordion id="the-gateway-is-up-but-replies-never-arrive-what-should-i-check" title="网关已启动，但回复从未到达。我应该检查什么？">
    快速健康检查：

    ```bash
    openclaw status
    openclaw models status
    openclaw channels status
    openclaw logs --follow
    ```

    常见原因：**网关主机**上未加载模型身份验证（检查`models status`）、通道pairing/allowlist阻止回复（检查通道配置和日志）或WebChat/Dashboard在没有正确令牌的情况下打开。如果是远程，请确认 tunnel/Tailscale 连接已建立并且网关 WebSocket 可达。

    文档：[频道](/channels)、[故障排除](/gateway/troubleshooting)、[远程访问](/gateway/remote)。

  </Accordion>

  <Accordion id="disconnected-from-gateway-no-reason-what-now" title='“与网关断开连接：无原因” - 现在怎么办？'>
    通常意味着 UI 丢失了 WebSocket 连接。检查：网关是否正在运行（`openclaw gateway status`）？健康吗（`openclaw status`）？ UI 是否具有正确的令牌 （`openclaw dashboard`）？如果是远程，tunnel/Tailscale 是否已链接？

    然后尾随日志：

    ```bash
    openclaw logs --follow
    ```

    文档：[Dashboard](/web/dashboard)、[远程访问](/gateway/remote)、[故障排除](/gateway/troubleshooting)。

  </Accordion>

  <Accordion id="telegram-setmycommands-fails-what-should-i-check" title="Telegram setMyCommands 失败。我应该检查什么？">
    ```bash
    openclaw channels status
    openclaw channels logs --channel telegram
    ```

    然后匹配错误：

    - `BOT_COMMANDS_TOO_MUCH`：Telegram 菜单条目过多。 OpenClaw 已调整至 Telegram 限制并使用更少的命令重试，但某些菜单项可能仍会被删除。减少 plugin/skill/custom 命令，或者如果不需要菜单则禁用 `channels.telegram.commands.native`。
    - `TypeError: fetch failed`、`Network request for 'setMyCommands' failed!`，或类似的网络错误：在 VPS 上或代理之后，请确认允许外发 HTTPS，并且 `api.telegram.org` 的 DNS 正常工作。

    如果 Gateway 是远程的，请检查 Gateway 主机上的日志。

    文档：[Telegram](/channels/telegram)、[频道故障排除](/channels/troubleshooting)。

  </Accordion>

  <Accordion id="tui-shows-no-output-what-should-i-check" title="TUI 显示无输出。我应该检查什么？">
    ```bash
    openclaw status
    openclaw models status
    openclaw logs --follow
    ```

    在 TUI 中，使用 `/status` 查看当前状态。如果你期望在聊天频道中收到回复，请确认已启用投递（`/deliver on`）。

    文档：[TUI](/web/tui)、[斜杠命令](/tools/slash-commands)。

  </Accordion>

  <Accordion id="how-do-i-completely-stop-then-start-the-gateway" title="如何完全停止然后启动网关？">
    如果您安装了该服务（launchd 位于 macOS 上，systemd 位于 Linux 上）：

    ```bash
    openclaw gateway stop
    openclaw gateway start
    ```

    在前台运行时，先按 Ctrl-C 停止，然后执行 `openclaw gateway run`。

    文档：[Gateway 服务运行手册](/gateway)。

  </Accordion>

  <Accordion id="eli5-openclaw-gateway-restart-vs-openclaw-gateway" title="ELI5：openclaw网关重启与openclaw网关">
    `openclaw gateway restart` 重新启动 **后台服务** （launchd/systemd）。 `openclaw gateway` 在该终端会话的前台 **中运行网关**。如果您安装了该服务，请使用 gateway 子命令；一次性使用裸露的前台运行。
  </Accordion>

  <Accordion id="fastest-way-to-get-more-details-when-something-fails" title="出现故障时获取更多详细信息的最快方法">
    使用 `--verbose` 启动 Gateway 以获取更多控制台细节，然后检查日志文件中的频道认证、模型路由和 RPC 错误。
  </Accordion>
</AccordionGroup>
