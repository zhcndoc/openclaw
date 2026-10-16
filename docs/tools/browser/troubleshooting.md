---
summary: "将 CDP 启动失败与导航 SSRF 块以及特定于平台的页面分开"
title: "浏览器故障排查"
read_when:
  - "浏览器无法启动或页面无法加载"
  - "您需要从策略块中判断 CDP 就绪失败"
---

对于 Linux- 特定问题（尤其是快照 Chromium），请参阅 [ 浏览器故障排除](/tools/browser-linux-troubleshooting)。

关于 WSL2 Gateway + Windows Chrome 分离主机部署，请参见 [WSL2 + Windows + 远程 Chrome CDP 故障排查](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)。

## <a id="inspection-times-out-but-screenshots-work"></a> 检查超时但屏幕截图有效

快照和页面文本读取使用浏览器自动化连接，即使选项卡列表和屏幕截图仍然有效，该连接也可能会变得过时。当连接无法再解析请求的选项卡时，OpenClaw 会重新连接一次。无响应的同级选项卡共享一个目标检查等待，而不是为每个选项卡添加单独的等待。

使用相同的配置文件和目标 ID 重试一次检查。如果仍然失败，请运行 `openclaw browser doctor` 并在重新启动网关之前检查屏幕截图。浏览器呈现的 HTTP 错误（例如 `403 Forbidden`）是网站拒绝访问的证据；它不确定配置文件或资源是否存在。

## <a id="output-directory-errors"></a> 输出目录错误

如果输出失败并显示 `Invalid path: must stay within output directory`，请将输出目录设置为其解析路径。浏览器输出拒绝目录路径中任何位置的用户创建的符号链接，包括当最终目录已经存在时。 macOS、`/tmp` 和 `/var` 系统别名仍受支持。

## <a id="cdp-startup-failure-vs-navigation-ssrf-block"></a> CDP 启动失败 vs 导航 SSRF 阻塞

这两类失败不同，它们遵循不同的代码路径。

- **CDP 启动或就绪失败** 表示 OpenClaw 无法确认浏览器控制平面是否健康。
- **导航 SSRF 阻止** 表示浏览器控制平面是健康的，但某个页面导航目标因策略被拒绝。

常见示例：

- CDP 启动或就绪失败：
  - `Chrome CDP websocket for profile "openclaw" is not reachable after start`
  - `Remote CDP for profile "<name>" is not reachable at <cdpUrl>`
  - `Port <port> is in use for profile "<name>" but not by openclaw` 当环回外部 CDP 服务配置为无 `attachOnly: true` 时
- 导航 SSRF 阻止：
  - `open`、`navigate`、快照或选项卡打开流程因 browser/network 策略错误而失败，而 `start` 和 `tabs` 仍然工作

使用以下最小流程来区分它们：

```bash
openclaw browser --browser-profile openclaw start
openclaw browser --browser-profile openclaw tabs
openclaw browser --browser-profile openclaw open https://example.com
```

如何解释结果：

- 如果 `start` 因 `not reachable after start` 失败，先排查 CDP 就绪状态。
- 如果 `start` 成功但 `tabs` 失败，控制平面仍然不健康。应将其视为 CDP 可达性问题，而不是页面导航问题。
- 如果 `start` 和 `tabs` 成功，但 `open` 或 `navigate` 失败，则浏览器控制平面是健康的，失败发生在导航策略或目标页面上。
- 如果 `start`、`tabs` 和 `open` 都成功，则基础的托管浏览器控制路径是健康的。

重要行为细节：

- Browser 配置默认为 SSRF 策略对象，即使您未配置 `browser.ssrfPolicy`，该对象也会阻止不允许的目标。
- 对于本地回环 `openclaw` 托管配置文件，CDP 健康检查会有意跳过对 OpenClaw 自身本地控制平面的 browser-SSRF 可达性强制检查。
- 启动本地托管浏览器后，准备情况检查允许每个 HTTP 请求最多 1.5 秒，每个 WebSocket 阶段最多 2 秒，以容忍网关调度延迟。准备重试窗口为八秒；接近结束时的检查使用较短的超时。
- 后来的操作在决定需要重新启动之前，对拥有的托管浏览器使用相同的准备情况。停止配置文件会中止其挂起的发现和准备情况检查；取消等待共享启动的一个调用者不会停止该共享启动。
- 导航保护是独立的。`start` 或 `tabs` 成功并不意味着后续的 `open` 或 `navigate` 目标一定被允许。

重置或删除本地托管配置文件会在移动数据之前停止早期网关运行时留下的经过验证的浏览器。如果无法验证或停止实时配置文件所有者，OpenClaw 会保留配置文件数据并报告原因。使用该配置文件关闭浏览器并在重试之前检查其 Chromium 锁定。命名另一个主机名的锁仍然未经验证，包括在机器重命名之后；启动浏览器还会保留锁定的配置文件的首选项。

安全建议：

- Do **not** 默认放宽浏览器 SSRF 策略。
- 优先选择狭窄的精确主机名 `allowedHostnames` 例外，而不是广泛的专用网络访问。
- 仅在确实需要私有网络浏览器访问且经过审查的、明确受信任的环境中，使用 `dangerouslyAllowPrivateNetwork: true`。
