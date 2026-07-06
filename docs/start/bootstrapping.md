---
summary: "为工作区和身份文件播种的 Agent 引导仪式"
read_when:
  - 理解首次 agent 运行时会发生什么
  - 说明引导文件存放位置
  - 调试 onboarding 身份设置
title: "Agent 引导"
sidebarTitle: "引导"
---

引导是首次运行时的仪式，用于为新的 agent 工作区播种，并
引导 agent 选择一个身份。它只会运行一次，就在
onboarding 之后、agent 的第一次正式回合时执行。

## 会发生什么

在首次针对一个全新的工作区（默认 `~/.openclaw/workspace`）运行时，
OpenClaw 会：

- 初始化 `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md` 和 `BOOTSTRAP.md`。
- 让代理遵循 `BOOTSTRAP.md`：进行一段自由形式的对话（不是固定的问答表单），以确定名称、性格和风格。
- 将它学到的内容写入 `IDENTITY.md`、`USER.md` 和 `SOUL.md`。
- 一旦工作区看起来已配置完成，就删除 `BOOTSTRAP.md`，因此这个仪式只会运行一次。

当 `SOUL.md`、`IDENTITY.md` 或 `USER.md` 中有任意一个
与其初始模板发生偏离，或者存在 `memory/` 文件夹时，工作区就算作已配置完成。

<Note>
`BOOTSTRAP.md` 涵盖了完整的身份对话。请参阅
[BOOTSTRAP.md 模板](/reference/templates/BOOTSTRAP) 中的内容。
</Note>

## 嵌入式和本地模型运行

对于嵌入式或本地模型运行，OpenClaw 会将 `BOOTSTRAP.md` 排除在特权系统上下文之外。在首次进行的主要交互式运行中，它仍会通过用户提示传递该文件内容，因此即使那些无法可靠调用 `read` 工具的模型也能完成这一流程。如果当前运行无法安全访问工作区，代理将收到一条简短的受限引导说明，而不是通用问候语。

## 跳过引导

要在已预置的工作区中跳过此步骤，请运行：

```bash
openclaw onboard --skip-bootstrap
```

## 运行位置

引导始终在 gateway 主机上运行。如果 macOS 应用连接到远程 Gateway，则工作区及其引导文件位于那台远程机器上，而不是在 Mac 上。

<Note>
当 Gateway 运行在另一台机器上时，请在 gateway 主机上编辑工作区文件（例如，`user@gateway-host:~/.openclaw/workspace`）。
</Note>

## 相关文档

- macOS app onboarding: [入门](/start/onboarding)
- Workspace layout: [Agent 工作区](/concepts/agent-workspace)
- Template contents: [BOOTSTRAP.md 模板](/reference/templates/BOOTSTRAP)
