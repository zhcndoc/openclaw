---
summary: "浏览器自动化的手动登录 + X/Twitter 发帖"
read_when:
  - 你需要登录网站以进行浏览器自动化
  - 你想向 X/Twitter 发布更新
title: "浏览器登录"
---

## 手动登录（推荐）

当网站需要登录时，请在**宿主**浏览器配置文件（openclaw 浏览器）中**手动登录**。

不要把你的凭据提供给模型。自动登录经常会触发反机器人防御，并可能导致账号被锁定。

返回浏览器主文档：[浏览器](/tools/browser)。

## 使用的是哪个 Chrome 配置文件？

OpenClaw 控制一个**专用的 Chrome 配置文件**（名为 `openclaw`，带橙色调 UI）。这与您的日常浏览器配置文件是分开的。

对于代理浏览器工具调用：

- 默认选择：代理应使用其隔离的 `openclaw` 浏览器。
- 只有在现有登录会话很重要，且用户坐在电脑前可以点击/批准任何附加提示时，才使用 `profile="user"`。
- 如果你有多个用户浏览器配置文件，请显式指定配置文件，而不是猜测。

访问它有两种简单方式：

1. **让代理打开浏览器**，然后你自己登录。
2. **通过 CLI 打开**：

```bash
openclaw browser start
openclaw browser open https://x.com
```

如果你有多个配置文件，请传入 `--browser-profile <name>`（默认是 `openclaw`）。

## X/Twitter：推荐流程

- **阅读/搜索/线程：**使用**宿主**浏览器（手动登录）。
- **发布更新：**使用**宿主**浏览器（手动登录）。

## 沙箱 + 宿主浏览器访问

沙箱化的浏览器会话**更有可能**触发机器人检测。对于 X/Twitter（以及其他严格的网站），请优先使用**宿主**浏览器。

如果代理处于沙箱中，浏览器工具默认会使用沙箱。要允许宿主控制：

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

然后你自己打开宿主浏览器（CLI 调用始终在宿主浏览器上运行）：

```bash
openclaw browser open https://x.com --browser-profile openclaw
```

一旦设置了 `sandbox.browser.allowHostControl: true`，代理的 `browser` 工具调用就可以针对宿主浏览器。或者，也可以为发布更新的代理禁用沙箱。

## 相关内容

- [浏览器](/tools/browser)
- [浏览器 Linux 故障排除](/tools/browser-linux-troubleshooting)
- [浏览器 WSL2 故障排除](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)
