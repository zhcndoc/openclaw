---
summary: "OpenClaw 插件参考页面的生成索引"
read_when:
  - 你需要某个特定 OpenClaw 插件的参考页面
  - 你正在审计插件文档覆盖情况
title: "插件参考"
---

# 插件参考

此页面根据顶层 `extensions/*/openclaw.plugin.json`
清单生成。如果存在 `package.json`，软件包元数据会丰富条目。
使用以下命令重新生成：

```bash
pnpm plugins:inventory:gen
```

使用[插件清单](/plugins/plugin-inventory)可按分发方式、软件包和描述浏览全部 149
个生成的插件参考页面。
