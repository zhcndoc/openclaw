---
summary: "浏览器自动化的手动登录 + X/Twitter 发布"
read_when:
  - 你需要登录网站以进行浏览器自动化
  - 你想发布更新到 X/Twitter
title: "浏览器登录"
---

# 浏览器登录 + X/Twitter 发布

## 手动登录（推荐）

当网站需要登录时，请在 **host** 浏览器配置文件（openclaw 浏览器）中**手动登录**。

**不要**将你的凭据提供给模型。自动登录通常会触发反机器人防护，可能导致账户被锁。

回到主浏览器文档：[浏览器](/tools/browser)。

## 使用哪个 Chrome 配置文件？

OpenClaw 控制着一个**专用 Chrome 配置文件**（名为 `openclaw`，界面带橙色调）。这个配置文件独立于你日常使用的浏览器配置文件。

有两种简单方式访问它：

1. **让代理打开浏览器**，然后你自己登录。
2. **通过命令行启动**：

```bash
openclaw browser start
openclaw browser open https://x.com
```

如果你有多个配置文件，使用 `--browser-profile <name>` 参数（默认是 `openclaw`）。

## X/Twitter：推荐流程

- **阅读/搜索/查看讨论线程：** 使用 **host** 浏览器（手动登录）。
- **发布更新：** 使用 **host** 浏览器（手动登录）。

## 沙箱环境 + host 浏览器访问

沙箱浏览器会话更容易触发机器人检测。对于 X/Twitter（及其他严格的网站），建议使用 **host** 浏览器。

如果代理在沙箱内，浏览器工具默认使用沙箱。要允许控制 host 浏览器：

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

然后目标定位到 host 浏览器：

```bash
openclaw browser open https://x.com --browser-profile openclaw --target host
```

或者为发布更新的代理禁用沙箱。
