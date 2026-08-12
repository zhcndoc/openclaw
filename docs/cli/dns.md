---
summary: "CLI 参考：`openclaw dns`（广域发现辅助工具）"
read_when:
  - 你想通过 Tailscale + CoreDNS 进行广域发现（DNS-SD）
  - 你正在为自定义发现域配置分离 DNS（例如：openclaw.internal）
title: "DNS"
---

# `openclaw dns`

用于广域发现的 DNS 辅助工具（Tailscale + CoreDNS）。目前仅支持 macOS + Homebrew CoreDNS。

相关：

- 网关发现：[Discovery](/gateway/discovery)
- 广域发现配置：[Configuration](/gateway/configuration)。

## `dns setup`

规划或应用 CoreDNS 设置，用于单播 DNS-SD 发现。

```bash
openclaw dns setup
openclaw dns setup --domain openclaw.internal
openclaw dns setup --apply
```

| 选项                | 作用                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------ |
| `--domain <domain>` | 广域发现域（例如 `openclaw.internal`）。                                                |
| `--apply`           | 安装／更新 CoreDNS 配置并（重新）启动服务。需要 sudo，仅限 macOS。                       |

如果不指定 `--domain`，OpenClaw 使用配置中的 `discovery.wideArea.domain`。设置该域后即可启用广域发现。

如果不指定 `--apply`，命令只会输出：

- 解析后的发现域和 zone 文件路径
- 当前的 tailnet IP
- 推荐的 `openclaw.json` 发现配置
- 需要在 Tailscale 管理控制台中设置的 Tailscale Split DNS nameserver/domain 值

使用 `--apply` 时（仅限 macOS，需要 Homebrew CoreDNS）：

- 如果缺失，则引导创建 zone 文件
- 如果缺失，则添加 CoreDNS import 代码段
- 重启 `coredns` brew 服务

## 相关

- [CLI 参考](/cli)
- [发现](/gateway/discovery)
