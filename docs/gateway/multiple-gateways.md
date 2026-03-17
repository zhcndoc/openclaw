---
summary: "在一台主机上运行多个 OpenClaw 网关（隔离、端口和配置文件）"
read_when:
  - 在同一台机器上运行多个网关
  - 需要为每个网关隔离配置、状态和端口
title: "多个网关"
---

# 多个网关（同一主机）

大多数情况下应使用一个网关，因为单个网关可以处理多个消息连接和代理。如果你需要更强的隔离或冗余（例如，一个救援机器人），请运行使用隔离配置文件和端口的独立网关。

## 隔离清单（必需）

- `OPENCLAW_CONFIG_PATH` — 每个实例的配置文件
- `OPENCLAW_STATE_DIR` — 每个实例的会话、凭据、缓存目录
- `agents.defaults.workspace` — 每个实例的工作区根目录
- `gateway.port`（或 `--port`）— 每个实例唯一
- 派生端口（浏览器/画布）不得重叠

如果以上资源被共享，将导致配置竞争和端口冲突。

## 推荐：配置文件（`--profile`）

配置文件会自动作用域 `OPENCLAW_STATE_DIR` + `OPENCLAW_CONFIG_PATH` 并为服务名称添加后缀。

```bash
# 主网关
openclaw --profile main setup
openclaw --profile main gateway --port 18789

# 救援网关
openclaw --profile rescue setup
openclaw --profile rescue gateway --port 19001
```

按配置文件安装服务：

```bash
openclaw --profile main gateway install
openclaw --profile rescue gateway install
```

## 救援机器人指南

在同一台主机上运行第二个网关，拥有独立的：

- 配置文件/配置
- 状态目录
- 工作区
- 基础端口（及其派生端口）

这可将救援机器人与主机器人隔离开来，从而在主机器人宕机时进行调试或应用配置更改。

端口间距：保持基础端口之间至少间隔 20 个端口，确保派生的浏览器/画布/CDP 端口不会冲突。

### 如何安装（救援机器人）

```bash
# 主机器人（已存在或新建，不使用 --profile 参数）
# 运行在端口 18789 + Chrome CDC/Canvas/...
openclaw onboard
openclaw gateway install

# 救援机器人（隔离配置文件 + 端口）
openclaw --profile rescue onboard
# 备注：
# - 工作区名称默认会加上 -rescue 后缀
# - 端口至少为18789 + 20个端口，
#   最好选择完全不同的基础端口，如 19789
# - 其余引导流程与正常相同

# 如果未在安装过程中自动安装服务，则手动安装
openclaw --profile rescue gateway install
```

## 端口映射（派生）

基础端口 = `gateway.port`（或 `OPENCLAW_GATEWAY_PORT` / `--port`）。

- 浏览器控制服务端口 = 基础端口 + 2（仅本地回环访问）
- 画布主机由网关 HTTP 服务器提供服务（与 `gateway.port` 相同端口）
- 浏览器配置文件的 CDP 端口自动分配范围为 `browser.controlPort + 9 .. +108`

如果你在配置或环境变量中覆盖了这些端口，必须确保每个实例的唯一性。

## 浏览器/CDP 注意事项（常见坑）

- 不要将 `browser.cdpUrl` 固定为多个实例相同的值。
- 每个实例需要自己独立的浏览器控制端口和 CDP 范围（基于其网关端口派生）。
- 若需要指定 CDP 端口，设置每个实例的 `browser.profiles.<name>.cdpPort`。
- 远程 Chrome：使用每个实例、每个配置文件的 `browser.profiles.<name>.cdpUrl`。

## 手动环境变量示例

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/main.json \
OPENCLAW_STATE_DIR=~/.openclaw-main \
openclaw gateway --port 18789

OPENCLAW_CONFIG_PATH=~/.openclaw/rescue.json \
OPENCLAW_STATE_DIR=~/.openclaw-rescue \
openclaw gateway --port 19001
```

## 快速检查

```bash
openclaw --profile main status
openclaw --profile rescue status
openclaw --profile rescue browser status
```
