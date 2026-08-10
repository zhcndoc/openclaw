---
summary: 会话的一种放置模型——网关、配对设备和云端主机都是运行器；客户端连接到会话，而不是运行器。
title: 运行器方案
read_when:
  - 设计或审查会话运行位置（网关、设备、云端）
  - 更改“运行位置”选择器、设备配对或工作器调度界面
  - 为会话、设备或放置相关内容命名
---

## 状态

提案，第 1 次修订。实施进行中（自主构建已于
2026-08-08 启动；本节跟踪实时状态——每个推进里程碑的 PR 都必须更新本节）。

| #   | 里程碑                                             | 状态       | PR     |
| --- | -------------------------------------------------- | ---------- | ------ |
| 0   | 本计划                                             | 已合并     | —      |
| 1a  | 命名：恢复会话副本                                 | 已合并     | #120667 |
| 1b  | 命名：设备整合                                     | 已合并     | #120689 |
| 1c  | 清理：合并 node-pairing → device-pairing           | 尚未开始   | —      |
| 2   | `openclaw resume` + 网页端在终端中继续             | 进行中     | #120664 |
| 3   | `oc-pair://` 一键粘贴配对                          | 尚未开始   | —      |
| 4   | 选择器 + 信息补充 + 项目读取模型                   | 尚未开始   | —      |
| 5   | 设备运行器                                         | 尚未开始   | —      |
| 6   | 停止并继续移动                                     | 尚未开始   | —      |
| 7   | 删除项（ssh 沙箱、openshell、exec-host 克隆）      | 尚未开始   | —      |

提案历史：经过对 worker、exec 和 node 技术栈的三次深入阅读、行业调研（Amp runners/orbs、Cursor 3 位置选择器、Claude Code teleport、Codex 云端、VS Code tunnels、Tailscale auth keys），以及三次对抗性评审后，于 2026-08-08 就方向达成一致；评审中否决的结论已作为明确的非目标纳入下文。本提案直接基于已发布的云工作器架构（`docs/plan/cloud-workers.md`、`docs/gateway/cloud-workers.md`）构建，并不取代该架构。

## 问题

OpenClaw 对“工作在哪里运行”有三个互不连通的答案：

- **节点**只接收转发的 `exec host=node` 调用；整个轮次循环始终不会离开网关。用户的常驻 Mac Studio 作为会话主机，能力反而不如一次性的 AWS 租约。
- **云工作者**承载完整会话，并拥有持久化的放置状态机，但目前只能使用临时的提供商租约。
- **ssh 沙箱后端**是第三条远程执行路径（由网关持有 SSH 凭据，按工具进行远程调用），其形态重复了云工作者已经取代的功能。

UI 也反映了这种碎片化：放置位置在新建会话弹出框中只选择一次，选项是混合了三种本体（网关、执行节点、云配置）的扁平列表，之后便不可见且无法修改。放置配置分散在 `tools.exec.*`、`agents.entries.*.tools.exec.node`、`agents.defaults.sandbox.*`、`gateway.nodes.*` 和 `cloudWorkers.profiles` 中。术语也逐渐发生偏移：控制 UI 使用“线程”（2026 年 7 月的文案重命名，PR 110933/110973），而 CLI、协议、存储和文档使用“会话”；配对硬件在路由/i18n 中称为“节点”，在路径/标签中则称为“设备”。

## 模型与词汇

```
会话      由网关拥有：转录、身份、放置、受管工作树。
          客户端（Web、TUI、macOS 应用、频道）附加到会话，
          从不附加到运行器。全程统一使用一个术语：会话。
运行器    任何能够承载会话轮次循环的对象：
            - 网关本身（免费提供的运行器）
            - 已配对设备（通过基于节点的工作器提供方；见下文）
            - 云主机（现有的 crabbox 工作器提供方）
隔离      是运行器的属性，而不是位置的属性：
            云主机       -> 机器就是边界
            网关/设备   -> 无 | docker | podman（现有沙箱）
设备      已配对的硬件（如今称为“节点”）。设备作为外设提供
          能力（摄像头、画布、执行）；设备只有通过工作器准入路径
          才会成为运行器。
项目      仓库身份：规范化的 remote.origin.url；如果没有远程仓库，
          则使用现有的 16 字符仓库指纹作为回退值。派生而来，
          从不注册。
检出      项目 × 运行器 = { runnerId, path } —— 项目在何处
          实际存在。云运行器没有检出；它们会为每个会话
          物化一个全新的检出。
文件夹    非 Git 场景的逃生通道：某个运行器上的普通路径
          （如今的浏览流程，保持不变）。
轮次      会话内一次从提示到响应的工作尝试
          （与 ACP 和工作器协议一致）。
```

命名裁定（操作方于 2026-08-08 决定）：

- **会话**是对话唯一的产品术语。Control-UI 中的“线程”文案已恢复为原样（包括 i18n 和测试字面量；技术标识符从未更改）。行业中，智能体产品对 session 与 thread 的采用比例为 9–2；ACP 使用 session；而“线程”会与 Discord/Slack/Telegram 的子线程传输概念冲突。
- **设备**是面向用户的已配对硬件称谓；“节点”仅保留为协议/内部词汇。路由/i18n 遗留项（`nodes` 路由 ID、`/settings/devices` 路径、`nodes.*` i18n 键）统一迁移到 devices。
- 新的 CLI 易用性设计以**动词**形式发布（`openclaw resume`），绝不在 `openclaw sessions` 旁新增第二个名词命令。
- “运行器”是内部/文档概念；UI 文案使用“运行于……”。

VISION.md 增加一段：网关是协调器，也是默认运行器；其他任何机器——无论是你的机器还是租用的机器——都可以成为运行器；客户端附加到会话，因此会话运行在哪里，永远不会改变你与它交流的方式。

## 对抗性评审否决的内容（现阶段非目标）

- **不设 Places 注册表。** `environments.list`
  (`src/gateway/server-methods/environments.ts:143-157`) 已经返回合并后的读模型：网关条目、节点目录（已配对 + 实时在线状态）、worker 环境、云配置。持久化注册表会重复记录在线状态事实；重命名 RPC 只是增加第二条路径。我们改为以增量方式丰富 `EnvironmentSummary`。
- **节点角色不承载回合循环。** 节点协议此前已被否决作为循环传输机制（cloud-workers.md §4）：已连接节点可以发出任意节点事件，因此其能力上限并不是入口边界。Worker 入口仍采用封闭的三方法允许列表
  (`packages/gateway-protocol/src/schema/worker-admission.ts:32-34`)，使用每次派发签发的凭据以及精确的 bundle-hash 准入
  (`src/gateway/worker-environments/admission.ts:80-104`)。设备只有在该准入机制下运行 `openclaw worker`，才能成为 runner。
- **不向正在使用的 checkout 派发任务。** 工作区同步要求远程目录由单一方独占（每次同步都会清空，
  `workspace-sync-setup-script.ts:29`）；reconcile 会将偏离基础 manifest 的内容视为 worker 输出。设备 runner 使用 `$HOME/.openclaw-worker/` 下相同的、按会话隔离的私有目录，这正是 qa-lab static-ssh provider 当前已证明可行的方式。
- **不合并 `exec host=node`。** 逐调用的 exec 路由约有 5k 行四层故障安全审批机制（网关 TOCTOU 重新检查、节点策略下限、在节点上重新校验的 `systemRunPlan` 哈希绑定、节点本地重新评估）。它服务于不同的产品（在不同策略域中执行一条命令），因此保持不变。
- **不将 sandbox 作为地点行。** Sandbox 是按 agent 配置的隔离机制，没有按会话覆盖的操作界面；对于未配置 sandbox 的 agent，选择器中的一行会悄无声息地不起作用。
- **不使用虚假的迁移动词。** `sessions.dispatch` 只接受 `local|reclaimed` 部署位置和云配置
  (`sessions-dispatch.ts:166-176`)；不存在暂停，也不存在机器到机器的迁移。UI 只展示后端实际支持的功能：当前支持显示 + reclaim；设备 runner 发布后，再支持停止并继续式迁移。
- **配对链接不预先批准 exec。** 单次粘贴流程可以预先批准仅限在线状态的权限范围；`system.run` 和文件夹同步始终经过现有的待审批或 SSH 验证门控
  (`src/gateway/node-pairing-ssh-verify.ts`)。
- **不支持实时迁移、不支持多网关联邦、不支持将手机作为 runner。**

## 组件

### 1. 会话续接体验（独立交付，优先发布）

这在设计上已经实现：会话记录和部署位置都位于网关上，无论采用何种部署方式，推理都源自网关，并且 TUI 是完整的网关客户端（`openclaw tui --session <key>`、Ctrl+P 选择器、恢复上次会话——`src/tui/tui-last-session.ts`）。在云端运行的 Web 上启动会话；TUI 会连接该会话，并将路由转交给工作节点。

变更仅涉及体验：

- `openclaw resume [query]` — 按名称/键在各个代理的最近会话中进行模糊匹配；不提供查询时打开选择器；解析为 `tui --session <key>`。
- Web UI 会话行中的“在终端中继续”：显示准确的命令（`openclaw resume <key>`），与 Codex/Claude 会话目录已有的终端恢复入口保持一致。
- 不新增协议接口；`sessions.list` 已经包含解析器所需的信息。

后续事项：边界级恢复测试（网关 → 会话列表 → 连接）需要一个轻量级的 CLI 侧网关测试工具；现有辅助工具在 CLI vitest 配置下耗时约 370 秒。

### 2. 一键设备配对（独立）

复用已交付的设置码流程：`PairingSetupPayload = { url, urls?,
bootstrapToken }` base64url blob（`src/pairing/setup-code.ts:40-44,406-410`）、
10 分钟有效且只能使用一次的 bootstrap token、`bootstrapProfile: "node"`
（`src/shared/device-bootstrap-profile.ts:61-94`），以及生成 token 的 RPC
`device.pair.setupCode`（`src/gateway/server-methods/device-pair-setup.ts`）。

需要补齐的部分：

- `oc-pair://<setupCode>` scheme wrapper（payload 保持不变）。
- `openclaw node run --pair <code|url>` 兑换路径：解码 blob，配置
  host/port/token，建立连接（目前仅存在 `--host/--port/--tls-fingerprint`
  参数，`src/node-host/runner.ts:27-37`）。
- 将 TLS fingerprint 添加到 `PairingSetupPayload`（node host 已经接受
  pin；但 blob 无法携带它）。
- 在 Control UI 配对对话框中暴露 `node` bootstrap profile
  （目前仅支持 RPC，`ui/src/lib/device-pair-setup.ts`）。
- 采用 Tailscale 风格的密钥拆分，并在文档中说明：配对 token 的有效期很短且只能使用一次；
  生成的设备凭据长期有效；撤销其中一个不会撤销另一个。

执行/权限范围升级保持不变：首次 `system.run` 请求会进入待审批状态，或通过 SSH-verify 自动批准。

### 3. 设备运行器（核心）

设备运行器是指连接到一台持久化机器的现有工作器栈。  
表明该栈已准备就绪的证据：

- 提供商契约非常精简且与 SSH 通用
  (`src/plugins/capability-provider.types.ts:97-114`)：`provision → {leaseId,
ssh}`、`inspect`、`destroy`。qa-lab 静态 SSH 提供商
  (`extensions/qa-lab/src/static-ssh-worker-provider.ts:70-91`) 已经通过无操作的 destroy
  封装了一个持久化主机；由于远程工作区是每个会话独享的私有镜像，同步/协调工作无需修改即可运行。
- 准入、放置状态机、SQLite 存储、transcript CAS、
  推理代理以及 `openclaw worker` 运行时基本无需更改；准入基于凭据，而非传输方式。
- 连接点是 `WorkerTunnelHandle`
  (`src/gateway/worker-environments/tunnel-contract.ts:74`，85 行)：
  在一个句柄之后封装工作区命令执行、同步和静默处理，目前仅支持 SSH
  (`worker-turn-launcher.ts:337-344`、`workspace-sync-scripts.ts`)。

工作项：

- **`device` 工作器提供商**：`provision` 将配置文件映射到一个现有的
  已配对且已连接的设备；`destroy` 释放逻辑租约。配置：
  `cloudWorkers.profiles.<id> = { provider: "device", settings: { device:
"<id-or-name>" } }`（命名待定：将配置块重命名为
  `runners.profiles`，并通过 doctor 迁移——在评审时决定）。
- **隧道变体**：可以选择 (a) 像连接任何工作器一样通过 SSH 连接设备（设备
  运行 sshd；最简单，并可复用全部现有机制），或者 (b) 实现一个
  `WorkerTunnelHandle`，通过设备现有的网关连接复用工作区命令和工作器套接字。先交付 (a)；(b) 作为优化方案，由评审决定。
- **经用户同意的固定版本运行时**：网关将其内容哈希后的
  bundle（现有 bootstrap，`bootstrap.ts:26-104`）推送到设备上的
  `$HOME/.openclaw-worker/`。在个人机器上安装运行时需要每台设备一次性的操作员批准，并在配对/批准界面中展示。继续执行精确版本准入；版本偏差通过重新安装 bundle 解决，绝不放宽检查。
- **离线/排空语义**（唯一真正新增的子系统）：个人机器会休眠且无法被销毁。针对
  `runner-offline` 新增放置处理：心跳丢失会将放置标记为离线，并记录一个对操作员可见的原因（产品原则：不得静默地产生非结果）；暂存结果会被保留（沿用现有的 fence 机制）；会话提供“在网关上继续”（回收）或“等待设备”选项。在设备具有唤醒通道的情况下，复用唤醒提示子系统
  (`src/gateway/node-wake-state.ts`)。
- **设备运行器上的隔离**：可选在设备上通过 Docker 运行工作器，与网关本地会话使用相同的沙箱维度。云运行器在容器内保留完整权限（机器本身就是边界）。

### 3b. 项目（派生的读取模型）

OpenClaw 已经在没有命名的情况下计算项目身份两次：工作树服务派生出
`originUrl` 和一个 16 字符的仓库指纹
（`src/agents/worktrees/service.ts:199-205`），而会话目录则按项目文件夹对
Codex/Claude 行进行分组，将 `.claude/worktrees/<name>` 归并到其源仓库中。该组件将其提升为一等读取模型——
派生而来、从不注册，与 `environments.list` 使用相同的模式：

- **`projects.list` 读取模型**（按需计算，不新增存储）：按仓库指纹对已知检出进行分组 → `{ name, originUrl, checkouts:
[{runnerId, path}], lastUsedAt }`。来源包括：会话行
  （`execCwd`/`execNode`）、受管理工作树注册表，以及设备公布的工作目录（如下）。所谓“GitHub 属性”仅指将 originUrl 的主机作为副标题显示；要对其建模无需集成代码托管平台。
- **设备检出公布**：由于网关无法获知设备检出的来源，因此目前无法跨运行器对检出进行分组。设备运行器启用功能（组件 3）会将 `{path, originUrl}` 对添加到设备握手信息中——这正是 Amp 的主机+工作目录理念应落地的位置。改动小、具有增量性，并且只会发送操作员启用的路径。
- **选择器流程**：先选择项目（芯片 ⌃J），然后由 Where 芯片缩小范围，显示“该项目存在于何处”——将检出路径作为行副标题；没有检出的运行器如实列出（“无检出 · 首次会话时从源仓库克隆”）；云端始终符合条件（进行全新克隆）。最近使用项按项目分组，而不是对原始的 `(folder, node)` 对去重
  （`ui/src/pages/new-session/recent-places.ts`）。“无项目”继续保留现有的按运行器浏览文件夹功能，作为备用入口。
- **代码托管平台集成是后续且可分离的阶段**：来自 GitHub 的仓库列表、克隆从未接触过的仓库、会话行上的 PR 状态。派生模型完全不需要这些功能；明确拒绝采用注册式项目创建（仅云端产品的模式）——项目之所以出现，是因为你曾在其中工作过。

### 4. UI 收敛

设计规则（操作员决定，2026-08-08）：**正常状态保持静默；只有异常才发声。** 不显示在线圆点，不显示持久/临时/外围标签，不显示状态胶囊——已经列在选择器中就意味着可用，操作员也知道哪些是自己的设备。状态文本仅在异常情况下出现（“离线 · 2 小时”、运行器离线横幅），或用于展示操作员无法推断的事实（配置时间、“在 docker 中运行”）。能力标签保留：它们是结构化事实，而不是状态。运行中的会话仅以安静文本显示位置（“在 aws 上”），而不是带徽章的小组件——活动加载指示器已经体现了运行状态。

- **以增量方式丰富 `EnvironmentSummary`**（协议层面，无需迁移）：
  `trust: "persistent" | "disposable"`、`sessionHost: boolean`、`platform`，以及对于配置文件，由提供方提供的 `class` 标签。在提供方实际提供价格之前，不加入任何价格字段。
- **重新组织选择器**（`ui/src/pages/new-session/place-picker.ts`）：
  分为“此网关”/“你的设备”（仅显示支持会话且已连接的设备——通过门控机制隐藏手机和离线设备）/“云端”。文件夹和目标保持正交。文案：“在 {place} 上运行”。
- **会话标题中的位置标签**：显示当前的位置和状态；对于今天的云端位置，菜单仅提供回收操作（“带回本地”），设备运行器发布后再加入停止并继续的迁移操作。复用侧边栏徽章已经使用的位置订阅。
- **设备页面**：将每台设备的实时会话整合到现有的 `ui/src/pages/nodes/` 页面中（端到端重命名为 devices）。不新增顶级导航项；选择器中的“连接设备……”链接指向此处。
- **命名调整**（一个 PR，尽早完成，在新增文案落地之前）：将 Control UI 文案中的 thread 恢复为 session；在路由 id、i18n 键和标签中统一将 nodes 改为 devices。按照 UI 现有的别名机制添加路由别名。

### 5. 删除与去重（每项删除都以其替代方案为前提）

| 目标                                                                                                                                                                                                    | 大小       | 前提                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------ |
| SSH 沙箱后端 + 远程文件系统桥接（`src/agents/sandbox/ssh*.ts`）                                                                                                                                     | 约 2.35k 行代码 | 设备运行器覆盖“我服务器上的工具”这一使用场景                 |
| openshell 重叠部分（`extensions/openshell`）                                                                                                                                                                | 约 3.4k 行代码  | 先确认实际使用情况；采用相同的 SSH 传输结构                  |
| exec-host 结构性克隆（`bash-tools.exec-host-gateway.ts` 与 `exec-host-node*.ts`：允许列表评估、自动审查、超时回退、后续交付；node host 将该分析再次克隆了一遍） | 约 5k 行中的 3k 行 | 提取一个共享的审批状态机；node 计划绑定保留 |
| `node-pairing.ts` 作为 `device-pairing.ts` 的外观层 + 迁移垫片                                                                                                                                       | 中等     | 完成合并；统一术语                                   |
| UI 放置监视器（`cloud-recovery-state.ts` + sessions 页面协调循环）                                                                                                                                        | 中等     | 使用一个放置监视控制器                                  |

整个计划的生产代码净行数目标为负数：组件 1–2 只是少量新增；组件 3 主要是一个提供商插件 + 一个基于复用机制的隧道变体；组件 5 删除的内容多于新增的内容。

## 既有方案（我们复制什么，跳过什么）

- **Amp agents-anywhere**：将运行器作为选择器中的一等选项；身份标识 =
  主机 + 工作目录，并可选使用固定名称 → 我们以设备 ID 为键，并公布工作目录。Amp 对离线运行器行为未作说明；我们记录的
  `runner-offline` 状态是有意做出的改进。
- **Tailscale 身份验证密钥**：一次性短期配对密钥与长期设备凭据分离，并单独支持撤销 → 在组件 2 中采用。
- **Claude Code teleport**：由于其云端会话位于其他地方，继续操作时需要重新生成状态；OpenClaw 的网关拥有会话，因此继续操作只需附加——更简单，也无需移动状态。他们关于分叉而非移动的语义，为我们停止并继续的表述提供了参考。
- **Cursor 3 位置选择器**：在一个下拉菜单中提供 Local/Worktree/Cloud/SSH，验证了单一选择器的用户体验；他们推出的实时云端交接存在缺陷——我们不尝试实时移动。
- **devcontainer.json**：如果/当面向工作器配置文件的仓库自有环境设置功能落地时，采用该规范，而不是另创格式（Cursor 专有的 environment.json 已积累了技术负债；Gitpod 已迁移到该规范）。

## 里程碑

可独立合并的 PR 系列，大致按顺序进行；1–3 可交错进行。

1. **命名阶段**：会话文案回退 + 设备整合（仅 UI/i18n/测试；
   不修改协议或 CLI）。
2. **续接体验优化**：`openclaw resume`，Web“在终端中继续”。
3. **配对**：`oc-pair://`、`node run --pair`、载荷中的 TLS 固定，
   配对 UI 中的节点配置。
4. **选择器 + 信息补充**：新增 `EnvironmentSummary` 字段、重新分组
   Where 选择器、位置标签（显示 + 回收）、`projects.list` 读取模型 +
   以项目优先的选择器流程（在第 5 项加入设备播报前，仅支持网关侧检出）。
5. **设备运行器**：设备工作器提供方（先实现 SSH 传输）、经固定版本的
   bundle 安装并按设备征得同意、检出播报
   （在启用握手中使用 `{path, originUrl}`）、带记录原因的
   `runner-offline` 位置语义、可选的 docker 内工作器隔离。
   故障注入测试（设备在回合中途休眠、设备离线时网关重启、凭据过期）
   作为退出门槛——标准与云工作器设定的标准相同。
6. **停止并继续移动**（标签动词“移动到…”）：排空 + 回收 +
   重新分派到其他运行器，复用迁移屏障。
7. **删除**：SSH 沙箱后端、openshell 重叠部分、exec-host 克隆提取、
   节点/设备配对合并——每项都在独立 PR 中完成，并证明替代方案已覆盖
   原有功能。

## 待解决问题

- 配置命名：保留 `cloudWorkers.profiles`（兼容性）还是在里程碑 5 中通过 doctor 迁移到
  `runners.profiles`？
- 设备运行器传输方式：（a）sshd，还是（b）多路复用网关连接：
  先发布（a）；（b）是否值得引入额外的协议层面？
- 当无法连接到网关时，`openclaw resume` 是否也应在本地模式下启动网关/TUI，还是在提供指导后失败？
- 工作器配置文件的仓库自有设置契约（devcontainer.json）：纳入此计划，还是后续处理？
- Forge 集成（GitHub 仓库列表、随处克隆、会话行上的 PR 状态）：明确排除在此计划之外；待派生项目模型投入使用后再后续处理。
- 项目命名冲突：`openclaw fleet` 和多租户文档有些地方宽泛地使用“project”一词——在命名调整阶段进行全面检查，确保“project”专指仓库身份。
