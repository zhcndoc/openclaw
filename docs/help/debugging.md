---
summary: "调试工具：监视模式、原始模型流和跟踪推理泄漏"
read_when:
  - 你需要检查原始模型输出中的推理泄漏
  - 你想在迭代时以监视模式运行 Gateway
  - 你需要一个可重复的调试工作流
title: "调试"
---

用于流式输出的调试辅助工具，尤其适用于提供方将推理内容混入普通文本的情况。

## 运行时调试覆盖

在聊天中使用 `/debug` 来设置**仅运行时**的配置覆盖（保存在内存中，不写入磁盘）。
`/debug` 默认是禁用的；通过 `commands.debug: true` 启用它。
当你需要在不编辑 `openclaw.json` 的情况下切换一些不常见的设置时，这会很方便。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 会清除所有覆盖，并返回磁盘上的配置。

## 会话跟踪输出

当你想在单个会话中查看插件拥有的跟踪/调试行，而不启用完整详细模式时，请使用 `/trace`。

示例：

```text
/trace
/trace on
/trace off
```

对于诸如 Active Memory 调试摘要之类的插件诊断，请使用 `/trace`。
正常的详细状态/工具输出继续使用 `/verbose`，仅运行时的配置覆盖继续使用 `/debug`。

## 插件生命周期跟踪

当插件生命周期命令感觉很慢，并且你需要内置的阶段拆解来查看插件元数据、发现、注册表、运行时镜像、配置变更和刷新工作时，请使用 `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1`。该跟踪是可选启用的，并写入 stderr，因此 JSON 命令输出仍然可以解析。

示例：

```bash
OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1 openclaw plugins install tokenjuice --force
```

示例输出：

```text
[plugins:lifecycle] phase="config read" ms=6.83 status=ok command="install"
[plugins:lifecycle] phase="slot selection" ms=94.31 status=ok command="install" pluginId="tokenjuice"
[plugins:lifecycle] phase="registry refresh" ms=51.56 status=ok command="install" reason="source-changed"
```

在使用 CPU 分析器之前，先用这个来调查插件生命周期。
如果命令是从源码检出中运行的，优先在 `pnpm build` 之后通过 `node dist/entry.js ...` 测量构建后的运行时；`pnpm openclaw ...` 也会测量源码运行器的额外开销。

对于看起来像是同步文件系统或模块加载器工作的启动卡顿，
可以通过源运行器添加 Node 的同步 I/O 跟踪标志：

```bash
OPENCLAW_TRACE_SYNC_IO=1 pnpm openclaw gateway --force
```

`pnpm gateway:watch` 默认会为被监视的 Gateway 子进程禁用此标志。若你明确希望在监视模式下看到 Node 同步 I/O 跟踪输出，请设置 `OPENCLAW_TRACE_SYNC_IO=1`。

## Gateway 监视模式

为了快速迭代，请在文件监视器下运行 gateway：

```bash
pnpm gateway:watch
```

默认情况下，这会启动或重启一个名为
`openclaw-gateway-watch-main` 的 tmux 会话（或一个与 profile/端口相关的变体，例如
`openclaw-gateway-watch-dev-19001`），并从交互式终端自动附加。非交互式 shell、CI 和 agent exec 调用会保持分离，并改为打印附加说明。需要时可手动附加：

```bash
tmux attach -t openclaw-gateway-watch-main
```

tmux 窗格运行的是原始 watcher：

```bash
node scripts/watch-node.mjs gateway --force
```

当不需要 tmux 时，使用前台模式：

```bash
pnpm gateway:watch:raw
# 或
OPENCLAW_GATEWAY_WATCH_TMUX=0 pnpm gateway:watch
```

在保留 tmux 管理的同时禁用自动附加：

```bash
OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch
```

在调试启动/运行时热点时，对被监视的 Gateway CPU 时间进行分析：

```bash
pnpm gateway:watch --benchmark
```

监视包装器会在调用 Gateway 之前消费 `--benchmark`，并在
`.artifacts/gateway-watch-profiles/` 下为 Gateway 子进程的每次退出写入
一个 V8 `.cpuprofile`。停止或重启被监视的 gateway 以刷新当前分析文件，
然后使用 Chrome DevTools 或 Speedscope 打开它：

```bash
npx speedscope .artifacts/gateway-watch-profiles/*.cpuprofile
```

Use `--benchmark-dir <path>` when you want profiles somewhere else.
Use `--benchmark-no-force` when you want the benchmarked child to skip the
default `--force` port cleanup and fail fast if the Gateway port is already in
use.
Benchmark mode suppresses sync-I/O trace spam by default. Set
`OPENCLAW_TRACE_SYNC_IO=1` with `--benchmark` when you explicitly want both CPU
profiles and Node sync-I/O stack traces. In benchmark mode those trace blocks
are written to `gateway-watch-output.log` under the benchmark directory and
filtered from the terminal pane; normal Gateway logs remain visible.

tmux 包装器会将常见的非机密运行时选择器传入窗格，例如
`OPENCLAW_PROFILE`、`OPENCLAW_CONFIG_PATH`、`OPENCLAW_STATE_DIR`、
`OPENCLAW_GATEWAY_PORT` 和 `OPENCLAW_SKIP_CHANNELS`。将提供方凭据放在你常用的 profile/config 中，或对一次性的临时密钥使用原始前台模式。
如果被监视的 Gateway 在启动期间退出，watcher 会运行一次
`openclaw doctor --fix --non-interactive`，然后重启 Gateway 子进程。
当你希望看到原始启动失败，而不经过仅限开发环境的修复流程时，使用 `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0`。
受管的 tmux 窗格还默认启用带颜色的 Gateway 日志以提升可读性；
在启动 `pnpm gateway:watch` 时设置 `FORCE_COLOR=0` 可禁用 ANSI 输出。

watcher 会在 `src/` 下的构建相关文件、扩展源文件、扩展 `package.json` 和 `openclaw.plugin.json` 元数据、`tsconfig.json`、`package.json` 以及 `tsdown.config.ts` 发生变化时重启。扩展元数据更改会在不强制进行 `tsdown` 重建的情况下重启 gateway；源码和配置更改仍会先重建 `dist`。

在 `gateway:watch` 之后添加任何 gateway CLI 标志，它们会在每次重启时透传。重新运行同一个 watch 命令会重新生成同名 tmux 窗格，而原始 watcher 仍会保留其单 watcher 锁，因此重复的 watcher 父进程会被替换，而不是堆积起来。

## Dev 配置 + dev 网关（--dev）

使用 dev 配置来隔离状态，并启动一个安全、可丢弃的环境用于调试。这里有 **两个** `--dev` 标志：

- **全局 `--dev`（配置）：** 将状态隔离到 `~/.openclaw-dev` 下，并将网关端口默认设为 `19001`（派生端口会随之变化）。
- **`gateway --dev`：** 在缺失时让 Gateway 自动创建默认配置 + 工作区**，并跳过 BOOTSTRAP.md。

推荐流程（dev 配置 + dev 启动）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

If you don't have a global install yet, run the CLI via `pnpm openclaw ...`.

这会做什么：

1. **配置隔离**（全局 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（浏览器/canvas 端口会相应变化）

2. **Dev bootstrap** (`gateway --dev`)
   - Writes a minimal config if missing (`gateway.mode=local`, bind loopback).
   - Sets `agent.workspace` to the dev workspace.
   - Sets `agent.skipBootstrap=true` (no BOOTSTRAP.md).
   - Seeds the workspace files if missing:
     `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`.
   - Default identity: **C3-PO** (protocol droid).
   - Skips channel providers in dev mode (`OPENCLAW_SKIP_CHANNELS=1`).

重置流程（全新开始）：

```bash
pnpm gateway:dev:reset
```

<Note>
`--dev` 是一个 **全局** 配置标志，且会被某些运行器吞掉。如果你需要显式写出它，请使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

</Note>

`--reset` 会清除配置、凭据、会话以及 dev 工作区（使用
`trash`，而不是 `rm`），然后重新创建默认的 dev 环境。

<Tip>
如果已经有一个非 dev 的网关在运行（launchd 或 systemd），请先停止它：

```bash
openclaw gateway stop
```

</Tip>

## 原始流日志（OpenClaw）

OpenClaw 可以在任何过滤/格式化之前记录**原始 assistant 流**。
这是查看推理是以纯文本增量形式到达，还是作为单独的思考块到达的最佳方式。

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

默认文件：

`~/.openclaw/logs/raw-stream.jsonl`

## Raw OpenAI-compatible chunk logging

To capture **raw OpenAI-compat chunks** before they are parsed into blocks,
enable the transport logger:

```bash
OPENCLAW_RAW_STREAM=1
```

可选路径：

```bash
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-openai-completions.jsonl
```

默认文件：

`~/.openclaw/logs/raw-openai-completions.jsonl`

## 安全提示

- 原始流日志可能包含完整的提示词、工具输出和用户数据。
- 将日志保存在本地，并在调试后删除它们。
- 如果你分享日志，请先清理密钥和 PII。

## 在 VSCode 中调试

Source maps are required to enable debugging in VSCode-based IDEs because many of the generated files end up with hashed names as part of the build process. The included `launch.json` configurations target the Gateway service, but can be adapted quickly for other purposes:

1. **Rebuild and Debug Gateway** - Debugs the Gateway service after creating a new build
2. **Debug Gateway** - Debugs the Gateway service of a pre-existing build

### Setup

The default **Rebuild and Debug Gateway** configuration is batteries-included, it will automatically delete the `/dist` folder and rebuild the project with debugging enabled:

1. Open the **Run and Debug** panel from the Activity Bar or press `Ctrl`+`Shift`+`D`
2. In the IDE, ensure **Rebuild and Debug Gateway** is selected in the configuration dropdown and then press the **Start Debugging** button

Alternatively - if you prefer to manage the build and debug processes manually:

1. Open a terminal and enable source maps:
   - **Linux/macOS**: `export OUTPUT_SOURCE_MAPS=1`
   - **Windows (PowerShell)**: `$env:OUTPUT_SOURCE_MAPS="1"`
   - **Windows (CMD)**: `set OUTPUT_SOURCE_MAPS=1`
2. In the same terminal, rebuild the project: `pnpm clean:dist && pnpm build`
3. In the IDE, select the **Debug Gateway** option in the **Run and Debug** configuration dropdown and then press the **Start Debugging** button

You can now set breakpoints in your TypeScript source files (`src/` directory) and the debugger will correctly map breakpoints to the compiled JavaScript via source maps. You'll be able to inspect variables, step through code, and examine call stacks as expected.

### Notes

- If using the **"Rebuild and Debug Gateway"** option - each time the debugger is launched it will completely delete the `/dist` folder and run a full `pnpm build` with source maps enabled before starting the Gateway
- If using the **"Debug Gateway"** option - debug sessions can be started and stopped at any time without affecting the `/dist` folder, but you must use a separate terminal process to both enable debugging and manage the build cycle
- Modify the `launch.json` settings for `args` to debug other sections of the project
- If you need to use the built OpenClaw CLI for other tasks (i.e. `dashboard --no-open` if your debug session spawns a new auth token), you can execute it in another terminal as `node ./openclaw.mjs` or create a shell alias like `alias openclaw-build="node $(pwd)/openclaw.mjs"`

## 相关

- [故障排查](/help/troubleshooting)
- [常见问题](/help/faq)
