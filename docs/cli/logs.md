---
summary: "`openclaw logs` 的命令行参考（通过 RPC 查看 Gateway 日志尾部）"
read_when:
  - 你需要远程查看 Gateway 日志尾部（无需 SSH）
  - 你希望获得用于工具处理的 JSON 格式日志行
title: "日志"
---

# `openclaw logs`

通过 RPC 查看 Gateway 文件日志尾部（适用于远程模式）。

相关内容：

- 日志概览：[Logging](/logging)

## 示例

```bash
openclaw logs
openclaw logs --follow
openclaw logs --json
openclaw logs --limit 500
openclaw logs --local-time
openclaw logs --follow --local-time
```

使用 `--local-time` 以你本地时区显示时间戳。
