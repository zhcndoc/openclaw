---
summary: "Zalo Personal 插件：通过原生 zca-js 实现二维码登录+消息（插件安装+频道配置+工具）"
read_when:
  - 您希望在 OpenClaw 中支持 Zalo Personal（非官方）
  - 您正在配置或开发 zalouser 插件
title: "Zalo Personal 插件"
---

# Zalo Personal（插件）

通过插件为 OpenClaw 提供 Zalo Personal 支持，使用原生 `zca-js` 实现对普通 Zalo 用户账户的自动化操作。

> **警告：**非官方自动化可能导致账户暂停或封禁，使用请自行承担风险。

## 命名

频道 ID 设为 `zalouser`，以明确其自动化的是**个人 Zalo 用户账户**（非官方）。我们保留 `zalo` 给未来可能的官方 Zalo API 集成。

## 运行位置

该插件**在 Gateway 进程内部**运行。

如果使用远程 Gateway，请在**运行 Gateway 的机器上安装/配置**，然后重启 Gateway。

不需要外部的 `zca`/`openzca` CLI 二进制文件。

## 安装

### 方案 A：从 npm 安装

```bash
openclaw plugins install @openclaw/zalouser
```

之后重启 Gateway。

### 方案 B：从本地文件夹安装（开发）

```bash
openclaw plugins install ./extensions/zalouser
cd ./extensions/zalouser && pnpm install
```

之后重启 Gateway。

## 配置

频道配置位于 `channels.zalouser` 下（而非 `plugins.entries.*`）：

```json5
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}
```

## 命令行界面（CLI）

```bash
openclaw channels login --channel zalouser
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "Hello from OpenClaw"
openclaw directory peers list --channel zalouser --query "name"
```

## 代理工具

工具名称：`zalouser`

支持操作：`send`、`image`、`link`、`friends`、`groups`、`me`、`status`

频道消息操作还支持 `react`，用于消息反应。
