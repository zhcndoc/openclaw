---
summary: "Pi 集成的开发工作流：构建、测试和实时验证"
title: "Pi 开发工作流"
read_when:
  - 开发 Pi 集成代码或测试时
  - 运行 Pi 专用的 lint、类型检查和实时测试流程时
---

在 OpenClaw 中处理 Pi 集成的一套合理工作流。

## Type checking and linting

- 默认本地门禁：`pnpm check`
- 构建门禁：当更改可能影响构建产物、打包或懒加载/模块边界时，运行 `pnpm build`
- 针对 Pi 变更较多时的完整落地门禁：`pnpm check && pnpm test`

## Running Pi tests

使用 Vitest 直接运行针对 Pi 的测试集：

```bash
pnpm test \
  "src/agents/pi-*.test.ts" \
  "src/agents/pi-embedded-*.test.ts" \
  "src/agents/pi-tools*.test.ts" \
  "src/agents/pi-settings.test.ts" \
  "src/agents/pi-tool-definition-adapter*.test.ts" \
  "src/agents/pi-hooks/**/*.test.ts"
```

若需包含实时提供者的测试：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/pi-embedded-runner-extraparams.live.test.ts
```

涵盖了主要的 Pi 单元测试套件：

- `src/agents/pi-*.test.ts`
- `src/agents/pi-embedded-*.test.ts`
- `src/agents/pi-tools*.test.ts`
- `src/agents/pi-settings.test.ts`
- `src/agents/pi-tool-definition-adapter.test.ts`
- `src/agents/pi-hooks/*.test.ts`

## Manual testing

推荐流程：

- 以开发模式运行网关：
  - `pnpm gateway:dev`
- 直接触发 agent：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 进行交互式调试：
  - `pnpm tui`

对于工具调用行为，系统会提示选择 `read` 或 `exec` 操作，以便观察工具的流式数据和载荷处理。

## Clean slate reset

状态数据位于 OpenClaw 状态目录下，默认路径为 `~/.openclaw`。如果配置了 `OPENCLAW_STATE_DIR`，则使用该目录。

要重置所有内容：

- `openclaw.json` 用于配置
- `agents/<agentId>/agent/auth-profiles.json` 用于模型认证配置文件（API 密钥 + OAuth）
- `credentials/` 用于仍然保留在认证配置文件存储之外的提供者/通道状态
- `agents/<agentId>/sessions/` 用于 agent 会话历史
- `agents/<agentId>/sessions/sessions.json` 用于会话索引
- `sessions/` 如果存在旧路径
- `workspace/` 如果你想要一个空白工作区

如果你只想重置会话，请删除该 agent 的 `agents/<agentId>/sessions/`。如果你想保留认证信息，请保留 `agents/<agentId>/agent/auth-profiles.json` 以及 `credentials/` 下的任何提供者状态。

## 参考资料

- [Testing](/help/testing)
- [Getting Started](/start/getting-started)

## Related

- [Pi 集成架构](/pi)
