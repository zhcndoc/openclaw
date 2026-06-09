---
summary: "在一台主机上运行多个 OpenClaw Gateway（隔离、端口和配置文件）"
read_when:
  - 在同一台机器上运行多个 Gateway
  - 你需要为每个 Gateway 提供独立的配置/状态/端口
title: "多个网关"
---

大多数部署应该只使用一个 Gateway，因为单个 Gateway 可以处理多个消息连接和代理。如果你需要更强的隔离或冗余（例如，救援机器人），请使用隔离的配置文件/端口运行独立的 Gateways。

## 最佳推荐方案

对大多数用户来说，最简单的救援机器人方案是：

- 将主机器人保留在默认配置文件上
- 使用 `--profile rescue` 运行救援机器人
- 为救援账户使用一个完全独立的 Telegram 机器人
- 将救援机器人放在不同的基础端口上，例如 `19789`

这样可以使救援机器人与主机器人隔离，便于在主机器人宕机时进行调试或应用配置更改。请在基础端口之间至少保留 20 个端口，以免派生出的浏览器/canvas/CDP 端口发生冲突。

## 救援机器人快速开始

除非你有充分理由采用其他方式，否则请将此作为默认路径：

```bash
# 救援机器人（独立的 Telegram 机器人、独立的配置文件、端口 19789）
openclaw --profile rescue onboard
openclaw --profile rescue gateway install --port 19789
```

如果你的主机器人已经在运行，那通常这就是你所需要的全部内容。

在执行 `openclaw --profile rescue onboard` 期间：

- 使用独立的 Telegram 机器人 token
- 保持 `rescue` 配置文件
- 使用至少比主机器人高 20 的基础端口
- 除非你已经自己在管理一个工作区，否则接受默认的救援工作区

如果 onboarding 已经为你安装了救援服务，那么最后的
`gateway install` 就不需要了。

## 为什么这样可行

救援机器人保持独立，因为它拥有自己的：

- 配置文件/配置
- 状态目录
- 工作区
- 基础端口（以及派生端口）
- Telegram 机器人 token

对于大多数部署，请为救援配置文件使用一个完全独立的 Telegram 机器人：

- 更容易仅供操作员使用
- 独立的机器人 token 和身份
- 与主机器人的频道/app 安装相互独立
- 当主机器人故障时，可通过简单的 DM 恢复路径进行处理

## `--profile rescue onboard` 会做什么

`openclaw --profile rescue onboard` 使用正常的 onboarding 流程，但它会将所有内容写入一个独立的配置文件中。

实际上，这意味着救援机器人会拥有自己的：

- 配置文件
- 状态目录
- 工作区（默认位于 `~/.openclaw/workspace-rescue`）
- 托管服务名称

除此之外，提示内容与正常 onboarding 相同。

## 通用多 gateway 配置

上面的救援机器人布局是最简单的默认方案，但同样的隔离模式适用于一台主机上的任意一对或一组 Gateways。

对于更通用的配置，请为每个额外的 Gateway 分配一个自己的命名配置文件和自己的基础端口：

```bash
# 主实例（默认配置文件）
openclaw setup
openclaw gateway --port 18789

# 额外的 gateway
openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

如果你希望两个 Gateways 都使用命名配置文件，这也可以：

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

当你想要一个备用操作通道时，请使用救援机器人快速开始方案。当你想要为不同的渠道、租户、工作区或操作角色运行多个长期存在的 Gateways 时，请使用通用的配置文件模式。

## 隔离检查清单

为每个 Gateway 实例保留以下内容唯一：

- `OPENCLAW_CONFIG_PATH` — 每个实例一个配置文件
- `OPENCLAW_STATE_DIR` — 每个实例的会话、凭据、缓存
- `agents.defaults.workspace` — 每个实例的工作区根目录
- `gateway.port`（或 `--port`）— 每个实例唯一
- 派生的浏览器/canvas/CDP 端口

如果这些被共享，你会遇到配置竞争和端口冲突。

## 端口映射（派生）

基础端口 = `gateway.port`（或 `OPENCLAW_GATEWAY_PORT` / `--port`）。

- 浏览器控制服务端口 = 基础端口 + 2（仅限回环）
- canvas 主机通过 Gateway 的 HTTP 服务器提供服务（与 `gateway.port` 相同的端口）
- 浏览器配置文件的 CDP 端口会自动从 `browser.controlPort + 9 .. + 108` 范围内分配

如果你在配置或环境变量中覆盖了这些值中的任何一个，就必须确保它们在每个实例中都是唯一的。

## 浏览器/CDP 注意事项（常见坑）

- 不要在多个实例上将 `browser.cdpUrl` 固定为相同的值。
- 每个实例都需要自己的浏览器控制端口和 CDP 范围（由其 gateway 端口派生）。
- 如果你需要显式指定 CDP 端口，请为每个实例设置 `browser.profiles.<name>.cdpPort`。
- 远程 Chrome：使用 `browser.profiles.<name>.cdpUrl`（每个配置文件、每个实例）。

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

解读：

- `gateway status --deep` helps catch stale launchd/systemd/schtasks services from older installs.
- `gateway probe` warning text such as `multiple reachable gateway identities detected` is expected only when you intentionally run more than one isolated gateway, or when OpenClaw cannot prove reachable probe targets are the same gateway. An SSH tunnel, proxy URL, or configured remote URL to the same gateway is one gateway with multiple transports, even when transport ports differ.

## 相关内容

- [Gateway runbook](/gateway)
- [Gateway lock](/gateway/gateway-lock)
- [Configuration](/gateway/configuration)
