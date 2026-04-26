---
summary: "调试工具：观察模式、原始模型流和推理信息泄露追踪"
read_when:
  - 你需要检查原始模型输出中的推理信息泄露
  - 你想在迭代时以观察模式运行 Gateway
  - 你需要一个可重复的调试工作流程
title: "调试"
---

此页面介绍用于流式输出的调试辅助功能，尤其适用于提供者将推理内容混入正常文本的情况。

## 运行时调试覆盖

在聊天中使用 `/debug` 设置**仅运行时**的配置覆盖（仅内存，不写入磁盘）。  
`/debug` 默认关闭，启用需设置 `commands.debug: true`。  
当你需要切换一些不常见设置而不编辑 `openclaw.json` 时非常有用。

示例：

```
/debug show
/debug set messages.responsePrefix="[openclaw]"
/debug unset messages.responsePrefix
/debug reset
```

`/debug reset` 会清除所有覆盖，恢复为磁盘上的配置。

## 会话跟踪输出

当你想在一个会话中查看插件生成的跟踪/调试行而不开启完整详细模式时，请使用 `/trace`。

示例：

```text
/trace
/trace on
/trace off
```

使用 `/trace` 进行插件诊断，例如活动内存调试摘要。继续使用 `/verbose` 获取正常的详细状态/工具输出，继续使用 `/debug` 进行仅运行时配置覆盖。

## 临时 CLI 调试计时

OpenClaw 保留 `src/cli/debug-timing.ts` 作为本地调查的小型辅助工具。它有意不接入 CLI 启动、命令路由或任何默认命令。请仅在调试慢命令时使用它，然后在完成行为修改前移除导入和时间跨度。

当某个命令很慢，而你需要在决定使用 CPU 分析器还是修复某个特定子系统之前，先快速拆分阶段时，可使用此功能。

### 添加临时时间跨度

在你正在调查的代码附近添加该辅助工具。例如，在调试 `openclaw models list` 时，`src/commands/models/list.list-command.ts` 中的临时补丁可能如下所示：

```ts
// Temporary debugging only. Remove before landing.
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

- 临时时段名称请以 `debug:` 为前缀。
- 只在可疑的慢区段周围添加少量时间跨度。
- 优先使用诸如 `registry`、`auth_store` 或 `rows` 这样的宽泛阶段，而不是辅助函数名。
- 同步工作使用 `time()`，Promise 使用 `timeAsync()`。
- 保持 stdout 干净。该辅助工具会写入 stderr，因此命令 JSON 输出仍可解析。
- 在打开最终修复 PR 之前移除临时导入和时间跨度。
- 在 issue 或 PR 中附上计时输出或简短摘要，说明该优化。

### 使用可读输出运行

可读模式最适合实时调试：

```bash
OPENCLAW_DEBUG_TIMING=1 pnpm openclaw models list --all --provider moonshot
```

以下是一次临时 `models list` 调查的输出示例：

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

从该输出得出的结论：

| 阶段                                     |       时间 | 含义                                                                                           |
| ---------------------------------------- | ---------: | ---------------------------------------------------------------------------------------------- |
| `debug:models:list:auth_store`           |      20.3s | 认证配置文件存储加载是最大的耗时，应优先调查。                                                  |
| `debug:models:list:ensure_models_json`   |       5.0s | 同步 `models.json` 的开销足够大，值得检查缓存或跳过条件。                                       |
| `debug:models:list:load_model_registry`  |       5.9s | 注册表构建和提供者可用性检查也是有意义的耗时。                                                  |
| `debug:models:list:read_registry_models` |       2.4s | 读取所有注册表模型并非免费，可能会影响 `--all`。                                              |
| 行追加阶段                                 | 3.2s 总计 | 构建五行显示结果仍需数秒，因此过滤路径值得进一步查看。                                          |
| `debug:models:list:print_model_table`    |        0ms | 渲染不是瓶颈。                                                                                  |

这些结论足以指导下一次补丁，而无需在生产路径中保留计时代码。

### 使用 JSON 输出运行

当你想保存或比较计时数据时，请使用 JSON 模式：

```bash
OPENCLAW_DEBUG_TIMING=json pnpm openclaw models list --all --provider moonshot \
  2> .artifacts/models-list-timing.jsonl
```

stderr 的每一行都是一个 JSON 对象：

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

### 在落地前清理

在打开最终 PR 之前：

```bash
rg 'createCliDebugTiming|debug:[a-z0-9_-]+:' src/commands src/cli \
  --glob '!src/cli/debug-timing.*' \
  --glob '!*.test.ts'
```

除非该 PR 明确是在添加永久性的诊断面，否则该命令应返回没有临时埋点调用位置。对于常规性能修复，只保留行为变更、测试，以及带有计时证据的简短说明。

对于更深层的 CPU 热点，请使用 Node 性能分析（`--cpu-prof`）或外部分析器，而不是添加更多计时包装。

## Gateway 观察模式

为了快速迭代，可在文件观察器下运行 gateway：

```bash
pnpm gateway:watch
```

映射为：

```bash
node scripts/watch-node.mjs gateway --force
```

监听器会在 `src/` 下与构建相关的文件、扩展源文件、扩展的 `package.json` 和 `openclaw.plugin.json` 元数据、`tsconfig.json`、`package.json` 和 `tsdown.config.ts` 发生变动时重启。扩展元数据更改会重启 gateway，但不强制 `tsdown` 重建；源代码和配置变更仍会先重建 `dist`。

在 `gateway:watch` 后添加任何 gateway CLI 标志，它们将在每次重启时传递。对于相同的仓库/标志集重新运行相同的观察命令现在会替换旧的观察器，而不是留下重复的观察器父进程。

## 开发配置文件 + 开发网关（--dev）

使用开发配置文件隔离状态，启动一个安全且一次性的调试环境。有**两个** `--dev` 标志：

- **全局 `--dev`（配置文件）：** 将状态隔离到 `~/.openclaw-dev`，默认 gateway 端口为 `19001`（衍生端口相应变动）。
- **`gateway --dev`：让 Gateway 自动创建默认配置 + 工作区**（如果缺失），并跳过 BOOTSTRAP.md。

推荐流程（开发配置文件 + 开发引导）：

```bash
pnpm gateway:dev
OPENCLAW_PROFILE=dev openclaw tui
```

如果尚无全局安装，使用 `pnpm openclaw ...` 调用 CLI。

执行效果：

1. **配置文件隔离**（全局 `--dev`）  
   - `OPENCLAW_PROFILE=dev`  
   - `OPENCLAW_STATE_DIR=~/.openclaw-dev`  
   - `OPENCLAW_CONFIG_PATH=~/.openclaw-dev/openclaw.json`  
   - `OPENCLAW_GATEWAY_PORT=19001`（浏览器/画布端口相应调整）

2. **开发引导**（`gateway --dev`）  
   - 若配置缺失，写入最简配置（`gateway.mode=local`，绑定回环地址）。  
   - 设置 `agent.workspace` 至开发工作区。  
   - 设置 `agent.skipBootstrap=true`（跳过 BOOTSTRAP.md）。  
   - 若缺失，初始化工作区文件：`AGENTS.md`、`SOUL.md`、`TOOLS.md`、`IDENTITY.md`、`USER.md`、`HEARTBEAT.md`。  
   - 默认身份：**C3‑PO**（协议机器人）。  
   - 开发模式跳过通道提供者（`OPENCLAW_SKIP_CHANNELS=1`）。

重置流程（全新开始）：

```bash
pnpm gateway:dev:reset
```

注意：`--dev` 是**全局**配置文件标志，某些运行器会“吞掉”。  
如需明确指定，请使用环境变量形式：

```bash
OPENCLAW_PROFILE=dev openclaw gateway --dev --reset
```

`--reset` 会删除配置、凭证、会话和开发工作区（使用 `trash`，非 `rm`），然后重建默认开发环境。

提示：如果已有非开发网关正在运行（launchd/systemd），请先停止：

```bash
openclaw gateway stop
```

## 原始流日志（OpenClaw）

OpenClaw 可以记录**原始助手流**，即任何过滤/格式化前的内容。  
这是查看推理是否作为纯文本增量到达（或作为独立思考块）的最佳方式。

通过 CLI 启用：

```bash
pnpm gateway:watch --raw-stream
```

可选路径覆盖：

```bash
pnpm gateway:watch --raw-stream --raw-stream-path ~/.openclaw/logs/raw-stream.jsonl
```

等效环境变量：

```bash
OPENCLAW_RAW_STREAM=1
OPENCLAW_RAW_STREAM_PATH=~/.openclaw/logs/raw-stream.jsonl
```

默认文件：

`~/.openclaw/logs/raw-stream.jsonl`

## 原始数据块日志（pi-mono）

为了捕获**解析为块之前的原始 OpenAI 兼容数据块**，pi-mono 提供单独的日志记录器：

```bash
PI_RAW_STREAM=1
```

可选路径：

```bash
PI_RAW_STREAM_PATH=~/.pi-mono/logs/raw-openai-completions.jsonl
```

默认文件：

`~/.pi-mono/logs/raw-openai-completions.jsonl`

> 注意：只有使用 pi-mono 的 `openai-completions` 提供者的进程才会发出此日志。

## 安全注意事项

- 原始流日志可能包含完整提示、工具输出和用户数据。
- 请将日志保存在本地，并在调试后删除。
- 如果要共享日志，请先清理密钥和个人身份信息。

## 相关内容

- [故障排除](/help/troubleshooting)
- [常见问题](/help/faq)
