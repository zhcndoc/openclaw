---
summary: "为工作区和身份文件播种的 Agent 引导仪式"
read_when:
  - 理解首次 agent 运行时会发生什么
  - 说明引导文件存放位置
  - 调试 onboarding 身份设置
title: "Agent 引导"
sidebarTitle: "引导"
---

引导是 **首次运行** 的仪式，用于准备 agent 工作区并收集身份详情。它发生在 onboarding 之后，即 agent 第一次启动时。

## 引导会做什么

在 agent 首次运行时，OpenClaw 会为工作区引导初始化（默认路径
`~/.openclaw/workspace`）：

- 生成 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 运行一个简短的问答仪式（一次一个问题）。
- 将身份信息 + 偏好写入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成后删除 `BOOTSTRAP.md`，确保它只运行一次。

对于嵌入式/本地模型运行，OpenClaw 会将 `BOOTSTRAP.md` 排除在特权系统上下文之外。在主要的交互式首次运行中，它仍会在用户提示中传递文件内容，因此那些不能可靠调用 `read` 工具的模型也能完成该仪式。如果当前运行无法安全访问工作区，则 agent 会收到一条受限的引导说明，而不是通用问候语。

## 跳过引导

如果要为已预置的工作区跳过此步骤，请运行 `openclaw onboard --skip-bootstrap`。

## 运行位置

引导始终在 **gateway 主机** 上运行。如果 macOS 应用连接到远程 Gateway，工作区和引导文件就位于那台远程机器上。

<Note>
当 Gateway 运行在另一台机器上时，请在 gateway 主机上编辑工作区文件（例如，`user@gateway-host:~/.openclaw/workspace`）。
</Note>

## 相关文档

- macOS 应用 onboarding： [Onboarding](/start/onboarding)
- 工作区布局： [Agent workspace](/concepts/agent-workspace)
