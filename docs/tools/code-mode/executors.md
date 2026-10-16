---
summary: "选择 Node 或 QuickJS 作为代码模式并了解其执行和安全边界"
title: "代码模式执行器"
doc-schema-version: 1
read_when:
  - "您想要选择代码模式如何执行 JavaScript"
  - "您需要强化的来宾隔离而不是可信的 Node 执行"
  - "您正在升级显式选择 QuickJS-WASI 的配置"
---

启用后，代码模式默认使用 **Node**。当您需要强化来宾运行时时，请选择 **QuickJS**。两个执行器都运行相同的普通 JavaScript 单元，公开相同类型的工具发现，并使用相同的 `exec` 和 `wait` 工具。如果没有全局代码模式设置，则适用每个模型的自动激活。在实验室中选择执行者可以保留激活状态。在配置中写入对象时，请包含 `enabled: "auto"` 以保留自动激活。

## <a id="choose-an-executor"></a> 选择执行人

| 执行者         | 预期用途                           | 执行                                                                | 暂停状态                      |
| ---------------- | -------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| `node`（默认） | 网关主机上的可信执行 | Node.js `node:vm` 在工作线程中                                     | 现场工作人员和 JavaScript 上下文 |
| `quickjs`        | 加强访客隔离               | 工作线程中的 QuickJS-WASI，由捆绑的执行器插件提供 | 序列化的 VM 快照             |

<Warning>
Node的`node:vm`是**不是安全边界**。工作线程使来宾计算远离网关事件循环，但它共享网关进程的操作系统权限。将 Node 代码模式视为可信主机执行。
</Warning>

桥梁沉降和故障起源均由两个执行程序的主机所有，无论执行程序隔离如何，都可以保持诊断的可信度。

目标客户 API 不会公开 Node 的文件系统、网络、进程、环境或模块加载 API。模块防护和一小组全局变量有助于让单元专注于工具编排；它们不会使 `node:vm` 对于敌对的 JavaScript 来说是安全的。当来宾隔离是威胁模型的一部分时，请使用 QuickJS；当您需要更强的主机边界时，请使用单独的 OS 用户、容器或主机。

QuickJS 提供独立的 WASM 来宾，无需环境主机访问。如果您的工具策略允许，它仍然可以调用强大的工具。通过代码模式工具桥进行的调用保留任一执行者下 OpenClaw 的正常策略、批准、挂钩和会话所有权。这些检查调解工具调用；它们不能包含转义 Node VM 上下文的恶意代码。

会话沙箱不会将代码模式单元移动到沙箱中。在 Node 执行程序下，沙盒会话中的单元（包括由需要沙箱 ](/gateway/operator-scopes#named-operator-roles) 的 [ 角色创建的单元）仍然在网关进程中运行。在网关上使用 QuickJS，不受信任的人可以在内置运行时启动会话。

## <a id="set-the-executor"></a> 设置执行者

在Web界面中，打开**Settings → Agents & Tools → Labs**并使用**Code Mode执行器**选择**Node.js（默认）**或**QuickJS（隔离）**。激活和执行器选择是分开的：选择执行器不会启用代码模式。

要使用默认的 Node 执行器启用代码模式：

```json5
{
  tools: {
    codeMode: {
      enabled: true,
      executor: "node",
    },
  },
}
```

对于强化来宾隔离，请在同一对象中设置 `executor: "quickjs"`。捆绑的插件ID是`code-mode-quickjs`；选择其执行器不需要单独的插件启用步骤。即使 `plugins.enabled` 是 `false` 或限制性 `plugins.allow` 列表忽略它，显式执行器选择也会激活此捆绑运行时。它不启用其他插件。显式的 `plugins.deny` 条目或 `plugins.entries.code-mode-quickjs.enabled: false` 仍然会阻止它。外部插件可以提供 `quickjs` 执行程序选择，并仍然遵守完整的插件激活策略。仅允许一位所有者进行该选择。可选择的执行器ID为`node`和`quickjs`； `node` 归核心所有。

所选执行人必须可用。如果丢失、禁用、被拒绝或无法加载，则运行失败并显示 `runtime_unavailable`； OpenClaw 永远不会默默地切换到 Node 或广泛的直接工具暴露。当配置的 QuickJS 执行器不可用时检查插件策略。

设置 `agents.entries.<agent>.tools.codeMode.executor` 以覆盖一个代理的全局选择。省略它的代理将继承全局选择。有关激活优先级和限制，请参阅 [ 代码模式配置](/tools/code-mode/configuration)。

## <a id="understand-waits-and-limits"></a> 了解等待和限制

每个单元在其整个生命周期中都保留其选定的执行器，包括每个 `wait`。更改配置会影响新的单元；它不会在引擎之间移动挂起的 JavaScript 或重放已完成的工具调用。

Node 在暂停时保留其实时工作线程上下文。 QuickJS 可以在序列化 guest 虚拟机后释放其工作线程并恢复 `wait` 的快照。两种延续都是暂时的：完成、失败、取消、到期或网关关闭都会释放它们。网关重新启动后两者均无法幸存。

`timeoutMs`、输出限制、挂起调用限制、暂停运行容量和 `snapshotTtlSeconds` 适用于两个执行器。历史 `snapshotTtlSeconds` 名称还控制 Node 的挂起上下文生命周期。主机通过终止逾期工作线程（包括同步循环和承诺延续）来强制执行 Node 的执行截止日期。超时之前发出的输出在配置的输出限制内仍然可用。 QuickJS 还根据 `maxSnapshotBytes` 检查序列化的 VM 状态。 Node 没有序列化的 VM 快照，因此该设置不会绑定其活动堆。保存的 JSON 结果保留其共享的 memory/snapshot 数据限额。

`memoryLimitBytes` 限制 QuickJS 客户机内存。对于 Node，它在老一代和年轻代之间配置尽力而为的 V8 工作堆预算，并受引擎最低限度的限制。该预算包括工作线程运行时间分配，不包括外部缓冲区；它不是每个上下文的堆测量或安全边界。当持续的主要垃圾收集使工作线程接近其堆限制时，Node 会停止 `runtime_unavailable` 的执行，然后使该工作线程退休，即使单独的收集很便宜。同一个警卫退休了压力暂停或温暖的工人。在堆耗尽或 GC 报废之前发出的输出在配置的输出限制内仍然可用。阻止 GC 通知的同步代码仍受主机执行截止时间的限制。对大型工具结果进行分页或缩小范围，并避免保留大型数组；在重试之前检查已完成的操作。捕获的 Node 输出仅保留有界前缀，包括当单元发出许多条目而不产生屈服时。即使工人被重用，新的细胞也会得到新的全局变量。已解决的输入和来宾错误会释放其单元上下文，并保持健康的工作人员可供重用。本机故障、执行中断和取消仍然会导致工作人员退休。

Node 最多可为四名完成的工人保暖。剩余工人30秒后到期；可以保温五分钟。 GC 在至少 10 秒的两个连续窗口中每分钟超过 600 个主要集合的风暴也会导致温暖的工人退休。池每分钟最多允许一次风暴退出。活动单元和停放的延续会在完成或现有超时或退休前到期时耗尽；排水工人再也没有回到温水池。下一个细胞根据需要获取健康的工人。诊断内存样本和稳定性日志公开了累积 `workerLifecycle` 计数器。 Prometheus 导出 `openclaw_worker_started_total{script="code-mode-node.worker.js"}` 和 `openclaw_worker_retired_total` 以及有限的退休原因：`eviction` 用于热缓存限制，`idle-expiry` 用于空闲期限，`dispose` 用于显式继续或独立清理，`shutdown` 用于主机关闭， `crash` 用于本机工作错误，`gc-thrash` 用于近极限 GC 看门狗，`gc-storm` 用于持续风暴遏制。内存压力和运行时替换保留`memory_pressure`和`rotation`。退休仅在本机退出后才算提前；清理重试保留第一个记录的原因。开始计数仍然按脚本分组，因为新工人还没有退休原因。

Node 代码模式将垃圾收集留给 V8，而不是请求检查员在单元之间或单元暂停时进行完全收集。它的堆限制、执行期限、GC-压力检测和工人退休仍然适用。两个执行器的设置都不限制总网关 RSS。工作线程开销和主机端工具结果也会消耗内存。保留的 Node 上下文可以比大小受限的 QuickJS 快照使用更多的总主机内存。 64 个暂停单元和保留恢复时隙的共享限制仍然适用；没有单独的全局内存配额。请参阅 [ 代码模式内部结构 ](/tools/code-mode/internals#run-and-snapshot-lifecycle) 了解状态所有权和保留。

## <a id="upgrade-an-existing-configuration"></a> 升级现有配置

Doctor 和符合条件的 Gateway 启动迁移将显式 `runtime: "quickjs-wasi"` 替换为 `executor: "quickjs"`，保留该显式选择。当两个字段都存在时，现有的 `executor` 设置优先。激活和其他限制保持不变。

当通用插件被禁用或列入白名单时，迁移的显式 QuickJS 选择也适用，而不启用不相关的插件。明确拒绝 `code-mode-quickjs` 仍然会阻止执行。

未显式选择运行时的配置使用新的 Node 默认值。显式设置 `executor: "quickjs"` 以保留强化的来宾隔离。已停用的 `runtime` 字段不是运行时别名；对于较旧的配置，请使用 `openclaw doctor --fix`。

## <a id="related"></a> 相关内容

- [代码模式快速入门](/tools/code-mode/quickstart)
- [代码模式配置](/tools/code-mode/configuration)
- [安全](/gateway/security)
- [沙箱化](/gateway/sandboxing)
