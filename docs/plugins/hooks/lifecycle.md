---
summary: "插件安装检查、网关启动和停止以及网关拥有的 cron 事件"
read_when:
  - "您正在从插件运行时检查分阶段安装材料"
  - "您正在使用网关启动或停止插件拥有的服务"
  - "你正在将 OpenClaw cron 唤醒投射到外部主机调度器"
title: "网关并安装生命周期挂钩"
sidebarTitle: "生命周期"
---

安装时检查、网关服务生命周期和安全的外部 cron 投影。 [ 插件挂钩 ](/plugins/hooks) 指南的一部分。

## <a id="install-hooks"></a> 安装钩子

使用 `security.installPolicy` 进行运营商拥有的 allow/warn/block 决策。该策略从 OpenClaw 配置运行，涵盖 CLI 安装和更新路径，并在启用但不可用时阻止安装。

`before_install` 是一个插件运行时生命周期挂钩。它可以在已加载插件挂钩的进程中在 `security.installPolicy` 之后运行，例如网关支持的安装流程。受信任的官方和捆绑安装路径可以跳过此钩子；他们仍然运行运营商安装政策。它对于插件拥有的观察、警告和兼容性检查很有用，但它不是安装的主要企业或主机安全边界。为了兼容性，`builtinScan` 字段保留在事件负载中，但 OpenClaw 不再运行内置的安装时危险代码阻止，因此它是空的 `ok` 结果。返回其他结果或 `{ block: true, blockReason }` 以停止该过程中的安装。

`block: true` 是终端。 `block: false` 被视为没有决定。处理程序失败会阻止安装。

## <a id="gateway-lifecycle"></a> 网关生命周期

使用 `gateway_start` 来启动通用插件服务，并使用 `gateway_stop` 来清理长期运行的资源。cron 调度器在 `gateway_start` 运行时仍可能处于加载中，因此不要把它作为外部 cron 投影的基线信号。

网关主机将可选的 `ctx.abortSignal` 传递给 `gateway_start`。当重新启动耗尽或网关关闭开始时，在关闭加入承认的工作之前，它会中止。使用它来停止定期调度并防止待处理的回调重新配置其计时器。在开始工作之前检查已经中止的信号，并在服务停止或重新加载时删除侦听器。将共享资源处置保留在 `gateway_stop` 或服务的 `stop()` 方法中，以便承认的工作保留其依赖性，直到解决为止。插件替换和恢复启动挂钩具有相同的网关耗尽生命周期；仅插件替换不会中止它。

旧版 `api.on("deactivate", ...)` 别名已于 2026 年 8 月删除。使用 `gateway_stop` 进行清理；请参阅 [ 迁移说明 ](/plugins/sdk-migration#deactivate-hook-alias)。

不要依赖内部的 `gateway:startup` 钩子来运行插件拥有的运行时服务。

`cron_reconciled` 会在 Gateway 的 cron 调度器及其退出时监听器完成有状态协调后触发。它既会在初始启动时触发，也会在配置重载时调度器替换后触发。该事件会报告 `reason`（`startup` 或 `reload`）以及实际生效的 `enabled` 状态。即使 cron 被禁用，也会以 `enabled: false` 触发，从而允许外部投影清除过期的唤醒。使用 `ctx.getCron?.()` 获取完成协调的精确调度器实例；之后的重载不会重新指向该回调。`ctx.abortSignal` 持有同一份调度器快照。Gateway 会在有更新的调度器被启用或关闭开始时立刻中止它。请将它传递给每一个持久化副作用，并且在它中止后不要再接受该快照。 这是一个调度器生命周期信号，不是插件激活信号：仅插件热重载不会再次触发它。新启用的消费者会在下一次调度器替换或 Gateway 启动时收到它的第一个基线信号。

与其他观察钩子类似，`gateway_start` 和 `cron_reconciled` 的回调可能会重叠。如果两个处理器共享插件初始化，请使用插件本地的就绪 promise 来协调，而不要依赖回调顺序。

`cron_changed` 针对网关拥有的 cron 生命周期事件触发，其类型化事件负载涵盖 `added`、`updated`、`removed`、`started`、`finished` 和 `scheduled` 原因。该事件可以包括 `PluginHookGatewayCronJob` 快照（包括 `state.nextRunAtMs`、`state.lastRunStatus` 和 `state.lastError`（如果存在））以及 `not-requested` | `delivered` | 的可选 `PluginHookGatewayCronDeliveryStatus` `not-delivered` | `unknown`。删除的事件是提交后的：它们仅在持久删除成功后触发，并且仍然携带已删除的作业快照，以便外部调度程序可以协调状态。

`scheduled` 事件也属于提交后事件：它只会在一次成功的持久化写入改变了现有作业的有效 `nextRunAtMs` 之后触发，并且不包括该作业显式的 `added`、`updated` 或 `removed` 生命周期事件。顶层的 `event.nextRunAtMs` 是已提交的下一次唤醒时间；当它缺失时，表示该作业没有下一次唤醒。请把这些事件视为协调提示，而不是有序的增量日志。将它们作为可合并的提示，用来重新读取由 `cron_reconciled` 最后捕获的调度器；不要从 `cron_changed` 上下文中接管调度器。将 OpenClaw 作为到期检查和执行的唯一真实来源。

### <a id="safe-external-cron-projection"></a> 安全的外部 cron 投影

投影完整的唤醒快照，而不是转发 cron 事件增量。外部适配器的 `replaceAll` 操作必须是原子的并且可以安全地重复，并且必须仅在主机持久接受快照后才能解析。它还必须遵守提供的中止信号：如果信号在持久接受之前中止，则适配器不得接受该快照。

这种模式使得同一时刻只有一个最新状态 worker 在运行。只有 `cron_reconciled` 会接管一个调度器实例；`cron_changed` 只是要求该 worker 重新读取权威实例，因此迟到的提示不会恢复较旧的调度器。更新的版本会在宿主尝试接受陈旧快照之前中止当前尝试。

```typescript
import { setTimeout as sleep } from "node:timers/promises";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";

type ExternalWake = { jobId: string; runAtMs: number };

type ExternalWakeHost = {
  replaceAll(wakes: readonly ExternalWake[], options: { signal: AbortSignal }): Promise<void>;
  close(): Promise<void>;
};

type CronReader = {
  list(options: { includeDisabled: true }): Promise<
    Array<{
      id: string;
      enabled?: boolean;
      state?: { nextRunAtMs?: number };
    }>
  >;
};

export function registerCronProjection(api: OpenClawPluginApi, host: ExternalWakeHost) {
  const lifecycle = new AbortController();
  let cron: CronReader | undefined;
  let enabled = false;
  let hasBaseline = false;
  let reconciliationSignal: AbortSignal | undefined;
  let requestedRevision = 0;
  let appliedRevision = 0;
  let worker = Promise.resolve();
  let activeAttempt: AbortController | undefined;

  const projectLatest = async () => {
    let retryMs = 1_000;

    while (!lifecycle.signal.aborted && appliedRevision < requestedRevision) {
      const ownerSignal = reconciliationSignal;
      if (!ownerSignal || ownerSignal.aborted) {
        return;
      }
      const targetRevision = requestedRevision;
      const attempt = new AbortController();
      const signal = AbortSignal.any([lifecycle.signal, ownerSignal, attempt.signal]);
      activeAttempt = attempt;

      try {
        const jobs = enabled && cron ? await cron.list({ includeDisabled: true }) : [];
        if (signal.aborted || targetRevision !== requestedRevision) {
          continue;
        }
        const wakes = jobs
          .flatMap((job): ExternalWake[] => {
            const runAtMs = job.enabled === false ? undefined : job.state?.nextRunAtMs;
            return runAtMs === undefined ? [] : [{ jobId: job.id, runAtMs }];
          })
          .sort((a, b) => a.runAtMs - b.runAtMs || a.jobId.localeCompare(b.jobId));

        await host.replaceAll(wakes, { signal });
        if (signal.aborted || targetRevision !== requestedRevision) {
          continue;
        }
        appliedRevision = targetRevision;
        retryMs = 1_000;
      } catch {
        if (lifecycle.signal.aborted || ownerSignal.aborted) {
          return;
        }
        if (attempt.signal.aborted) {
          continue;
        }
        api.logger.warn(`external cron projection failed; retrying in ${retryMs}ms`);
        try {
          await sleep(retryMs, undefined, { signal });
        } catch {
          if (lifecycle.signal.aborted) {
            return;
          }
          if (attempt.signal.aborted) {
            continue;
          }
        }
        retryMs = Math.min(retryMs * 2, 30_000);
      } finally {
        if (activeAttempt === attempt) {
          activeAttempt = undefined;
        }
      }
    }
  };

  const requestProjection = () => {
    const targetRevision = ++requestedRevision;
    activeAttempt?.abort();
    worker = worker.then(async () => {
      if (!lifecycle.signal.aborted && appliedRevision < targetRevision) {
        await projectLatest();
      }
    });
    return worker;
  };

  api.on("cron_reconciled", (event, ctx) => {
    const reconciledCron = ctx.getCron?.();
    if (event.enabled && !reconciledCron) {
      api.logger.warn("cron reconciliation did not expose a scheduler");
      return;
    }
    cron = reconciledCron;
    enabled = event.enabled;
    hasBaseline = true;
    reconciliationSignal = ctx.abortSignal;
    return requestProjection();
  });

  api.on("cron_changed", () => {
    if (hasBaseline) {
      return requestProjection();
    }
  });

  api.on("gateway_stop", async () => {
    lifecycle.abort();
    await worker;
    await host.close();
  });
}
```

当 `cron_reconciled` 报告 `enabled: false` 时，同一路径调用 `replaceAll([])` 并清除过时的外部唤醒。本示例中的 Retry/backoff 是进程本地的，并将运行时适配器故障视为暂时的；在注册之前验证不可重试的配置。 OpenClaw 不提供插件挂钩效果的发件箱。如果进程在持久接受之前退出，则下一次网关启动会发出新的权威 `cron_reconciled` 快照。 `gateway_stop` 中止正在进行的主机工作，等待工作线程稳定下来，然后关闭适配器。
