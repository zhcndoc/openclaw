---
summary: "核心 OpenClaw 密钥、默认值和专用子系统参考链接的网关配置参考"
title: "配置参考"
read_when:
  - "您需要精确的字段级配置语义或默认值"
  - "您正在验证通道、模型、网关或工具配置块"
doc-schema-version: 1
---

`~/.openclaw/openclaw.json` 的字段级参考：键、默认值以及指向更深层次子系统页面的链接。有关面向任务的设置指南，请参阅 [Configuration](/gateway/configuration)。通道和插件拥有的命令目录和深度内存旋钮位于它们自己的页面上，而不是在这里。

配置格式为 **JSON5**（允许注释+尾随逗号）。所有字段都是可选的； OpenClaw 省略时使用安全默认值。

代码真相胜过此页：

- `openclaw config schema` 打印用于验证的实时 JSON 架构和 Control UI，并合并 bundled/plugin/channel 元数据。
- 在编辑配置之前，Agents 应为一个精确的路径范围架构节点调用 `gateway` 工具操作 `config.schema.lookup`。
- `pnpm config:docs:check` / `pnpm config:docs:gen` 根据当前架构表面验证此文档的基线哈希。

模式 `uiHints` 还为每个路径携带解析的 `advanced` 布尔值。 Control UI 使用它首先显示常见字段并折叠每个部分的高级字段；搜索仍然跨越两个层次。层元数据仅供展示。添加键时，在叶子上声明其层或让它继承最近的祖先声明。默认情况下，没有声明祖先的路径会前进。

专用深度参考：

- [`memory.search.*`、`memory.citations`的内存配置参考](/reference/memory-config)，以及`plugins.entries.memory-core.config.dreaming`下的dreaming配置。
- [斜线命令](/tools/slash-commands)表示当前内置+捆绑命令目录。
- 拥有用于通道特定命令表面的 channel/plugin 页面。

---

## <a id="pages-in-this-reference-set"></a> 本参考集中的页面

- [配置 — 运行时基础](/gateway/config-runtime) — 运行时配置：工作树根、模型路由、发现、更新、ACP 和向导。
- [配置 - MCP、技能和插件](/gateway/config-extensions) - 扩展配置：MCP 服务器、技能、插件条目和画布小部件演示器。
- [配置 — 浏览器、UI 和桌面](/gateway/config-browser-ui-desktop) — 浏览器自动化、Control UI 演示以及桌面或配对节点配置。
- [配置 — 网关](/gateway/config-gateway) — 网关配置：绑定、身份验证、角色、Control UI、终端、远程、节点、TLS 和重新加载。
- [配置 — 云工作人员环境](/gateway/config-cloud-workers) — `cloudWorkers` 下的云工作人员配置文件，包括 Crabbox 和静态 SSH 开发。
- [存储位置](/concepts/storage-locations) — `storage.locations`、初始化和加密下的命名存储目标。
- [数据库引擎（实验）](/reference/database-engines) — SQLite 默认值和 `database` 下的 PostgreSQL 选择、连接 SecretRefs 和存储支持。
- [Configuration — hooks](/gateway/config-hooks) — 挂钩配置：HTTP 合同、代理负载、会话策略、映射、重试和 Gmail。
- [配置 — 环境、秘密，包括 ](/gateway/config-secrets-env) — 环境变量、秘密提供者、身份验证存储和 `$include` 配置分割。
- [配置 — 审计、日志记录、诊断和遥测](/gateway/config-observability) — 可观察性配置：审计、日志记录、诊断和遥测密钥。
- [配置 - 自动化和媒体模板变量](/gateway/config-automation) - `cron` 下的自动化配置加上媒体模型模板变量表面。
- [配置 — 代理](/gateway/config-agents) — 代理默认值、多代理路由、会话、消息和对话。
- [配置 — 通道](/gateway/config-channels) — 每通道访问控制、配对和通道密钥。
- [配置 — 工具](/gateway/config-tools) — 工具支持和自定义工具提供商。

---

## <a id="channels"></a> 渠道

每通道配置密钥位于 [Configuration - 通道](/gateway/config-channels)：`channels.*` 用于 Slack、Discord、Telegram、WhatsApp、Matrix、 iMessage，以及其他通道插件（身份验证、访问控制、多帐户、提及门控）。

## <a id="agent-defaults%2C-multi-agent%2C-sessions%2C-and-messages"></a><a id="agent-defaults-multi-agent-sessions-and-messages"></a> Agent 默认值、多代理、会话和消息

请参阅 [ 配置 - 代理](/gateway/config-agents) 以了解：

- `agents.defaults.*`（工作空间、模型、思维、心跳、记忆、媒体、技能、沙箱）
- `multiAgent.*`（多代理路由和绑定）
- `session.*`（会话生命周期、压缩、修剪）
- `messages.*`（消息传递、TTS、markdown渲染）
- `talk.*`（通话模式）
  - `talk.consultThinkingLevel`：在 Control UI Talk 实时咨询后面运行的完整 OpenClaw 代理的思维级别覆盖
  - `talk.consultFastMode`：Control UI Talk 实时咨询的一次性快速模式覆盖
  - `talk.speechLocale`：可选的 BCP 47 区域设置 ID，用于 Android、iOS 和 macOS 上的对话语音识别，以及用于 iOS 系统语音回退
  - `talk.silenceTimeoutMs`：未设置时，Talk 在发送文字记录之前保留平台默认暂停窗口 （`700 ms on macOS and Android, 900 ms on iOS`）
  - `talk.realtime.consultRouting`：跳过 `openclaw_agent_consult` 的最终实时通话记录的网关中继回退

## `worktreeRoot`

工作树存储 （`worktreeRoot`）、文件系统加速 （`worktreeAcceleration`） 和实时结帐上限 （`worktreeMaxCount`） 记录在 [Configuration — 运行时基础知识](/gateway/config-runtime) 中。

## <a id="tools-and-custom-providers"></a> 工具和自定义提供程序

工具策略、实验切换、提供程序支持的工具配置和自定义提供程序/基本 URL 设置位于 [Configuration - 工具和自定义提供程序](/gateway/config-tools) 中。

`agents.entries.<id>.tools.github.allowInSandbox` 是一个可选布尔值，默认为 `false`。将其设置在代理的托管 GitHub 身份上，以将该身份公开给代理自己的 Docker 或 Podman 沙箱，包括角色所需的沙箱。该配置文件以只读方式安装在 `/openclaw/github` 处；有效的共享范围拒绝注入。全局 `tools.github` 不接受此设置，并且安全审核会对每个选择加入的代理发出警告。有关设置、凭证公开和后端要求，请参阅 [GitHub Identity](/gateway/config-tools/github-identity#sandbox-opt-in)。

## <a id="models"></a> 模型

移至 [ 配置 — 运行时基础知识 ](/gateway/config-runtime)。

## MCP

移至 [ 配置 — MCP、技能和插件](/gateway/config-extensions)。

## <a id="skills"></a> 技能

移至 [ 配置 — MCP、技能和插件](/gateway/config-extensions)。

## <a id="plugins"></a> 插件

移至 [ 配置 — MCP、技能和插件](/gateway/config-extensions)。部分：Codex harness插件配置。

<a id="codex-harness-plugin-config"></a>

## <a id="browser"></a> 桌面

移至 [ 配置 — 浏览器、UI 和桌面 ](/gateway/config-browser-ui-desktop)。

## UI

移至 [ 配置 — 浏览器、UI 和桌面 ](/gateway/config-browser-ui-desktop)。

## <a id="desktop"></a> 台式机

移至 [ 配置 — 浏览器、UI 和桌面 ](/gateway/config-browser-ui-desktop)。部分：配对节点桌面。

<a id="paired-node-desktops"></a>

## <a id="gateway"></a> 网关

移至 [ 配置 — 网关](/gateway/config-gateway)。部分：OpenAI- 兼容端点、多实例隔离、`gateway.tls`、`gateway.reload`。

<a id="gateway-field-details"></a>
<a id="openai-compatible-endpoints"></a>
<a id="multi-instance-isolation"></a>
<a id="gatewaytls"></a>
<a id="gatewayreload"></a>

## <a id="cloud-worker-environments"></a> 云工作器环境

移至 [ 配置 — 云工作人员环境](/gateway/config-cloud-workers)。部分：Crabbox 配置文件、静态 SSH 开发配置文件。

<a id="crabbox-profile"></a>
<a id="static-ssh-development-profile"></a>

## <a id="hooks"></a> 钩子

移至 [ 配置 — hooks](/gateway/config-hooks)。部分：Hook HTTP 合同、Hook 代理负载、Hook 会话和代理策略、映射详细信息、Hook 重试和扇出、Gmail 集成。

<a id="hook-http-contract"></a>
<a id="hook-agent-payload"></a>
<a id="hook-session-and-agent-policy"></a>
<a id="mapping-details"></a>
<a id="hook-retries-and-fan-out"></a>
<a id="gmail-integration"></a>

## <a id="canvas-widget-presenter"></a> Canvas 小部件演示器

移至 [ 配置 — MCP、技能和插件](/gateway/config-extensions)。

## <a id="discovery"></a> 发现

移至 [ 配置 — 运行时基础知识 ](/gateway/config-runtime)。部分：mDNS （Bonjour）、广域 （DNS-SD）。

<a id="mdns-bonjour"></a>
<a id="wide-area-dns-sd"></a>

## <a id="environment"></a> 环境

移至 [ 配置 — 环境、机密，并包含 ](/gateway/config-secrets-env)。部分：`env`（内联环境变量）、环境变量替换。

<a id="env-inline-env-vars"></a>
<a id="env-var-substitution"></a>

## <a id="secrets"></a> 密钥

移至 [ 配置 — 环境、机密，并包括 ](/gateway/config-secrets-env)。部分：`secrets.egressProxy`、`SecretRef`、支持的凭证表面、秘密提供程序配置。

<a id="secretsegressproxy"></a>
<a id="secretref"></a>
<a id="supported-credential-surface"></a>
<a id="secret-providers-config"></a>

## <a id="auth-storage"></a> 认证存储

移至 [ 配置 — 环境、机密，并包含 ](/gateway/config-secrets-env)。

## <a id="audit"></a> 审计

移至 [ 配置 — 审核、日志记录、诊断和遥测](/gateway/config-observability)。

## <a id="logging"></a> 日志

移至 [ 配置 — 审核、日志记录、诊断和遥测](/gateway/config-observability)。

## <a id="diagnostics"></a> 诊断

移至 [ 配置 — 审核、日志记录、诊断和遥测](/gateway/config-observability)。

## <a id="telemetry"></a> 遥测

移至 [ 配置 — 审核、日志记录、诊断和遥测](/gateway/config-observability)。

## <a id="update"></a> 更新

移至 [ 配置 — 运行时基础知识 ](/gateway/config-runtime)。

## ACP

移至 [ 配置 — 运行时基础知识 ](/gateway/config-runtime)。

## <a id="wizard"></a> 向导

移至 [ 配置 — 运行时基础知识 ](/gateway/config-runtime)。

## <a id="identity"></a> 身份

请参阅[智能体默认设置](/gateway/config-agents#agent-defaults)下 `agents.entries` 的身份字段。

---

## <a id="bridge-(legacy%2C-removed)"></a><a id="bridge-legacy-removed"></a> 桥接（旧版，已移除）

移至 [ 配置 — 运行时基础知识 ](/gateway/config-runtime)。

## <a id="automations-(cron)"></a><a id="automations-cron"></a> 自动化（`cron`）

移至 [ 配置 — 自动化和媒体模板变量](/gateway/config-automation)。部分：`cron.failureAlert`。

<a id="cronfailurealert"></a>

## <a id="media-model-template-variables"></a> 媒体模型模板变量

移至 [ 配置 — 自动化和媒体模板变量](/gateway/config-automation)。

## <a id="config-includes-(%24include)"></a><a id="config-includes-$include"></a> 配置包含（`$include`）

移至 [ 配置 — 环境、机密，并包含 ](/gateway/config-secrets-env)。

## <a id="related"></a> 相关内容

- [配置](/gateway/configuration)
- [配置示例](/gateway/configuration-examples)
- [诊断工具](/gateway/doctor)
- [Cloud Workers](/gateway/cloud-workers) — 这些工作设置配置的功能
- [`openclaw configure`](/cli/configure) — 交互式提示，无需手动编辑文件即可编辑这些设置
