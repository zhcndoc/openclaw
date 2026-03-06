---
summary: "代理引导仪式，用于初始化工作区和身份文件"
read_when:
  - 了解首次运行代理时发生了什么
  - 说明引导文件存放位置
  - 调试入职身份设置
title: "代理引导"
sidebarTitle: "引导"
---

# 代理引导

引导是**首次运行**时的仪式，用于准备代理工作区并收集身份信息。它发生在入职之后，当代理首次启动时。

## 引导的作用

在代理首次运行时，OpenClaw 会引导工作区（默认
`~/.openclaw/workspace`）：

- 初始化 `AGENTS.md`、`BOOTSTRAP.md`、`IDENTITY.md`、`USER.md`。
- 运行简短的问答流程（一次一个问题）。
- 将身份信息和偏好写入 `IDENTITY.md`、`USER.md`、`SOUL.md`。
- 完成后删除 `BOOTSTRAP.md`，确保只运行一次。

## 引导运行的地方

引导始终在**网关主机**上运行。如果 macOS 应用连接到远程网关，工作区和引导文件则存放在该远程机器上。

<Note>
当网关运行在另一台机器时，请在网关主机上编辑工作区文件（例如，`user@gateway-host:~/.openclaw/workspace`）。
</Note>

## 相关文档

- macOS 应用入职指南：[入职](/start/onboarding)
- 工作区结构：[代理工作区](/concepts/agent-workspace)
