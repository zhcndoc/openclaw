---
summary: "诊断未发现、不合格或未执行的钩子"
read_when:
  - "`openclaw hooks list` 不显示您的钩子"
  - "挂钩报告不符合条件，您需要阻止原因"
  - "钩子已加载但其副作用从未出现"
title: "钩子故障排除"
---

诊断未发现、不合格或未执行的钩子。 [Hooks](/automation/hooks) 指南的一部分。

## <a id="troubleshooting"></a> 故障排查

### <a id="hook-not-discovered"></a> 未发现 Hook

检查报告的 `workspaceDir` 和 `managedHooksDir` 与 `openclaw hooks list --json`。确认您正在检查预期的主机、配置文件和代理。每个钩子需要 `HOOK.md` 和一个支持的处理程序文件；仅有元数据文件是不够的。收集地点检查直系儿童。显式额外路径或链接根本身可以是钩子或包。对于包，验证 `openclaw.hooks` 是否直接列出了预期的钩子目录：不遵循嵌套包和集合，并且拒绝的条目不会导致未列出的子项被扫描。

检查网关日志中的重复名称和遏制警告。工作区挂钩无法覆盖捆绑或托管挂钩。对于额外的目录和链接包，请验证 [Hook discovery](/automation/hooks/configuration#hook-discovery) 中描述的根布局。

### <a id="hook-not-eligible"></a> Hook 不符合条件

```bash
openclaw hooks info my-hook
openclaw hooks list --verbose
```

检查 `blockedReason`、网关的 `PATH`、环境、配置路径和 OS 上缺少的二进制文件。在明确启用之前，工作区挂钩将被禁用。没有声明事件的钩子是不可加载的。报告可以通过要求，而无需证明其模块导入成功。

### <a id="hook-not-executing"></a> Hook 未执行

检查 `hooks.internal.enabled`、配置名称选择以及挂钩的 `hookKey` 条目和 [ 重载模式 ](/gateway/configuration#reload-modes)。 `ready` 报告不会覆盖主交换机或名称选择，也不意味着已加载另一个座席的工作区。

```bash
openclaw logs --follow
```

查找 import/export 错误、边界故障、未知事件警告或 `Hook error [<type>:<action>]`。再次触发确切的事件并验证特定于钩子的标记或工件。普通聊天文字不会触发`command:new`； `/stop` 不发送钩子回复；元数据订阅不会发明自定义触发器。

如果出现标记但聊天回复未出现，请检查 [Reply Delivery](/automation/hooks/writing-hooks#reply-delivery) 下的生产者和路由，而不仅仅是启用。对于 `session-memory`，允许后台写入完成并检查已解析的代理工作区，而不是假设默认工作区。
