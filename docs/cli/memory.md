---
summary: "`openclaw memory` 的命令行参考（状态/索引/搜索）"
read_when:
  - 你想要索引或搜索语义记忆
  - 你正在调试记忆可用性或索引相关问题
title: "memory"
---

# `openclaw memory`

管理语义记忆的索引和搜索功能。  
由当前激活的记忆插件提供（默认：`memory-core`；设置 `plugins.slots.memory = "none"` 可禁用）。

相关内容：

- 记忆概念：[Memory](/concepts/memory)
- 插件：[Plugins](/tools/plugin)

## 示例

```bash
openclaw memory status
openclaw memory status --deep
openclaw memory index --force
openclaw memory search "meeting notes"
openclaw memory search --query "deployment" --max-results 20
openclaw memory status --json
openclaw memory status --deep --index
openclaw memory status --deep --index --verbose
openclaw memory status --agent main
openclaw memory index --agent main --verbose
```

## 选项

`memory status` 和 `memory index`：

- `--agent <id>`：限定操作范围为单个代理。若未指定，则命令对所有已配置代理执行；如果没有已配置的代理列表，则回退到默认代理。
- `--verbose`：在探测和索引过程中输出详细日志。

`memory status`：

- `--deep`：探测向量和嵌入的可用性。
- `--index`：如果存储被标记为脏，则运行重新索引（隐含 `--deep`）。
- `--json`：打印 JSON 格式输出。

`memory index`：

- `--force`：强制进行完整重新索引。

`memory search`：

- 查询输入：可以传入位置参数 `[query]` 或 `--query <text>`。
- 如果两者都提供，以 `--query` 为准。
- 如果均未提供，命令会报错退出。
- `--agent <id>`：限定操作范围为单个代理（默认：默认代理）。
- `--max-results <n>`：限制返回结果数量。
- `--min-score <n>`：过滤低分匹配项。
- `--json`：打印 JSON 格式结果。

注意事项：

- `memory status --deep` 会探测向量及嵌入的可用性。
- `memory status --deep --index` 如果存储被标记为脏，则执行重新索引。
- `memory index --verbose` 会打印每个阶段的详细信息（提供者、模型、来源、批处理活动）。
- `memory status` 会包含通过 `memorySearch.extraPaths` 配置的额外路径。
- 如果有效的记忆远程 API 密钥字段被配置为 SecretRefs，命令会从当前激活的网关快照中解析这些值。如果网关不可用，命令会快速失败。
- 网关版本兼容提示：该命令路径需要支持 `secrets.resolve` 方法的网关；旧版网关会返回未知方法错误。
