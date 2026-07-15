---
doc-schema-version: 1
summary: "将多个租户信任域作为每个租户一个隔离的 OpenClaw Gateway cell 来托管"
read_when:
  - 当你为多个用户或组织托管 OpenClaw 时
  - 当你需要为租户工作负载选择一个隔离边界时
title: "多租户托管"
---

# 多租户托管

OpenClaw 的默认安全模型是：每个 Gateway 对应一个受信任的操作员边界，而不是在一个共享 Gateway 内实现对抗性的多租户隔离。因此，托管那些不共享信任边界的用户或组织，意味着为每个租户运行一个独立、完整的 OpenClaw 实例。

`openclaw fleet` 将每个隔离实例称为一个 **cell**。一个 cell 是运行在加固容器中的完整 Gateway，拥有自己的状态、凭据、工作区、频道账户、令牌以及仅限回环的主机端口。

Fleet 是 **实验性** 的：其命令、标志和容器配置文件可能会在不同版本之间发生变化，且不会提供弃用过渡期。

Fleet 已在 Linux 和 macOS 主机上测试。Windows 主机目前尚未测试。

## 为什么每个租户都需要一个 cell

在一个 Gateway 内部经过身份验证的操作员拥有受信任的控制平面角色。Session ID 只用于选择路由；它们不能授权一个租户访问另一个租户。Agent 沙箱可以降低不受信任内容和工具执行带来的影响，但它不会把一个共享 Gateway 变成租户级别的授权边界。

为每个租户使用一个 cell，这样每个信任域都有独立的 Gateway 进程、容器、持久状态树和 Gateway 凭证。这符合 [Gateway 安全模型](/gateway/security)：不要在一个 OpenClaw 进程或一个 OS 用户中并置彼此不受信任的用户。

## 架构

Fleet CLI 是一个宿主机侧的生命周期监督器。它将 cell 记录到 OpenClaw 状态数据库中，并请求本地 Docker 或 Podman 运行时创建、检查、启动、停止、替换和移除这些容器。由于 Fleet 的绑定路径和回环 URL 只属于本地主机，因此不支持远程运行时端点。Fleet 不代理租户消息，也不会在 cell 之间添加共享的应用层数据路径。

每个 cell 都在各自用户定义的 bridge 网络上运行官方的 `ghcr.io/openclaw/openclaw` 镜像。独立的 bridge 可防止 cell 之间直接进行容器 IP 级别的流量通信，同时仍保留面向提供者和通道的出站 NAT 访问。默认情况下，出站流量不受限制。Podman cell 可以使用 `--network internal` 来阻止出站流量，同时保留已发布的回环 Gateway 端口。Docker 的 internal 网络会破坏该已发布端口，因此 Fleet 会拒绝这种组合；请改为使用宿主机防火墙规则（例如 `DOCKER-USER` 链）来强制执行 Docker 的出站策略。cell Gateway 在容器内监听 `18789` 端口，而运行时仅将其发布到宿主机上的 `127.0.0.1:<allocated-port>`。当需要远程访问时，操作员可以在该回环端点前放置一个已批准的反向代理、SSH 隧道或 tailnet。

持久化的 Gateway 状态来自 `<state-dir>/fleet/cells/<tenant>/`，并挂载到 `/home/node/.openclaw`。Auth-profile 加密密钥来自单独的 `<state-dir>/fleet/auth-profile-secrets/<tenant>/` 宿主机路径，并挂载到 `/home/node/.config/openclaw`，与官方 [Docker 持久化布局](/install/docker#storage-and-persistence) 保持一致。该密钥不会嵌套在普通状态挂载之下。每个租户的 channel 账户都终止于拥有它们的 cell 内；Fleet 不提供共享的 channel 账户或入站消息路由器。

官方镜像默认使用非 root 的 `node` 用户，UID 为 1000。Fleet 使用与宿主机兼容的用户映射，以确保私有 bind mount 仍可写：Podman 使用 `keep-id`，rootful Docker 使用调用它的非 root 身份，而 rootless Docker 将容器 root 映射为无特权的守护进程用户。当宿主机 SELinux 处于活动状态时，Docker 和 Podman 会应用私有的 `:Z` 重标记。该容器配置避免使用特权宿主机特性，并且对 rootless 友好，但 rootless 运行是宿主机运行时的选择和前提，而不是 Fleet 自动启用的功能。

## 信任边界

多租户机制可保护各租户彼此之间的隔离。Fleet 运营方和宿主机对每个租户都是可信的。抵御宿主机被攻陷并不是目标。

这意味着宿主机管理员可以检查容器配置和环境，读取挂载的单元数据，替换镜像，或进入容器。通过 `--env` 传递的网关令牌和值，管理员可以通过 Docker 或 Podman 检查看到。请相应地使用宿主机控制、管理访问策略、监控、备份以及经过批准的密钥管理器。

该基线可防止意外的通配符网络暴露，并移除常见的容器提权原语，但它并不能让不可信的宿主机变得安全。

## 隔离阶梯

选择与你托管的租户相匹配的边界：

1. **加固的容器基线。** Fleet 会移除所有 Linux capabilities，启用 `no-new-privileges`，应用 PID、内存、CPU 以及可选的可写层磁盘限制，使用独立的持久化挂载和按 cell 划分的网络，并且只发布到主机回环地址。桥接网络不会限制出站流量；当某个 cell 不能发起外部连接时，请使用 Podman `--network internal` 或 Docker 主机防火墙策略。这是适用于信任运营者和主机的租户的默认配置文件。
2. **更强的容器或 VM 隔离。** 对于风险更高的工作负载，请将 Docker 或 Podman 配置为使用更强的 OCI 隔离运行时，例如 gVisor 或 Kata Containers，或者将 cell 放入 microVM 中。这属于运行时或基础设施配置；Fleet 的 `--runtime docker|podman` 选项选择的是容器 CLI，而不是 OCI 隔离后端。请参阅 Docker 的 [替代容器运行时](https://docs.docker.com/engine/daemon/alternative-runtimes/) 和 [Docker VM 运行时指南](/install/docker-vm-runtime)。
3. **为恶意租户使用独立机器。** 不要将恶意租户共置于同一个 OpenClaw 进程或 OS 用户下。当租户不信任同一个主机运营者，或需要更强的管理边界时，请使用彼此独立的 VM 或物理主机，并分别进行运行时管理。

这一阶梯中的任何一层都不会改变 OpenClaw 应用的信任模型：一个 Gateway 仍然是一个受信任的运营者域。

## 快速开始

创建一个单元。该命令会生成一次性的 Gateway 令牌，请立即保存：

```bash
openclaw fleet create acme
```

在 Fleet 主机上打开报告的 `http://127.0.0.1:<port>` URL，使用该租户的令牌进行身份验证，并在单元内配置提供商凭据和频道账户。

检查容器状态和 Gateway 存活情况：

```bash
openclaw fleet status acme
```

在保留主机端口、挂载数据、资源配置、用户提供的环境变量和 Gateway 令牌的同时进行升级：

```bash
openclaw fleet upgrade acme
```

移除容器和注册表记录，同时保留租户数据：

```bash
openclaw fleet rm acme --force
```

如果也要删除持久化的租户数据，请添加 `--purge-data`。清除操作需要 `--force`，且不可逆，并且会在删除任何内容之前执行已解析路径的包含性检查：

```bash
openclaw fleet rm acme --purge-data --force
```

有关所有命令和选项，请参阅 [`openclaw fleet` CLI 参考](/cli/fleet)。

## 当前范围

Fleet 不提供这些接口：

- 共享通道账户或共享入口路由器
- 用于单个租户的精简版宿主进程，而不是完整的 OpenClaw 实例
- 由一个监督器管理的远程 cell 宿主
- 租户自助服务门户、计费平面或委托管理界面

这些能力需要明确的身份、路由、授权以及故障域契约。不要通过在租户之间共享一个 Gateway 或其凭据来近似实现它们。Fleet 是一个单主机生命周期监督器；多机器、由身份治理的 fleet 需要单独的控制平面层。

## 相关内容

- [`openclaw fleet`](/cli/fleet)
- [网关安全](/gateway/security)
- [多个网关](/gateway/multiple-gateways)
- [Docker](/install/docker)
- [Podman](/install/podman)
