---
summary: "面向确定性 OpenClaw QA 场景的合成 Slack 类通道插件"
title: "QA 通道"
read_when:
  - 您正在将合成 QA 传输接入本地或 CI 测试运行
  - 您需要捆绑的 qa-channel 配置界面
  - 您正在迭代端到端 QA 自动化
---

`qa-channel` 是一个用于自动化 OpenClaw QA 的捆绑式合成消息传输。它不是生产通道——它的存在是为了在保持状态确定且完全可检查的同时，练习与真实传输相同的通道插件边界。

## 它的作用

- Slack 类目标语法：
  - `dm:<user>`
  - `channel:<room>`
  - `thread:<room>/<thread>`
- 用于入站消息注入、出站转录捕获、线程创建、表情反应、编辑、删除以及搜索/读取操作的 HTTP 支持合成总线。
- 运行在主机侧的自检执行器，会将 Markdown 报告写入 `.artifacts/qa-e2e/`。

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

- `enabled` — 该账户的总开关。
- `name` — 可选的显示标签。
- `baseUrl` — 合成总线 URL。
- `botUserId` — 在目标语法中使用的 Matrix 风格 bot 用户 id。
- `botDisplayName` — 出站消息的显示名称。
- `pollTimeoutMs` — 长轮询等待窗口。100 到 30000 之间的整数。
- `allowFrom` — 发送者允许列表（用户 id 或 `"*"`）。
- `defaultTo` — 未提供目标时的回退目标。
- `actions.messages` / `actions.reactions` / `actions.search` / `actions.threads` — 按动作进行的工具开关控制。

顶层的多账户键：

- `accounts` — 以账户 id 为键的按账户覆盖记录。
- `defaultAccount` — 配置了多个账户时的首选账户 id。

## 运行器

主机侧自检（会将 Markdown 报告写入 `.artifacts/qa-e2e/` 下）：

```bash
pnpm qa:e2e
```

这会通过 `qa-lab` 路由，启动仓库内的 QA 总线，启动捆绑的 `qa-channel` 运行时切片，并运行一个确定性的自检。

完整的仓库支持场景套件：

```bash
pnpm openclaw qa suite
```

以并行方式在 QA 网关通道上运行场景。有关场景、配置文件和提供者模式，请参见 [QA 概览](/concepts/qa-e2e-automation)。

Docker 支持的 QA 网站（网关 + QA Lab 调试器 UI 集于一体）：

```bash
pnpm qa:lab:up
```

构建 QA 网站，启动 Docker 支持的网关 + QA Lab 栈，并打印 QA Lab URL。从那里你可以选择场景、选择模型通道、启动单独运行，并实时查看结果。QA Lab 调试器与发布的控制 UI 捆绑包是分开的。

## 相关内容

- [QA 概览](/concepts/qa-e2e-automation) — 整体栈、传输适配器、场景编写
- [Matrix QA](/concepts/qa-matrix) — 驱动真实通道的实时传输运行器示例
- [Pairing](/channels/pairing)
- [Groups](/channels/groups)
- [Channels overview](/channels)
