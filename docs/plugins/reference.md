---
summary: "OpenClaw 插件参考页面的生成索引"
read_when:
  - 你需要某个特定 OpenClaw 插件的参考页面
  - 你正在审计插件文档覆盖情况
title: "插件参考"
---

# 插件参考

此页面由 `extensions/*/package.json` 和
`openclaw.plugin.json` 生成。使用以下命令重新生成：

```bash
pnpm plugins:inventory:gen
```

使用 [插件清单](/plugins/plugin-inventory) 按分布、包和描述浏览全部 130
个生成的插件参考页面。
