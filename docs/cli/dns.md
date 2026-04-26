---
summary: "`openclaw dns` 的 CLI 参考（广域发现助手）"
read_when:
  - 你想通过 Tailscale + CoreDNS 进行广域发现（DNS-SD）
  - 你正在为自定义发现域（例如：openclaw.internal）设置拆分 DNS
title: "DNS"
---

# `openclaw dns`

用于广域发现（Tailscale + CoreDNS）的 DNS 助手。目前主要针对 macOS + Homebrew CoreDNS。

相关内容：

- 网关发现：[Discovery](/gateway/discovery)
- 广域发现配置：[Configuration](/gateway/configuration)

## 设置

```bash
openclaw dns setup
openclaw dns setup --domain openclaw.internal
openclaw dns setup --apply
```

## `dns setup`

规划或应用用于单播 DNS-SD 发现的 CoreDNS 设置。

选项：

- `--domain <domain>`：广域发现域（例如 `openclaw.internal`）
- `--apply`：安装或更新 CoreDNS 配置并重启服务（需要 sudo；仅限 macOS）

显示内容：

- 已解析的发现域
- 区域文件路径
- 当前 tailnet IP
- 推荐的 `openclaw.json` 发现配置
- 要设置的 Tailscale 拆分 DNS 名称服务器/域值

注意：

- 不使用 `--apply` 时，该命令仅作为规划辅助工具，并打印推荐的设置。
- 如果省略 `--domain`，OpenClaw 将使用配置中的 `discovery.wideArea.domain`。
- `--apply` 当前仅支持 macOS，并要求使用 Homebrew CoreDNS。
- `--apply` 会在需要时初始化区域文件，确保 CoreDNS 的 import 语句块存在，并重启 `coredns` brew 服务。

## 相关内容

- [CLI reference](/cli)
- [Discovery](/gateway/discovery)
