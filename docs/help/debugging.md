---
summary: "调试工具：观察模式、原始模型流和推理信息泄露追踪"
read_when:
  - 你需要检查原始模型输出中的推理信息泄露
  - 你想在迭代时以观察模式运行 Gateway
  - 你需要一个可重复的调试工作流程
title: "调试"
---

# 调试

本页介绍用于流式输出的调试辅助工具，特别是当提供者将推理混入普通文本时。

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

## Gateway 观察模式

为了快速迭代，可在文件观察器下运行 gateway：

```bash
pnpm gateway:watch
```

映射为：

```bash
node --watch-path src --watch-path tsconfig.json --watch-path package.json --watch-preserve-output scripts/run-node.mjs gateway --force
```

在 `gateway:watch` 后添加任何 gateway CLI 标志，会在每次重启时传递。

## 开发配置文件 + 开发网关（--dev）

使用开发配置文件隔离状态，启动一个安全且一次性的调试环境。有**两个** `--dev` 标志：

- **全局 `--dev`（配置文件）：** 将状态隔离到 `~/.openclaw-dev`，默认 gateway 端口为 `19001`（衍生端口相应变动）。
- **`gateway --dev`：让 Gateway 自动创建默认配置+工作区**（如果缺失），并跳过 BOOTSTRAP.md。

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
- 保持日志本地，调试后请删除。  
- 若要分享日志，先清理秘密信息和个人身份信息（PII）。
