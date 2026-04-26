---
summary: "在一台主机上运行多个 OpenClaw 网关（隔离、端口和配置文件）"
read_when:
  - 在同一台机器上运行一个以上的网关
  - 你需要每个网关拥有独立的配置/状态/端口
title: "多个网关"
---

对于大多数部署，应该使用一个网关，因为单个网关可以处理多个消息连接和代理。如果你需要更强的隔离或冗余（例如，救援机器人），请运行独立的网关，并为其使用隔离的配置文件/端口。

## 最佳推荐设置

对于大多数用户来说，最简单的救援机器人设置是：

- 将主机器人保留在默认配置文件上
- 让救援机器人使用 `--profile rescue`
- 为救援账户使用一个完全独立的 Telegram 机器人
- 将救援机器人放在不同的基础端口上，例如 `19789`

这样可以让救援机器人与主机器人完全隔离，便于在主机器人宕机时进行调试或应用配置更改。请确保基础端口之间至少间隔 20 个端口，以免派生的浏览器/canvas/CDP 端口发生冲突。

## 救援机器人快速开始

除非你有强烈理由采用其他方式，否则请将其作为默认路径：

```bash
# 救援机器人（独立的 Telegram 机器人、独立配置文件、端口 19789）
openclaw --profile rescue onboard
openclaw --profile rescue gateway install --port 19789
```

如果你的主机器人已经在运行，通常这就足够了。

在执行 `openclaw --profile rescue onboard` 期间：

- 使用独立的 Telegram 机器人 token
- 保持 `rescue` 配置文件
- 使用至少比主机器人高 20 的基础端口
- 除非你已经自己管理工作区，否则接受默认的救援工作区

如果 onboarding 已经为你安装了救援服务，则最后的
`gateway install` 就不需要了。

## 这是如何工作的

救援机器人之所以保持独立，是因为它拥有自己的：

- 配置文件/配置
- 状态目录
- 工作区
- 基础端口（以及派生端口）
- Telegram 机器人 token

对于大多数场景，救援配置文件应使用一个完全独立的 Telegram 机器人：

- 易于保持仅限操作员使用
- 独立的机器人 token 和身份
- 与主机器人的 channel/app 安装相互独立
- 当主机器人损坏时，提供简单的 DM 恢复路径

## `--profile rescue onboard` 会更改什么

`openclaw --profile rescue onboard` 使用正常的 onboarding 流程，但它会将所有内容写入一个独立的配置文件中。

实际上，这意味着救援机器人会拥有自己的：

- 配置文件
- 状态目录
- 工作区（默认 `~/.openclaw/workspace-rescue`）
- 托管服务名称

除此之外，提示内容与正常 onboarding 相同。

## 通用多网关设置

上面的救援机器人布局是最简单的默认方案，但同样的隔离模式也适用于一台主机上的任意一对或一组网关。

对于更通用的设置，请为每个额外的网关分配自己的命名配置文件和自己的基础端口：

```bash
# 主网关（默认配置文件）
openclaw setup
openclaw gateway --port 18789

# 额外网关
openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

如果你希望两个网关都使用命名配置文件，这也同样可行：

```bash
openclaw --profile main setup
openclaw --profile main gateway --port 18789

openclaw --profile ops setup
openclaw --profile ops gateway --port 19789
```

服务也遵循同样的模式：

```bash
openclaw gateway install
openclaw --profile ops gateway install --port 19789
```

当你需要一个备用操作通道时，请使用救援机器人快速开始方案。当你希望为不同的渠道、租户、工作区或运营角色运行多个长期网关时，请使用通用的配置文件模式。

## 隔离检查清单

确保每个网关实例都拥有唯一的：

- `OPENCLAW_CONFIG_PATH` — 每个实例独立的配置文件
- `OPENCLAW_STATE_DIR` — 每个实例独立的会话、凭据、缓存
- `agents.defaults.workspace` — 每个实例独立的工作区根目录
- `gateway.port`（或 `--port`）— 每个实例唯一
- 派生的浏览器/canvas/CDP 端口

如果以上资源被共享，将导致配置竞争和端口冲突。

## 端口映射（派生）

基础端口 = `gateway.port`（或 `OPENCLAW_GATEWAY_PORT` / `--port`）。

- 浏览器控制服务端口 = 基础端口 + 2（仅本地回环访问）
- 画布主机由网关 HTTP 服务器提供服务（与 `gateway.port` 相同端口）
- 浏览器配置文件的 CDP 端口自动分配范围为 `browser.controlPort + 9 .. +108`

如果你在配置或环境变量中覆盖了这些端口，必须确保每个实例都具有唯一性。

## 浏览器/CDP 注意事项（常见坑）

- 不要将 `browser.cdpUrl` 固定为多个实例相同的值。
- 每个实例都需要自己独立的浏览器控制端口和 CDP 范围（基于其网关端口派生）。
- 若需要指定 CDP 端口，请为每个实例设置 `browser.profiles.<name>.cdpPort`。
- 远程 Chrome：为每个实例、每个配置文件使用 `browser.profiles.<name>.cdpUrl`。

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

解释：

- `gateway status --deep` 有助于发现旧安装遗留的 launchd/systemd/schtasks 服务。
- `gateway probe` 的警告文本，例如 `multiple reachable gateways detected`，只有在你有意运行多个隔离网关时才是预期的。

## 相关内容

- [Gateway runbook](/gateway)
- [Gateway lock](/gateway/gateway-lock)
- [Configuration](/gateway/configuration)
