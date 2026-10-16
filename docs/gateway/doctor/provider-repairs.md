---
summary: "提供商覆盖、浏览器、OAuth TLS 和路由修复（检查 2b-2g）"
title: "提供商和路线维修"
read_when:
  - "医生警告提供商覆盖、Codex 路线或 Chrome MCP 准备情况"
  - "您正在更改提供商或路由迁移行为"
---

检查 2b-2g 覆盖提供商覆盖、浏览器和 Chrome MCP 准备情况、OAuth TLS 先决条件以及路由清理。

## <a id="checks-2b-2g"></a> 检查2b-2g

<AccordionGroup>
  <Accordion id="2b-opencode-provider-overrides" title="2b. OpenCode 提供商覆盖">
    如果你在匹配的官方外部插件已安装并启用时，手动添加了 `models.providers.opencode`、`opencode-zen` 或 `opencode-go`，它会覆盖该插件提供的目录。这可能会强制模型使用错误的 API，或将成本归零。Doctor 会发出警告，以便你移除该覆盖并恢复按模型进行的 API 路由和成本计算。如果没有匹配的插件，该条目仍是有效的独立自定义 provider。
  </Accordion>
  <Accordion id="2c-browser-migration-and-chrome-mcp-readiness" title="2c.浏览器迁移和 Chrome MCP 准备情况">
    如果扩展驱动程序配置文件仍然带有已退役的继电器 `cdpUrl`，则医生会删除该 URL，同时保留 `driver: "extension"`；当前扩展中继拥有其端点。

    当启用 `browser.extensionRelay.allowLegacyAuth` 时，Doctor 会发出警告。请将配对的 Chrome 扩展和外部 CDP 客户端升级到 Browser Relay Authentication v2，然后将该标志设置为 `false`。V2 客户端不会降级到旧版身份验证。

    Doctor 不会检查个人浏览器配置文件的可选扩展准备情况或 cookie 导入可用性。它将可导入 cookie 数据库计数报告为不可用，而不是零。当存在稳定的 Chrome 扩展副本时，Doctor 会报告其本机引导状态为未检查； `openclaw doctor --fix` 跳过本机主机注册修复。

    在托管 Chrome 的机器上，运行 `openclaw browser extension status --json` 显式检查注册；这可能会请求浏览器配置文件访问。如果升级留下过时的本机主机目标，请运行 `openclaw browser extension install --no-store` 通过显式安装程序进行修复，而无需请求应用商店安装。安装程序拒绝覆盖外部同名清单或启动器。状态区分请求的安装、Chrome 批准和本机主机注册运行状况；它不能证明实时中继连接。

    对于初始设置，请运行 `openclaw browser extension install`。在macOS上，这还要求在Google Chrome中安装官方商店；重新打开 Chrome 并在出现提示时批准或启用 OpenClaw。其他浏览器和平台需要手动安装商店。未打包的稳定路径仍然是 `openclaw browser extension install --no-store` 的开发回退。显式导入 cookie 仍需要其单独同意。

    当使用 `defaultProfile: "user"` 或已配置的 `existing-session` profile 时，Doctor 还会审计主机本地的 Chrome MCP 路径：

    - 检查默认自动连接配置下，Google Chrome 是否安装在同一台主机上
    - 检查检测到的 Chrome 版本，并在低于 Chrome 144 时发出警告
    - 提醒你在浏览器 inspect 页面中启用远程调试（例如 `chrome://inspect/#remote-debugging`、`brave://inspect/#remote-debugging` 或 `edge://inspect/#remote-debugging`）

    Doctor 无法为您启用 Chrome-side 设置。主机本地 Chrome MCP 仍然需要 gateway/node 主机上基于 Chromium- 的浏览器 144+，在本地运行，启用远程调试，并且在浏览器中批准第一个附加同意提示。

    此处的就绪检查仅涵盖本地 attach 前置条件。Existing-session 保留当前 Chrome MCP 路由限制；`responsebody`、PDF 导出、下载拦截和批量操作等高级路由仍需要托管浏览器或原始 CDP profile。此检查不适用于 Docker、sandbox、remote-browser 或其他无头流程，这些流程继续使用原始 CDP。

  </Accordion>
  <Accordion id="2d-oauth-tls-prerequisites" title="2d. OAuth TLS 先决条件">
    配置 OpenAI Codex OAuth 配置文件时，doctor 检查 OpenAI 授权端点以验证本地 Node/OpenSSL TLS 堆栈是否可以验证证书链。如果检查因证书错误（例如 `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`、过期证书或自签名证书）而失败，医生将打印特定于平台的修复指南。在带有 Homebrew Node 的 macOS 上，修复通常是 `brew postinstall ca-certificates`。使用 `--deep`，即使网关正常，也会运行检查。
  </Accordion>
  <Accordion id="2e-codex-oauth-provider-overrides" title="2e. Codex OAuth 提供商覆盖">
    如果你之前在 `models.providers.openai-codex` 下添加了旧版 OpenAI transport 设置，它们可能会遮蔽内置的 Codex OAuth provider 路径。当 Doctor 发现这些旧 transport 设置与 Codex OAuth 同时存在时，会发出警告，以便你移除或重写过时的 transport 覆盖并恢复当前的路由行为。自定义代理和仅包含 header 的覆盖仍受支持，不会触发此警告，但这些由用户编写的请求路由不符合隐式 Codex 选择条件。
  </Accordion>
  <Accordion id="2f-codex-route-repair" title="2f. Codex航线修复">
    医生检查旧版 `openai-codex/*` 模型参考。原生 Codex harness布线使用标准 `openai/*` 模型参考，但仅前缀从不选择 Codex。在未设置运行时策略或 `auto` 的情况下，只有没有编写请求覆盖的确切官方 HTTPS 平台响应或 ChatGPT 响应路由才符合资格。请参阅 [OpenAI 隐式代理运行时](/providers/openai#implicit-agent-runtime)。

    在 `--fix` / `--repair` 模式下，doctor 重写受影响的默认代理和每个代理引用，包括主要模型、回退、image/video 生成模型、heartbeat/subagent/compaction 覆盖、挂钩、通道模型覆盖和过时的持久会话路由状态：

    - `openai-codex/gpt-*` 变为 `openai/gpt-*`。
    - Codex 意图移至 provider/model-scoped `agentRuntime.id: "codex"` 条目以修复代理模型参考。
    - Stale 持久会话运行时引脚已被删除，因为运行时选择是 provider/model-scoped.
    - 除非修复后的旧模型引用需要 Codex 路由来保留旧的身份验证路径，否则现有 provider/model 运行时策略会被保留。
    - 保留现有模型后备列表，并重写其旧条目；复制的每个模型设置从旧密钥移至当前 `openai/*` 密钥。
    - 持久化会话的 `modelProvider`/`providerOverride`、`model`/`modelOverride`、回退通知和 auth-profile 固定值会在所有已发现的 agent 会话存储中修复。
    - Doctor 在 `agents.defaults`、`agents.entries.*` 和 `models.providers.*` 模型条目中单独修复过时的 `agentRuntime.id: "codex-cli"` 引脚（不同的旧版运行时 ID）至 `"codex"`。
    - `/codex ...` 表示“从聊天中控制或绑定原生 Codex 对话”。
    - `/acp ...` 或 `runtime: "acp"` 表示“使用外部 ACP/acpx 适配器”。

  </Accordion>
  <Accordion id="2g-session-route-cleanup" title="2克。会话路由清理">
    当你把已配置模型或运行时从某个插件拥有的 route（例如 Codex）迁移走后，Doctor 还会扫描已发现的 agent 会话存储中的陈旧自动创建 route 状态。

    `openclaw doctor --fix` 可以清除自动创建的陈旧状态，例如 `modelOverrideSource: "auto"` 模型 pin、运行时模型元数据、固定的 harness id、CLI 会话绑定，以及在其所属 route 不再配置时的自动 auth-profile 覆盖。显式用户选择或旧的会话模型选择会被报告出来供人工审查，并保持不变；如果该 route 不再被需要，可通过 `/model ...`、`/new` 切换，或重置会话。

  </Accordion>
</AccordionGroup>
