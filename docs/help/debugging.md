---
summary: "调试工具：监视模式、原始模型流和跟踪推理泄漏"
read_when:
  - 你需要检查原始模型输出中的推理泄漏
  - 你想在迭代时以监视模式运行 Gateway
  - 你需要一个可重复的调试工作流
title: "调试"
---

用于流式输出、Gateway 迭代和启动性能分析的调试辅助工具。

## 运行时调试覆盖

`/debug` 设置**仅运行时**的配置覆盖（存于内存，不写入磁盘）。默认禁用；通过 `commands.debug: true` 启用。

```text
/debug show
/debug set channels.whatsapp.responsePrefix="[openclaw]"
/debug unset channels.whatsapp.responsePrefix
/debug reset
```

`/debug reset` 会清除所有覆盖，并返回磁盘上的配置。

## 会话跟踪输出

`/trace` 会显示单个会话中由插件拥有的跟踪/调试行，而无需启用完整的详细模式。可将其用于插件诊断，例如 Active Memory 调试摘要；正常的状态/工具输出请使用 `/verbose`。

```text
/trace
/trace on
/trace off
```

## 插件生命周期跟踪

Set `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` for a phase-by-phase breakdown of plugin metadata, discovery, registry, runtime mirror, config mutation, and refresh work. Writes to stderr, so JSON command output stays parseable.
Plugin load failures include their stack trace while this trace is enabled.

```bash
OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1 openclaw plugins install tokenjuice --force
```

```text
[plugins:lifecycle] phase="config read" ms=6.83 status=ok command="install"
[plugins:lifecycle] phase="slot selection" ms=94.31 status=ok command="install" pluginId="tokenjuice"
[plugins:lifecycle] phase="registry refresh" ms=51.56 status=ok command="install" reason="source-changed"
```

在使用 CPU 性能分析器之前，先用这个功能。对于源码检出版本，在 `pnpm build` 之后使用 `node dist/entry.js ...` 来测量构建后的运行时；`pnpm openclaw ...` 也会计入源运行器的开销。

For synchronous module-load timings, use the shared diagnostics surface instead of a separate plugin-only environment switch:

```bash
OPENCLAW_DIAGNOSTICS=plugin.load-profile openclaw plugins list
```

## CLI startup and command profiling

已提交的启动基准测试：

```bash
pnpm test:startup:bench:smoke
pnpm tsx scripts/bench-cli-startup.ts --preset real --case status --runs 3
pnpm tsx scripts/bench-cli-startup.ts --preset real --cpu-prof-dir .artifacts/cli-cpu
```

对于通过正常源运行器进行的一次性性能分析，请设置 `OPENCLAW_RUN_NODE_CPU_PROF_DIR`：

```bash
OPENCLAW_RUN_NODE_CPU_PROF_DIR=.artifacts/cli-cpu pnpm openclaw status
```

源运行器会添加 Node CPU 性能分析标志，并为该命令写入一个 `.cpuprofile` 文件。在为命令代码添加临时埋点之前，请先使用此方法。

对于看起来像同步文件系统或模块加载器工作的启动卡顿，请通过源运行器添加 Node 的同步 I/O 跟踪标志：

```bash
OPENCLAW_TRACE_SYNC_IO=1 pnpm openclaw gateway --force
```

`pnpm gateway:watch` 默认会为被监视的 Gateway 子进程禁用此标志；当你也想在 watch 模式下输出同步 I/O 跟踪时，请设置 `OPENCLAW_TRACE_SYNC_IO=1`。

## Gateway 监视模式

```bash
pnpm gateway:watch
```

默认情况下，这会启动或重启一个名为 `openclaw-gateway-watch-<profile>` 的 tmux 会话（例如 `openclaw-gateway-watch-main`），只有当 `OPENCLAW_GATEWAY_PORT` 与默认端口 `18789` 不同时，才会额外添加诸如 `openclaw-gateway-watch-dev-19001` 这样的端口后缀。它会从交互式终端自动附加；非交互式 shell、CI 和 agent exec 调用会保持分离，并改为打印附加说明：

```bash
tmux attach -t openclaw-gateway-watch-main
# 读取最近输出而不附加
tmux capture-pane -ep -t openclaw-gateway-watch-main -S -200
```

该窗格使用 tmux 的 `remain-on-exit`，因此启动失败会保留，便于附加或捕获，而不会删除会话。重新运行 `pnpm gateway:watch` 会重新生成该窗格。

tmux 窗格运行原始 watcher：

```bash
node scripts/watch-node.mjs gateway --force
```

在监视配置的/默认端口之前，tmux 包装器会停止当前 profile 已安装的 Gateway 服务。这样就能把端口交给源 watcher，而不会被 launchd、systemd 或 Scheduled Task 重新启动并替换掉它。该服务仍会保持安装状态；在 watch 会话结束后，可用以下命令恢复它：

```bash
pnpm openclaw gateway start
```

当显式的 `--port` 或 `OPENCLAW_GATEWAY_PORT` 与已安装服务的实际端口不同时，包装器会让该服务继续运行，这样两个 Gateway 就可以并行运行。

不使用 tmux 的前台模式：

```bash
pnpm gateway:watch:raw
# 或
OPENCLAW_GATEWAY_WATCH_TMUX=0 pnpm gateway:watch
```

原始模式不会管理已安装的服务。当它使用相同端口时，请先运行 `pnpm openclaw gateway stop`。

保留 tmux 管理，但禁用自动附加：

```bash
OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch
```

在调试启动/运行时热点时，对被监视的 Gateway CPU 时间进行分析：

```bash
pnpm gateway:watch --benchmark
```

watch 包装器会在调用 Gateway 之前消费 `--benchmark`，并在每次 Gateway 子进程退出时，将一个 V8 `.cpuprofile` 写入 `.artifacts/gateway-watch-profiles/`。停止或重启被监视的 gateway 以刷新当前配置文件，然后使用 Chrome DevTools 或 Speedscope 打开它：

```bash
npx speedscope .artifacts/gateway-watch-profiles/*.cpuprofile
```

- `--benchmark-dir <path>`：将配置文件写到其他位置。
- `--benchmark-no-force`：跳过默认的 `--force` 端口清理；如果 Gateway 端口已被占用，则立即失败。

默认情况下，benchmark 模式会抑制同步 I/O 的 trace 噪音。将 `OPENCLAW_TRACE_SYNC_IO=1` 与 `--benchmark` 一起使用，可以同时获取 CPU 配置文件和同步 I/O 堆栈跟踪；在 benchmark 模式下，这些 trace 块会写入 benchmark 目录下的 `gateway-watch-output.log`（会从终端窗格中过滤掉），而普通的 Gateway 日志仍会保持可见。

tmux 包装器会将常见的非密钥运行时选择项传递到窗格中，包括 `OPENCLAW_PROFILE`、`OPENCLAW_CONFIG_PATH`、`OPENCLAW_STATE_DIR`、`OPENCLAW_GATEWAY_PORT` 和 `OPENCLAW_SKIP_CHANNELS`。请把提供方凭据放在你的常规 profile/config 中，或者在一次性临时密钥场景下使用原始前台模式。

如果被监视的 Gateway 在启动期间退出，watcher 会先运行一次 `openclaw doctor --fix --non-interactive`，然后重启 Gateway 子进程。设置 `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0`，即可在没有仅供开发使用的修复流程时看到原始的启动失败原因。

受管理的 tmux 窗格默认使用彩色 Gateway 日志；启动 `pnpm gateway:watch` 时设置 `FORCE_COLOR=0` 可禁用 ANSI 输出。

watcher 会在 `src/` 下的构建相关文件、扩展源码文件、扩展的 `package.json` 和 `openclaw.plugin.json` 元数据、`tsconfig.json`、`package.json` 以及 `tsdown.config.ts` 变化时重启。扩展元数据的更改会在不强制重新构建的情况下重启 gateway；源码和配置更改仍会先重新构建 `dist`。

在 `gateway:watch` 之后追加 gateway CLI 标志，这些标志会在每次重启时透传。重新运行相同的 watch 命令会重新生成同名 tmux 窗格；原始 watcher 会保持单一 watcher 锁，因此重复的 watcher 父进程会被替换，而不是堆积起来。

## Dev Configuration + dev 网关（--dev）

两个**独立的** `--dev` 标志：

- **全局 `--dev`（profile）：** 将状态隔离到 `~/.openclaw-dev` 下，并将网关端口默认设为 `19001`（派生端口会随之变化）。
- **`gateway --dev`：** 告诉 Gateway 在缺少默认配置和工作区时自动创建它们（并跳过 bootstrap）。

推荐流程（dev 配置 + dev 启动）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果没有全局安装，请通过 `pnpm openclaw ...` 运行 CLI。

这会做什么：

1. **配置隔离**（全局 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（browser/canvas 端口会相应变化）

2. **Dev bootstrap** (`gateway --dev`)
   - Writes a minimal config if missing (`gateway.mode=local`, bind loopback).
   - Sets `agents.defaults.workspace` to the dev workspace and `agents.defaults.skipBootstrap=true`.
   - Seeds the workspace files if missing: `AGENTS.md`, `SOUL.md`, `IDENTITY.md`, `USER.md`.
   - Default identity: **C3-PO** (protocol droid).
   - `pnpm gateway:dev` also sets `OPENCLAW_SKIP_CHANNELS=1` to skip channel providers.

Dev Gateways ignore ambient channel environment triggers by default, so credentials inherited from your shell do not connect the development instance to real channel services. Explicit `channels.<id>` configuration still works. Pass `--dev-ambient-channels` with `--dev` to restore ambient channel auto-configuration for that run.

Reset flow (fresh start):

```bash
pnpm gateway:dev:reset
```

<Note>
`--dev` 是一个**全局**配置标志，且会被某些运行器吞掉。如果你需要显式写出它，请使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

</Note>

`--reset` 会清除配置、凭据、会话，以及 dev 工作区（会移到垃圾桶，而不是删除），然后重新创建默认的 dev 设置。

<Tip>
如果已经有一个非 dev 的网关在运行（launchd 或 systemd），请先停止它：

```bash
openclaw gateway stop
```

</Tip>

## 原始流日志

OpenClaw 可以在任何过滤/格式化之前记录**原始助手流**。这是查看推理是以纯文本增量（还是以独立的思考块）到达的最佳方式。

通过 CLI 启用它：

```bash
pnpm gateway:watch --raw-stream
```

可选的路径覆盖：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

等效的环境变量：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

默认文件：`~/.openclaw/logs/raw-stream.jsonl`

## 安全提示

- 原始流日志可能包含完整的提示词、工具输出和用户数据。
- 将日志保存在本地，并在调试后删除它们。
- 如果你分享日志，请先清理密钥和 PII。

## 在 VSCode 中调试

由于构建会对生成的文件名进行哈希处理，因此需要 source maps。随附的 `launch.json` 面向 Gateway 服务：

1. **重新构建并调试 Gateway** - 在启动 Gateway 之前删除 `/dist` 并在启用调试的情况下重新构建。
2. **调试 Gateway** - 在不触碰 `/dist` 的情况下调试现有构建。

### 设置

1. 打开 **运行和调试**（活动栏，或 `Ctrl`+`Shift`+`D`）。
2. 选择 **重新构建并调试 Gateway**，然后按 **开始调试**。

如果你想改为手动管理构建/调试循环：

1. 在终端中启用 source maps：
   - **Linux/macOS**: `export OUTPUT_SOURCE_MAPS=1`
   - **Windows (PowerShell)**: `$env:OUTPUT_SOURCE_MAPS="1"`
   - **Windows (CMD)**: `set OUTPUT_SOURCE_MAPS=1`
2. 重新构建：`pnpm clean:dist && pnpm build`
3. 选择 **调试 Gateway**，然后按 **开始调试**。

在 `src/` 的 TypeScript 文件中设置断点；调试器会通过 source maps 将它们映射到编译后的 JavaScript。

### 注意

- **重新构建并调试 Gateway** 会删除 `/dist`，并在每次启动时运行一次开启 source maps 的完整 `pnpm build`。
- **调试 Gateway** 可以在不影响 `/dist` 的情况下启动/停止，但你需要在单独的终端中管理构建循环。
- 编辑 `launch.json` 中的 `args` 以调试其他 CLI 子命令。
- 若要将已构建的 CLI 用于其他任务（例如你的调试会话生成了新的认证令牌时使用 `dashboard --no-open`），请在另一个终端中运行：`node ./openclaw.mjs`，或使用别名，例如 `alias openclaw-build="node $(pwd)/openclaw.mjs"`。

## 相关

- [故障排查](/help/troubleshooting)
- [常见问题](/help/faq)
