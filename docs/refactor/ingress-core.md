---
summary: "将重复的 channel ingress 样板代码删除后迁移到 core 的删除优先计划。"
read_when:
  - 审查为什么 channel ingress 重构新增了太多代码
  - 将路由、命令、事件、激活或访问组策略从 bundled 插件迁移到 core
  - 检查某个 channel ingress helper 是否真的删除了 bundled 插件代码
title: "Ingress core 删除计划"
sidebarTitle: "Ingress core 删除"
---

# Ingress core 删除计划

当 ingress 重构增加了成千上万的净代码行时，它就不健康了。只有当 bundled 插件的生产代码变少，并且旧第三方 SDK 兼容性被隔离到 SDK/core shim 中时，core 集中化才算数。

期望的运行时形态：

```text
bundled 插件事件
  -> 在本地提取平台事实
  -> 在事实可用时仅解析一次共享 ingress
  -> 基于通用 ingress 投影/结果分支
  -> 在本地执行平台副作用

旧第三方 helper
  -> SDK 兼容性 shim
  -> 共享的 ingress 兼容投影（如有可能）
  -> 保留旧的返回形状
```

除非该类型是公开的插件 API，否则 bundled 插件不应把 ingress 再翻译回本地的 `AccessResult`、
`GroupAccessDecision`、`CommandAuthDecision`、`DmCommandAccess` 或
`{ allowed, reasonCode }` 形状。

## 预算

按 PR 与 `origin/main` 的 merge-base 进行衡量，包括未跟踪文件。

```text
merge-base            1671e7532adb

current:
core production       +3,922 / -546    = +3,376
docs                  +601 / -17       = +584
other                 +145 / -2        = +143
plugin production     +4,148 / -5,388  = -1,240
tests                 +2,326 / -2,414  = -88
total                 +11,142 / -8,367 = +2,775

required:
plugin production     <= -1,500
core production       <= +1,500，或者由更大的 plugin 删除来抵消
tests                 <= +1,000
total                 <= +2,000

stretch:
plugin production     <= -2,500
core production       <= +1,200
total                 <= 0
```

最低剩余清理量：

```text
plugin production     还需要再删除 260 行净代码
total                 还需要再删除 775 行净代码
core production       仍比独立预算高 1,876 行，除非通过 plugin 删除来摊销
```

仅删除注释不算清理。上一次预算通过过于宽松，因为其中包含了恢复的 QQBot 说明性注释；本文档只跟踪可执行代码 / 文档 / 测试代码的迁移。

每完成一波清理后重新测量：

```sh
base=$(git merge-base HEAD origin/main)
git diff --shortstat "$base"
git diff --numstat "$base" -- src/channels/message-access src/plugin-sdk extensions | sort -nr -k1 | head -n 80
pnpm lint:extensions:no-deprecated-channel-access
```

## 诊断

第一轮先加入了共享 ingress 内核，然后在其旁边保留了太多插件本地授权逻辑：

```text
platform facts
  -> shared ingress state and decision
  -> plugin-local DTO 或 legacy projection
  -> plugin-local if/else ladder
```

这重复了模型。core 生产代码大约增加了 3,376 行，而 bundled 插件生产代码减少了 1,240 行。这比第一轮更好，但仍未进入最低预算。修复仍然必须以删除优先：

- 删除那些只是在重命名 ingress 字段的插件 DTO
- 删除那些只断言 wrapper 形状的测试
- 只有在同一个补丁同时删除 bundled 插件代码时，才添加 core helper
- 旧 SDK 兼容性只保留在 SDK/core shims 中
- 在 wrapper 删除后暴露稳定形状，再重新整理 core

## 热点

仍需缩减的正向 bundled 生产文件：

```text
extensions/telegram/src/ingress.ts                        +126
extensions/discord/src/monitor/dm-command-auth.ts         +101
extensions/signal/src/monitor/access-policy.ts             +92
extensions/feishu/src/policy.ts                            +85
extensions/slack/src/monitor/auth.ts                       +64
extensions/googlechat/src/monitor-access.ts                +59
extensions/nextcloud-talk/src/inbound.ts                   +51
extensions/matrix/src/matrix/monitor/access-state.ts       +49
extensions/irc/src/inbound.ts                              +44
extensions/imessage/src/monitor/inbound-processing.ts      +36
extensions/qa-channel/src/inbound.ts                       +34
extensions/qqbot/src/bridge/sdk-adapter.ts                 +33
extensions/tlon/src/monitor/utils.ts                       +30
extensions/twitch/src/access-control.ts                    +22
extensions/qqbot/src/engine/commands/slash-command-handler.ts +20
extensions/telegram/src/bot-handlers.runtime.ts            +19
```

该分支仍未进入最低预算。剩余与 review 相关的工作应当先删除重复的授权流程、转向 scaffolding 或 wrapper 测试，再添加新的 core 抽象。

## 当前代码解读

健康的 core 接缝已经存在于 `src/channels/message-access/runtime.ts`：
它负责 identity adapter、effective allowlist、pairing-store 读取、route descriptor、command/event preset、access group，以及最终解析出的
`ResolvedChannelMessageIngress` 投影。

剩余增长大多是叠加在该接缝之上的插件 glue：

- `extensions/telegram/src/ingress.ts` 用 Telegram 特定的 command/event helper 包装 core 决策，然后调用点仍然传入预先计算好的标准化 allowlist 和 owner list。
- `extensions/discord/src/monitor/dm-command-auth.ts`、
  `extensions/feishu/src/policy.ts`、`extensions/googlechat/src/monitor-access.ts`，
  以及 `extensions/matrix/src/matrix/monitor/access-state.ts` 仍然在 ingress 旁边保留本地 policy DTO 或 legacy decision 名称。
- `extensions/signal/src/monitor/access-policy.ts` 正确地将 Signal 的 identity 标准化和 pairing 回复保留在本地，但仍有一个 wrapper 接缝，应当收缩为直接消费 ingress。
- `extensions/nextcloud-talk/src/inbound.ts`、`extensions/irc/src/inbound.ts`、`extensions/qa-channel/src/inbound.ts`、`extensions/zalo/src/monitor.ts` 以及
  `extensions/zalouser/src/monitor.ts` 仍然重复 route/envelope/turn 的组装，这些可以迁移到 ingress 内核之外的共享 turn helper。

结论：只有当这些插件 wrapper 层在同一个补丁中被删除时，把更多代码移入 core 才有意义。只添加抽象而保留 wrapper 返回值不变，会重演同样的错误。

## 边界

Core 负责通用策略：

- allowlist 规范化与匹配
- access-group 扩展与诊断
- pairing-store 的 DM allowlist 读取
- route、sender、command、event 和 activation gate
- admission 映射：dispatch、drop、skip、observe、pairing
- 脱敏后的状态、决策、诊断和 SDK 兼容投影
- 可复用的通用 descriptor：identity、route、command、event、activation 和 outcomes

插件负责传输事实和副作用：

- webhook/socket/request 真实性
- 平台 identity 提取和 API 查询
- channel 特定的策略默认值
- pairing challenge 投递、回复、ack、reaction、typing、媒体、历史记录、设置、doctor、状态、日志以及面向用户的文案

Core 必须保持 channel 无关：`src/channels/message-access` 中不能出现 Discord、Slack、Telegram、Matrix、room、guild、space、API client 或插件特定默认值。

## 验收规则

每个新的 core helper 都必须立即删除 bundled 插件生产代码。

```text
一个 bundled 调用者        拒绝；保留 plugin-local
两个 bundled 调用者       只有在 plugin 生产 LOC 下降时才接受
三个或更多调用者         plugin 删除量必须至少是新增 core LOC 的 2 倍
仅用于兼容的 helper       只允许 SDK/core shim；绝不进入 bundled 热路径
```

如果出现以下情况则停止并重新设计：

- plugin 生产 LOC 增加
- 测试增长速度快于生产代码减少速度
- bundled 热路径返回一个只是重命名了 `ResolvedChannelMessageIngress` 的 DTO
- core helper 需要 channel id、平台对象、API client 或 channel 特定默认值

## 工作包

1. 冻结预算。
   在 PR 中写明 LOC，保持 deprecated-ingress lint 绿色，并在清理提交中包含前后 LOC。

2. 删除薄 DTO 接缝。
   直接把插件本地 wrapper 返回值替换为 `ResolvedChannelMessageIngress`、
   `senderAccess`、`commandAccess`、`routeAccess` 或 `ingress`。先从 QQBot、Telegram、Slack、Discord、Signal、Feishu、Matrix、iMessage 和 Tlon 开始。删除 wrapper 形状测试；保留行为测试。

3. 只有在伴随删除时才添加 outcome 分类。
   通用分类器可以暴露 `dispatch`、`pairing-required`、
   `skip-activation`、`drop-command`、`drop-route`、`drop-sender` 和
   `drop-ingress`。它必须从 decision graph 推导，而不是从 reason strings 推导，并且在同一个补丁中至少迁移三个插件。

4. 只有在伴随删除时才添加 route descriptor 构建器。
   通用 route target 和 route sender helper 只有在能立即缩减 route-heavy 插件时才可接受：Google Chat、IRC、Microsoft Teams、Nextcloud Talk、Mattermost、Slack、Zalo 和 Zalo Personal。

5. 只有在伴随删除时才添加 command/event preset。
   集中化 text-command、native-command、callback 和 origin-subject 形状。若没有运行 command gate，command 消费者必须默认 unauthorized；events 不能开始 pairing。

6. 只有在它们能移除样板代码时才添加 identity preset。
   stable-id、stable-id-plus-aliases、phone/e164 和 multi-identifier helper 只有在 raw values 仅进入 adapter input 且脱敏状态保留 opaque id/counts 时才允许使用。

7. 共享授权 turn 组装。
   在 ingress 内核之外，删除 QA Channel、IRC、Nextcloud Talk、Zalo 和 Zalo Personal 中重复的 route/envelope/context/reply scaffolding。Core 可以负责 route/session/envelope/dispatch 的顺序；插件保留投递和 channel 特定上下文。

8. 隔离兼容性。
   弃用的 SDK helper 保持源码兼容，但 bundled 热路径不得导入已弃用的 ingress 或 command-auth facade。兼容性测试应使用假的第三方插件，而不是 bundled 插件内部实现。

9. 重新整理 core。
   在 wrapper 删除后，合并一次性模块，移除未使用的导出，把兼容投影移出热路径，并为 identity、route、command/event、activation、access group 和兼容 shim 保留聚焦测试。

## 删除波次

按顺序执行这些操作。每一波都必须降低打包后的生产 LOC。

1. 包装层收缩，预期插件差异：-400 到 -600。
   将插件本地的 `resolveXAccess`、`resolveXCommandAccess` 和
   `accessFromIngress` 返回类型替换为直接从
   `ResolvedChannelMessageIngress` 读取。首要目标：Discord DM 命令鉴权、
   飞书策略、Matrix 访问状态、Telegram ingress、Signal 访问策略、
   QQBot SDK 适配器。

2. 共享结果辅助函数，预期插件差异：-200 到 -350。
   仅在它能删除重复的
   `shouldBlockControlCommand`、配对、激活跳过、路由阻塞和发送者
   阻塞分支链，并且至少覆盖三个插件时，才添加一个通用分类器。

3. 路由描述符构建器，预期插件差异：-200 到 -350。
   将重复的路由目标和路由发送者描述符组装迁移到 core 辅助函数中。
   首要目标：Google Chat、IRC、Microsoft Teams、Nextcloud Talk、
   Mattermost、Slack、Zalo、Zalo Personal。

4. Turn 组装共享，预期插件差异：-250 到 -450。
   对简单的入站插件使用通用的 route/session/envelope/dispatch 顺序。
   首要目标：QA Channel、IRC、Nextcloud Talk、Zalo、Zalo Personal。

5. Core 重打包，预期 core 差异：-300 到 -700。
   在插件直接消费运行时投影之后，删除一次性模块，
   将小文件合并回 `runtime.ts` 或相关的精简兄弟文件中，并保持 SDK
   兼容性文件与打包后的热点路径分离。

6. 测试裁剪，预期测试差异：-300 到 -600。
   删除仅断言已移除包装器形状的测试。保留针对
   命令拒绝、群组回退、来源-主题匹配、激活跳过、
   访问组、配对和脱敏的行为测试。

这些波次完成后的预期最低落地形态：

```text
plugin production     <= -1,500
core production       about +1,800 to +2,200 before final repack
tests                 <= +500
total                 <= +2,000
```

## 不要移动

不要移动平台配置默认值、设置 UX、doctor/fix 文案、API 查找、
Slack 拥有者在线状态检查、Matrix 别名/验证处理、Telegram
回调解析、命令语法解析、原生命令注册、反应
载荷解析、配对回复、命令回复、acks、typing、media、history，
或 logs。

## 验证

本地定向循环：

```sh
pnpm lint:extensions:no-deprecated-channel-access
pnpm test src/channels/message-access/message-access.test.ts src/plugin-sdk/channel-ingress-runtime.test.ts src/plugin-sdk/access-groups.test.ts
pnpm test extensions/<changed-plugin>/src/...
pnpm plugin-sdk:api:check
pnpm config:docs:check
pnpm check:docs
git diff --check
```

当 LOC 趋势进入预算范围后，使用 Testbox 进行广泛的变更门禁/完整套件证明。

每个工作包都要记录：

- 按类别划分的前后 LOC
- 已删除的插件包装器
- 新增的 core 辅助函数 LOC（如有）
- 已运行的定向测试
- 剩余热点列表

## 退出标准

- 打包后的 production imports 不包含任何已弃用的 channel-access 或 command-auth 外观层
- 兼容性代码被隔离在 SDK/core 的交界处
- 打包后的插件直接消费 ingress 投影或通用结果
- 相比 `origin/main`，plugin production LOC 至少净减少 1,500
- core production LOC `<= +1,500`，或任何超出部分都已偿还，同时 total
  保持 `<= +2,000`
- 代表性测试覆盖脱敏、路由、命令/事件、激活、
  access-group，以及 channel-specific 回退行为
