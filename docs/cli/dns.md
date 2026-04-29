---
summary: "CLI 参考：`openclaw dns`（广域发现辅助工具）"
read_when:
  - 当你想通过 Tailscale + CoreDNS 进行广域发现（DNS-SD）时
  - 当你正在为自定义发现域名（例如：openclaw.internal）设置分离 DNS 时
title: "DNS"
---

# `openclaw dns`

用于广域发现（Tailscale + CoreDNS）的 DNS 辅助工具。目前主要面向 macOS + Homebrew CoreDNS。

相关：

- 网关发现：[Discovery](/gateway/discovery)
- 广域发现配置：[Configuration](/gateway/configuration)

## 安装

```bash
openclaw dns setup
openclaw dns setup --domain openclaw.internal
openclaw dns setup --apply
```

## `dns setup`

为单播 DNS-SD 发现规划或应用 CoreDNS 设置。

选项：

- `--domain <domain>`：广域发现域名（例如 `openclaw.internal`）
- `--apply`：安装或更新 CoreDNS 配置并重启服务（需要 sudo；仅限 macOS）

显示内容：

- 解析后的发现域名
- 区域文件路径
- 当前 tailnet IP
- 推荐的 `openclaw.json` 发现配置
- 需要设置的 Tailscale Split DNS 名称服务器/域值

说明：

- 如果不使用 `--apply`，该命令仅作为规划辅助工具，并打印推荐设置。
- 如果省略 `--domain`，OpenClaw 会使用配置中的 `discovery.wideArea.domain`。
- `--apply` 目前仅支持 macOS，并且需要 Homebrew CoreDNS。
- `--apply` 会在需要时初始化区域文件，确保 CoreDNS import 语句存在，并重启 `coredns` brew 服务。

## 相关

- [CLI 参考](/cli)
- [Discovery](/gateway/discovery)
