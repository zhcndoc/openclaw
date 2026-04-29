---
summary: "Crestodian 的 CLI 参考与安全模型，适用于无配置安全的设置和修复助手"
read_when:
  - 你在不带命令运行 openclaw，并希望了解 Crestodian
  - 你需要一种无配置且安全的方式来检查或修复 OpenClaw
  - 你正在设计或启用消息通道救援模式
title: "Crestodian"
---

# `openclaw crestodian`

Crestodian 是 OpenClaw 的本地设置、修复和配置助手。它被设计为在正常代理路径损坏时仍保持可达。

不带命令运行 `openclaw` 会在交互式终端中启动 Crestodian。
运行 `openclaw crestodian` 会显式启动同一个助手。

## Crestodian 显示什么

启动时，交互式 Crestodian 会打开与 `openclaw tui` 相同的 TUI shell，但使用 Crestodian 聊天后端。聊天日志以一段简短的问候开始：

- 何时启动 Crestodian
- Crestodian 实际使用的模型或确定性规划器路径
- 配置有效性和默认代理
- 第一次启动探测时的 Gateway 可达性
- Crestodian 可采取的下一步调试动作

它不会在启动时转储密钥或加载插件 CLI 命令。TUI 仍然提供正常的头部、聊天日志、状态行、页脚、自动补全和编辑器控制。

使用 `status` 可查看详细清单，包括配置路径、文档/源码路径、本地 CLI 探测、API 密钥存在性、代理、模型以及 Gateway 详情。

Crestodian 使用与常规代理相同的 OpenClaw 参考发现机制。在 Git 检出中，它会指向本地 `docs/` 和本地源码树。在 npm 包安装中，它会使用随包附带的文档，并链接到
[https://github.com/openclaw/openclaw](https://github.com/openclaw/openclaw)，并明确建议在文档不足时查看源码。

## 示例

```bash
openclaw
openclaw crestodian
openclaw crestodian --json
openclaw crestodian --message "models"
openclaw crestodian --message "validate config"
openclaw crestodian --message "setup workspace ~/Projects/work model openai/gpt-5.5" --yes
openclaw crestodian --message "set default model openai/gpt-5.5" --yes
openclaw onboard --modern
```

在 Crestodian TUI 内：

```text
status
health
doctor
doctor fix
validate config
setup
setup workspace ~/Projects/work model openai/gpt-5.5
config set gateway.port 19001
config set-ref gateway.auth.token env OPENCLAW_GATEWAY_TOKEN
gateway status
restart gateway
agents
create agent work workspace ~/Projects/work
models
set default model openai/gpt-5.5
talk to work agent
talk to agent for ~/Projects/work
audit
quit
```

## 安全启动

Crestodian 的启动路径故意保持很小。它可以在以下情况下运行：

- `openclaw.json` 缺失
- `openclaw.json` 无效
- Gateway 已关闭
- 插件命令注册不可用
- 尚未配置任何代理

`openclaw --help` 和 `openclaw --version` 仍然使用正常的快速路径。
非交互式 `openclaw` 会以简短消息退出，而不是打印根级帮助，因为无命令产品就是 Crestodian。

## 操作与审批

Crestodian 使用类型化操作，而不是临时编辑配置。

只读操作可以立即运行：

- 显示概览
- 列出代理
- 显示模型/后端状态
- 运行状态或健康检查
- 检查 Gateway 可达性
- 在没有交互式修复的情况下运行 doctor
- 验证配置
- 显示审计日志路径

持久性操作在交互模式下需要会话式批准，除非你为直接命令传入 `--yes`：

- 写入配置
- 运行 `config set`
- 通过 `config set-ref` 设置受支持的 SecretRef 值
- 运行设置/引导初始化
- 更改默认模型
- 启动、停止或重启 Gateway
- 创建代理
- 运行会重写配置或状态的 doctor 修复

已应用的写入会记录到：

```text
~/.openclaw/audit/crestodian.jsonl
```

发现过程不会被审计。只有已应用的操作和写入会被记录。

`openclaw onboard --modern` 会将 Crestodian 作为现代化 onboarding 预览启动。
普通 `openclaw onboard` 仍然运行经典 onboarding。

## 设置引导

`setup` 是聊天优先的 onboarding 引导。它只通过类型化配置操作进行写入，并会先请求批准。

```text
setup
setup workspace ~/Projects/work
setup workspace ~/Projects/work model openai/gpt-5.5
```

当尚未配置模型时，setup 会按以下顺序选择第一个可用后端，并告诉你它选择了什么：

- 现有的显式模型（如果已配置）
- `OPENAI_API_KEY` -> `openai/gpt-5.5`
- `ANTHROPIC_API_KEY` -> `anthropic/claude-opus-4-7`
- Claude Code CLI -> `claude-cli/claude-opus-4-7`
- Codex CLI -> `codex-cli/gpt-5.5`

如果这些都不可用，setup 仍会写入默认工作区并保持模型未设置。请安装或登录 Codex/Claude Code，或暴露
`OPENAI_API_KEY`/`ANTHROPIC_API_KEY`，然后再次运行 setup。

## 模型辅助规划器

Crestodian 总是以确定性模式启动。对于确定性解析器无法理解的模糊命令，本地 Crestodian 可以通过 OpenClaw 的正常运行路径进行一次受限的规划器回合。它首先使用已配置的 OpenClaw 模型。如果当前没有可用的已配置模型，它可以回退到机器上已存在的本地运行时：

- Claude Code CLI: `claude-cli/claude-opus-4-7`
- Codex app-server harness: 带有 `agentRuntime.id: "codex"` 的 `openai/gpt-5.5`
- Codex CLI: `codex-cli/gpt-5.5`

模型辅助规划器不能直接修改配置。它必须将请求翻译为 Crestodian 的某个类型化命令，然后正常的审批和审计规则才会生效。Crestodian 会在执行任何操作之前打印它使用的模型以及解释后的命令。无配置回退的规划器回合是临时的、在运行时支持的情况下禁用工具，并使用临时工作区/会话。

消息通道救援模式不使用模型辅助规划器。远程救援保持确定性，因此损坏或被入侵的正常代理路径不能被用作配置编辑器。

## 切换到代理

使用自然语言选择器离开 Crestodian 并打开正常 TUI：

```text
talk to agent
talk to work agent
switch to main agent
```

`openclaw tui`、`openclaw chat` 和 `openclaw terminal` 仍然会直接打开正常的代理 TUI。它们不会启动 Crestodian。

切换到正常 TUI 后，使用 `/crestodian` 返回 Crestodian。
你可以附带后续请求：

```text
/crestodian
/crestodian restart gateway
```

TUI 内的代理切换会留下一个提示，表明 `/crestodian` 可用。

## 消息救援模式

消息救援模式是 Crestodian 的消息通道入口点。它适用于你的正常代理已失效，但诸如 WhatsApp 之类的可信通道仍然接收命令的场景。

支持的文本命令：

- `/crestodian <request>`

操作流程：

```text
You, in a trusted owner DM: /crestodian status
OpenClaw: Crestodian rescue mode. Gateway reachable: no. Config valid: no.
You: /crestodian restart gateway
OpenClaw: Plan: restart the Gateway. Reply /crestodian yes to apply.
You: /crestodian yes
OpenClaw: Applied. Audit entry written.
```

代理创建也可以从本地提示符或救援模式排队：

```text
create agent work workspace ~/Projects/work model openai/gpt-5.5
/crestodian create agent work workspace ~/Projects/work
```

远程救援模式是一个管理员面板。它必须被视为远程配置修复，而不是普通聊天。

远程救援的安全契约：

- 在沙箱化启用时禁用。如果某个代理/会话处于沙箱中，Crestodian 必须拒绝远程救援，并说明需要本地 CLI 修复。
- 默认有效状态为 `auto`：仅在可信的 YOLO 操作中允许远程救援，此时运行时已经拥有非沙箱化的本地权限。
- 需要显式的所有者身份。救援不得接受通配符发送者规则、开放群组策略、未认证 webhook 或匿名通道。
- 默认仅限所有者 DM。群组/频道救援需要显式选择加入。
- 远程救援不能打开本地 TUI 或切换到交互式代理会话。请使用本地 `openclaw` 进行代理交接。
- 即使在救援模式下，持久写入仍需要批准。
- 对每个已应用的救援操作进行审计。消息通道救援会记录频道、账户、发送者和源地址元数据。会修改配置的操作还会记录修改前后的配置哈希。
- 永远不要回显密钥。SecretRef 检查应报告可用性，而不是值。
- 如果 Gateway 存活，优先使用 Gateway 类型化操作。如果 Gateway 已死，只使用不依赖正常代理循环的最小本地修复面。

配置形状：

```jsonc
{
  "crestodian": {
    "rescue": {
      "enabled": "auto",
      "ownerDmOnly": true,
    },
  },
}
```

`enabled` 应接受：

- `"auto"`：默认值。仅在有效运行时处于 YOLO 且沙箱关闭时允许。
- `false`：永不允许消息通道救援。
- `true`：在所有者/通道检查通过时显式允许救援。这仍然不能绕过沙箱化拒绝。

默认的 `"auto"` YOLO 姿态为：

- sandbox 模式解析为 `off`
- `tools.exec.security` 解析为 `full`
- `tools.exec.ask` 解析为 `off`

远程救援由 Docker 流水线覆盖：

```bash
pnpm test:docker:crestodian-rescue
```

无配置的本地规划器回退由以下测试覆盖：

```bash
pnpm test:docker:crestodian-planner
```

一个可选的实时通道命令面 smoke 检查会验证 `/crestodian status` 以及通过救援处理器进行的一次持久批准往返：

```bash
pnpm test:live:crestodian-rescue-channel
```

通过 Crestodian 的全新无配置设置由以下测试覆盖：

```bash
pnpm test:docker:crestodian-first-run
```

该流水线从一个空状态目录开始，将裸 `openclaw` 路由到 Crestodian，设置默认模型，创建一个额外代理，通过插件启用加 SecretRef 令牌来配置 Discord，验证配置，并检查审计日志。QA Lab 还为同一 Ring 0 流程提供了一个基于仓库的场景：

```bash
pnpm openclaw qa suite --scenario crestodian-ring-zero-setup
```

## 相关内容

- [CLI 参考](/cli)
- [Doctor](/cli/doctor)
- [TUI](/cli/tui)
- [沙箱](/cli/sandbox)
- [安全](/cli/security)
