---
title: "Pi 开发工作流程"
summary: "Pi 集成的开发者工作流程：构建、测试和实时验证"
read_when:
  - 开发 Pi 集成代码或测试时
  - 运行 Pi 专用的 lint、类型检查和实时测试流程时
---

# Pi 开发工作流程

本指南总结了在 OpenClaw 中进行 pi 集成开发的合理工作流程。

## 类型检查和代码风格检查

- 类型检查并构建：`pnpm build`
- 代码风格检查：`pnpm lint`
- 格式检查：`pnpm format`
- 提交前完整检查流程：`pnpm lint && pnpm build && pnpm test`

## 运行 Pi 测试

使用 Vitest 直接运行针对 Pi 的测试集：

```bash
pnpm test -- \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-extensions/**/*.test.ts"
```

若需包含实时提供者的测试：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test -- src/agents/pi-embedded-runner-extraparams.live.test.ts
```

涵盖了主要的 Pi 单元测试套件：

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-extensions/*.test.ts`

## 手动测试

推荐流程：

- 以开发模式运行网关：
  - `pnpm gateway:dev`
- 直接触发 agent：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 进行交互式调试：
  - `pnpm tui`

对于工具调用行为，系统会提示选择 `read` 或 `exec` 操作，以便观察工具的流式数据和载荷处理。

## 清理重置

状态数据位于 OpenClaw 状态目录下，默认路径为 `~/.openclaw`。如果配置了 `OPENCLAW_STATE_DIR`，则使用该目录。

要重置所有内容：

- `openclaw.json`（配置文件）
- `credentials/`（认证配置文件和令牌）
- `agents/<agentId>/sessions/`（agent 会话历史）
- `agents/<agentId>/sessions.json`（会话索引）
- `sessions/`（若存在遗留路径）
- `workspace/`（若需要全新工作区）

若仅需重置会话，删除该 agent 的 `agents/<agentId>/sessions/` 和 `agents/<agentId>/sessions.json` 即可。如不想重新认证，请保留 `credentials/`。

## 参考资料

- [Testing](/help/testing)
- [Getting Started](/start/getting-started)
