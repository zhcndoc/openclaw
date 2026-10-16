---
summary: "调试工具：监视模式、原始模型流和跟踪推理泄漏"
read_when:
  - "你需要检查原始模型输出中的推理泄漏"
  - "你想在迭代时以监视模式运行 Gateway"
  - "你需要一个可重复的调试工作流"
  - "您正在诊断 Node 或 tsx 启动错误"
title: "调试"
doc-schema-version: 1
---

用于流式输出、Gateway 迭代和启动性能分析的调试辅助工具。

## <a id="gateway-watch-mode"></a> Gateway 监视模式

```bash
pnpm gateway:watch
```

默认情况下，这会启动或重新启动名为 `openclaw-gateway-watch-<profile>` 的 tmux 会话，例如 `openclaw-gateway-watch-main`。仅当 `OPENCLAW_GATEWAY_PORT` 与默认端口 `18789` 不同时，会话名称才会获得端口后缀，例如 `openclaw-gateway-watch-dev-19001`。它从交互式终端自动连接。非交互式 shell、CI 和代理 exec 调用保持分离并打印附加指令：

```bash
tmux attach -t openclaw-gateway-watch-main
# Read recent output without attaching
tmux capture-pane -ep -t openclaw-gateway-watch-main -S -200
```

该窗格使用 tmux 的 `remain-on-exit`，因此启动失败会保留，便于附加或捕获，而不会删除会话。重新运行 `pnpm gateway:watch` 会重新生成该窗格。

tmux 窗格运行原始 watcher：

```bash
node scripts/watch-node.mjs gateway --force
```

在观察 configured/default 端口之前，tmux 包装器会停止活动配置文件的已安装网关服务。这会将端口交给源观察程序，而无需 launchd、systemd 或计划任务重生并替换它。该服务保持安装状态。在观看会话后恢复它：

```bash
pnpm openclaw gateway start
```

显式 `--port` 或 `OPENCLAW_GATEWAY_PORT` 可能与已安装服务的有效端口不同。在这种情况下，包装器使服务保持运行，因此两个网关可以并行运行。

不使用 tmux 的前台模式：

```bash
pnpm gateway:watch:raw
# or
OPENCLAW_GATEWAY_WATCH_TMUX=0 pnpm gateway:watch
```

原始模式不会管理已安装的服务。当它使用相同端口时，请先运行 `pnpm openclaw gateway stop`。

保留 tmux 管理，但禁用自动附加：

```bash
OPENCLAW_GATEWAY_WATCH_ATTACH=0 pnpm gateway:watch
```

Profile在调试startup/runtime热点时观察了网关CPU时间：

```bash
pnpm gateway:watch --benchmark
```

watch 包装器会在调用 Gateway 之前消费 `--benchmark`，并在每次 Gateway 子进程退出时，将一个 V8 `.cpuprofile` 写入 `.artifacts/gateway-watch-profiles/`。停止或重启被监视的 gateway 以刷新当前配置文件，然后使用 Chrome DevTools 或 Speedscope 打开它：

```bash
npx speedscope .artifacts/gateway-watch-profiles/*.cpuprofile
```

- `--benchmark-dir <path>`：将配置文件写到其他位置。
- `--benchmark-no-force`：跳过默认的 `--force` 端口清理；如果 Gateway 端口已被占用，则立即失败。

默认情况下，基准模式会抑制sync-I/O 跟踪垃圾邮件。将 `OPENCLAW_TRACE_SYNC_IO=1` 与 `--benchmark` 设置以获取 CPU 配置文件和同步 I/O 堆栈跟踪。在基准测试模式下，这些跟踪块将转到基准目录下的 `gateway-watch-output.log`（从终端窗格中过滤）。正常网关日志保持可见。

tmux 包装器会将常见的非密钥运行时选择项传递到窗格中，包括 `OPENCLAW_PROFILE`、`OPENCLAW_CONFIG_PATH`、`OPENCLAW_STATE_DIR`、`OPENCLAW_GATEWAY_PORT` 和 `OPENCLAW_SKIP_CHANNELS`。请把提供方凭据放在你的常规 profile/config 中，或者在一次性临时密钥场景下使用原始前台模式。

如果被监视的网关返回启动错误，则监视程序将运行 `openclaw doctor --fix --non-interactive` 一次并重新启动网关子级。设置 `OPENCLAW_GATEWAY_WATCH_AUTO_DOCTOR=0` 以查看原始启动失败，而无需仅开发修复通道。

在 Unix 上，如果本机运行程序被信号终止，则前台命令会保留该信号并停止，而不是运行 doctor 或重新启动。当请求的重新启动或关闭必须杀死无响应的运行程序时，这也适用。其独立工作人员可能仍需要清理。 Signal 终止并不证明它们已停止。普通返回的错误、确认的停止和源更改将保留其现有的恢复和重建行为。 Windows 保留其现有的终止和重新启动行为，因为其信号仿真没有做出相同的区分。

UI dev 包装器仅在其子节点正常返回并且捕获的子树已停止后才确认请求的停止。发出信号的子进程或强制清理会保留信号结果，而不是报告已确认的停止。

托管 tmux 窗格默认为彩色网关日志。启动 `pnpm gateway:watch` 时设置 `FORCE_COLOR=0`，以禁用 ANSI 输出。

观察程序在 `src/`、扩展源文件、扩展 `package.json` 和 `openclaw.plugin.json` 元数据、`tsconfig.json`、`package.json` 和 `tsdown.config.ts` 下的构建相关文件上重新启动。扩展元数据更改会重新启动网关，而不会强制重建。源和配置更改仍然首先重建 `dist`。

在 `gateway:watch` 之后添加网关 CLI 标志，它们在每次重新启动时都会通过。重新运行相同的 watch 命令会重新生成指定的 tmux 窗格。原始观察者保留单个观察者锁，因此重复的观察者父母被替换而不是堆积。

## <a id="dev-profile-%2B-dev-gateway-(--dev)"></a><a id="dev-profile-+-dev-gateway-dev"></a> Dev Configuration + dev 网关（--dev）

当您从签出运行 `pnpm openclaw`、`pnpm dev` 或网关开发运行程序时，运行程序会在具有相同 id 的跟踪全局副本之前选择该签出的插件。内置插件输出在可用时仍然是首选，包括单独发布的结帐插件、Doctor 合约和 Doctor 的 provider/tool 检查。仅源插件仍会从结账时加载。使用构建输出时重新构建以获取源更改。有意的源条目选择和安装的源覆盖继续使用源而不是已编译的对等体。

此选择与 `--dev` 配置文件分开。它不会向任意本地链接、`npm-pack:` 安装或具有官方名称的插件授予可信插件功能。显式 `plugins.load.paths` 覆盖仍然获胜。同一独立发现的捆绑条目的别名保留其捆绑来源。不同的本地副本仍然不受信任。

除非您明确设置，否则运行程序会提供现有的 `OPENCLAW_DEV_SOURCE_ROOT` 选择器。当直接启动 `node dist/entry.js` 进行调试时，将其设置为运行签出根以实现相同的重复选择行为。它不会将不相关的签出添加到受信任的捆绑发现中。使用 `pnpm openclaw plugins inspect <id> --json` 检查所选来源和来源。

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

2. **Dev bootstrap** （`gateway --dev`）
   - 如果缺少则写入最小配置（`gateway.mode=local`，绑定环回）。
   - 将 `agents.defaults.workspace` 设置为开发工作区和 `agents.defaults.skipBootstrap=true`。
   - 种子工作区文件（如果丢失）：`AGENTS.md`、`SOUL.md`、`IDENTITY.md`、`USER.md`。
   - 默认身份：**C3-PO**（协议机器人）。
   - `pnpm gateway:dev` 还设置 `OPENCLAW_SKIP_CHANNELS=1` 跳过通道提供商。

默认情况下，所有网关都会忽略周围通道环境触发器。因此，如果没有明确的意图，从启动 shell 继承的凭据不会连接到通道服务。 `channels.<id>` 配置块仍然启用该通道，并且可以使用环境变量作为其凭证。通过 `--ambient-channels` 恢复该运行的环境通道自动配置。 `--dev-ambient-channels` 标志仍然是已弃用的别名。

重置流程（全新开始）：

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

## <a id="raw-stream-logging"></a> 原始流日志

OpenClaw 可以在任何 filtering/formatting. 之前记录 **raw 辅助流** 这是查看推理是否作为纯文本增量（或作为单独的思维块）到达的最佳方法。

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

### <a id="safety-notes"></a> 安全注意事项

- 原始流日志可能包含完整的提示词、工具输出和用户数据。
- 将日志保存在本地，并在调试后删除它们。
- 如果你分享日志，请先清理密钥和 PII。

## <a id="cli-startup-and-command-profiling"></a> CLI 启动和命令分析

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

一些启动停顿看起来像同步文件系统或模块加载器工作。对于这些停顿，通过源运行器添加 Node 的同步 I/O 跟踪标志：

```bash
OPENCLAW_TRACE_SYNC_IO=1 pnpm openclaw gateway --force
```

默认情况下，`pnpm gateway:watch` 为监视的网关子级保留禁用此标志。当您也希望在监视模式下同步 I/O 跟踪输出时，请设置 `OPENCLAW_TRACE_SYNC_IO=1`。

## <a id="plugin-lifecycle-trace"></a> 插件生命周期跟踪

设置 `OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1` 来逐步细分插件元数据、发现、注册表、运行时镜像、配置突变和刷新工作。写入 stderr，因此 JSON 命令输出保持可解析。插件加载失败包括启用此跟踪时的堆栈跟踪。

```bash
OPENCLAW_PLUGIN_LIFECYCLE_TRACE=1 openclaw plugins install tokenjuice --force
```

```text
[plugins:lifecycle] phase="config read" ms=6.83 status=ok command="install"
[plugins:lifecycle] phase="slot selection" ms=94.31 status=ok command="install" pluginId="tokenjuice"
[plugins:lifecycle] phase="registry refresh" ms=51.56 status=ok command="install" reason="source-changed"
```

在使用 CPU 分析器之前使用它。从源代码检查中，在 `pnpm build` 之后使用 `node dist/entry.js ...` 测量构建的运行时间。 `pnpm openclaw ...` 命令还测量源运行器开销。

对于同步模块加载计时，请使用共享诊断表面而不是单独的仅插件环境开关：

```bash
OPENCLAW_DIAGNOSTICS=plugin.load-profile openclaw plugins list
```

## <a id="node-and-tsx-startup-errors"></a> Node 和 tsx 启动错误

如果源运行命令因 `TypeError: __name is not a function` 失败，请捕获 `node --version`、`pnpm list tsx --depth 0`、确切的命令和完整堆栈。检查Node是否是[支持的版本](/install/node)。

从可信源检查，运行 `pnpm build`，然后通过 `pnpm openclaw <command>` 将故障与构建的运行时进行比较。存储库的类型检查不会发出构建输出。将失败的命令和版本证据保留在错误报告中，而不是应用旧调查中的解决方法。

## <a id="debugging-in-vscode"></a> 在 VSCode 中调试

由于构建会对生成的文件名进行哈希处理，因此需要 source maps。随附的 `launch.json` 面向 Gateway 服务：

1. **重新构建并调试 Gateway** - 在启动 Gateway 之前删除 `/dist` 并在启用调试的情况下重新构建。
2. **调试 Gateway** - 在不触碰 `/dist` 的情况下调试现有构建。

### <a id="setup"></a> 设置

1. 打开 **运行和调试**（活动栏，或 `Ctrl`+`Shift`+`D`）。
2. 选择 **重新构建并调试 Gateway**，然后按 **开始调试**。

要手动管理 build/debug 周期：

1. 在终端中启用 source maps：
   - **Linux/macOS**: `export OUTPUT_SOURCE_MAPS=1`
   - **Windows (PowerShell)**: `$env:OUTPUT_SOURCE_MAPS="1"`
   - **Windows (CMD)**: `set OUTPUT_SOURCE_MAPS=1`
2. 重新构建：`pnpm clean:dist && pnpm build`
3. 选择 **调试 Gateway**，然后按 **开始调试**。

在 `src/` TypeScript 文件中设置断点。调试器通过源映射将它们映射到编译后的 JavaScript。

### <a id="notes"></a> 说明

- **重新构建并调试 Gateway** 会删除 `/dist`，并在每次启动时运行一次开启 source maps 的完整 `pnpm build`。
- **调试网关**可以start/stop而不影响`/dist`，但您可以在单独的终端中管理构建周期。
- 编辑 `launch.json` 中的 `args` 以调试其他 CLI 子命令。
- 您可以使用内置的CLI执行其他任务。一个示例是 `dashboard --no-open`，如果您的调试会话生成一个新的身份验证令牌。使用 `node ./openclaw.mjs` 或使用 `alias openclaw-build="node $(pwd)/openclaw.mjs"` 等别名从另一个终端运行它。

## <a id="runtime-debug-overrides"></a> 运行时调试覆盖

`/debug` 设置 **runtime-only** 配置覆盖（内存，而不是磁盘）。默认情况下禁用此功能。使用 `commands.debug: true` 启用它。

```text
/debug show
/debug set channels.whatsapp.responsePrefix="[openclaw]"
/debug unset channels.whatsapp.responsePrefix
/debug reset
```

`/debug reset` 会清除所有覆盖，并返回磁盘上的配置。

## <a id="session-trace-output"></a> 会话跟踪输出

`/trace` 显示一个会话的插件拥有的 trace/debug 行，而无需启用完整详细模式。将其用于插件诊断，例如 Active Memory 调试摘要。使用 `/verbose` 进行正常 status/tool 输出。

```text
/trace
/trace on
/trace off
```

## <a id="related"></a> 相关内容

- [故障排查](/help/troubleshooting)
- [FAQ](/help/faq)
