---
summary: "`openclaw clawbot` 的 CLI 参考（旧版别名命名空间）"
read_when:
  - 你维护使用 `openclaw clawbot ...` 的旧脚本
  - 你需要迁移到当前命令的指导
title: "Clawbot"
---

# `openclaw clawbot`

为向后兼容而保留的旧版别名命名空间。它注册了与顶级 CLI 相同的 QR 命令，因此 `openclaw clawbot qr` 接受所有 [`openclaw qr`](/cli/qr) 标志。

## 迁移

优先使用现代的顶层命令：

- `openclaw clawbot qr` -> `openclaw qr`

## 相关

- [CLI 参考](/cli)
