---
summary: "OpenClaw 代理运行时的开发工作流：构建、测试和实时验证"
title: "OpenClaw 代理运行时工作流"
read_when:
  - 处理 OpenClaw 代理运行时代码或测试时
  - 运行 agent-runtime 的 lint、typecheck 和实时测试流程时
---

在 OpenClaw 中处理 OpenClaw 代理运行时的一个合理工作流。

## 类型检查和 lint

- 默认本地门禁：`pnpm check`
- 构建门禁：当更改可能影响构建产物、打包或懒加载/模块边界时，运行 `pnpm build`
- agent-runtime 更改的完整合入门禁：`pnpm check && pnpm test`

## 运行 Agent Runtime 测试

直接使用 Vitest 运行 agent-runtime 测试集：

```bash
pnpm test \
  "src/agents/agent-*.test.ts" \
  "src/agents/embedded-agent-*.test.ts" \
  "src/agents/agent-tools*.test.ts" \
  "src/agents/agent-settings.test.ts" \
  "src/agents/agent-tool-definition-adapter*.test.ts" \
  "src/agents/agent-hooks/**/*.test.ts"
```

要包含实时提供者演练：

```bash
OPENCLAW_LIVE_TEST=1 pnpm test src/agents/embedded-agent-runner-extraparams.live.test.ts
```

这涵盖了主要的代理运行时单元测试套件：

- `src/agents/agent-*.test.ts`
- `src/agents/embedded-agent-*.test.ts`
- `src/agents/agent-tools*.test.ts`
- `src/agents/agent-settings.test.ts`
- `src/agents/agent-tool-definition-adapter.test.ts`
- `src/agents/agent-hooks/*.test.ts`

## 手动测试

推荐流程：

- 以开发模式运行网关：
  - `pnpm gateway:dev`
- 直接触发代理：
  - `pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 进行交互式调试：
  - `pnpm tui`

对于工具调用行为，提示一个 `read` 或 `exec` 动作，这样你就可以看到工具流式传输和负载处理。

## 清理并重置状态

状态存放在 OpenClaw 的状态目录下。默认是 `~/.openclaw`。如果设置了 `OPENCLAW_STATE_DIR`，则改用该目录。

要重置所有内容：

- `openclaw.json` 用于配置
- `agents/<agentId>/agent/auth-profiles.json` 用于模型认证配置文件（API 密钥 + OAuth）
- `credentials/` 用于仍然位于认证配置文件存储之外的提供方/通道状态
- `agents/<agentId>/sessions/` 用于代理会话历史
- `agents/<agentId>/sessions/sessions.json` 用于会话索引
- `sessions/` 用于存在旧路径时
- `workspace/` 如果你想要一个空白工作区

如果你只想重置会话，删除该代理的 `agents/<agentId>/sessions/`。如果你想保留认证，请保留 `agents/<agentId>/agent/auth-profiles.json` 以及 `credentials/` 下的任何提供方状态不变。

## 参考资料

- [测试](/help/testing)
- [入门](/start/getting-started)

## 相关内容

- [OpenClaw agent runtime architecture](/agent-runtime-architecture)
