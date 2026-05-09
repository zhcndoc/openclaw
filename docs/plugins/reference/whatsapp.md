---
summary: "添加用于发送和接收 OpenClaw 消息的 WhatsApp 渠道接入层。"
read_when:
  - You are installing, configuring, or auditing the whatsapp plugin
title: "WhatsApp 插件"
---

# WhatsApp 插件

添加用于发送和接收 OpenClaw 消息的 WhatsApp 渠道接入层。

## 分发

- Package: `@openclaw/whatsapp`
- 安装途径：npm；ClawHub

## 接入层

channels: whatsapp

## Windows 安装说明

在 Windows 上，WhatsApp 插件在 npm 安装期间需要 `PATH` 中有 Git，因为它的某个 Baileys/libsignal 依赖项是从 git URL 拉取的。先安装 Git for Windows，然后重启 shell 并重新运行安装：

```powershell
winget install --id Git.Git -e
```

如果 Portable Git 的 `bin` 目录在 `PATH` 中，也可以正常工作。

## 相关文章

- [whatsapp](/channels/whatsapp)
