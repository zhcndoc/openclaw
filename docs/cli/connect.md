---
summary: "使用一条粘贴的命令将机器连接到 OpenClaw Gateway"
read_when:
  - 将新的无头节点与 Gateway 配对
  - 使用加入 URL 或设置代码安装节点主机
title: "连接"
---

# `openclaw connect`

将当前机器作为无头节点连接到 OpenClaw Gateway。该命令会兑换一个短期有效的引导凭据，将 Gateway 端点保存到现有的节点主机状态中，并运行与 [`openclaw node run`](/cli/node) 相同的运行时。

## 创建加入命令

在 Gateway 主机上，使用管理员凭据生成一次性加入 URL：

```bash
openclaw devices join-code
```

该命令会输出 URL 和可粘贴的命令：

```bash
npx openclaw connect https://gateway.example/j/<shortcode>
```

该短代码具有 128 位熵，会在设置凭据约 10 分钟后过期，并且只能获取一次。如果代码已过期或已经使用，请生成另一个代码。

## 在前台连接

在要连接的机器上粘贴输出的命令：

```bash
npx openclaw connect https://gateway.example/j/<shortcode>
```

需要时，在注册期间设置设备名称：

```bash
npx openclaw connect https://gateway.example/j/<shortcode> --display-name "Build Node"
```

节点会一直在前台运行，直到你将其停止。

## 安装为服务

传递 `--service` 以兑换引导凭据，并将节点主机安装为平台用户服务：

```bash
npx openclaw connect https://gateway.example/j/<shortcode> --service
```

OpenClaw 会在安装服务前完成首次经过身份验证的连接。短期有效的引导令牌不会存储在服务命令或节点主机配置中；后续启动会使用持久的已配对设备令牌。使用 [`openclaw node status`](/cli/node#service-background) 检查已安装的服务。

## 接受的目标

`openclaw connect <target>` 接受：

- `https://<gateway>/j/<shortcode>` 加入 URL；
- `oc-pair://<setup-code>` URL；
- 裸 base64url 设置代码。

加入 URL 必须使用 HTTPS。仅当是回环 Gateway URL 时才接受普通 HTTP，例如 `http://127.0.0.1/j/<shortcode>`。直接设置代码可以携带 Gateway TLS 证书指纹，这使节点主机能够在解码负载后固定自签名 Gateway 证书。

负载决定保存的主机、端口、TLS 模式、WebSocket 上下文路径以及有序的备用端点。不会创建其他 `openclaw.json` 键。

## 撤销行为

加入代码和已配对设备具有独立的生命周期：

- 使用或使加入代码过期会阻止使用该代码进行另一次注册；
- 这不会断开或移除已经兑换该代码的节点；
- 要撤销已注册的机器，请使用 [`openclaw devices remove <deviceId>`](/cli/devices#openclaw-devices-remove-deviceid) 移除其已配对设备。

## 故障排除

如果加入 URL 报告缺失或已过期，请使用 `openclaw devices join-code` 生成新的 URL。已使用的代码会有意返回与未知代码相同的结果。

如果 HTTPS 加入 URL 使用的证书不受本地机器信任，请使用包含 TLS 固定信息的直接 `oc-pair://` 或裸设置代码形式。

请参阅 [Node](/cli/node)，了解服务管理、显式连接标志、节点状态和执行审批行为。
