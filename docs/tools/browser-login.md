---
summary: "浏览器自动化的手动登录 + X/Twitter 发帖"
read_when:
  - 你需要登录网站以进行浏览器自动化
  - 你想向 X/Twitter 发布更新
title: "浏览器登录"
---

## 手动登录（推荐）

当某个网站需要登录时，请在宿主浏览器的 `openclaw`
配置文件中手动登录。不要将您的凭据提供给模型：自动登录通常会
触发反机器人防护，并可能导致账户被锁定。

在 X/Twitter 以及其他对机器人敏感的网站上，无论是阅读（搜索/帖子串）还是
发帖，都请使用宿主浏览器（手动登录）。沙盒浏览器会话
更容易触发机器人检测。

返回浏览器主文档：[浏览器](/tools/browser)。

## 使用的是哪个 Chrome 配置文件？

OpenClaw 控制一个名为 `openclaw` 的专用 Chrome 配置文件（橙色调
UI），它与您的日常浏览器配置文件是分开的。

对于代理浏览器工具调用：

- 默认选择：代理使用其隔离的 `openclaw` 浏览器。
- 仅在现有登录会话很重要且您在电脑前可以点击/确认任何附加提示时，才使用 `profile="user"`。
- 如果您有多个用户浏览器配置文件，请明确指定配置文件，而不是猜测。

访问 `openclaw` 配置文件有两种方式：

1. 让代理打开浏览器，然后您自己登录。
2. 通过 CLI 打开：

```bash
openclaw browser start
openclaw browser open https://x.com
```

对于非默认配置文件，请在子命令之前放置 `--browser-profile <name>`（默认是 `openclaw`）：

```bash
openclaw browser --browser-profile <name> open https://x.com
```

## 沙箱：允许访问宿主浏览器

如果代理处于沙箱环境中，其 `browser` 工具调用默认会使用沙箱
浏览器，而不是宿主浏览器。要让代理改为目标宿主浏览器：

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

CLI 调用始终会指向宿主浏览器，而不会是沙箱，因此你可以
不受此设置影响，自己打开宿主浏览器：

```bash
openclaw browser --browser-profile openclaw open https://x.com
```

一旦设置了 `sandbox.browser.allowHostControl: true`，代理的 `browser`
工具调用也可以指向宿主浏览器。或者，也可以为发布更新的
代理禁用沙箱。

## 相关内容

- [浏览器](/tools/browser)
- [浏览器 Linux 故障排除](/tools/browser-linux-troubleshooting)
- [浏览器 WSL2 故障排除](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
