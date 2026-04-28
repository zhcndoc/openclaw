---
summary: "用于 Gateway 的基于浏览器的控制 UI（聊天、节点、配置）"
read_when:
  - 你想通过浏览器操作 Gateway
  - 你想在不使用 SSH 隧道的情况下访问 Tailnet
title: "控制 UI"
sidebarTitle: "控制 UI"
---

Control UI 是一个由 Gateway 提供服务的小型 **Vite + Lit** 单页应用：

- 默认：`http://<host>:18789/`
- 可选前缀：设置 `gateway.controlUi.basePath`（例如 `/openclaw`）

它通过同一端口上的 **Gateway WebSocket** 直接通信。

## 快速打开（本地）

如果 Gateway 运行在同一台电脑上，请打开：

- [http://127.0.0.1:18789/](http://127.0.0.1:18789/)（或 [http://localhost:18789/](http://localhost:18789/)）

如果页面无法加载，请先启动 Gateway：`openclaw gateway`。

认证通过 WebSocket 握手期间提供：

- `connect.params.auth.token`
- `connect.params.auth.password`
- 当 `gateway.auth.allowTailscale: true` 时使用 Tailscale Serve 身份头
- 当 `gateway.auth.mode: "trusted-proxy"` 时使用受信任代理身份头

仪表板设置面板会为当前浏览器标签页会话和所选 gateway URL 保存一个 token；密码不会持久化。首次连接时，引导流程通常会为共享密钥认证生成一个 gateway token，但当 `gateway.auth.mode` 为 `"password"` 时也可以使用密码认证。

## 设备配对（首次连接）

当你从新的浏览器或设备连接到 Control UI 时，Gateway 通常会要求进行一次 **一次性配对审批**。这是为防止未授权访问而采取的安全措施。

**你会看到：** "disconnected (1008): pairing required"

<Steps>
  <Step title="列出待处理请求">
    ```bash
    openclaw devices list
    ```
  </Step>
  <Step title="按请求 ID 进行批准">
    ```bash
    openclaw devices approve <requestId>
    ```
  </Step>
</Steps>

如果浏览器在重试配对时更改了认证细节（角色/作用域/公钥），先前的待处理请求会被新的请求取代，并生成新的 `requestId`。批准前请重新运行 `openclaw devices list`。

如果浏览器已经配对，但你将其从只读访问改为写入/管理员访问，这会被视为一次批准升级，而不是静默重连。OpenClaw 会保持旧批准有效，阻止更宽权限的重连，并要求你显式批准新的作用域集合。

一旦批准，该设备就会被记住，除非你使用 `openclaw devices revoke --device <id> --role <role>` 撤销它，否则不需要再次批准。有关令牌轮换和撤销，请参见 [Devices CLI](/cli/devices)。

<Note>
- 直接的本地回环浏览器连接（`127.0.0.1` / `localhost`）会自动批准。
- 当 `gateway.auth.allowTailscale: true`、Tailscale 身份验证通过且浏览器呈现其设备身份时，Tailscale Serve 可以跳过 Control UI 操作会话的配对往返。
- 直接的 Tailnet 绑定、LAN 浏览器连接以及没有设备身份的浏览器配置仍然需要显式批准。
- 每个浏览器配置文件都会生成唯一的设备 ID，因此切换浏览器或清除浏览器数据都需要重新配对。
</Note>

## 个人身份（浏览器本地）

Control UI 支持按浏览器保存的个人身份（显示名称和头像），会附加到发出的消息上用于共享会话中的归属标识。它保存在浏览器存储中，作用域限定为当前浏览器配置文件，不会同步到其他设备，也不会在服务器端持久化，除了你实际发送的消息在正常转录作者元数据中保留之外。清除站点数据或切换浏览器会将其重置为空。

同样的浏览器本地模式也适用于助手头像覆盖。上传的助手头像只会在本地浏览器上覆盖 Gateway 解析出的身份，不会通过 `config.patch` 往返传输。对于直接写入该字段的非 UI 客户端（例如脚本化 gateway 或自定义仪表板），共享的 `ui.assistant.avatar` 配置字段仍然可用。

## 运行时配置端点

Control UI 会从 `/__openclaw/control-ui-config.json` 获取其运行时设置。该端点与 HTTP 其余部分一样受同一套 Gateway 认证保护：未认证的浏览器无法获取它，成功获取需要已有有效的 gateway token/password、Tailscale Serve 身份或受信任代理身份。

## 语言支持

Control UI 可在首次加载时根据浏览器区域设置自动本地化。若要之后覆盖它，请打开 **Overview -> Gateway Access -> Language**。语言选择器位于 Gateway Access 卡片中，而不在 Appearance 下。

- 支持的区域设置：`en`, `zh-CN`, `zh-TW`, `pt-BR`, `de`, `es`, `ja-JP`, `ko`, `fr`, `tr`, `uk`, `id`, `pl`, `th`
- 非英语翻译会在浏览器中按需加载。
- 所选语言会保存到浏览器存储中，并在后续访问时复用。
- 缺失的翻译键会回退到英语。

## 外观主题

Appearance 面板保留了内置的 Claw、Knot 和 Dash 主题，以及一个浏览器本地的 tweakcn 导入槽位。要导入主题，请打开 [tweakcn themes](https://tweakcn.com/themes)，选择或创建一个主题，点击 **Share**，然后将复制的主题链接粘贴到 Appearance 中。导入器还接受 `https://tweakcn.com/r/themes/<id>` 注册表 URL、类似 `https://tweakcn.com/editor/theme?theme=amethyst-haze` 的编辑器 URL、相对路径 `/themes/<id>`、原始主题 ID，以及默认主题名称（例如 `amethyst-haze`）。

导入的主题仅存储在当前浏览器配置文件中。它们不会写入 gateway 配置，也不会在设备之间同步。替换导入的主题会更新那个本地槽位；如果清空它，且该导入主题正被选中，活动主题会切换回 Claw。

## 它现在能做什么

<AccordionGroup>
  <Accordion title="聊天与交谈">
    - 通过 Gateway WS 与模型聊天（`chat.history`、`chat.send`、`chat.abort`、`chat.inject`）。
    - 通过浏览器实时会话进行交谈。OpenAI 使用直接 WebRTC，Google Live 使用通过 WebSocket 的受限一次性浏览器 token，而仅后端的实时语音插件则使用 Gateway relay 传输。relay 会将提供商凭据保留在 Gateway 上，同时浏览器通过 `talk.realtime.relay*` RPC 传输麦克风 PCM，并通过 `chat.send` 将 `openclaw_agent_consult` 工具调用回传给更大的已配置 OpenClaw 模型。
    - 在 Chat 中流式展示工具调用和实时工具输出卡片（agent events）。
  </Accordion>
  <Accordion title="通道、实例、会话、梦境">
    - 通道：内置通道以及捆绑/外部插件通道的状态、二维码登录和按通道配置（`channels.status`、`web.login.*`、`config.patch`）。
    - 实例：在线状态列表 + 刷新（`system-presence`）。
    - 会话：列表 + 每个会话的模型/思考/fast/verbose/trace/reasoning 覆盖（`sessions.list`、`sessions.patch`）。
    - 梦境：做梦状态、启用/禁用切换，以及 Dream Diary 阅读器（`doctor.memory.status`、`doctor.memory.dreamDiary`、`config.patch`）。
  </Accordion>
  <Accordion title="Cron、技能、节点、exec 批准">
    - Cron 任务：列表/添加/编辑/运行/启用/禁用 + 运行历史（`cron.*`）。
    - 技能：状态、启用/禁用、安装、API key 更新（`skills.*`）。
    - 节点：列表 + 能力（`node.list`）。
    - exec 批准：编辑 gateway 或节点允许列表 + `exec host=gateway/node` 的询问策略（`exec.approvals.*`）。
  </Accordion>
  <Accordion title="配置">
    - 查看/编辑 `~/.openclaw/openclaw.json`（`config.get`、`config.set`）。
    - 带验证的应用 + 重启（`config.apply`），并唤醒最后一个活动会话。
    - 写入时包含 base-hash 保护，以防止覆盖并发编辑。
    - 写入（`config.set`/`config.apply`/`config.patch`）会预检提交的配置载荷中引用的活动 SecretRef 解析；在写入前会拒绝未解析的活动提交引用。
    - Schema + 表单渲染（`config.schema` / `config.schema.lookup`，包括字段 `title` / `description`、匹配到的 UI 提示、立即子摘要、嵌套对象/通配符/数组/组合节点上的文档元数据，以及可用时的插件 + 通道 schema）；仅当快照具有安全的原始往返能力时才提供 Raw JSON 编辑器。
    - 如果某个快照无法安全地原始往返，Control UI 会强制使用表单模式，并对该快照禁用原始模式。
    - Raw JSON 编辑器中的“Reset to saved”会保留原始编写的形态（格式、注释、`$include` 布局），而不是重新渲染为扁平化快照，因此当快照能够安全往返时，外部编辑可以在重置后保留。
    - 结构化的 SecretRef 对象值会在表单文本输入中以只读方式渲染，以防止意外的对象转字符串损坏。
  </Accordion>
  <Accordion title="Debug、日志、更新">
    - Debug：status/health/models 快照 + 事件日志 + 手动 RPC 调用（`status`、`health`、`models.list`）。
    - Logs：带过滤/导出的 gateway 文件日志实时尾随（`logs.tail`）。
    - Update：运行包/git 更新 + 重启（`update.run`），并附带重启报告，然后在重连后轮询 `update.status` 以验证正在运行的 gateway 版本。
  </Accordion>
  <Accordion title="Cron 任务面板说明">
    - 对于隔离任务，投递默认是 announce summary。若你希望仅内部运行，可切换为 none。
    - 选择 announce 时会显示通道/目标字段。
    - Webhook 模式使用 `delivery.mode = "webhook"`，并将 `delivery.to` 设置为有效的 HTTP(S) webhook URL。
    - 对于主会话任务，可用 webhook 和 none 投递模式。
    - 高级编辑控制包括运行后删除、清除 agent 覆盖、cron 精确/错峰选项、agent 模型/思考覆盖，以及尽力投递切换。
    - 表单校验为内联显示，带字段级错误；无效值会禁用保存按钮，直到修复。
    - 设置 `cron.webhookToken` 以发送专用 bearer token；如果省略，webhook 将在没有 auth header 的情况下发送。
    - 已弃用的回退方式：存储的旧任务如果带有 `notify: true`，在迁移前仍可使用 `cron.webhook`。
  </Accordion>
</AccordionGroup>

## 聊天行为

<AccordionGroup>
  <Accordion title="发送与历史语义">
    - `chat.send` 是 **非阻塞** 的：它会立即以 `{ runId, status: "started" }` 确认，响应则通过 `chat` 事件流式返回。
    - 聊天上传支持图片以及非视频文件。图片保留原生图片路径；其他文件会作为受管媒体存储，并在历史中显示为附件链接。
    - 使用相同的 `idempotencyKey` 重新发送时，在运行中会返回 `{ status: "in_flight" }`，完成后返回 `{ status: "ok" }`。
    - `chat.history` 响应会为 UI 安全而限制大小。当转录条目过大时，Gateway 可能会截断较长的文本字段、省略较重的元数据块，并用占位符替换超大消息（`[chat.history omitted: message too large]`）。
    - 助手/生成的图片会作为受管媒体引用持久化，并通过经过认证的 Gateway 媒体 URL 返回，因此重新加载不依赖于原始 base64 图片载荷仍保留在聊天历史响应中。
    - `chat.history` 还会从可见助手文本中移除仅用于显示的内联指令标签（例如 `[[reply_to_*]]` 和 `[[audio_as_voice]]`）、纯文本工具调用 XML 载荷（包括 `<tool_call>...</tool_call>`、`<function_call>...</function_call>`、`<tool_calls>...</tool_calls>`、`<function_calls>...</function_calls>`，以及被截断的工具调用块），以及泄漏的 ASCII/全角模型控制 token，并省略其可见文本完全等于精确静默 token `NO_REPLY` / `no_reply` 的助手条目。
    - 在一次活动发送以及最终历史刷新期间，如果 `chat.history` 短暂返回较旧快照，聊天视图会保留本地乐观的用户/助手消息可见；一旦 Gateway 历史赶上，这些本地消息就会被规范转录替换。
    - `chat.inject` 会向会话转录追加一条助手备注，并广播一条 `chat` 事件用于仅 UI 的更新（无 agent 运行、无通道投递）。
    - 聊天标题栏中的模型和 thinking 选择器会通过 `sessions.patch` 立即修改活动会话；它们是持久化的会话覆盖，而不是仅对单轮发送生效的选项。
    - 当新的 Gateway 会话使用报告显示较高的上下文压力时，聊天输入区会显示上下文提示，并在建议的压缩级别上显示一个压缩按钮，该按钮会执行正常的会话压缩路径。当 Gateway 再次报告新的使用情况时，过期的 token 快照会被隐藏。
  </Accordion>
  <Accordion title="交谈模式（浏览器实时）">
    交谈模式使用注册的实时语音提供商。通过 `talk.provider: "openai"` 加上 `talk.providers.openai.apiKey` 配置 OpenAI，或者通过 `talk.provider: "google"` 加上 `talk.providers.google.apiKey` 配置 Google；Voice Call realtime provider 配置仍然可以作为回退复用。浏览器永远不会收到标准的提供商 API key。OpenAI 会接收用于 WebRTC 的临时 Realtime client secret。Google Live 会接收一个一次性受限的 Live API auth token，用于浏览器 WebSocket 会话，其中指令和工具声明会被 Gateway 锁定进 token 中。仅暴露后端 realtime bridge 的提供商会通过 Gateway relay 传输运行，因此在浏览器音频通过经过认证的 Gateway RPC 传输时，凭据和供应商套接字仍保留在服务器端。Realtime 会话提示由 Gateway 组装；`talk.realtime.session` 不接受调用方提供的指令覆盖。

    在 Chat 输入框中，Talk 控件是位于麦克风听写按钮旁边的波浪按钮。当 Talk 启动时，输入框状态行会显示 `Connecting Talk...`，随后在音频连接期间显示 `Talk live`，或者在实时工具调用通过 `chat.send` 询问已配置的更大模型时显示 `Asking OpenClaw...`。

    维护者 live smoke：`OPENAI_API_KEY=... GEMINI_API_KEY=... node --import tsx scripts/dev/realtime-talk-live-smoke.ts` 用于验证 OpenAI 浏览器 WebRTC SDP 交换、Google Live 受限 token 的浏览器 WebSocket 设置，以及带伪造麦克风媒体的 Gateway relay 浏览器适配器。该命令仅打印提供商状态，不会记录密钥。

  </Accordion>
  <Accordion title="停止与中止">
    - 点击 **Stop**（调用 `chat.abort`）。
    - 当某个运行处于活动状态时，正常的后续消息会排队。对排队消息点击 **Steer** 可将该后续消息注入正在运行的轮次中。
    - 输入 `/stop`（或独立的中止短语，例如 `stop`、`stop action`、`stop run`、`stop openclaw`、`please stop`）可以带外中止。
    - `chat.abort` 支持 `{ sessionKey }`（不带 `runId`），用于中止该会话的所有活动运行。
  </Accordion>
  <Accordion title="中止后的部分保留">
    - 当某个运行被中止时，部分助手文本仍可能显示在 UI 中。
    - 当存在缓冲输出时，Gateway 会将被中止的部分助手文本持久化到转录历史中。
    - 持久化条目包含中止元数据，因此转录消费者可以将中止的部分内容与正常完成输出区分开来。
  </Accordion>
</AccordionGroup>

## PWA 安装与 Web Push

Control UI 自带一个 `manifest.webmanifest` 和一个 service worker，因此现代浏览器可以将其作为独立的 PWA 安装。即使标签页或浏览器窗口未打开，Web Push 也能让 Gateway 通过通知唤醒已安装的 PWA。

| 位置                                                  | 功能                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `ui/public/manifest.webmanifest`                      | PWA 清单。浏览器在可访问后会提供“安装应用”。                         |
| `ui/public/sw.js`                                     | 处理 `push` 事件和通知点击的 service worker。                        |
| `push/vapid-keys.json`（位于 OpenClaw 状态目录下）     | 自动生成的 VAPID 密钥对，用于签名 Web Push 负载。                   |
| `push/web-push-subscriptions.json`                    | 持久化的浏览器订阅端点。                                            |

当你想固定密钥时，可以通过 Gateway 进程上的环境变量覆盖 VAPID 密钥对（适用于多主机部署、密钥轮换或测试）：

- `OPENCLAW_VAPID_PUBLIC_KEY`
- `OPENCLAW_VAPID_PRIVATE_KEY`
- `OPENCLAW_VAPID_SUBJECT`（默认值为 `mailto:openclaw@localhost`）

Control UI 使用这些按作用域限制的 Gateway 方法来注册和测试浏览器订阅：

- `push.web.vapidPublicKey` — 获取当前生效的 VAPID 公钥。
- `push.web.subscribe` — 注册一个 `endpoint` 以及 `keys.p256dh`/`keys.auth`。
- `push.web.unsubscribe` — 移除已注册的端点。
- `push.web.test` — 向调用者的订阅发送测试通知。

<Note>
Web Push 独立于 iOS APNS 中继路径（有关中继驱动的推送，请参见 [Configuration](/gateway/configuration)）以及现有的 `push.test` 方法；后者面向原生移动设备配对。
</Note>

## 托管嵌入内容

助手消息可以通过 `[embed ...]` 短代码以内联方式渲染托管的 Web 内容。iframe 沙箱策略由 `gateway.controlUi.embedSandbox` 控制：

<Tabs>
  <Tab title="strict">
    禁用托管嵌入内容中的脚本执行。
  </Tab>
  <Tab title="scripts (default)">
    允许交互式嵌入，同时保持源隔离；这是默认值，通常足以满足自包含的浏览器游戏/组件。
  </Tab>
  <Tab title="trusted">
    在 `allow-scripts` 之上再增加 `allow-same-origin`，适用于同站点文档且确实需要更高权限的场景。
  </Tab>
</Tabs>

示例：

```json5
{
  gateway: {
    controlUi: {
      embedSandbox: "scripts",
    },
  },
}
```

<Warning>
只有当被嵌入文档确实需要同源行为时，才使用 `trusted`。对于大多数由 agent 生成的游戏和交互式画布，`scripts` 是更安全的选择。
</Warning>

默认情况下，绝对的外部 `http(s)` 嵌入 URL 仍会被阻止。如果你有意让 `[embed url="https://..."]` 加载第三方页面，请设置 `gateway.controlUi.allowExternalEmbedUrls: true`。

## Tailnet 访问（推荐）

<Tabs>
  <Tab title="集成式 Tailscale Serve（首选）">
    让 Gateway 保持在 loopback 上，并用 Tailscale Serve 通过 HTTPS 代理它：

    ```bash
    openclaw gateway --tailscale serve
    ```

    打开：

    - `https://<magicdns>/`（或你配置的 `gateway.controlUi.basePath`）

    默认情况下，当 `gateway.auth.allowTailscale` 为 `true` 时，Control UI/WebSocket Serve 请求可以通过 Tailscale 身份头（`tailscale-user-login`）进行认证。OpenClaw 会通过 `tailscale whois` 解析 `x-forwarded-for` 地址并与该头信息匹配来验证身份，并且只在请求命中 loopback 且带有 Tailscale 的 `x-forwarded-*` 头时接受这些请求。对于具有浏览器设备身份的 Control UI 操作员会话，这条已验证的 Serve 路径还会跳过设备配对往返；无设备浏览器和 node-role 连接仍会遵循正常的设备检查。如果你希望即使是 Serve 流量也必须使用显式共享密钥凭据，请设置 `gateway.auth.allowTailscale: false`。然后使用 `gateway.auth.mode: "token"` 或 `"password"`。

    对于该异步 Serve 身份路径，来自同一客户端 IP 和认证作用域的失败认证尝试会在写入限流之前串行处理。因此，同一浏览器的并发错误重试可能会在第二个请求上显示 `retry later`，而不是两个普通的不匹配并行竞争。

    <Warning>
    无 token 的 Serve 认证假定 gateway 主机是可信的。如果该主机上可能运行不受信任的本地代码，请要求 token/password 认证。
    </Warning>

  </Tab>
  <Tab title="绑定到 tailnet + token">
    ```bash
    openclaw gateway --bind tailnet --token "$(openssl rand -hex 32)"
    ```

    然后打开：

    - `http://<tailscale-ip>:18789/`（或你配置的 `gateway.controlUi.basePath`）

    将匹配的共享密钥粘贴到 UI 设置中（作为 `connect.params.auth.token` 或 `connect.params.auth.password` 发送）。

  </Tab>
</Tabs>

## 不安全的 HTTP

如果你通过普通 HTTP（`http://<lan-ip>` 或 `http://<tailscale-ip>`）打开仪表盘，浏览器会运行在**非安全上下文**中并阻止 WebCrypto。默认情况下，OpenClaw 会**阻止**没有设备身份的 Control UI 连接。

已文档化的例外：

- 仅限 localhost 的不安全 HTTP 兼容性，使用 `gateway.controlUi.allowInsecureAuth=true`
- 通过 `gateway.auth.mode: "trusted-proxy"` 成功进行 operator Control UI 认证
- 破窗式应急开关 `gateway.controlUi.dangerouslyDisableDeviceAuth=true`

**推荐修复：** 使用 HTTPS（Tailscale Serve）或在本地打开 UI：

- `https://<magicdns>/`（Serve）
- `http://127.0.0.1:18789/`（在 gateway 主机上）

<AccordionGroup>
  <Accordion title="不安全认证开关行为">
    ```json5
    {
      gateway: {
        controlUi: { allowInsecureAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    `allowInsecureAuth` 只是一个本地兼容性开关：

    - 它允许本地的 Control UI 会话在非安全 HTTP 上下文中无需设备身份继续进行。
    - 它不会绕过配对检查。
    - 它不会放宽远程（非 localhost）设备身份要求。

  </Accordion>
  <Accordion title="仅限紧急破窗">
    ```json5
    {
      gateway: {
        controlUi: { dangerouslyDisableDeviceAuth: true },
        bind: "tailnet",
        auth: { mode: "token", token: "replace-me" },
      },
    }
    ```

    <Warning>
    `dangerouslyDisableDeviceAuth` 会禁用 Control UI 设备身份检查，是严重的安全降级。请在紧急使用后尽快恢复。
    </Warning>

  </Accordion>
  <Accordion title="Trusted-proxy 说明">
    - 成功的 trusted-proxy 认证可以在**operator** Control UI 会话中免除设备身份。
    - 这**不**适用于 node-role Control UI 会话。
    - 同主机 loopback 反向代理仍然不满足 trusted-proxy 认证；参见 [Trusted proxy auth](/gateway/trusted-proxy-auth)。
  </Accordion>
</AccordionGroup>

有关 HTTPS 设置指导，请参见 [Tailscale](/gateway/tailscale)。

## Content security policy

Control UI 附带了严格的 `img-src` 策略：只允许**同源**资源、`data:` URL，以及本地生成的 `blob:` URL。远程 `http(s)` 和协议相对的图片 URL 会被浏览器拒绝，并且不会发起网络请求。

这在实际中的含义是：

- 通过相对路径提供的头像和图片（例如 `/avatars/<id>`）仍然可以渲染，包括 UI 会获取并转换为本地 `blob:` URL 的经过认证的头像路由。
- 内联的 `data:image/...` URL 仍然可以渲染（对协议内负载很有用）。
- 由 Control UI 创建的本地 `blob:` URL 仍然可以渲染。
- 频道元数据发出的远程头像 URL 会在 Control UI 的头像辅助逻辑中被移除，并替换为内置的 logo/badge，因此即使某个频道被攻破或恶意，也无法强制操作员浏览器去获取任意远程图片。

你无需做任何修改即可获得这种行为——它始终启用且不可配置。

## 头像路由认证

当配置了 gateway 认证时，Control UI 的头像端点要求与 API 其余部分相同的 gateway token：

- `GET /avatar/<agentId>` 只会向经过认证的调用者返回头像图片。`GET /avatar/<agentId>?meta=1` 会在相同规则下返回头像元数据。
- 对任一路由的未认证请求都会被拒绝（与同级的 assistant-media 路由一致）。这可以防止在其他方面受保护的主机上头像路由泄漏 agent 身份。
- Control UI 在获取头像时会将 gateway token 作为 bearer 头转发，并使用经过认证的 blob URL，因此图片仍会在仪表盘中渲染。

如果你禁用了 gateway 认证（不建议在共享主机上这样做），那么头像路由也会像 gateway 的其他部分一样变为未认证。

## 构建 UI

Gateway 从 `dist/control-ui` 提供静态文件。使用以下命令构建：

```bash
pnpm ui:build
```

可选的绝对 base（当你希望固定资源 URL 时）：

```bash
OPENCLAW_CONTROL_UI_BASE_PATH=/openclaw/ pnpm ui:build
```

用于本地开发（独立开发服务器）：

```bash
pnpm ui:dev
```

然后将 UI 指向你的 Gateway WS URL（例如 `ws://127.0.0.1:18789`）。

## 调试/测试：开发服务器 + 远程 Gateway

Control UI 是静态文件；WebSocket 目标是可配置的，并且可以不同于 HTTP 源。当你希望在本地运行 Vite 开发服务器，而 Gateway 运行在其他位置时，这很方便。

<Steps>
  <Step title="启动 UI 开发服务器">
    ```bash
    pnpm ui:dev
    ```
  </Step>
  <Step title="使用 gatewayUrl 打开">
    ```text
    http://localhost:5173/?gatewayUrl=ws://<gateway-host>:18789
    ```

    可选的一次性认证（如有需要）：

    ```text
    http://localhost:5173/?gatewayUrl=wss://<gateway-host>:18789#token=<gateway-token>
    ```

  </Step>
</Steps>

<AccordionGroup>
  <Accordion title="说明">
    - `gatewayUrl` 会在加载后存储到 localStorage，并从 URL 中移除。
    - `token` 应尽可能通过 URL 片段（`#token=...`）传递。片段不会发送到服务器，这可以避免请求日志和 Referer 泄漏。为了兼容性，旧式的 `?token=` 查询参数仍会被导入一次作为回退，但只会作为备用，并会在启动完成后立即移除。
    - `password` 只保存在内存中。
    - 当设置了 `gatewayUrl` 时，UI 不会回退到配置或环境凭据。请显式提供 `token`（或 `password`）。缺少显式凭据会报错。
    - 当 Gateway 位于 TLS 后面时，请使用 `wss://`（Tailscale Serve、HTTPS 代理等）。
    - `gatewayUrl` 只在顶层窗口中接受（不能嵌入），以防点击劫持。
    - 非 loopback 的 Control UI 部署必须显式设置 `gateway.controlUi.allowedOrigins`（完整 origin）。这也包括远程开发环境。
    - Gateway 启动时可能会根据有效的运行时 bind 和端口种子化本地 origin，例如 `http://localhost:<port>` 和 `http://127.0.0.1:<port>`，但远程浏览器 origin 仍然需要显式条目。
    - 不要使用 `gateway.controlUi.allowedOrigins: ["*"]`，除非是在严格控制的本地测试中。它表示允许任何浏览器 origin，而不是“匹配我当前使用的任何主机”。
    - `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` 会启用 Host 头 origin 回退模式，但这是危险的安全模式。
  </Accordion>
</AccordionGroup>

示例：

```json5
{
  gateway: {
    controlUi: {
      allowedOrigins: ["http://localhost:5173"],
    },
  },
}
```

远程访问设置详情： [Remote access](/gateway/remote)。

## 相关

- [Dashboard](/web/dashboard) — 网关仪表板
- [Health Checks](/gateway/health) — 网关健康监控
- [TUI](/web/tui) — 终端用户界面
- [WebChat](/web/webchat) — 基于浏览器的聊天界面