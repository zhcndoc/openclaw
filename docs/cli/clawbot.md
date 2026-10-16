---
summary: "`openclaw clawbot` 的 CLI 参考（旧版别名命名空间）"
read_when:
  - "你维护使用 `openclaw clawbot ...` 的旧脚本"
  - "你需要迁移到当前命令的指导"
title: "爪机器人"
---

# `openclaw clawbot`

保留旧别名命名空间以实现向后兼容性。它注册与顶级 CLI 相同的 QR 命令，因此 `openclaw clawbot qr` 接受每个 [`openclaw qr`](/cli/qr) 标志。没有安排拆除；更喜欢新脚本中的顶级命令。

## <a id="migration"></a> 迁移

优先使用现代的顶层命令：

- `openclaw clawbot qr` -> `openclaw qr`

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
