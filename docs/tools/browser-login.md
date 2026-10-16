---
summary: "浏览器自动化的手动登录 + X/Twitter 发帖"
read_when:
  - "你需要登录网站以进行浏览器自动化"
  - "你想向 X/Twitter 发布更新"
title: "浏览器登录"
---

## <a id="manual-login-(recommended)"></a><a id="manual-login-recommended"></a> 手动登录（推荐）

当站点需要登录时，请在主机浏览器的 `openclaw` 配置文件中手动登录。自动登录通常会触发反机器人防御并可能锁定帐户。

对于所有者授权的任务，代理可以通过浏览器表单填写使用所有者提供的凭据。将凭据保留在聊天和回复之外。

使用主机浏览器（手动登录）在 X/Twitter 和其他机器人敏感网站上阅读 （search/threads） 和发帖。沙盒浏览器会话更有可能触发机器人检测。

返回浏览器主文档：[浏览器](/tools/browser)。

## <a id="passkeys-in-headless-browsers"></a> 无头浏览器中的密钥

Chrome 的隐形万能钥匙对话框可以阻止无头模式下的点击和按键。 OpenClaw 会拒绝无头 Chromium 中的模式密钥请求，因此该站点可以提供另一种登录方法，例如密码或一次性代码。密钥自动填充请求和引导浏览器保持 Chrome 的正常行为。

使用标题配置文件通过密码或安全密钥登录。如果页面在 OpenClaw 连接之前已请求密钥，请导航到相同的 URL 以重新加载它。连接和远程浏览器必须报告其无头启动标志；记录失败的检测。 `existing-session` 配置文件未更改。

## <a id="which-chrome-profile-is-used%3F"></a><a id="which-chrome-profile-is-used"></a> 使用的是哪个 Chrome 配置文件？

OpenClaw 控制一个名为 `openclaw` 的专用 Chrome 配置文件（橙色调 UI），它与您的日常浏览器配置文件是分开的。

对于代理浏览器工具调用：

- 默认选择：代理使用其隔离的 `openclaw` 浏览器。
- 仅当现有登录会话很重要并且您在计算机上看到 click/approve 任何附加提示时才使用 `profile="user"`。
- 如果您有多个用户浏览器配置文件，请明确指定配置文件，而不是猜测。

默认情况下，本地托管浏览器是无头的。对于手动登录，请使用具有桌面会话和完整 Chrome/Chromium 的浏览器主机；无头 shell 无法显示登录窗口。如果您的配置文件使用无头 shell，请在登录前创建一个单独的配置文件，并将 `executablePath` 设置为完整浏览器。请勿在 shell/full 发行版中重复使用其数据目录。请参阅 [ 浏览器配置](/tools/browser/configuration)。

在浏览器主机上，将`browser.headless`设置为`false`。如果所选配置文件有自己的 `headless` 值，请将其也设置为 `false`。从网关进程环境中删除 `OPENCLAW_BROWSER_HEADLESS=1` 覆盖，或将其设置为 `0`；它优先于配置。不要通过 `start --headless`。

在以 head 模式启动之前，先停止正在运行的浏览器。对于没有每个配置文件覆盖的默认 `openclaw` 配置文件：

```bash
openclaw browser stop
openclaw config set browser.headless false
openclaw browser start
openclaw browser open https://x.com
```

通过可见窗口登录。您也可以在头配置生效后让代理打开页面。在同一个完整浏览器的有头模式和无头模式之间切换时，保持相同的配置文件。请勿使用 `reset-profile`，这会删除其保存的浏览器数据。

对于非默认配置文件，请在子命令之前放置 `--browser-profile <name>`（默认是 `openclaw`）：

```bash
openclaw browser --browser-profile <name> open https://x.com
```

## <a id="sandboxing%3A-allow-host-browser-access"></a><a id="sandboxing-allow-host-browser-access"></a> 沙箱：允许访问宿主浏览器

如果代理处于沙箱环境中，其 `browser` 工具调用默认会使用沙箱浏览器，而不是宿主浏览器。要让代理改为目标宿主浏览器：

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        browser: {
          allowHostControl: true,
        },
      },
    },
  },
}
```

CLI 调用始终会指向宿主浏览器，而不会是沙箱，因此你可以不受此设置影响，自己打开宿主浏览器：

```bash
openclaw browser --browser-profile openclaw open https://x.com
```

一旦设置了 `sandbox.browser.allowHostControl: true`，代理的 `browser` 工具调用也可以指向宿主浏览器。或者，也可以为发布更新的代理禁用沙箱。

## <a id="related"></a> 相关内容

- [浏览器](/tools/browser)
- [浏览器 Linux 故障排除](/tools/browser-linux-troubleshooting)
- [浏览器 WSL2 故障排除](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
