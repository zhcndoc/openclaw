---
summary: "用于确定性 OpenClaw QA 场景的合成 Slack 类频道插件"
title: "QA 频道"
read_when:
  - 你正在将合成 QA 传输接入本地或 CI 测试运行
  - 你需要内置的 qa-channel 配置接口
  - 你正在迭代端到端 QA 自动化
---

`qa-channel` 是一个为自动化 OpenClaw QA 打包的合成消息传输。它不是生产频道——它的存在是为了在保持状态确定且完全可检查的同时，练习与真实传输相同的频道插件边界。

## 它的作用

- Slack 类目标语法：
  - `dm:<user>`
  - `channel:<room>`
  - `group:<room>`
  - `thread:<room>/<thread>`
- 共享的 `channel:` 和 `group:` 会话会作为群组/频道房间轮次展示给代理，因此它们会使用与 Discord、Slack、Telegram 以及类似传输相同的可见回复和消息工具路由策略。
- 用于入站消息注入、出站转录捕获、线程创建、反应、编辑、删除以及搜索/读取操作的 HTTP 支持合成总线。
- 主机侧自检运行器，会将 Markdown 报告写入 `.artifacts/qa-e2e/`。

## 配置

```json
{
  "channels": {
    "qa-channel": {
      "baseUrl": "http://127.0.0.1:43123",
      "botUserId": "openclaw",
      "botDisplayName": "OpenClaw QA",
      "allowFrom": ["*"],
      "pollTimeoutMs": 1000
    }
  }
}
```

账户键：

- `enabled` - 此账户的总开关。
- `name` - 可选显示标签。
- `baseUrl` - 合成总线 URL。
- `botUserId` - 在目标语法中使用的 Matrix 风格机器人用户 id。
- `botDisplayName` - 出站消息的显示名称。
- `pollTimeoutMs` - 长轮询等待窗口。介于 100 和 30000 之间的整数。
- `allowFrom` - 发送方允许列表（用户 id 或 `"*"`）。
- `defaultTo` - 未提供目标时的回退目标。
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` - 按动作的工具门控。

顶层的多账户键：

- `accounts` - 以账户 id 为键的命名账户级覆盖记录。
- `defaultAccount` - 配置多个账户时首选的账户 id。

## 运行器

主机侧自检（会在 `.artifacts/qa-e2e/` 下写入 Markdown 报告）：

```bash
pnpm qa:e2e
```

这会通过 `qa-lab`，启动仓库内的 QA 总线，启动内置的 `qa-channel` 运行时切片，并运行一个确定性自检。

完整的仓库支持场景套件：

```bash
pnpm openclaw qa suite
```

并行针对 QA 网关通道运行场景。有关场景、配置文件和提供者模式，请参见 [QA 概览](/concepts/qa-e2e-automation)。

Docker 支持的 QA 站点（网关 + QA Lab 调试器 UI 处于同一栈中）：

```bash
pnpm qa:lab:up
```

会构建 QA 站点，启动 Docker 支持的网关 + QA Lab 栈，并打印 QA Lab URL。从那里你可以选择场景、选择模型通道、启动单独运行，并实时查看结果。QA Lab 调试器与已发布的 Control UI 包是分开的。

## 相关内容

- [QA overview](/concepts/qa-e2e-automation) - 整体栈、传输适配器、场景编写
- [Matrix QA](/concepts/qa-matrix) - 驱动真实频道的示例实时传输运行器
- [Pairing](/channels/pairing)
- [Groups](/channels/groups)
- [Channels overview](/channels)
