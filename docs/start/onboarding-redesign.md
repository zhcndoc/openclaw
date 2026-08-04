---
summary: "保管人入职重设计的实施计划（活文档）"
read_when:
  - 你正在实施或审查入职重设计的某个阶段
title: "入职重设计"
---

# 入职重设计实施计划

> **活文档。** 本页跟踪保管人入职重设计的实施层面，
> 并会随着每个阶段的落地进行更新。当最后一个阶段
> 合并后，本页将改写为面向用户的入职指南，并加入
> 文档导航。在此之前，它有意不包含在 `docs.json` 中。

## 北极星

一个非技术用户输入 `openclaw onboard`（或打开应用），并会被一个对话式存在迎接——OpenClaw，系统管家（“custodian” 只是内部名称；用户始终看到的是 “OpenClaw”）——它会找到他们的 AI，用已宣布的默认值而不是问题来完成所有设置，把他们的 agent 作为一个可见的身份时刻“孵化”出来，并在此后始终作为系统的看护者保持可达。默认即魔法，一个同意边界，没有死胡同。

设计原则（已决定，不要随意重提）：

- **已宣布且易于撤销的默认值**取代阻塞式问题。唯一的
  硬性要求是推理功能可用；其他一切都是可选的提议。
- **问题零是同意边界**：“完全访问”（推荐）意味着发现过程静默且自动进行；“先询问”则会让每一次发现——AI 扫描、应用扫描以及记忆来源扫描——都必须经过一次明确同意，同时提供一条完全手动的路径，永远不会进行扫描。
- **以对话作为 UI，并逐步提升智能**：管家界面在任何 AI 生效之前就已存在（脚本化对话），一旦某个路由验证通过，就立即由模型提供支持，并明确告知用户这一点。它绝不假装智能：在路由验证通过前输入自由文本时，会礼貌地提示“请先让我把大脑运转起来”。
- **孵化舱门是一场仪式**：同一线程中完成、替换头像，agent 自己命名并挑选自己的面孔。管家只教一次层级关系：“问我系统相关的问题，或者直接问你的 agent——它会代为转达。”
- **信任按来源分级**：官方目录条目可以预先选中；第三方 ClawHub 技能无论模型排名如何，都绝不会预先选中，并且其标签会说明它们安装的是发布者的代码。
- **已配置的安装神圣不可侵犯**：重新运行引导流程只是一次验证过程。它绝不会重新应用设置，也绝不会重启 Gateway 服务。
- **终端是备用方案，而不是问题**：只要 Gateway 能提供服务，就优先使用浏览器仪表盘；绝不要询问“终端还是浏览器？”。
- **较弱的模型会获得精简后的界面**（自动启用 `localModelLean`），并用通俗的语言解释——绝不用工具、代码模式或上下文窗口等术语。

## 当前已发布流程（第 1-3 阶段后）

在全新安装的 macOS 上运行 `openclaw onboard`，按最佳路径走——总共需要按四次回车：

1. 安全提示 → 按一次回车确认（该选择会持久化保存；之后不再询问）。
2. **问题零**：“我应该如何设置？”——完全访问权限（推荐）或先询问。该选择会持久化保存为 `wizard.accessMode`；重新运行时默认使用已保存的选择。受保护模式 +“手动配置”会直接进入提供商选择器，不执行任何扫描，也会跳过记忆源扫描。
3. **发现演示**：检测编码 CLI、环境变量密钥和本地运行时；发现编码代理时会插科打诨；按顺序实时测试候选项，并将失败项静默汇总为一行摘要（详情位于“查看其他选项”之后）。第一个可用的路由会作为默认选项公布，并提供一键进入完整选择器的路径；继续探索或跳过都会保留该可用路由。
4. 仅限全新安装：标准设置计划会自动应用（工作区、Gateway 服务、会话——与对话式“是”所执行的计划相同）。对于已配置的安装，会打印“已完成设置”，并且绝不会触碰该服务。
5. 提供记忆导入选项（Claude Code / Codex / Hermes）；如果拒绝了发现流程，则跳过此项。导入使用设置完成后最终持久化保存的工作区。
6. **应用推荐**：通过已验证的模型，将已安装的应用与官方目录及 ClawHub 进行匹配；官方频道插件会预先勾选，第三方技能则需要主动选择加入，并带有警告标签。可跳过；关闭开关为 `wizard.appRecommendations`。
7. **孵化**：Gateway 在后台构建缺失的控制界面资源。一旦能够提供仪表盘，浏览器交接流程会打开它（GUI），或在无头模式/SSH 环境下打印不含身份验证密钥的 URL，并等待控制界面连接——“仪表盘已连接——将在浏览器中继续。”否则，或者使用 `--tui` 时，终端 TUI 会打开，并预置孵化消息，然后由代理进行自我介绍。

远程网关引导保留其旧式对话式接管方式（`handoffMode: "chat"`）；设置必须应用到远程网关上。

## 阶段

| #   | 阶段                                                                                                                                                     | 表面                | 状态                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 已安装应用的插件推荐（扫描、候选项、AI 匹配器、向导步骤、`device.apps` 节点命令）                                                                          | classic + guided CLI | 已合并 ([#109668](https://github.com/openclaw/openclaw/pull/109668))                                                              |
| 2   | CLI 管家主干（问题零、发现剧场、自动应用 + hatch）                                                                                                      | guided CLI           | 已合并 ([`a83ed13204f1`](https://github.com/openclaw/openclaw/commit/a83ed13204f118adf1009e5ac88d5afe1905b86c))                   |
| 3   | 浏览器优先接管（GUI 会话检测、wait-for-dashboard-connect、TUI 作为回退）                                                                                | CLI → web            | 已合并 ([#110054](https://github.com/openclaw/openclaw/pull/110054))                                                              |
| 4   | Web 管家界面（选项卡片、`openclaw.chat` 上带类型的 `question` 字段、向导步骤镜像、首次运行接管）                                                         | Control UI           | 已合并 ([#110141](https://github.com/openclaw/openclaw/pull/110141), [#110242](https://github.com/openclaw/openclaw/pull/110242)) |
| 5   | Hatch 和 bootstrap（带一次性语义的推荐存储、自命名出生序列、全新设置后的自动 hatch 接管；avatar 阶梯延后）                                                | agent bootstrap      | 已合并 ([#110173](https://github.com/openclaw/openclaw/pull/110173), [#110331](https://github.com/openclaw/openclaw/pull/110331)) |
| 6   | 管家在场 PR1（固定侧边栏入口、设置中的 Ask OpenClaw、正常外观的管家问候；事件评论和频道召唤属于 PR2）                                                    | web + channels       | 已合并 ([#110269](https://github.com/openclaw/openclaw/pull/110269))                                                              |
| 7   | 弹性恢复（在配置损坏时管家仍可触达、部分界面救援、自动修复）                                                                                              | gateway              | 后续跟进                                                                                                                         |

## 每个阶段的实现说明

### 第 1 阶段 — 应用推荐（PR #109668）

- 扫描器：`src/infra/installed-apps.ts`（无 TCC 的 macOS 枚举；会跟随符号链接的 `.app` 包）。
- 候选项：官方目录 + ClawHub 搜索，整体预算 20 秒，离线时优雅降级为仅目录候选。目录条目是没有顶层 `id` 的包清单——候选项以解析后的插件 id 作为键（已针对真实捆绑目录做回归测试；一旦按 `entry.id` 作为键，就会把整个目录折叠掉并丢失所有官方推荐）。
- AI 匹配器：在已验证路由上完成一次补全（`src/system-agent/setup-app-recommendations.ts`）；没有整理过的 bundle-id 映射——模型会拒绝偶然的名称重叠。输出受解析后模型自身 `maxTokens` 预算限制（当未传入显式上限时，流式层会应用该限制）。
- **供应链防护**：ClawHub 列表文本由发布者控制，并会进入匹配器提示词，因此某个列表可以把自己提升为“推荐”。只有官方目录条目可以被预先选中；ClawHub 技能始终需要显式勾选，并标注为“第三方 ClawHub 技能；会安装其发布者的代码”。
- Node 命令 `device.apps`（TS node-host，Android 封套保持一致），默认关闭共享；网关杀开关 `wizard.appRecommendations`。
- 交付位于经典向导和引导式 custodian 流程中（`src/wizard/setup.app-recommendations.ts`）；重定向到 bootstrap 尾部仍属于第 5 阶段（该服务已经接受可注入的库存源）。once 语义（仅在被接受前提供，扫描结果持久化）也会随第 5 阶段存储一起落地；目前重新运行会再次提供。
- 另已修复：自定义的 `completeSetupInference` 提示词不再继承 32 token 的验证探测输出上限（`SETUP_INFERENCE_TEST_MAX_TOKENS` 仅适用于“reply OK”探测）。

### 第二阶段 — CLI 守护脊柱（PR #109841）

- `src/commands/onboard-guided.ts` 中重新设计了流程；远程网关引导仍通过 `handoffMode: "chat"` 保留其旧版聊天交接方式。
- 第零个问题会持久化 `wizard.accessMode`（"full" | "guarded"）；重新运行时默认采用已保存的选择（接受默认值绝不会将 guarded 静默降级为 full）。Guarded + 手动模式使用 `listManualSetupInferenceOptions`（仅配置/清单，不进行探测），并跳过记忆源扫描。
- 发现流程：静默收集失败信息（单行摘要；详细信息隐藏在“查看其他选项”后），加入 coding-agent 式俏皮话，并公布路由默认值。俏皮话中的会话计数将在存在廉价的会话计数接缝之前延后提供（目前仅作定性描述）。
- 全新安装：`applySystemAgentSetup`（确定性的对话式“是”）会持久化工作区，并在导入记忆之前启动网关；终端入口使用以 bootstrap 消息初始化的 `launchTuiCli`。
  已配置的安装（已有模型或网关配置——向导时间戳不能证明任何事情，因为它们与 configure/doctor 共享）仅执行验证——不执行 apply，也不重启网关服务。只有待处理的 onboarding 回执才允许中断的全新设置继续执行。Apply 失败时会回退到对话式聊天。

### 第 3 阶段 — 以浏览器优先的接管（PR #110054，已合并）

- `src/commands/onboard-browser-handoff.ts` 负责纯图形会话检测（`SSH_CONNECTION`/`SSH_TTY`；Linux 上的 `DISPLAY`/`WAYLAND_DISPLAY`）以及 60 秒 GUI / 300 秒 SSH 等待。引导式 onboarding 支持 macOS、Linux 和 Windows 上的图形桌面会话；无头/SSH 会话会打印仪表盘 URL，而 `--tui` 会强制使用终端入口。
- `src/commands/control-ui-handoff.ts` 负责仪表盘目标、已提供文档的就绪状态，以及 onboarding 和 `openclaw dashboard` 的一次性浏览器配对。GUI 启动会收到一次性 bootstrap 链接；无头/SSH 输出会打印干净的 URL，并提供手动认证指引。浏览器启动使用共享的 `openUrl` 辅助函数。
- 一个已解析的目标会确认网关提供仪表盘文档，捕获启动前的存在基线，并等待新连接。缺失的 Control UI 资源会异步构建，不会阻塞网关启动。连接跟踪会轮询现有的 `system-presence` RPC，作为**使用已配置共享密钥的 CLI 模式回环客户端**——这是每个 `openclaw` 命令使用的可信路径。SecretRef 网关会拒绝原始共享认证 Control UI 客户端，并返回“需要设备身份”。只有当已连接的 `openclaw-control-ui`/`webchat` presence 行相对于基线而言是新的，交接才会完成（已打开的仪表盘无法完成交接）。
- `gateway.controlUi.enabled: false` 会在显示任何 URL 之前直接短路。
- 已针对隔离的同配置网关完成端到端验证：打印 URL → 真实浏览器连接 → “仪表盘已连接——正在浏览器中继续” → 不出现终端入口。此前的“令牌不匹配”阻塞是测试框架产物——请参阅下面的测试操作手册。

### 第 4 阶段 — web custodian 界面（合并：#110141、#110242）

- 在 `openclaw.chat` 上的 `/custodian` 页面，使用 option-card 组件
  （2-4 张卡片，最多 1 个推荐项，始终可跳过）；通过
  `?onboarding=1` 提供 onboarding chrome；model-setup 的首次运行完成后会
  交接到这里。
- 结构化问题是在 `SystemAgentChatResult` 上新增的、带类型的增量 `question` 字段
  （每个选项的 `reply` 文本；对于 macOS 应用/TUI，prose 始终单独存在）。生产者：
  onboarding 的两种欢迎变体，以及带 2-4 个封闭选项的 hosted wizard 选择/确认步骤
  ——真实 channel wizard 会以卡片形式渲染。PR1 的字符串标记临时方案已删除。
- 会话所有权的作用域为 gateway URL + 每个已展示的凭据
  （token、password、bootstrap token、已存储的 device token —— 在临时 hello 掉线期间保持 sticky）；
  失败的用户轮次绝不会被重放；敏感输入会原样发送，并在 transcript 中被遮蔽。

### 第 5 阶段 — 孵化与引导启动（合并：#110173、#110331）

- 管理员创建一个无名代理（工具调用）；代理的引导启动以自我命名开场。PR1 将这套仪式压缩为最多三拍（名字 → 灵魂行 → 技能问题），并将自绘头像/图像生成阶梯（模型生成候选 → 预设标记 → 保留徽标）留待后续处理。同一线程中可更换头像；爪印标记仍保留给管理员。约定的身份会持久化两次：写入 `IDENTITY.md`/`SOUL.md`（代理读取的内容），以及通过 `openclaw agents set-identity`（频道和 UI 展示的内容）。
- 推荐内容（第 1 阶段服务、带一次性语义的已存扫描）作为引导启动的最后一步落地，在引导文件被移除之前完成：“最小集合还是最大便利？”引导启动通过 `openclaw onboard recommendations --json` 读取已存的提议（仅使用不可见的安装 ID），并在选择处理完成后予以确认，因此不会再次询问。频道连接按钮附带各频道的设置操作手册；代理通过对话式方式收集凭据，并将配置写入转交给管理员（“询问 OpenClaw…”是规范表述）。
- 自主学习是被询问的，而非被宣布的，并且等同于技能工作坊同意；请描述 ClawHub 的发布信任、扫描、验证和完整性检查，以及发布者代码警告——切勿暗示每个发布都已签名。
- 自动孵化已上线：全新安装时的 setup apply 会宣布孵化并交接（终端 TUI / 网关客户端使用 `open-agent`）；网页会进入代理聊天界面，并预填 “Wake up, my friend!” 草稿。该交接仅在写入后验证通过且结果干净时触发。删除后提供 0 个代理（而非自动提供）仍作为后续润色项。

### 第 6 阶段 — 守护者常驻（PR1 已合并：#110269；commentary/summon 属于 PR2）

- 已在 PR1 交付：默认固定的“OpenClaw”侧边栏入口（新建配置文件；现有用户保留已保存的固定项，并可通过自定义/更多进入）、将“Ask OpenClaw”作为第一个 Settings 条目，以及正常浏览器中的 `/custodian` 访问会请求看护者问候（不使用 onboarding 欢迎变体），并且仅在 onboarding 模式下渲染 Exit setup。
  一个停靠的内嵌 Settings 面板需要共享会话视图抽取（后续）。
- 具有事件响应的 commentary，并带有防 Clippy 保护机制：仅在有实质影响或失败的变更时触发，每次 settings 访问最多一次，除非被要求。相同的事件接点也会让守护者在之后因认证降级或通道故障而发声。
- 通道：日常情况下不可见（由 agent 转达）；可通过显式 summon 以及在同一线程中的 agent-down 事件触达，在平台允许的情况下显示其自身名称和爪子头像。
- 在设置阶段检测到弱模型：自动设为 `localModelLean`，并且守护者会用直白的话说明这一点，同时提供升级选项。
- 守护者知道自己的内部昵称（“有些人叫我守护者——OpenClaw 也行”），并且始终用名称来称呼 agent。

### 第 7 阶段 — 韧性（在开始实现前需要负责人决策）

原始草图——“无论配置坏到什么程度，custodian 都必须可达”——与仓库的安全策略相冲突：根指南明确说明，当配置在结构上无效时，Gateway **会拒绝启动**，只有 SecretRef 负责人失败才会降级为已配置但不可用的能力。让任何界面在无效配置下继续提供服务，属于策略变更，而不是实现细节。两个范围，任选其一：

- **选项 A（推荐，符合策略）：CLI 侧自动修复。** 当 gateway 或 CLI 启动因已知类型的无效配置而失败时，CLI 提供（或在获得同意后运行）`openclaw doctor --fix`，然后重试一次并明确报告结果。Gateway 行为不变；custodian 仍通过现有的 degraded-SecretRef 路径和终端保持可达。
- **选项 B（需要负责人明确批准 + 安全审查）：gateway 最小表面模式。** 在结构上无效的配置下，启动一个锁定的表面，仅提供 custodian 对话和 doctor 操作。这会重写 fail-closed 的启动契约，并且在任何代码编写前都必须定义自己的入口保护方案。

阶段 4–6 剩余的后续事项（已跟踪，未排期）：hatch 的头像/图像生成梯子；macOS 应用对类型化 `question` 字段的渲染；为 custodian 提供一个停靠式内联 Settings 面板（需要共享的 conversation-view 抽取）；事件响应式评论以及 channel 召唤/agent-down 恢复（第 6 阶段 PR2）；为弱模型自动设置 `localModelLean`；以及现有用户已保存的侧边栏固定项是否应采用 OpenClaw 入口。

macOS 应用现在也遵循相同的浏览器优先原则：推理验证完成后（安装 + AI 设置页面），原生 onboarding 即告结束，Finish 会在 `/custodian?onboarding=1` 打开仪表盘。原生的记忆导入和权限页面已从首次运行流程中移除（Settings → Permissions 仍然保留）；删除如今已无法访问的原生记忆导入模块将作为后续事项。

## 测试与上线操作手册（来之不易；请在第 4–6 阶段前阅读）

- **`OPENCLAW_STATE_DIR` 不会隔离 Gateway 服务。** `LaunchAgent` 标签（`ai.openclaw.gateway`）是全局机器级的：使用隔离 state dir 进行 fresh-install onboarding 测试时，会 **重写并重启** 真实机器上的服务（包装脚本会落到隔离目录里；下次服务启动时，如果该目录被清理，就会失败）。在任何 fresh-install 测试之后，都要从真实环境执行 `openclaw gateway install --force && openclaw gateway restart` 恢复，并验证 plist。产品后续事项：按 state-dir 范围划分的服务标签，或者由 onboarding 检测到外部服务。
- **安全的端到端 harness**：在隔离配置中预先填入一个 `gateway` section（这样 onboarding 会走已配置安装路径，并且永远不会碰到服务），然后在备用端口上以普通前台进程运行 `openclaw gateway run`，使用普通 token。这个 harness 证明了第 3 阶段的循环，包括真实浏览器连接。
- **认证路径因客户端身份而异，不仅仅取决于凭据。** Presence 和其他 operator 读取使用的是 CLI 模式的 loopback 客户端，凭据来自同一份配置。基于 token 的 gateway 需要共享密钥；SecretRef/none gateway 可以回退到受信任的 loopback 认证而无需 token。一个以 Control UI 身份标识的浏览器客户端需要设备身份或安全上下文的 loopback 授权。针对提供**不同**配置的 gateway 进行认证的 probe（见 LaunchAgent 陷阱）会报 "token mismatch"——这个产物曾短暂卡在第 3 阶段。
- **完成探测**：`runSetupInferenceTest` 将验证探测上限设为 32 个输出 token；自定义 prompt 会绕过该上限，并受模型自身 `maxTokens` 限制。推理模型会先用隐藏推理消耗这部分预算——如果某一轮输出为空文本，通常意味着预算已经在这里耗尽。
- **Agent 上线需要精确 head 的 hosted CI。** 较重的 `CI` workflow 在组织负载较高时，可能不会在 push 时排队；维护者的备用方案是在 PR 分支上触发 release-gate dispatch：

  ```bash
  gh workflow run ci.yml --ref <branch> -f target_ref=<head-sha> -f release_gate=true -f pull_request_number=<pr>
  ```

  该运行必须在 branch ref 上执行，这样 `head_sha` 才会匹配，并且标题会变成 `CI release gate <sha>`，`scripts/verify-pr-hosted-gates.mjs` 会接受它。然后照常使用 `scripts/pr` 进行 prepare/merge。

- **CI 除了重点测试之外还会强制执行的门禁**：文档一致性
  （修改文档后执行 `pnpm check:docs`）、oxlint（`no-map-spread`、
  `max-lines` —— 拆分文件，绝不要禁用检查）、`check:test-types`、knip
  死代码检查（只导出生产代码会使用的内容；让测试通过公共 API
  调用），以及实时测试分片分类器
  （`test/scripts/test-live-shard.test.ts` 必须列出任何新增的 `*.live.test.ts`）。

## 决策记录

- 带有杀开关的魔法扫描，不是先同意后扫描（第 1 阶段；持久输出会在扫描前披露模型和 ClawHub 的使用情况，结果备注也会重复说明）。
- 包括节点 `device.apps` 命令在内的完整垂直流程（第 1 阶段）。
- 第三方 ClawHub 技能从不默认预选，并标注为正在安装发布者的代码；官方条目可以预先勾选（第 1 阶段，已发布的安全姿态）。
- 两张访问卡，不是三张；同意前置到选择中（第 2 阶段）。
- 自动孵化并公告，不是阻塞式按钮（第 2/5 阶段）。
- 以浏览器优先：终端孵化是后备方案，绝不是“终端还是浏览器？”这种问题（第 3 阶段）。
- 管护者获得频道存在感（召唤 + 恢复），而不是仅限网页/CLI（第 6 阶段）。
- 孵化在同一线程中进行并伴随头像切换；完成后应用过渡到常规 UI（第 5 阶段）。
- 设置界面保留“Settings”这个名称；管护者住在那里（以及侧边栏中），而不是取代它（第 6 阶段）。
- 选项卡有约束：2-4 个选项，恰好一个推荐项，始终可跳过；同一组件同时用于引导和代理提问工具（第 4 阶段）。
- “Asking OpenClaw…” 是标准的委派习语；灵魂可以添加风格，但工具叙述保持朴素（第 5 阶段）。
- 面向用户的文案在解释弱模型裁剪时绝不使用“代码模式”、“工具”或“上下文窗口”这些说法（第 6 阶段）。

## 已知缺口和后续事项

- LaunchAgent 标签未按状态目录隔离（上述测试陷阱；同时也是实际存在的多实例产品缺口）。
- 推荐的一次性语义和已存储的扫描结果（第 5 阶段）；目前重新运行时仍会再次提供推荐。
- 会话计数的俏皮说法是定性的；计数需要一个开销低的会话计数接缝。
- 浏览器交接会进入常规仪表板；引导模式下的管理者深层链接将在第 4 阶段到达。
