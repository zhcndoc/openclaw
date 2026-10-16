---
summary: "针对隔离网关测量固定持续时间 Control UI 协议负载"
read_when:
  - "比较连接 Control UI 负载下的网关运行时间"
---

# <a id="control-ui-protocol-load"></a> Control UI 协议负载

使用 `pnpm build` 构建。 Linux 基准测试创建私有网关状态、合成签名 devices/credentials、环回侦听器和模拟提供程序。为委托的 cgroup-v2 父级提供 CPU 会计；在该子树内运行控制器，以便允许网关迁移。该基准测试拥有一个独特的子 cgroup 并验证清理工作。使用隔离的运行器，而不是实时服务 cgroup。

```bash
taskset --cpu-list 4-31 node scripts/bench-gateway-concurrency.ts \
  --control-ui-clients 50 --active-clients 25 --drivers 4 \
  --duration-ms 60000 --timeout-ms 180000 --runs 1 --warmup 0 \
  --gateway-runtime /path/to/node --gateway-cpus 0,1,2,3 \
  --resource-cgroup /sys/fs/cgroup/benchmark-parent \
  --transpiler-cache /benchmark-cache/node \
  --output /benchmark-results/node-50-25.json
```

对于 100/50，更改两个客户端计数。选择另一个网关运行时时，请保持 Node 驱动程序不变。记录可执行哈希值、source/build/lockfile 身份、主机拓扑、内核以及观察到的与每个活动的关联性。

## <a id="workload-contract"></a> 工作量合约

驱动程序对客户端进行循环分区。每个签名的 Control UI 网络聊天连接都会订阅清单及其自己的会话，并启用默认观察者 HUD。不活动的客户端选择不同的空闲会话，因此他们不会观看活动的会话。这修复了事件扇出拓扑。每个活跃客户端完成一项不计分的热身，然后保持一个请求未完成，直到公共单调截止日期。提交的请求会在超时时间内耗尽。这测量有线协议，不包括浏览器渲染和外部网络。

ACK 表示入场。排队的请求可能会在不同的运行 ID 下以任一顺序发出空的托管最终结果和可见的后续回复。独特的回显模拟令牌和会话身份将回复关联起来。 Empty/status 事件不是第一个增量；重复的决赛不能推进循环。日志通过流身份保留部分观察结果和不匹配的第一个增量，而无需发明请求关联。

## <a id="results"></a> 结果

`requests` 包含发送、ACK、第一个增量和相对于开始的可见最终时间。延迟减去发送时间； p50/p95 使用最近的排名并包括后来耗尽的请求。缺失的观测值保持为空。 `streamObservations` 保留未绑定的第一增量身份。失败、缺失 replies/deltas 或丢失客户使试用无效；保留失败的试验，而不是默默地替换它们。

`summary.replies` 和吞吐量仅计算固定窗口完成情况； `drainedReplies` 计算较晚的完成情况。 `windowCpu` 通过窗口内回复划分固定窗口 cgroup CPU，保留实际边界时间和偏差。 `cpu` 而是将通过排水管的进入括起来，并除以所有完成情况。两者都包括已退出的 Gateway 后代，但不包括 drivers/provider；将分母分开。

50 ms 采样器区分 lifetime/load-window、RSS 和线程峰值，记录线程关联性和 PID/TID 出生刻度。求和 RSS 可以重复计算共享页面并错过短暂的峰值；它不是 cgroup `memory.peak`。观察限制了线程的生命周期。分别验证每个运行时的网关 JavaScript-worker 事件覆盖率。没有单独退出通知的工作人员仅具有记录的进程退出上限；单独报告它们而不是发明完整的生命周期。工作线程 `atNs` 具有运行时本地源。使用 `epochMs` 和驱动程序的 `startEpochMs` 对加载窗口事件进行分类；原始 Node/Bun `hrtime` 来源不同。

## <a id="cache-policy-and-proof"></a> Cache策略和证明

保持用户状态新鲜。每个不可变的 Bun 构建使用单独的 `--transpiler-cache` 目录，用一个完整的未评分工作负载填充每个形状，在评分试验中保留它，并记录库存。空缓存试验形成一个单独的活动。独立记录 OS 页面、转译器缓存、产品拥有的 Node 编译缓存策略和 JIT 预热。比较每个 release/shape 的两个 Node/Bun/Bun/Node 模块的每次试验摘要，包括离散度。分别使用准确的构建 ID 和丢失样本计数进行分析；单个请求不是独立的运行时试验。

运行 `node --import ./scripts/tsx.mjs scripts/bench-gateway-control-ui-proof.ts /path/to/runtime /delegated/cgroup` 以选择加入 Linux process/protocol 退出子 CPU、工作人员、强制清理、回复排序、断开连接、超时、延迟错误和取消的证明。这位于每个 PR 单元 CI 之外。在评分之前单独证明一个小的真实网关工作负载的签名准入和订阅。驾驶员通过协调的 finish/close 握手保持监控，并保留可用的故障证据。网关拆卸在强制清理之前使用现有的公认的 IPC 停止和共享服务停止预算，在耗尽期间保留承认的后续工作。
