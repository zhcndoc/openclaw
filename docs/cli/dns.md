---
summary: "CLI 参考：`openclaw dns`（广域发现辅助工具）"
read_when:
  - "您想要通过 Tailscale + CoreDNS 进行广域发现 （DNS-SD）"
  - You're setting up split DNS for a custom discovery domain (example: openclaw.internal)
title: "DNS"
---

# `openclaw dns`

DNS 用于广域发现的帮助程序 （Tailscale + CoreDNS）。 `openclaw dns setup` 在任何平台上打印其计划；将该计划与 `--apply` 一起应用需要 macOS 与 Homebrew CoreDNS。

相关：

- 网关发现：[Discovery](/gateway/discovery)
- 大范围发布行为：[Bonjour discovery](/gateway/bonjour)
- 广域发现配置：[`discovery.wideArea`](/gateway/config-runtime#wide-area-dns-sd)

## `dns setup`

规划或应用 CoreDNS 设置，用于单播 DNS-SD 发现。

```bash
openclaw dns setup
openclaw dns setup --domain openclaw.internal
openclaw dns setup --apply
```

| 选项              | 作用                                                                              |
| ------------------- | ----------------------------------------------------------------------------------- |
| `--domain <domain>` | 广域发现域（例如 `openclaw.internal`）。                       |
| `--apply`           | Install/update CoreDNS 配置并（重新）启动服务。仅需要 sudo、macOS。 |

如果不指定 `--domain`，OpenClaw 使用配置中的 `discovery.wideArea.domain`。设置该域后即可启用广域发现。

如果不指定 `--apply`，命令只会输出：

- 解析后的发现域和 zone 文件路径
- 当前尾网IP
- 推荐的 `openclaw.json` 发现配置
- Tailscale 拆分 DNS nameserver/domain 在 Tailscale 管理控制台中设置的值

使用 `--apply` 时（仅限 macOS，需要 Homebrew CoreDNS）：

- 如果缺失，则引导创建 zone 文件
- 如果缺失，则添加 CoreDNS import 代码段
- 重启 `coredns` brew 服务

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [发现](/gateway/discovery)
