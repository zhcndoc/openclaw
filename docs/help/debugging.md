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

## 临时 CLI 调试计时

OpenClaw 保留 `src/cli/debug-timing.ts` 作为一个用于本地调查的小助手。它有意没有接入 CLI 启动、命令路由或任何默认命令。只在调试一个慢命令时使用它，然后在合并行为更改之前移除导入和跨度。

当某个命令很慢，并且你需要在决定使用 CPU 分析器还是修复某个特定子系统之前，快速查看阶段拆解时，请使用它。

### 添加临时跨度

在你正在调查的代码附近添加这个助手。例如，在调试 `openclaw models list` 时，`src/commands/models/list.list-command.ts` 中的一个临时补丁可能如下所示：

```ts
// 仅用于临时调试。合并前移除。
import { createCliDebugTiming } from "../../cli/debug-timing.js";

const timing = createCliDebugTiming({ command: "models list" });

const authStore = timing.time("debug:models:list:auth_store", () => ensureAuthProfileStore());

const loaded = await timing.timeAsync(
  "debug:models:list:registry",
  () => loadListModelRegistry(cfg, { sourceConfig }),
  (result) => ({
    models: result.models.length,
    discoveredKeys: result.discoveredKeys.size,
  }),
);
```

指南：

- 临时阶段名称以前缀 `debug:` 开头。
- 只在可疑的慢区段周围添加少量跨度。
- 优先使用 `registry`、`auth_store` 或 `rows` 之类的宽泛阶段，而不是辅助函数名称。
- 对同步工作使用 `time()`，对 promise 使用 `timeAsync()`。
- 保持 stdout 干净。该助手会写入 stderr，因此命令 JSON 输出仍可解析。
- 在打开最终修复 PR 之前移除临时导入和跨度。
- 在 issue 或 PR 中附上计时输出或简短摘要，以解释优化内容。

### 以可读输出运行

可读模式最适合实时调试：

```bash
OPENCLAW_DEBUG_TIMING=1 pnpm openclaw models list --all --provider moonshot
```

来自一次临时 `models list` 调查的示例输出：

```text
OpenClaw CLI debug timing: models list
     0ms     +0ms start all=true json=false local=false plain=false provider="moonshot"
     2ms     +2ms debug:models:list:import_runtime duration=2ms
    17ms    +14ms debug:models:list:load_config duration=14ms sourceConfig=true
  20.3s  +20.3s debug:models:list:auth_store duration=20.3s
  20.3s     +0ms debug:models:list:resolve_agent_dir duration=0ms agentDir=true
  20.3s     +0ms debug:models:list:resolve_provider_filter duration=0ms
  25.3s   +5.0s debug:models:list:ensure_models_json duration=5.0s
  31.2s   +5.9s debug:models:list:load_model_registry duration=5.9s models=869 availableKeys=38 discoveredKeys=868 availabilityError=false
  31.2s     +0ms debug:models:list:resolve_configured_entries duration=0ms entries=1
  31.2s     +0ms debug:models:list:build_configured_lookup duration=0ms entries=1
  33.6s   +2.4s debug:models:list:read_registry_models duration=2.4s models=871
  35.2s   +1.5s debug:models:list:append_discovered_rows duration=1.5s seenKeys=0 rows=0
  36.9s   +1.7s debug:models:list:append_catalog_supplement_rows duration=1.7s seenKeys=5 rows=5

Model                                      Input       Ctx   Local Auth  Tags
moonshot/kimi-k2-thinking                  text        256k  no    no
moonshot/kimi-k2-thinking-turbo            text        256k  no    no
moonshot/kimi-k2-turbo                     text        250k  no    no
moonshot/kimi-k2.5                         text+image  256k  no    no
moonshot/kimi-k2.6                         text+image  256k  no    no

  36.9s     +0ms debug:models:list:print_model_table duration=0ms rows=5
  36.9s     +0ms complete rows=5
```

来自此输出的发现：

| 阶段                                     |       时间 | 含义                                                                                              |
| ---------------------------------------- | ---------: | ------------------------------------------------------------------------------------------------- |
| `debug:models:list:auth_store`           |      20.3s | auth-profile 存储加载是最大的开销，应优先调查。                                                   |
| `debug:models:list:ensure_models_json`   |       5.0s | 同步 `models.json` 的成本足够高，需要检查缓存或跳过条件。                                         |
| `debug:models:list:load_model_registry`  |       5.9s | 注册表构建和提供方可用性工作也是有意义的成本。                                                    |
| `debug:models:list:read_registry_models` |       2.4s | 读取所有注册表模型并非没有开销，且在 `--all` 场景下可能很重要。                                   |
| row append phases                        | 3.2s total | 构建五行显示结果仍然花费了几秒，因此过滤路径值得进一步查看。                                      |
| `debug:models:list:print_model_table`    |        0ms | 渲染不是瓶颈。                                                                                    |

这些发现足以指导下一次补丁，而不必把计时代码保留在生产路径中。

### 以 JSON 输出运行

当你想保存或比较计时数据时，请使用 JSON 模式：

```bash
OPENCLAW_DEBUG_TIMING=json pnpm openclaw models list --all --provider moonshot \
  2> .artifacts/models-list-timing.jsonl
```

每一行 stderr 都是一个 JSON 对象：

```json
{
  "command": "models list",
  "phase": "debug:models:list:registry",
  "elapsedMs": 31200,
  "deltaMs": 5900,
  "durationMs": 5900,
  "models": 869,
  "discoveredKeys": 868
}
```

### 合并前清理

在打开最终 PR 之前：

```bash
rg 'createCliDebugTiming|debug:[a-z0-9_-]+:' src/commands src/cli \
  --glob '!src/cli/debug-timing.*' \
  --glob '!*.test.ts'
```

除非该 PR 明确是在添加一个永久的诊断面，否则该命令不应返回任何临时插桩调用点。对于正常的性能修复，只保留行为变更、测试，以及一条带有计时证据的简短说明。

对于更深层的 CPU 热点，请使用 Node profiling（`--cpu-prof`）或外部分析器，而不是添加更多计时包装器。

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

tmux 包装器会将常见的非密钥运行时选择器，如
`OPENCLAW_PROFILE`、`OPENCLAW_CONFIG_PATH`、`OPENCLAW_STATE_DIR`、
`OPENCLAW_GATEWAY_PORT` 和 `OPENCLAW_SKIP_CHANNELS` 传入窗格。将
提供方凭据放在你的常规 profile/config 中，或者在一次性临时密钥场景下使用原始前台模式。

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

如果你还没有全局安装，请通过 `pnpm openclaw ...` 来运行 CLI。

这会做什么：

1. **配置隔离**（全局 `--dev`）
   - `OPENCLAW_PROFILE=dev`
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`
   - `OPENCLAW_GATEWAY_PORT=19001`（浏览器/canvas 端口会相应变化）

2. **Dev 启动**（`gateway --dev`）
   - 如果缺失，则写入最小配置（`gateway.mode=local`，绑定 loopback）。
   - 将 `agent.workspace` 设置为 dev 工作区。
   - 设置 `agent.skipBootstrap=true`（不使用 BOOTSTRAP.md）。
   - 若工作区文件缺失，则初始化这些文件：
     `AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`。
   - 默认身份：**C3‑PO**（协议机器人）。
   - 在 dev 模式下跳过 channel providers（`OPENCLAW_SKIP_CHANNELS=1`）。

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

## 原始 chunk 日志（pi-mono）

为了在块被解析之前捕获**原始 OpenAI 兼容 chunks**，
pi-mono 提供了一个单独的日志记录器：

```bash
PI_RAW_STREAM=1
```

可选路径：

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

默认文件：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：这只会由使用 pi-mono 的 `openai-completions` provider 的进程输出。

## 安全提示

- 原始流日志可能包含完整的提示词、工具输出和用户数据。
- 将日志保存在本地，并在调试后删除它们。
- 如果你分享日志，请先清理密钥和 PII。

## 相关内容

- [故障排查](/help/troubleshooting)
- [常见问题](/help/faq)
