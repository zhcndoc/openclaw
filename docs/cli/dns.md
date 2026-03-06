---
summary: "`openclaw dns` 的 CLI 参考（广域发现助手）"
read_when:
  - 当你想通过 Tailscale + CoreDNS 进行广域发现 (DNS-SD)
  - 你正在为自定义发现域（例如：openclaw.internal）设置拆分 DNS
title: "dns"
---

# `openclaw dns`

用于广域发现（Tailscale + CoreDNS）的 DNS 助手。目前主要针对 macOS + Homebrew CoreDNS。

相关内容：

- 网关发现：[Discovery](/gateway/discovery)
- 广域发现配置：[Configuration](/gateway/configuration)

## 设置

```bash
openclaw dns setup
openclaw dns setup --apply
```
