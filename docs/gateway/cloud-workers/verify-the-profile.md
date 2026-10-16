---
summary: "验证配置，确认配置文件已公布，并端到端证明新的云工作人员配置文件"
title: "验证云工作人员配置文件"
read_when: "您添加或更改了云工作线程配置文件，并希望在依赖它之前证明其有效。"
---

保存配置文件更改后运行的检查，以及只读就绪检查无法替代的端到端流程。

## <a id="verify-the-profile"></a> 验证个人资料

保存更改后，验证保存的配置和提供程序运行时：

```bash
openclaw config validate --json
openclaw plugins inspect crabbox --runtime --json
```

`cloudWorkers` 下的更改无需重新启动网关即可应用：默认的 `gateway.reload.mode: "hybrid"` 会监视配置并重新加载工作程序提供程序插件。对于 `gateway.reload.mode: "off"`，通过 Control UI 保存或其他网关配置写入会重新启动网关以应用它们，而直接文件编辑则等待手动 `openclaw gateway restart`。配置文件更改适用于新配置的工人；正在运行的工作人员保留其承认的配置设置（请参阅[hot reload](/gateway/configuration/hot-reload)）。

要对 Codex 使用相同的配置文件，请在网关上启用受信任的 Codex 插件安装，并将 `codex.exec-server.stdio.v1` 显式添加到 `gateway.nodes.commands.allow`。 Bootstrap 在云节点的隔离状态下自动包含并启用所需的插件。安装运行时不会授予执行权限：持久命令启用不会取代关键启动批准。 **允许一次** 覆盖一次执行服务器启动； **始终允许** 仅在确切位置、节点配对、环境所有者、命令批准范围和工作区保持最新状态时覆盖以后的启动。

应用更改后，证明该配置文件已发布，并将其与 Crabbox 的只读租赁库存进行比较：

```bash
openclaw gateway call environments.list --params '{}'
crabbox list --provider aws --json
```

`environments.list` 响应必须包含 `profiles` 下配置的 id。 `crabbox list` 是非变异的。相比之下，`crabbox warmup` 提供租约，而 `crabbox stop` 或 `crabbox release` 则撕毁租约；仅当您打算创建或销毁云资源时才使用这些变异命令。

默认情况下，协调器支持的 `crabbox list` 显示实时活动和配置租约。查找未确认清理的保留终端资源时添加`--retained`；它不是完整的历史租赁清单。为了进行清理，检查并停止准确记录的 ID。仅缺少列表并不能证明提供商已被删除。

检查 `crabbox --version` 是 0.77.0 或更新版本，并检查拥有的测试租约的有效到期日、空闲超时、最大值、运行时扩展能力以及任何策略通知。简单的心跳必须刷新空闲活动，而不承诺额外的总生命周期。长时间依赖源的捕获必须适合其有效窗口，否则会报告明显的跳过或准备失败；创建固定的提供商在分配时需要足够的 TTL。

在依赖新的配置文件之前，授权提供商支出和测试分配、设置、节点注册、所选运行时的轮换以及协调回网关的工作区编辑。针对同一租约测试取消和中断调度重放，然后停止会话并使用 Crabbox 的特定于提供商的清理合约验证拆卸。只读准备情况检查和模拟测试不能替代这种端到端验证。
