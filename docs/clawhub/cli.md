---
summary: "ClawHub CLI 入口，用于发现、安装、发布和验证 OpenClaw 技能与插件。"
read_when:
  - 当你想通过命令行使用 ClawHub 时
  - 当你想通过 OpenClaw 安装 ClawHub 技能或插件时
  - 当你想发布 ClawHub 包时
title: "ClawHub CLI"
---

# ClawHub CLI

OpenClaw 为 ClawHub 提供两个命令行入口：

- `openclaw skills` 和 `openclaw plugins` 用于在 OpenClaw 内安装和管理
  ClawHub 包。
- 独立的 `clawhub` CLI 处理发布者工作流，例如登录、
  发布、转移和同步。

## 发现与安装

当你想为本地 OpenClaw 代理或 Gateway 安装或更新包时，请使用 OpenClaw 命令。

```bash
openclaw skills search "calendar"
openclaw skills install @owner/<slug>
openclaw skills update @owner/<slug>
openclaw skills verify @owner/<slug>

openclaw plugins search "calendar"
openclaw plugins install clawhub:<package>
openclaw plugins update <id-or-npm-spec>
```

默认情况下，技能安装会目标指向当前工作区的 `skills/` 目录。添加
`--global` 可安装到共享的受管技能目录中。

当你希望使用 ClawHub 解析而不是 npm 或其他安装来源时，插件安装会使用
`clawhub:` 前缀。

## 发布与维护

为发布者工作流安装独立的 ClawHub CLI：

```bash
npm i -g clawhub
clawhub login
```

使用 `clawhub package publish` 发布插件包：

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
clawhub package publish your-org/your-plugin@v1.0.0
```

使用 `clawhub skill publish` 发布技能文件夹：

```bash
clawhub skill publish ./skills/review-helper
clawhub skill publish ./skills/review-helper --version 1.0.0
```

当本地技能扫描状态或包所有权需要维护时，请使用相应的独立命令：

```bash
clawhub sync --all
clawhub package transfer @old-owner/package --to new-owner
```

## 相关内容

- [`openclaw skills`](/cli/skills) - 本地技能搜索、安装、更新和
  验证
- [`openclaw plugins`](/cli/plugins) - 插件搜索、安装、更新和
  检查
- [ClawHub 发布](/clawhub/publishing) - 所有者范围、发布验证、
  和审查流程
- [创建技能](/tools/creating-skills) - 技能编写和发布流程
- [构建插件](/plugins/building-plugins) - 插件包编写
