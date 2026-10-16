---
summary: "只读 lint 结果、检查选择和升级后插件检查"
title: "Lint 和升级后模式"
read_when:
  - "您需要 CI 或部署预检的只读运行状况报告"
  - "您在构建或升级后正在链接医生"
---

医生的只读姿势会在不更改配置或状态的情况下产生结果。此页面涵盖 lint 输出、检查选择和升级后检查。

## <a id="lint-mode"></a> 语法检查模式

裸露的 `openclaw doctor --json` 是只读且非交互式的：无提示、修复或 config/state 重写。它发出与 lint 模式相同的默认结果，但在生成报告后退出 `0`，因此输出格式不会更改普通 Doctor 的咨询成功合同。读取有效负载的 `ok` 和 `findings` 字段以确定运行状况。

显式的 `openclaw doctor --lint` 是部署预检姿势。添加 `--json` 以获得机器可读的输出，而无需更改 lint 基于阈值的退出代码。此处报告的政策调查结果记录在 [`openclaw policy`](/cli/policy) 中。

设置助理的 `doctor` 操作在隔离进程中使用此只读 lint 状态。它报告结果而不应用修复或迁移。当您打算修复状态时，请在网关主机上单独运行 `openclaw doctor --fix`。

完整报告重用私有共享状态快照进行报告内的普通读取，从而保留实时数据库及其 WAL 文件。每份新报告都会读取新的快照。需要可写检查状态或独立数据库验证的检查保留自己的副本； `--only` 按需检查准备状态。

只读报告保留现有的 SQLite 数据库、WAL 和共享内存文件，包括其修改时间。较旧的共享状态模式会根据 `openclaw doctor --fix` 指导产生“迁移待定”结果；检查不会升级它。普通医生和显式修复保留其迁移行为。

Doctor 在删除检查快照之前停用私有数据库读取器和写入器。清理失败会保留已完成的发现和检查计数；更新程序运行报告失败的临时文件删除作为警告。如果数据库停用失败，Doctor 会报告错误并保留私有快照。

插件源捕获使用原始配置文件的临时存储（位于这些数据库快照之外）。它们的插件缓存所有者会保留它们直到插件检查完成，因此以后的通道设置检查可以安全地重用已接纳的本机文件。

```bash
openclaw doctor --json
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --all
openclaw doctor --lint --allow-exec
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --only core/doctor/local-audio-acceleration --severity-min info
openclaw doctor --lint --only memory-core/managed-local-embedding-setup --severity-min error --json
```

托管本地嵌入设置检查是现有语义索引的有范围的、非变异的预切换门。它是通过 `--only` 或 `--all` 选择加入的，因此简单的 `doctor --lint` 行为保持不变。它报告缺少 llama.cpp 设置和交互式 `models auth login` 修复，但未声明完全网关就绪、启动服务、下载模型或更改配置。

人类可读输出很简洁：

```text
doctor --lint: ran 6 check(s), 1 finding(s)
  [warning] core/doctor/gateway-config gateway.mode - gateway.mode is unset; gateway start will be blocked.
    fix: Run `openclaw configure` and set Gateway mode (local/remote), or `openclaw config set gateway.mode local`.
```

JSON 输出是脚本接口：

```json
{
  "schemaVersion": 1,
  "ok": false,
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": [
    {
      "checkId": "core/doctor/gateway-config",
      "severity": "warning",
      "message": "gateway.mode is unset; gateway start will be blocked.",
      "path": "gateway.mode",
      "fixHint": "Run `openclaw configure` and set Gateway mode (local/remote), or `openclaw config set gateway.mode local`."
    }
  ]
}
```

显式 lint 退出代码：

| 代码 | 含义                                                  |
| ---- | -------------------------------------------------------- |
| `0`  | 在所选严重级别阈值及以上没有发现问题。 |
| `1`  | 至少有一个发现满足所选阈值。       |
| `2`  | Command/runtime 在运行状况检查完成之前失败。   |

`--severity-min` 控制打印哪些结果和退出阈值：即使存在较低严重性的 `info`/`warning` 结果，`openclaw doctor --lint --severity-min error` 也不能打印任何内容并退出 `0`。

当更新程序运行 lint 时，低于其错误阈值的警告严重性结果将保留在单独的 JSON `warnings` 数组中。他们不会更改 lint 退出代码。更新程序在其运行历史记录中记录这些建议，包括有意的开放通道策略，因此它们在 `openclaw update status` 中仍然可用。普通独立 lint 保持选定的输出阈值。

如果呼叫者在检查开始之前取消状态租约获取，Doctor 会记录一条信息诊断信息，其中包含 `errorCode: OPENCLAW_STATE_LEASE_ABORTED`、经过的时间和呼叫者的信号作为其原因。低于所选阈值时，此诊断会出现在 JSON、`warnings` 和人工输出中，且不会失败 lint。这意味着没有进行检查。获取后取消和其他检查失败仍然是错误。

在更新期间，可选检查和策略建议都是警告，包括有意开放的 DM 策略。所需的配置、状态和启动检查仍然处于阻塞状态。保存的报告保留每项发现，并带有单独的有限原因；更新历史记录会保留严重性计数、判定错误以及达到其诊断界限时的显式遗漏计数。

安全结果在更新报告中保留其特定的检查标识符和补救措施。秘密迁移命令出现在长字段列表之前，因此有限诊断保留 `openclaw secrets configure` 和 `openclaw secrets apply` 后续步骤。

`PLAINTEXT_FOUND`、`REF_SHADOWED` 和 `LEGACY_RESIDUE` 是来自单独的 `openclaw secrets audit` 命令的结果。它们描述的是强化或保留的恢复材料，而不是数据库损坏。对于这些发现，独立 `secrets audit --check` 可以退出非零值；仅凭该结果并不能确定候选医生检查不合格。使用候选人记录的 lint 结果，而不是截断的 stderr 尾部，来识别更新失败。

已配置的 Codex 插件丢失或无法验证其公布的运行状况 API 会在 `core/doctor/codex-session-routes` 下生成可用性警告，并包含插件名称和修复命令。不导入不受信任的安装来检查其运行状况 API。更新程序的 `--severity-min error` 通行证会因这些警告而退出 `0`，使用与网关启动相同的警告策略。无效的配置、不安全的状态检查以及实际健康检查报告的错误都会保留其故障。缺少配置的 `plugins.load.paths` 会在 `core/doctor/final-config-validation` 下产生警告，并要求 `configured-plugin-path-unavailable` 和 `source` 中的不可用路径。权限、I/O 和其他检查失败改为使用 `configured-plugin-path-inspection-failed`，保留文件系统 `errorCode` 和错误消息，并为受影响的路径提供恢复提示。更新程序保留警告并继续。 Doctor 保留插件所有者无法检查的设置；请参阅 [ 插件修复警告](/install/update-troubleshooting#plugin-repair-warnings)。

裸 `openclaw doctor --json` 一旦发出结果有效负载，就会退出 `0`，包括当 `ok` 为 `false` 时。参数错误保持非零。如果 lint 运行程序在生成报告之前失败，Doctor 将退出 `2` 并发出一份经过编辑的 JSON 文档，其中包含 `ok: false`、`checksRun: 0` 以及 `core/doctor/lint-inspection` 下的错误发现。它为现有消费者保留了 `error: { type: "cli_error", message }` 字段。此就绪形状被已发布的更新程序（包括 2026.9.5）接受，而不将检查失败视为成功检查。

`--all` 控制在严重级别过滤之前选择哪些检查。默认的 lint 运行会排除那些更深入、更具历史性，或更可能暴露可修复旧残留的检查；使用 `--all` 可查看完整清单。`--only <id>` 是最精确的选择器，可以按 id 运行任何已注册的检查。

`core/doctor/session-snapshots` 将保留的遗留会话元数据中的过时路径报告为信息结果。即使在`--fix`下也能保留原始文件；活动会话使用当前 SQLite 状态和当前运行时技能目录。历史快照路径不需要清理或会话重置。

`core/doctor/local-audio-acceleration` 报告自动选择的本地 STT 命令、单独的 capable/requested/observed 后端证据和回退顺序，而无需加载语音模型。它会发出信息发现，因此请包含 `--severity-min info` 来显示它。

## <a id="check-selection"></a> 检查选择

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
```

`--only` 和 `--skip` 接受完整的检查 ID，并且可以重复。未注册的 `--only` id 会发出 `core/doctor/lint-selection` 错误发现；有效的选定检查仍在运行。在输出中使用 `checksRun`/`checksSkipped` 来确认重点门选择了您期望的检查。

要检查模型凭据，请运行 `openclaw doctor --lint --only core/doctor/auth-profiles --json`。此选择加入检查会检查共享凭据和每个配置的代理的本地身份验证存储，包括没有默认代理的队列。共享凭证问题报告一次；特工特定的冷却时间仍然归因于他们当地的商店。

`core/doctor/runtime-tool-schemas` 不会在只读 Doctor 报告中检查 OAuth- 支持的 MCP 服务器，包括分类和更新检查。即使本地状态写入转到一次性快照，检查也可以在外部服务器上轮换刷新令牌。医生以信息严重程度报告了此延迟；使用`--severity-min info`来显示它。对于 `mcp.servers` 中的服务器，针对服务配置运行 `openclaw mcp probe <name>`。从经过身份验证的服务代理轮次验证插件提供的服务器或代理本地身份验证配置文件，以便刷新的凭据与其所有者保持一致。非 OAuth MCP 架构检查仍在运行。

## <a id="post-upgrade-mode"></a> 升级后模式

`openclaw doctor --post-upgrade` 在构建或升级后运行插件兼容性检查以进行链接。结果将输出到标准输出；如果任何发现具有 `level: "error"`，则退出代码为 1。添加 `--json` 为机器可读信封（`{ probesRun, findings }`），适用于 CI、社区 `fork-upgrade` 技能以及其他升级后的烟雾工具。如果安装的插件索引丢失或格式错误，JSON 模式仍会发出带有 `plugin.index_unavailable` 错误发现的信封。

当已安装索引中启用的官方插件属于与升级后的 OpenClaw CLI 不同的版本组时，检查还会发出 `plugin.version_drift` 警告。按照报告的插件更新命令操作，然后重新启动网关。仅当注册表确认目标存在后，确切的 npm 引脚才会收到更新命令。独立版本的社区插件和禁用的插件被排除在外；版本漂移本身不会更改退出代码。

容器镜像启动是常规“更新后运行 doctor”流程的例外。当 `openclaw gateway run` 在新的 OpenClaw 版本上启动时，它会在报告就绪之前运行安全的状态和插件修复。如果修复无法安全完成，启动将退出，并提示你先使用 `openclaw doctor --fix` 针对相同挂载的 state/config 在同一镜像上运行一次，然后再正常重启容器。
