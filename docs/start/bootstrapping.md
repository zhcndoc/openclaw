---
summary: "为工作区和身份文件播种的 Agent 引导仪式"
read_when:
  - "理解首次 agent 运行时会发生什么"
  - "说明引导文件存放位置"
  - "调试 onboarding 身份设置"
title: "Agent 引导"
sidebarTitle: "引导"
---

引导是首次运行时的仪式，用于为新的 agent 工作区播种，并引导 agent 选择一个身份。它只会运行一次，就在 onboarding 之后、agent 的第一次正式回合时执行。

## <a id="what-happens"></a> 会发生什么

在首次针对一个全新的工作区（默认 `~/.openclaw/workspace`）运行时， OpenClaw 会：

- 种子 `AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md` 和 `BOOTSTRAP.md`。特定于环境的工具说明位于 `AGENTS.md` 的 `## Tools` 部分。
- 作为代理遵循一个简短的出生顺序：它询问您想称呼它什么，共享一条简短的 soul/vibe 行，当 `image_generate` 可用时生成四个头像选项，询问您是否想要最少的推荐插件集或最大的便利性。
- 将协商好的身份持久化两次：写入 `IDENTITY.md` 和 `SOUL.md`（代理读取自身信息的地方），以及通过 `openclaw agents set-identity`（渠道和 UI 的显示内容）。
- 使用配置的图像生成模型或可用的提供程序（例如 OpenAI）在编号的 2×2 选择表中呈现四个生成的头像，供您选择或跳过。所选肖像将从工作表中裁剪出来，保存在工作区的 `avatars/` 目录下，并同步到身份中。在此选择后保存身份文件，因此异步生成不会提前结束孵化。如果生成不可用或失败，则会继续使用表情符号进行孵化。
- 读取在 onboarding 期间已存储的应用推荐，而不重新扫描。官方插件使用 `openclaw plugins install <id>`；第三方 ClawHub 技能仍然保持为明确的可选加入。处理完选择后，代理会确认已存储的提议，因此以后再也不会询问。
- 一旦工作区看起来已配置完成，就删除 `BOOTSTRAP.md`，这样该仪式只会运行一次。

当 `SOUL.md`、`IDENTITY.md` 或 `USER.md` 中有任意一个与其初始模板发生偏离，或者存在 `memory/` 文件夹时，工作区就算作已配置完成。

<Note>
`BOOTSTRAP.md` 涵盖了完整的身份对话。请参阅 [BOOTSTRAP.md 模板](/reference/templates/BOOTSTRAP) 中的内容。
</Note>

## <a id="embedded-and-local-model-runs"></a> 嵌入式和本地模型运行

对于嵌入式或本地模型运行，OpenClaw 会将 `BOOTSTRAP.md` 排除在特权系统上下文之外。在首次进行的主要交互式运行中，它仍会通过用户提示传递该文件内容，因此即使那些无法可靠调用 `read` 工具的模型也能完成这一流程。如果当前运行无法安全访问工作区，代理将收到一条简短的受限引导说明，而不是通用问候语。

## <a id="skipping-bootstrapping"></a> 跳过引导

要在已预置的工作区中跳过此步骤，请运行：

```bash
openclaw onboard --skip-bootstrap
```

## <a id="where-it-runs"></a> 运行位置

引导始终在 gateway 主机上运行。如果 macOS 应用连接到远程 Gateway，则工作区及其引导文件位于那台远程机器上，而不是在 Mac 上。

<Note>
当 Gateway 运行在另一台机器上时，请在 gateway 主机上编辑工作区文件（例如，`user@gateway-host:~/.openclaw/workspace`）。
</Note>

## <a id="related-docs"></a> 相关文档

- macOS 应用程序入门：[Onboarding](/start/onboarding)
- Workspace layout: [Agent 工作区](/concepts/agent-workspace)
- Template contents: [BOOTSTRAP.md 模板](/reference/templates/BOOTSTRAP)
