---
summary: "OpenClaw 代理运行时的开发工作流：构建、测试和实时验证"
title: "OpenClaw 代理运行时工作流"
read_when:
  - 处理 OpenClaw 代理运行时代码或测试时
  - 运行 agent-runtime 的 lint、typecheck 和实时测试流程时
---

OpenClaw 仓库中代理运行时（`src/agents/`）的开发工作流。

## 类型检查和 lint

- 默认本地门禁：`pnpm check`（typecheck、lint、policy guards）
- 构建门禁：当更改可能影响构建输出、打包或懒加载/模块边界时，运行 `pnpm build`
- 完整的预推送门禁：`pnpm build && pnpm check && pnpm check:test-types && pnpm test`

## 运行 Agent Runtime 测试

运行 agent runtime 单元测试套件：

```bash
pnpm test \
  "src/agents/agent-*.test.ts" \
  "src/agents/embedded-agent-*.test.ts" \
  "src/agents/agent-hooks/**/*.test.ts"
```

第一个 glob 还涵盖 `agent-tools*`、`agent-settings` 和
`agent-tool-definition-adapter*` 套件。

Live 测试不包含在单元测试配置中；请通过 live
wrapper 运行它们（会设置 `OPENCLAW_LIVE_TEST=1`，并且需要提供方凭据）：

```bash
pnpm test:live src/agents/embedded-agent-runner-extraparams.live.test.ts
```

## 手动测试

- 在开发模式下运行 Gateway（通过 `OPENCLAW_SKIP_CHANNELS=1` 跳过频道连接）：`pnpm gateway:dev`
- 通过 Gateway 触发一次 agent 轮次：`pnpm openclaw agent --message "Hello" --thinking low`
- 使用 TUI 进行交互式调试：`pnpm tui`

对于工具调用行为，提示执行 `read` 或 `exec` 操作，这样你就可以观察
工具流式传输和负载处理。

## 清理并重置状态

状态保存在 OpenClaw 状态目录中：默认情况下为 `~/.openclaw`，或者当设置了 `$OPENCLAW_STATE_DIR` 时为该路径。相对于该目录的路径如下：

| 路径                                           | 内容                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `openclaw.json`                                | 配置                                                              |
| `state/openclaw.sqlite`                        | 共享运行时状态数据库                                                |
| `agents/<agentId>/agent/openclaw-agent.sqlite` | 每个代理的模型认证配置文件（API 密钥 + OAuth）和运行时状态          |
| `credentials/`                                | 认证配置文件存储之外的提供方/通道凭据                                |
| `agents/<agentId>/sessions/`                  | 会话转录以及 `sessions.json` 索引                                     |
| `sessions/`                                   | 旧版单代理会话存储（仅旧安装使用）                                  |
| `workspace/`                                   | 默认代理工作区（额外代理使用 `workspace-<agentId>`）                |

删除这些路径即可完全重置。更精简的重置方式：

- 仅会话：删除该代理的 `agents/<agentId>/sessions/`。
- 保留认证：保留 `agents/<agentId>/agent/openclaw-agent.sqlite` 和 `credentials/`。

旧版 `auth-profiles.json` 文件在运行时不再读取；
`openclaw doctor --fix` 会将它们导入到 SQLite 存储中。

## 参考资料

- [测试](/help/testing)
- [入门](/start/getting-started)

## 相关内容

- [OpenClaw 代理运行时架构](/agent-runtime-architecture)
