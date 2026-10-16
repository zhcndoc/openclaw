---
summary: "配置概述：常见任务、快速设置以及配置参考链接"
read_when:
  - "首次设置 OpenClaw"
  - "查找常见配置模式"
  - "导航到特定配置部分"
title: "配置"
---

OpenClaw 从 `~/.openclaw/openclaw.json` 读取可选的 <Tooltip tip="JSON5 支持注释和尾随逗号">**JSON5**</Tooltip> 配置。如果文件不存在，则使用安全的默认值。

当前配置路径必须指向常规文件。OpenClaw 会通过重命名原子替换该路径，因此如果 `openclaw.json` 是符号链接，写入会替换这个链接，而不会沿链接写入目标文件。请避免使用符号链接配置。如果配置保存在默认状态目录之外，请将 `OPENCLAW_CONFIG_PATH` 直接指向实际文件。

添加配置的常见原因：

- 连接通道并控制谁可以给机器人发消息
- 设置模型、工具、沙箱或自动化（cron、hooks）
- 调整会话、媒体、网络或 UI

有关全部可用字段，请参阅[配置参考](/gateway/configuration-reference)。

配置分为两类：根级同级字段存放基础设施设置和跨智能体的默认值，`agents.defaults` 则存放智能体循环的行为设置。在架构支持按智能体覆盖的情况下，`agents.entries` 中的条目可以覆盖任一类别的设置。

智能体和自动化工具在修改配置前，应使用 `config.schema.lookup` 获取准确的字段级文档。本页提供面向任务的指导；完整的字段映射和默认值，请参阅[配置参考](/gateway/configuration-reference)。

<Tip>
**刚开始配置？** 可以运行 `openclaw onboard` 进行交互式设置，也可以参阅[配置示例](/gateway/configuration-examples)，获取可直接复制使用的完整配置。
</Tip>

## <a id="minimal-config"></a> 最小配置

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

## <a id="editing-config"></a> 编辑配置

<Tabs>
  <Tab id="interactive-wizard" title="交互式向导">
    ```bash
    openclaw onboard       # full onboarding flow
    openclaw configure     # config wizard
    ```
  </Tab>
  <Tab id="cli-one-liners" title="CLI（单行）">
    ```bash
    openclaw config get agents.defaults.workspace
    openclaw config set agents.defaults.heartbeat.every "2h"
    openclaw config unset plugins.entries.brave.config.webSearch.apiKey
    ```
  </Tab>
  <Tab title="Control UI">
    打开 [http://127.0.0.1:18789](http://127.0.0.1:18789)，使用 **Config** 标签页。Control UI 根据实时配置架构生成表单，包括字段的 `title` / `description` 文档元数据，以及可用的插件和渠道架构；也提供 **Raw JSON** 编辑器供直接编辑。对于需要逐层查看配置的界面和其他工具，Gateway 还提供 `config.schema.lookup`，可获取指定路径的架构节点及其直接子节点摘要。设置界面优先显示常用字段，高级字段则折叠在各章节的 **Advanced (N)** 分组中。使用 **Show advanced** 可展开全部分组。搜索始终涵盖两个层级，并按需展开匹配的高级分组。**Settings -> Channels** 下的渠道设置也采用相同方式，并共享 **Show advanced** 偏好；点击分隔线上的 **Hide advanced** 可再次折叠。
  </Tab>
  <Tab id="direct-edit" title="直接编辑">
    直接编辑`~/.openclaw/openclaw.json`。网关监视文件并自动应用更改（请参阅 [hot reload](/gateway/configuration/hot-reload)）。
  </Tab>
</Tabs>

## <a id="strict-validation"></a> 严格校验

<Warning>
OpenClaw 仅接受完全符合架构的配置。未知键、错误的类型或无效值都会导致 Gateway **拒绝启动**。启动 Gateway 前，可运行 `openclaw doctor --fix` 修复旧版配置键。唯一的根级例外是 `$schema`（字符串），用于让编辑器附加 JSON Schema 元数据。
</Warning>

`openclaw config schema` 输出 Control UI 和配置校验使用的权威 JSON Schema。`config.schema.lookup` 获取指定路径的节点和子节点摘要，供工具逐层查看。字段的 `title`/`description` 文档元数据会保留在嵌套对象、通配符（`*`）、数组项（`[]`）以及 `anyOf`/`oneOf`/`allOf` 分支中。加载清单注册表时，还会合并运行时插件和渠道的架构。

每个配置叶节点都通过 `uiHints` 指定为常用或高级显示层级。`advanced: false` 表示常用设置，`advanced: true` 表示高级设置。没有直接提示的叶节点会继承最近祖先的层级；如果祖先都未声明，则默认为高级。这只影响显示方式，不影响校验、默认值、重载行为或该键能否设置。

启动迁移使用与 `openclaw doctor --fix` 相同的固定转换，无需交互确认；仅当迁移后的整个配置（包括插件）通过校验时才写入。原配置保留在 `.bak` 轮换备份中。使用 `$include`、由 Nix 管理或由更新版本 OpenClaw 写入的配置不会自动迁移。适用条件和回退行为，请参阅[旧版配置键迁移](/gateway/doctor#detailed-behavior-and-rationale)。

当验证仍然失败时：

- Gateway 不会启动
- 只有诊断命令可用（`openclaw doctor`、`openclaw logs`、`openclaw health`、`openclaw status`）
- 运行 `openclaw doctor` 查看具体问题
- 运行`openclaw doctor --fix`（`--repair`是相同的标志，`--yes`跳过提示）以应用修复

每次成功启动后，Gateway 都会保留一份可信的最近有效配置，但启动和热重载不会自动恢复它，只有 `openclaw doctor --fix` 才会恢复。如果经过适用的启动迁移（包括插件本地校验）后 `openclaw.json` 仍无效，Gateway 会启动失败。无效的热重载会被跳过，当前运行时继续使用最近接受的配置。如果写入因疑似意外覆盖而被阻止，OpenClaw 会尝试将拒绝的内容保存为 `<path>.rejected.<timestamp>` 供检查，并通过警告说明保存是否成功。如果保存失败，当前配置仍保持不变。对于疑似意外覆盖的写入，例如删除有效的 `gateway.mode` 或将文件缩小一半以上，Gateway 会予以阻止，除非写入明确允许破坏性更改。模式检查会先解析 `$include` 和环境变量引用。缺少 `meta` 会被记录为写入异常。如果候选配置包含 `***` 或 `[redacted]` 等脱敏密钥占位符，则不会将其提升为最近有效配置。

## <a id="configuration-pages"></a> 配置页面

本页提供索引，较长的参考内容已拆分为四页。请打开与你的需求对应的页面。

| 页面                                                                  | 适用情况                                                                            |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [常见任务](/gateway/configuration/common-tasks)                   | 您需要通道、模型、访问规则、会话或自动化的复制粘贴配方。 |
| [配置热重载](/gateway/configuration/hot-reload)                | 编辑未生效，或者您需要知道是什么强制网关重新启动。         |
| [配置 RPC](/gateway/configuration/config-rpc)                       | 工具通过网关 API 写入配置，而不是编辑文件。                 |
| [环境变量](/gateway/configuration/environment-variables) | 您正在决定 API 密钥所在的位置，或使用 `${VAR}` 替换或秘密引用。 |

## <a id="where-each-section-moved"></a> 各章节的新位置

本页保留了原有的全部锚点，因此 `/gateway/configuration#config-hot-reload` 等既有链接仍可访问。每个条目都指向该内容现在所在的页面。

- <a id="common-tasks" />[常见任务](/gateway/configuration/common-tasks#common-tasks)
- <a id="set-up-a-channel-whatsapp-telegram-discord-etc" />[设置通道（WhatsApp、Telegram、Discord等）](/gateway/configuration/common-tasks#set-up-a-channel-whatsapp-telegram-discord-etc)
- <a id="choose-and-configure-models" />[选择和配置模型](/gateway/configuration/common-tasks#choose-and-configure-models)
- <a id="control-who-can-message-the-bot" />[控制谁可以向机器人发送消息](/gateway/configuration/common-tasks#control-who-can-message-the-bot)
- <a id="set-up-group-chat-mention-gating" />[设置群聊提及门控](/gateway/configuration/common-tasks#set-up-group-chat-mention-gating)
- <a id="restrict-skills-per-agent" />[限制每个代理的技能](/gateway/configuration/common-tasks#restrict-skills-per-agent)
- <a id="configure-per-channel-health-monitoring" />[配置每通道健康状况监控](/gateway/configuration/common-tasks#configure-per-channel-health-monitoring)
- <a id="configure-sessions-and-resets" />[配置会话并重置](/gateway/configuration/common-tasks#configure-sessions-and-resets)
- <a id="enable-sandboxing" />[启用沙箱](/gateway/configuration/common-tasks#enable-sandboxing)
- <a id="enable-relay-backed-push-for-official-ios-builds" />[为官方 iOS 版本启用中继支持推送](/gateway/configuration/common-tasks#enable-relay-backed-push-for-official-ios-builds)
- <a id="set-up-heartbeat-periodic-check-ins" />[设置心跳（定期签入）](/gateway/configuration/common-tasks#set-up-heartbeat-periodic-check-ins)
- <a id="configure-cron-jobs" />[配置 cron 作业](/gateway/configuration/common-tasks#configure-cron-jobs)
- <a id="set-up-webhooks-hooks" />[设置webhooks（挂钩）](/gateway/configuration/common-tasks#set-up-webhooks-hooks)
- <a id="configure-multi-agent-routing" />[配置多代理路由](/gateway/configuration/common-tasks#configure-multi-agent-routing)
- <a id="split-config-into-multiple-files-include" />[将配置拆分为多个文件（$include）](/gateway/configuration/common-tasks#split-config-into-multiple-files-include)
- <a id="config-hot-reload" />[配置热重载](/gateway/configuration/hot-reload#config-hot-reload)
- <a id="reload-modes" />[重载模式](/gateway/configuration/hot-reload#reload-modes)
- <a id="what-hot-applies-vs-what-needs-a-restart" />[什么是热应用与什么需要重新启动](/gateway/configuration/hot-reload#what-hot-applies-vs-what-needs-a-restart)
- <a id="reload-planning" />[重装计划](/gateway/configuration/hot-reload#reload-planning)
- <a id="config-rpc-(programmatic-updates)" /><a id="config-rpc-programmatic-updates" />[配置 RPC（编程更新）](/gateway/configuration/config-rpc#config-rpc-programmatic-updates)
- <a id="environment-variables" />[环境变量](/gateway/configuration/environment-variables#environment-variables)
- <a id="shell-env-import-optional" />[Shell env 导入（可选）](/gateway/configuration/environment-variables#shell-env-import-optional)
- <a id="env-var-substitution-in-config-values" />[配置值中的Env var替换](/gateway/configuration/environment-variables#env-var-substitution-in-config-values)
- <a id="secret-refs-env-file-exec-store" />[秘密引用（env、文件、执行、存储）](/gateway/configuration/environment-variables#secret-refs-env-file-exec-store)

## <a id="full-reference"></a> 完整参考

有关完整的逐字段参考，请参阅 **[ 配置参考](/gateway/configuration-reference)**。

---

_相关：[配置Examples](/gateway/configuration-examples)·[配置参考](/gateway/configuration-reference)·[Doctor](/gateway/doctor)_

## <a id="related"></a> 相关内容

- [配置参考](/gateway/configuration-reference)
- [配置示例](/gateway/configuration-examples)
- [Gateway 运行手册](/gateway)
- [`openclaw config`](/cli/config) — 从 CLI 读取和写入这些设置
- [`openclaw configure`](/cli/configure) — 这些设置的引导编辑器
- [Docker](/install/docker) — 容器部署、其环境变量以及已安装的配置和状态路径
- [安全审核检查](/gateway/security/audit-checks) — 此配置中的审核标志是什么
- [可信代理身份验证](/gateway/trusted-proxy-auth) — 在反向代理后面配置网关
