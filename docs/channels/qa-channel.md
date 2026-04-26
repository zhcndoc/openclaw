---
summary: "面向确定性 OpenClaw QA 场景的合成 Slack 类通道插件"
title: "QA 通道"
read_when:
  - 您正在将合成 QA 传输接入本地或 CI 测试运行
  - 您需要捆绑的 qa-channel 配置界面
  - 您正在迭代端到端 QA 自动化
---

`qa-channel` 是一个用于自动化 OpenClaw QA 的捆绑式合成消息传输。

它不是一个生产通道。它的存在是为了演练真实传输所使用的相同通道插件边界，同时保持状态确定性且完全可检查。

## 它目前的功能

- Slack 类目标语法：
  - `dm:<user>`
  - `channel:<room>`
  - `thread:<room>/<thread>`
- 基于 HTTP 的合成总线，用于：
  - 入站消息注入
  - 出站转录捕获
  - 线程创建
  - 反应
  - 编辑
  - 删除
  - 搜索和读取操作
- 捆绑的主机端自检运行器，写入 Markdown 报告

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

支持的账户键：

- `baseUrl`
- `botUserId`
- `botDisplayName`
- `pollTimeoutMs`
- `allowFrom`
- `defaultTo`
- `actions.messages`
- `actions.reactions`
- `actions.search`
- `actions.threads`

## 运行器

当前垂直切片：

```bash
pnpm qa:e2e
```

现在它通过捆绑的 `qa-lab` 扩展进行路由。它启动仓库内的 QA 总线，引导捆绑的 `qa-channel` 运行时切片，运行确定性自检，并在 `.artifacts/qa-e2e/` 下写入 Markdown 报告。

私有调试器 UI：

```bash
pnpm qa:lab:up
```

该命令构建 QA 站点，启动基于 Docker 的网关 + QA Lab 堆栈，并打印 QA Lab URL。从该站点您可以挑选场景，选择模型通道，启动独立运行，并实时观看结果。

完整仓库支持的 QA 套件：

```bash
pnpm openclaw qa suite
```

这将在本地 URL 启动私有 QA 调试器，与发布的控制 UI 捆绑包分开。

## 范围

当前范围故意设定得较窄：

- 总线 + 插件传输
- 线程化路由语法
- 通道拥有的消息操作
- Markdown 报告
- 带有运行控制的基于 Docker 的 QA 站点

后续工作将添加：

- provider/model matrix execution
- richer scenario discovery
- OpenClaw-native orchestration later

## 相关内容

- [配对](/channels/pairing)
- [群组](/channels/groups)
- [通道概览](/channels)
