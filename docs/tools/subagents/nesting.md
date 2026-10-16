---
summary: "递归委托深度、公告链、级联停止以及子代理身份验证和内存受众如何解析"
title: "嵌套子代理和身份验证"
read_when:
  - "您正在构建一个能够生成自己的子项的编排器"
  - "您需要深度上限和每个代理子级限制"
  - "您需要知道子代理使用哪个身份验证配置文件"
  - "你需要知道孩子如何继承记忆受众"
---

## <a id="nested-sub-agents"></a> 嵌套子代理

默认情况下，子代理可以通过深度 `5` 递归委托。每会话执行和子项准入限制、继承工具策略、沙箱继承和目标代理白名单仍然适用。设置较低的深度可以更快地创建叶子工人。

```json5
{
  agents: {
    defaults: {
      subagents: {
        maxSpawnDepth: 2, // stop nesting after depth 2 (default: 5, range 1-5)
        maxChildrenPerAgent: 5, // max active children per agent session (default: 5, range 1-20)
        maxConcurrent: 8, // concurrent child runs per spawning session (default: 8)
        runTimeoutSeconds: 900, // default timeout for sessions_spawn (0 = no timeout)
        announceTimeoutMs: 120000, // gateway announce timeout, excluding accepted queue waits
      },
    },
  },
}
```

### <a id="depth-levels"></a> 深度层级

| 深度 | 会话键形状                          | 默认角色 | 可以启动子级？                     |
| ----- | ------------------------------------------ | ------------ | ------------------------------ |
| 0     | `agent:<id>:main`                          | 主代理   | 始终可以                         |
| 1     | `agent:<id>:subagent:<uuid>`               | 协调者 | 是的，除非 `maxSpawnDepth: 1` |
| 2-4   | 具有沿袭的持久平面子代理密钥 | 协调者 | 是的，默认情况下                |
| 5     | 具有沿袭的持久扁平子代理密钥  | 叶子         | 否，在默认边界    |

### <a id="announce-chain"></a> 通知链

结果一次返回一级：

1. A 后代完成并向其直接父级宣布。
2. 父进程在完成并向上宣布之前合成其子进程。
3. 主代理收到最终公告并交付给用户。

每一层只能看到来自其直接子级的通知。

<Note>
**操作指导：**启动一次子工作并等待完成事件，而不是围绕`sessions_list`、`sessions_history`、`/subagents list`或`exec`睡眠命令构建轮询循环。 `sessions_list` 和 `/subagents list` 将子会话关系集中在实时工作上 - 实时子会话保持连接，已结束的子会话在最近的短暂窗口中保持可见，并且在新鲜窗口之后，陈旧的仅存储子链接将被忽略。这可以防止旧的 `spawnedBy` / `parentSessionKey` 元数据在重新启动后复活幽灵子项。如果在您发送最终答案后出现子完成事件，请查看它并继续任何未完成的工作。避免重复已交付的更新。内部编排仍然需要一个有意义的结果；静默令牌无法解决子任务。
</Note>

### <a id="tool-policy-by-depth"></a> 按深度划分的工具策略

- 子代理在生成时会捕获请求者的有效发送者策略。即使之后 `toolsBySender` 发生变化，无发送者的子代理运行和已认证操作员的恢复仍会保留该快照；但当前的全局、代理、提供方、沙箱和子代理限制仍然适用。面向该子代理的新外部通道轮次会重新解析当前发送者策略。
- 角色和控制范围在生成时写入会话元数据以供参考。当前的深度策略是权威的，因此当配置的上限发生更改时，现有会话将获得或失去递归编排工具。
- **Orchestrator（`maxSpawnDepth` 以下）：** 获取 `sessions_spawn`、`subagents`、`sessions_list`、`sessions_history`，以便它可以生成子级并检查其状态。其他 session/system 工具仍然被拒绝。
- **Leaf（位于 `maxSpawnDepth`）：** 无递归编排工具。

### <a id="per-agent-spawn-limit"></a> 每个代理的启动上限

每个代理会话（任何深度）一次最多可以有 `maxChildrenPerAgent`（默认 `5`）个活动子进程。这可以防止单个协调器的失控扇出。另外，`maxConcurrent` 限制立即生成会话的子运行的执行。每个嵌套编排器都有自己的执行预算；它的子进程不共享根会话的槽。

### <a id="reset-a-conversation"></a> 重置对话

完整的就地对话重置会取消与该会话关联的未完成的本机子代理，包括生成的子代理以及完成请求者与其控制器不同的子代理。聊天 `/reset` 和 `sessions.reset` 使用相同的清理所有者。如果子取消不完整，重置会在清除对话之前报告失败；检查剩余任务并重试。子记录和不相关的会话将被保留。

### <a id="cascade-stop"></a> 级联停止

协调器的显式取消会通过其后代树级联。主聊天中的 `/stop` 适用于该请求者的子树。有关范围和不完全取消行为，请参阅 [Stopping](/tools/subagents/operations#stopping)。

## <a id="authentication"></a> 身份验证

子代理认证按**代理 id**解析，而不是按会话类型：

- 子代理会话键为 `agent:<agentId>:subagent:<uuid>`。
- 本地身份验证覆盖是从该代理的 `agentDir` 加载的。
- 共享身份验证配置文件合并为 **fallback**；代理配置文件在发生冲突时会覆盖共享配置文件。

合并是附加的，因此共享配置文件始终可用作后备。没有任何设置可以将代理的身份验证与共享配置文件隔离。

### <a id="memory-audience-inheritance"></a> 记忆观众传承

OpenClaw `sessions_spawn`（包括 ACP 运行时）和实时语音咨询记录直接父密钥 （`spawnedBy`）、确切的父会话 ID （`spawnedBySessionId`）、父生命周期修订 （`parentSessionLifecycleRevision`） 以及生成调用的可信所有者状态（`spawnedBySenderIsOwner`）。这些是主机拥有的事实，而不是工具参数或 `sessions.patch` 字段。所有者标志永远不会从孩子的合成发射权限中推断出来；语音咨询仅从呼叫者的入口身份验证中获取信息。缺少或错误的所有者状态不会授予所有者访问权限。

对于内存访问，OpenClaw 根据当前父代化身和生命周期验证每个父跳，包括相同 ID 重置。然后，它将主机铸造的根受众提供给内存提供商和插件工具。提供者必须消费准备好的受众，并且不得遍历会话沿袭或从会话查找推断内存权限。

Spawn 记录了准备过程中捕获的父代化身。如果父级在创建完成之前重置，则仍然可以创建子级，但内存访问会拒绝其过时的沿袭；从当前父会话中重新生成它。

子重置会保留其记录的父授权，因此新解析的受众仍然可以从同一根继承。重置或删除任何记录的父项都会使已捕获的受众无效，因此下一个受保护的提供程序或工具操作将无法通过其受众货币检查。那个孩子后来的轮次没有记忆观众。使用本机内存提供程序时，网关日志会警告子进程的沿袭已过时，必须从当前会话中重新生成或重新创建它；重置孩子会保留陈旧的血统。没有完整谱系印记的遗留子级不会收到继承的内存受众：它们的轮流在没有私有或会话内存的情况下运行，并且网关日志警告会话早于内存谱系收据，并且必须从其父级重生。父级缺少生命周期修订的子级必须在父级下一次重置后重生，这将建立当前的生命周期修订。

该合同涵盖 OpenClaw- 创建的子会话。本机运行时子线程还需要其运行时的工具桥来提供实时授权调用；谱系元数据本身并不能增加这个桥梁。
