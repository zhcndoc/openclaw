---
summary: "在一台主机上运行多个 OpenClaw Gateway（隔离、端口和配置文件）"
read_when:
  - 在同一台机器上运行多个 Gateway
  - 你需要为每个 Gateway 提供独立的配置/状态/端口
title: "多个网关"
---

大多数场景只需要一个 Gateway——单个 Gateway 就能处理多个消息连接和代理。只有在你需要更强的隔离或冗余时（例如，用于救援机器人），才运行彼此隔离、使用独立配置文件/端口的多个 Gateway。

## 救援机器人快速入门

最简单的救援机器人设置：

- 将主机器人保持在默认配置文件上。
- 使用 `--profile rescue` 运行救援机器人，并使用它自己的 Telegram 机器人令牌。
- 为救援机器人设置不同的基础端口，例如 `19789`。

这样可以确保当主机器人宕机时，救援机器人仍然能够进行调试或应用配置更改。请至少在基础端口之间保留 20 个端口，以避免派生的浏览器/CDP 端口发生冲突。

```bash
# 救援机器人（独立的 Telegram 机器人、独立的配置文件、端口 19789）
openclaw --profile rescue onboard
openclaw --profile rescue gateway install --port 19789
```

如果你的主机器人已经在运行，那么通常只需要这些步骤。如果 onboarding 已经安装了救援服务，就跳过最后的 `gateway install`。

在执行 `openclaw --profile rescue onboard` 期间：

- 使用单独的 Telegram 机器人令牌，专用于救援账户（便于仅限操作人员使用，独立于主机器人的频道/应用安装，并且提供一个基于私聊的简单恢复路径）。
- 保持 `rescue` 配置文件名称不变。
- 使用至少比主机器人高 20 的基础端口。
- 如果你自己已经管理了工作区，则接受默认的救援工作区。

### `--profile rescue onboard` 会更改什么

`--profile rescue onboard` 会运行正常的 onboarding 流程，但将所有内容写入一个单独的配置文件，因此救援机器人将拥有自己的：

- 配置文件/配置文件
- 状态目录
- 工作区（默认：`~/.openclaw/workspace-rescue`）
- 托管服务名称
- 基础端口（以及派生端口）
- Telegram 机器人令牌

除此之外，提示内容与正常 onboarding 完全相同。

## 通用多 gateway 配置

相同的隔离模式也适用于同一主机上的任意一对或一组 Gateway——为每个额外的 Gateway 分配各自命名的 profile 和基础端口：

```bash
# 主实例（默认配置文件）
openclaw setup
openclaw gateway --port 18789

# 额外的 gateway
openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

两侧都使用命名 profile 也同样可行：

```bash
openclaw --profile main setup
openclaw --profile main gateway --port 18789

openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

服务也遵循相同的模式：

```bash
openclaw gateway install
openclaw --profile ops gateway install --port 19789
```

为备用操作通道使用 rescue-bot 快速入门；对于跨不同频道、租户、工作区或运营角色的多个长期运行的 Gateway，请使用通用 profile 模式。

## 隔离检查清单

为每个 Gateway 实例保留以下内容唯一：

| 设置                         | 目的                                 |
| ---------------------------- | ------------------------------------ |
| `OPENCLAW_CONFIG_PATH`       | 每个实例的配置文件                   |
| `OPENCLAW_STATE_DIR`         | 每个实例的会话、凭据、缓存           |
| `agents.defaults.workspace`  | 每个实例的工作区根目录               |
| `gateway.port`（或 `--port`） | 每个实例唯一                        |
| 派生的浏览器/CDP 端口         | 见下文                               |

共享其中任何一项都会导致配置竞争和端口冲突。

## 端口映射（派生）

基础端口 = `gateway.port`（或 `OPENCLAW_GATEWAY_PORT` / `--port`）。

- 浏览器控制服务端口 = 基础端口 + 2（仅回环）。
- Canvas 主机由 Gateway HTTP 服务器本身提供（与 `gateway.port` 相同端口）。
- 浏览器配置文件 CDP 端口会自动分配为 `browser control port + 9` 到 `+ 108`。

如果在配置或环境变量中覆盖了这些值，则必须确保每个实例的端口保持唯一。

## 浏览器/CDP 注意事项（常见坑）

- 不要在多个实例上将 `browser.cdpUrl` 固定为相同的值。
- 每个实例都需要自己的浏览器控制端口和 CDP 范围（由其网关端口派生）。
- 对于显式指定的 CDP 端口，请为每个实例设置 `browser.profiles.<name>.cdpPort`。
- 对于远程 Chrome，请使用 `browser.profiles.<name>.cdpUrl`（按 profile、按实例）。

## 手动环境变量示例

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19789
```

## 快速检查

```bash
openclaw gateway status --deep
openclaw --profile rescue gateway status --deep
openclaw --profile rescue gateway probe
openclaw status
openclaw --profile rescue status
openclaw --profile rescue browser status
```

- `gateway status --deep` 会捕获来自旧安装的过期 launchd/systemd/schtasks 服务。
- 仅当你有意运行多个彼此隔离的 gateway，或者当 OpenClaw 无法证明可达的探测目标是同一个 gateway 时，`gateway probe` 才会出现诸如 `multiple reachable gateway identities detected` 的警告文本。指向同一 gateway 的 SSH 隧道、代理 URL 或已配置的远程 URL，尽管传输端口不同，也仍然算作一个 gateway，只是使用了多种传输方式。

## 相关内容

- [Gateway 运行手册](/gateway)
- [Gateway 锁](/gateway/gateway-lock)
- [配置](/gateway/configuration)
