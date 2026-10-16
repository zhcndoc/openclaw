---
summary: "代码模式实现布局、验证检查表和 E2E 测试计划"
title: "代码模式维护者注释"
doc-schema-version: 1
read_when:
  - "您正在更改代码模式源并需要文件布局"
  - "您正在验证代码模式更改，然后再登陆它"
  - "您正在撰写或审阅代码模式 E2E 报道"
---

## <a id="implementation-layout"></a> 实现布局

- 配置契约：`tools.codeMode`
- 目录构建器：有效工具，用于压缩条目和 id 映射
- 模型表面适配器：用control/direct工具替换可见工具
- 执行合约：评估、继续、处置
- Node 执行器：工作线程和 VM 上下文在等待期间保留
- QuickJS 执行者：WASM 加载、评估、快照、恢复、处置
- 工作线程监管器：超时、终止、崩溃隔离
- bridge 适配器：JSON-safe 主机回调和结果传递
- 延续所有者：TTL、容量、run/session 范围、执行器固定
- 嵌套工具调用的轨迹投影
- 遥测计数器和诊断

共享目录和工具桥保留策略所有权。执行器拥有 JavaScript 执行和延续状态。 Node的`node:vm`是可信执行，不是沙箱安全边界。

重建 `before_tool_call` 挂钩必须按其原始顺序保留周围的执行包装器。调用者权限、取消、活动和运行生命周期检查包含准备和结果最终确定以及工具主体。执行包装器在复制工具元数据时注册其重建功能；仅模式副本保留该注册。

工具搜索将每个已发布的目录条目数组视为不可变的描述符快照。注册、限制和执行器重新绑定替换该数组；通过目录所有者发布架构或描述更改。每个快照都会延迟渲染搜索文本一次，而热搜索会重用内容寻址的词汇索引。每次搜索都会检查可见性，包括可变权限集，并且 BM25 统计数据仅使用该有效库存。缓存的词汇数据不包含工具执行器。

## <a id="validation-checklist"></a> 验证清单

代码模式覆盖应证明：

- 没有启用覆盖的禁用配置使现有工具暴露保持不变
- omited `enabled`，包括设置其他字段的对象配置，保持禁用状态，除非代理或模型覆盖启用它
- per-model `true`、`false` 和未设置值保留激活优先级、后备模型选择和封闭选项的限制
- 启用的配置在运行期间工具处于激活状态时，会向模型暴露 `exec`、`wait`，以及仅必需的 direct-only 工具
- omited执行者选择Node；显式 QuickJS 选择捆绑的插件，并且不可用的执行器会失败而不会回退
- 显式旧版 `runtime: "quickjs-wasi"` 迁移到 `executor: "quickjs"`
- 全局和每个代理执行器选择在每个 `wait` 中保持固定
- 原始无工具运行、`disableTools` 和空允许列表不会触发代码模式载荷强制
- 每个符合目录资格的有效非 MCP 名称都有一名可调用的获胜者
- direct-only 工具保持模型可见，并且不会出现在 `catalog` 中
- denied 工具没有全局或目录句柄
- 裸全局变量、可调用 `catalog.search` 结果、`catalog.all` 以及处理 OpenClaw 和客户端工具的 `describe()` 工作，而无需暴露确切的 ID
- `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")` 公开 TypeScript-style MCP 声明，无需 bridge/tool 调用
- MCP 命名空间 `$api()` 作为架构的内联回退仍然可用
- MCP 命名空间调用适用于具有一个对象输入的可见 MCP 工具，而搜索句柄使用相同的命名空间调度程序，并且 `catalog.all()` 保持本机
- Tool Search 控制工具对模型表面和隐藏目录都不可见
- 嵌套调用会保留审批和钩子行为
- 捕获和未捕获的嵌套故障仍然可以恢复，而不会重播之前执行的副作用
- 网络控制的故障保留不受信任的内容包装和清理
- shell `exec` 对模型隐藏，但在允许时可作为来宾全局调用
- 递归的代码模式 `exec` 和 `wait` 不能从 guest 代码中调用
- 可执行单元接受普通 JavaScript，而类型化发现仍然可用
- TypeScript-only 语法和已停用的 `language`/`typecheck` 参数在任何嵌套工具分派之前失败
- 预期的访客 API 省略了 `import`、`require`、文件系统、网络和环境访问； QuickJS 隔离与 Node 的编程约束分开进行测试
- 无限循环会超时，且不能阻塞 Gateway
- 执行器内存故障终止执行
- 输出上限适用于两个执行器；序列化快照上限适用于 QuickJS
- `wait` 恢复执行器继续并返回最终值
- 过期、已中止、错误会话和未知的 `runId` 值会失败
- 转录回放和持久化会保留代码模式控制调用
- 转录和遥测会清晰显示嵌套工具调用

## <a id="e2e-test-plan"></a> E2E 测试计划

更改运行时时对两个执行器运行这些：

1. 启动一个 `tools.codeMode.enabled: false` 的 Gateway。
2. 使用一个小型直接工具集发送一次 agent turn。
3. 断言模型可见的工具未发生变化。
4. 以 `tools.codeMode.enabled: true` 重启。
5. 使用 OpenClaw、plugin、MCP 和 client 测试工具发送一次 agent turn。
6. 断言模型可见的工具列表为 `exec`、`wait`，外加仅配置的 direct-only 工具。
7. 在`exec`中，调用安全裸全局变量并断言规范化名称、保留名称和冲突名称与快速索引匹配。
8. 搜索`catalog`，检查句柄metadata/`describe()`，并调用OpenClaw/plugin/client句柄而不观察确切的id。
9. 在 `exec` 中，调用 `API.list("mcp")` 和 `API.read("mcp/<server>.d.ts")`， 并断言声明文件描述了可见的 MCP 工具。
10. 在`exec`中，在本机和MCP工具中按任务意图搜索，检查MCP句柄的声明，并调用它。验证规范化名称冲突、精确的命名空间查找、有界远程元数据和不受信任的输出包装器。直接 `MCP.<server>.<tool>({ ...input })` 调用必须同意，并且 `catalog.all()` 搜索后必须保持本机。
11. 断言被拒绝的工具不存在，并且无法通过猜测 id 来调用。
12. 启动一个嵌套工具调用，该调用在 `exec` 返回 `waiting` 后才解析完成。
13. 调用 `wait` 并断言持续上下文接收工具结果。
14. 断言最终答案包含恢复后生成的输出，无需重播。
15. Assert 超时、中止和继续到期清理运行时状态。
16. 导出轨迹，并断言嵌套调用在父级代码模式调用下可见。

仅限文档的对此页面的更改仍应运行 `pnpm check:docs`。
