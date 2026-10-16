---
summary: "从被拒绝的配置中恢复并读取网关检查警告"
title: "配置验证和检查"
sidebarTitle: "配置验证和检查"
read_when:
  - "网关拒绝了无效的配置，您需要恢复路径"
  - "您需要知道 `.rejected`、`.bak` 和最后已知的良好副本包含什么内容"
  - "网关检查警告出现在状态或医生输出中"
---

## <a id="gateway-rejected-invalid-config"></a> Gateway 拒绝了无效配置

当 Gateway 启动失败并提示 `Invalid config`，或者热重载日志显示它跳过了一次无效编辑时使用。

启动会自动迁移旧密钥以及符合条件的单文件配置中的已知替换项，并且仅在整个结果（包括插件）验证后才继续。它保留 `.bak` 环中的先前配置。使用 `$include` 的配置、Nix 管理的配置、由较新版本编写的配置以及仍然无法验证的配置需要操作员修复。请参阅 [ 旧版配置密钥迁移](/gateway/doctor#detailed-behavior-and-rationale)。

```bash
openclaw logs --follow
openclaw config file
openclaw config validate
openclaw doctor
```

查看以下内容：

- `Invalid config at ...`
- `config reload skipped (invalid config): ...`
- `Config write rejected: ...`
- 活动配置旁边带有时间戳的 `openclaw.json.rejected.*` 文件。
- 如果 `doctor --fix` 修复了损坏的直接编辑，则 A 带时间戳的 `openclaw.json.clobbered.*` 文件。
- 对于每个配置路径，OpenClaw 会保留最新的 32 个 `.clobbered.*` 文件，并轮转更旧的文件。

<AccordionGroup>
  <Accordion id="what-happened" title="发生了什么">
    - 该配置在启动、热重载或 OpenClaw- 写入期间未验证。
    - Gateway 启动使旧密钥保持不变，并拒绝需要修复的配置，并带有 `openclaw doctor --fix` 提示。
    - 热重载会跳过无效的外部编辑，并保持当前运行时配置生效。
    - OpenClaw- 拥有的写入在提交之前拒绝 invalid/destructive 有效负载并保存 `.rejected.*`。
    - `openclaw doctor --fix` 拥有旧密钥修复。它还可以删除非 JSON 前缀或恢复最后一次已知的良好副本，同时将被拒绝的有效负载保留为 `.clobbered.*`。
    - 当同一个配置路径发生多次修复时，OpenClaw 会轮转较旧的 `.clobbered.*` 文件，以便最新修复后的负载仍然可用。
    - 如果 OpenClaw 无法保存 `.clobbered.*` 副本，则会延迟恢复并发出警告，并且活动文件保持不变。解决快照锁定或存储问题后重试恢复。

  </Accordion>
  <Accordion id="inspect-and-repair" title="检查和修理">
    ```bash
    CONFIG="$(openclaw config file)"
    ls -lt "$CONFIG".clobbered.* "$CONFIG".rejected.* 2>/dev/null | head
    diff -u "$CONFIG" "$(ls -t "$CONFIG".clobbered.* 2>/dev/null | head -n 1)"
    openclaw config validate
    openclaw doctor
    ```
  </Accordion>
  <Accordion id="common-signatures" title="通用签名">
    - `.clobbered.*` 存在 → doctor 在修复活动配置时保留了一个损坏的外部编辑。
    - `.rejected.*` 存在 → OpenClaw- 拥有的配置写入失败的架构或提交前的破坏检查。
    - `Config write rejected:` → 该写入试图删除必需结构、显著缩小文件，或持久化无效配置。
    - `config reload skipped (invalid config):` → 一次直接编辑未通过验证，被正在运行的 Gateway 忽略。
    - `Invalid config at ...` → Gateway 服务启动前就已失败。
    - `missing-meta-vs-last-good`、`gateway-mode-missing-vs-last-good` 或 `size-drop-vs-last-good:*` → OpenClaw- 拥有的写入被拒绝，因为与上次已知的良好备份相比，它丢失了字段或大小。
    - `Config last-known-good promotion skipped` → 候选配置包含被脱敏的秘密占位符，例如 `***`。

  </Accordion>
  <Accordion id="fix-options" title="修复选项">
    当自动旧密钥迁移不够时，交互式启动可以运行 `openclaw doctor --fix` 并重试一次。非交互式启动会打印修复命令。

    1. 运行`openclaw doctor --fix`让医生修复prefixed/clobbered配置或恢复最后一次已知的良好状态。
    2. 只从 `.clobbered.*` 或 `.rejected.*` 中复制你想保留的键，然后使用 `openclaw config set` 或 `config.patch` 应用它们。
    3. 重启前先运行 `openclaw config validate`。
    4. 如果你手动编辑，请保留完整的 JSON5 配置，而不是只保留你想修改的部分对象。

  </Accordion>
</AccordionGroup>

相关：

- [配置](/cli/config)
- [配置：热重载](/gateway/configuration#config-hot-reload)
- [配置：严格验证](/gateway/configuration#strict-validation)
- [诊断工具](/gateway/doctor)

<a id="gateway-probe-warnings" />

## <a id="gateway-check-warnings"></a> 网关检查警告

当 `openclaw gateway probe` 已经探测到某些内容，但仍然打印警告块时使用。

```bash
openclaw gateway probe
openclaw gateway probe --json
openclaw gateway probe --ssh user@gateway-host
```

查看以下内容：

- JSON 输出中的 `warnings[].code` 和 `primaryTargetId`。
- 警告是否与 SSH 回退、多网关、缺失的 scope，或未解析的身份验证引用有关。

警告含义：

- `ssh_tunnel_failed` → SSH 设置失败，但该命令仍尝试直接 configured/loopback 目标。
- `multiple reachable gateway identities detected` → 不同的网关有响应，或者 OpenClaw 无法证明可达目标是同一个网关。SSH 隧道、代理 URL，或配置为指向同一个网关的远程 URL，会被视为一个具有多种传输方式的网关，即使传输端口不同也是如此。
- `probe_scope_limited` → 连接有效，但详细信息 RPC 范围有限；将设备身份与 `operator.read` 配对或使用凭据。
- `Gateway accepted the WebSocket connection, but follow-up read diagnostics failed` → 连接有效，但完整诊断 RPC 设置超时或失败。将此视为具有降级诊断功能的可访问网关；比较 `--json` 输出中的 `connect.ok` 和 `connect.rpcOk`。
- `Capability: pairing-pending` 或 `gateway closed (1008): pairing required` → 网关应答，但该客户端仍需要 pairing/approval 才能正常操作员接入。
- 未解析的 `gateway.auth.*` / `gateway.remote.*` SecretRef 警告文本 → 在此次命令路径中，失败目标的身份验证材料不可用。

相关：

- [网关](/cli/gateway)
- [同一主机上的多个网关](/gateway#multiple-gateways-same-host)
- [远程访问](/gateway/remote)
