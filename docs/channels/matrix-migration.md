---
summary: "OpenClaw 如何就地升级之前的 Matrix 插件，包括加密状态恢复限制和手动恢复步骤。"
read_when:
  - "升级现有的 Matrix 安装"
  - "迁移加密的 Matrix 历史记录和设备状态"
title: "Matrix 迁移"
---

从之前公开的 `matrix` 插件升级到当前实现。

对大多数用户来说，这是就地升级：

- 该插件仍然是 `@openclaw/matrix`
- 该频道仍然是 `matrix`
- 你的配置仍然位于 `channels.matrix` 下
- 缓存的凭据会迁移到共享的 `state/openclaw.sqlite` 插件状态中
- 运行时状态仍然位于 `~/.openclaw/matrix/`

你不需要重命名配置键，也不需要以新名称重新安装插件。 根 `openclaw` 包不再捆绑 Matrix 运行时代码或 Matrix SDK 依赖项。 如果 `openclaw channels status` 显示已配置 Matrix 但插件未安装，请运行 `openclaw doctor --fix` 或 `openclaw plugins install @openclaw/matrix`；不要将 Matrix SDK 包安装到根 OpenClaw 包中。

## <a id="what-the-migration-does-automatically"></a> 迁移会自动执行的内容

Matrix 迁移在您运行 [`openclaw doctor --fix`](/gateway/doctor) 时运行。支持的同步缓存 JSON 导入保留其客户端启动回退。凭证文件导入仅限 Doctor；运行时仅读取当前 SQLite 凭证状态。

Doctor 迁移包括：

- 在归档已退役的 `~/.openclaw/credentials/matrix/credentials*.json` 文件之前，对其进行导入和验证
- 保持相同的账户选择和 `channels.matrix` 配置
- 将支持的帐户范围的 `bot-storage.json` 同步缓存导入到 Matrix SQLite 状态并使用 `.migrated` 后缀归档迁移的文件
- 当访问令牌后续发生变化时，为同一 Matrix 账户、homeserver、用户和设备复用最完整的现有 token-hash 存储根目录

## <a id="retired-pre-july-state-files"></a> 7月前退役状态文件

当前版本支持 2026 年 7 月 1 日或之后写入的状态格式。Matrix 线程绑定、启动验证冷却、恢复密钥、加密快照、存储元数据和入站重复数据删除标记此时已使用 SQLite。 `thread-bindings.json`、`startup-verification.json`、`recovery-key.json`、`legacy-crypto-migration.json`、`crypto-idb-snapshot.json`、`storage-meta.json` 和 `inbound-dedupe.json` 的进口已停用。 Doctor 和受影响的运行时拒绝这些文件并保持它们不变。如果它们保留在活动的 Matrix 存储根中，请首先安装 OpenClaw `2026.9.5`，运行 `openclaw doctor --fix`，然后启动 Matrix 通道一次以完成导入。然后升级到最新版本。

## <a id="upgrading-from-openclaw-releases-older-than-2026.4"></a><a id="upgrading-from-openclaw-releases-older-than-2026-4"></a> 从早于 2026.4 的 OpenClaw 版本升级

截至 2026.6 版本系列的发布，还迁移了原始的扁平单存储 Matrix 布局（`~/.openclaw/matrix/bot-storage.json` 以及 `~/.openclaw/matrix/crypto/`），并为旧 rust crypto store 中的加密状态恢复做了准备。当前版本不再包含该迁移。

如果您要升级仍使用平面布局的安装，请首先升级到 2026.6 版本，运行 `openclaw doctor --fix`，然后启动网关一次，以便迁移平面存储和任何可恢复的房间密钥。接下来，通过 `2026.9.5` 升级，运行其 Doctor，并启动 Matrix 一次，将任何剩余的 JSON sidecar 转换为 SQLite，然后再安装最新版本。

之前的公共 Matrix 插件**不会**自动创建 Matrix 房间密钥备份。如果你的旧安装有仅本地保存、且从未备份过的加密历史，那么无论采用哪种迁移路径，一些较旧的加密消息在升级后仍可能无法读取。

## <a id="recommended-upgrade-flow"></a> 推荐的升级流程

1. 使用正常的[`openclaw update`流量](/install/updating)。它使用 OpenClaw 更新官方 npm Matrix 插件并重新启动托管网关。对于共享加密帐户状态的独立安装，请遵循 [ 加密存储升级预防措施](/channels/matrix/encryption#encryption-and-verification)，包括旧版本的最终保存限制。
2. 运行：

   ```bash
   openclaw doctor --fix
   ```

3. 如果更新程序没有重新启动网关，请启动或重新启动它。
4. 检查当前验证和备份状态：

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. 将你正在修复的 Matrix 账户的恢复密钥放入按账户区分的环境变量中。对于单个默认账户，`MATRIX_RECOVERY_KEY` 即可。对于多个账户，每个账户使用一个变量，例如 `MATRIX_RECOVERY_KEY_ASSISTANT`，并在命令中添加 `--account assistant`。

6. 如果 OpenClaw 提示需要恢复密钥，请为对应账户运行命令：

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify backup restore --recovery-key-stdin --account assistant
   ```

7. 如果该设备仍未验证，请为对应账户运行命令：

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify device --recovery-key-stdin --account assistant
   ```

   如果恢复密钥被接受且备份可用，但 `Cross-signing verified` 仍然是 `no`，请从另一款 Matrix 客户端完成自我验证：

   ```bash
   openclaw matrix verify self
   ```

   在另一款 Matrix 客户端中接受请求，对比 emoji 或数字， 只有在它们匹配时才输入 `yes`。该命令会等待完整的 Matrix 身份信任建立后再报告成功。

8. 如果你有意放弃无法恢复的旧历史记录，并希望为未来消息建立新的备份基线，请运行：

   ```bash
   openclaw matrix verify backup reset --yes
   ```

   仅当旧恢复密钥应当停止解锁新的备份时，才添加 `--rotate-recovery-key`。

9. 如果目前还没有服务器端密钥备份，请为将来的恢复创建一个：

   ```bash
   openclaw matrix verify bootstrap
   ```

## <a id="common-messages-and-what-they-mean"></a> 常见消息及其含义

`Failed migrating legacy Matrix client storage: ...`

- 含义：将基于文件的 sidecar 状态导入到 SQLite 时，Matrix 客户端回退失败。启动停止。已完成的 SQLite 导入和已存档的 sidecar 仍保留在原处；尚未归档的文件仍可重试。
- 该怎么做：检查文件系统权限或冲突，保留SQLite状态和来源或`.migrated`文件完好无损，修复错误后重试。

`Matrix is installed from a custom path: ...`

- 含义：Matrix 固定安装在某个自定义路径上，因此主线更新不会自动将其替换为默认的 Matrix 包。
- 该怎么做：如果你想恢复为默认 Matrix 插件，请使用 `openclaw plugins install @openclaw/matrix` 重新安装。

`Matrix is installed from a custom path that no longer exists: ...`

- 含义：你的插件安装记录指向了一个已经不存在的本地路径。
- 该怎么做：使用 `openclaw plugins install @openclaw/matrix` 重新安装；如果你是从仓库检出版本运行的，则使用 `openclaw plugins install ./path/to/local/matrix-plugin`。`openclaw doctor --fix` 也可以帮你移除过期的 Matrix 插件引用。

### <a id="manual-recovery-messages"></a> 手动恢复消息

`openclaw matrix verify status` 和 `openclaw matrix verify backup status` 在此设备上的房间密钥备份不健康时，会打印一行 `Backup issue:` 以及 `Next steps:` 指引：

| 备份问题                                                          | 含义                                            | 修复                                                                                                                                       |
| --------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `no room-key backup exists on the homeserver`                         | 没有可供恢复的内容                            | 使用 `openclaw matrix verify bootstrap` 创建房间密钥备份                                                                            |
| `backup decryption key is not loaded on this device`                  | 密钥存在，但此处未激活                  | `openclaw matrix verify backup restore`；如果仍无法加载密钥，请通过 `--recovery-key-stdin` 管道传入恢复密钥                |
| `backup decryption key could not be loaded from secret storage (...)` | secret storage 加载失败或不受支持       | 通过管道传入恢复密钥：`printf '%s\n' "$MATRIX_RECOVERY_KEY" \| openclaw matrix verify backup restore --recovery-key-stdin`               |
| `backup key mismatch (...)`                                           | 存储的密钥与当前服务器备份不匹配 | 使用当前服务器备份密钥重新运行 `verify backup restore --recovery-key-stdin`，或用 `verify backup reset --yes` 建立新的基线 |
| `backup signature chain is not trusted by this device`                | 此设备尚未信任跨签名链  | 先执行 `verify device --recovery-key-stdin`，如果信任仍不完整，再从另一台已验证客户端执行 `verify self`                        |
| `backup exists but is not active on this device`                      | 服务器备份存在，但本地会话未激活      | 先验证该设备，然后用 `openclaw matrix verify backup status` 重新检查                                                         |
| `backup trust state could not be fully determined`                    | 诊断结果不明确                      | `openclaw matrix verify status --verbose`                                                                                                 |

其他恢复错误：

`Matrix recovery key is required`

- 含义：你在需要恢复密钥时，却没有提供它就执行了恢复步骤。
- 该怎么做：使用 `--recovery-key-stdin` 重新运行该命令，例如 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`。

`Invalid Matrix recovery key: ...`

- 含义：提供的密钥无法解析，或者不符合预期格式。
- 该怎么做：使用你 Matrix 客户端或 recovery-key 导出的准确恢复密钥重试。

`Matrix recovery key was applied, but this device still lacks full Matrix identity trust.`

- 含义：恢复密钥已解锁可用的备份材料，但 Matrix 尚未为此设备建立完整的跨签名身份信任。检查命令输出中的 `Recovery key accepted`、`Backup usable`、`Cross-signing verified` 和 `Device verified by owner`。
- 该怎么做：运行 `openclaw matrix verify self`，在另一台 Matrix 客户端中接受请求，比较 SAS，并且仅在匹配时输入 `yes`。只有在你确实想替换当前跨签名身份时，才使用 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify bootstrap --recovery-key-stdin --force-reset-cross-signing`。

如果你接受丢失无法恢复的旧加密历史，也可以改为使用 `openclaw matrix verify backup reset --yes` 重置当前备份基线。当存储的备份 secret 已损坏时，该重置也会修复 secret storage，以便新的备份密钥在重启后能正确加载。

## <a id="if-encrypted-history-still-does-not-come-back"></a> 如果加密历史记录仍然没有恢复

请按顺序运行这些检查：

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin --verbose
```

如果备份成功恢复，但某些旧房间仍然缺少历史记录，那么这些缺失的密钥可能从未被之前的插件备份过。

## <a id="if-you-want-to-start-fresh-for-future-messages"></a> 如果你想为未来的消息重新开始

如果你接受丢失无法恢复的旧加密历史记录，并且只想从现在开始建立一个干净的备份基线，请按顺序运行这些命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

如果之后设备仍然未验证，请通过你的 Matrix 客户端完成验证，比较 SAS 表情符号或十进制代码，并确认它们匹配。

## <a id="related"></a> 相关内容

- [Matrix](/channels/matrix)：频道设置和配置。
- [Matrix push rules](/channels/matrix-push-rules)：通知路由。
- [Doctor](/gateway/doctor)：健康检查和自动迁移触发。
- [Migration guide](/install/migrating)：所有迁移路径（机器迁移、跨系统导入）。
- [Plugins](/tools/plugin)：插件安装和注册。
