---
summary: "当已弃用的插件 SDK 表面符合删除条件时"
read_when:
  - "您需要导入的 SDK 子路径的删除日期或门限"
  - "您正在计划围绕兼容性窗口进行迁移工作"
title: "移除时间表"
sidebarTitle: "移除时间表"
---

控制已弃用表面何时可移除的日期和门限。 [Plugin SDK 迁移](/plugins/sdk-migration) 指南的一部分。

`pnpm plugin-sdk:surface:check` 独立于导出计数预算强制执行最新稳定版本的承诺类型公共表面。删除已传送的子路径或命名导出需要覆盖 `deprecated`、`removal-pending` 或 `removed` 兼容性记录，其中 `removeAfter` 日期严格早于当前 UTC 日期；仅 `removalGate` 并不授权删除。没有 `types` 导出条件的打包私有运行时外观被排除在外，因为它们没有声明类型化公共合约。

## <a id="removal-timeline"></a> 移除时间线

| 什么时候                                                     | 会发生什么                                                                                                                                                                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **现在**                                                  | 可发出警告的已弃用接口会发出运行时警告；仓库防护措施会拒绝核心和捆绑插件导入已弃用的 SDK 接口                                                                             |
| **等待所有者决策**                               | 没有 `removeAfter` 或 `removalGate` 的记录仍保持已弃用状态，在其所有者发布门控之前不具备移除资格                                                                                                   |
| **`deprecated` 记录的 `removeAfter` 日期后的天** | 在 00：00 UTC，该记录变得符合日期条件，并且 `pnpm plugins:boundary-report --fail-on-eligible-compat` 以非零值退出。该日期本身就是最终兼容日。                                          |
| **A `removal-pending` 记录的 `removeAfter` 日期**      | 在 00：00 UTC，报告标记该记录需要审核并列出其阻止程序。它不会触发兼容性失败标志。                                                                                     |
| **2026-12-31 — 最终 SQLite 兼容性日**          | 已弃用的同步 SQLite-backed 成员在此日期之前保留其已发布的合约。在升级到 1 月删除版本之前，请迁移到记录的 async/V2 替换版本。                      |
| **2027 年 1 月第一个稳定版本**                    | 在下一个稳定版本发布警告和迁移指南后，删除过时的同步 SQLite 兼容性成员。不需要 SDK 专业。日期门首次允许移除日期为 2027 年 1 月 1 日 UTC。 |
| **其他普通稳定释放闸门**                  | `inbound-reply-dispatch` 和已弃用的提及收件箱签名保留单独的、未注明日期的 `stable-deprecation-period` 门。它们的主人必须宣布一个窗口并授权拆除。                               |

下面其余的公共 SDK 表面具有注册表支持的删除窗口。对于同步 SQLite- 支持的系列，`removeAfter` 是 **2026-12-31**，删除目标是 **2027 年 1 月第一个稳定版本**。在 main 上写入的弃用元数据并不能证明稳定版本中包含警告。下一个稳定版本必须宣布此窗口并发布警告和迁移说明；地表守卫仍必须看到已达到的日期。此准备工作增加了弃用和替换，但不删除公共成员。请参阅[完整成员迁移表](/plugins/sdk-migration/sqlite-async)、[等待迁移说明](/plugins/sdk-migration/how-to-migrate)和[转录和TTS替换](/plugins/sdk-migration/async-transcript-and-tts)。 7 月 30 日的行在早期维护者授权的清理后被删除：未使用的子路径被删除，早期的兼容性别名被删除，仅捆绑的模块被降级为私有本地构建映射。

8 月 15 日的兼容性子路径 `agent-config-primitives`、`channel-logging`、`channel-secret-runtime`、`channel-streaming`、`group-access`、`matrix`、`text-runtime` 和 `zod` 已通过显式提前停用SDK-所有者于2026年8月批准。使用[插件SDK子路径目录](/plugins/sdk-subpaths)中的重点替换，并直接从`zod`包导入`zod`。 `inbound-reply-dispatch` 仍然可用，直到所有者授权在以后的稳定版本中删除为止。

beta.5 全会话存储桥已于 2026 年 9 月 30 日（比原定的 10 月 12 日截止日期提前）退役，并获得 SDK-owner 的明确批准。支持的插件截止排除了 `v2026.7.1-beta.5` 以及仍然导入这些桥导出或包根全商店别名的所有版本。在升级主机之前，将受影响的插件升级到作用域行和转录本身份 API。 `session-store-runtime` 子路径和 `resolveStorePath` 仍受支持；请参阅 [ 删除的会话 API 和替换 ](/plugins/sdk-migration/removed-surfaces#removed-session-and-transcript-file-apis)。

| 移除门控                            | 层级                                      | SDK 子路径                                                                                                                                                                                                                |
| --------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2026-12-31`； 2027 年 1 月稳定 | 最终兼容性日/删除版本 | 同步 SQLite- 支持 session/transcript、插件状态、绑定、auth/provider、channel/approval、工作区、代理捕获、技能发现、运行时配置和迁移指南中记录的 TTS 准备 API。 |
| 后来的普通稳定版——TBD     | 需要业主迁移                  | `inbound-reply-dispatch` 和已弃用的提及收件箱签名具有单独的未注明日期的窗口。                                                                                                                             |
| `2026-10-01`                            | 媒体旧版投影                   | `agent-media-payload`，以及非子路径的 `MsgContext Media*` 字段、通道入站媒体负载构建器、`buildMediaPayload`、钩子媒体别名和 `{{Media*}}` 模板                                         |

五个兼容性子路径 `channel-lifecycle`、`channel-message`、`channel-reply-pipeline`、`config-runtime` 和 `infra-runtime` 已于 2026 年 9 月 30 日经 SDK-owner 明确批准提前停用。该决定取代了 10 月 1 日的大门和外部迁移保留阻止程序；它并不证明每个外部插件都已迁移。它们的公共导出和兼容性别名已被删除。在将受影响的插件加载到包含此删除的主机上之前，先升级它们。

在批准的保留例外情况下，这些子路径在 2026.8.2 中仍然可用。 2026 年 9 月 2 日，发布维护者将 2026.9.1. 的 `removeAfter` 日期从 9 月 1 日更新为 10 月 1 日。9 月 30 日的决定取代了该窗口。请参阅 [ 通道导入映射](/plugins/sdk-migration/import-paths#retained-channel-facade-mappings) 和 [ 配置和基础设施迁移](/plugins/sdk-migration/how-to-migrate) 了解替换和行为差异。系统事件快照检查和消耗现在使用`openclaw/plugin-sdk/system-event-runtime`。

兼容性子路径 `command-auth`、`discord` 和 `telegram-account` 已于 2026 年 10 月 2 日经 SDK-owner 明确批准提前停用。该决定关闭了它们的兼容性窗口；它并不证明每个外部插件都已迁移。他们的公共出口被删除。在将受影响的插件加载到包含此删除的主机上之前，先升级它们。请参阅 [ 命令和通道外观替换 ](/plugins/sdk-migration/import-paths#removed-command-and-channel-facades)。

捆绑插件迁移并不能证明每个外部调用者都可以使用仅路径替换。使用经过验证的类型公共映射迁移函数；在删除的命名类型或所需行为缺乏公共替换的情况下调整调用者。不要替换私有本地主机导出。运行 `pnpm plugins:boundary-report` 以查看插件使用的表面的日期、大门和拦截器。
