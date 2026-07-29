---
summary: "OpenClaw 如何就地升级之前的 Matrix 插件，包括加密状态恢复限制和手动恢复步骤。"
read_when:
  - 升级现有的 Matrix 安装
  - 迁移加密的 Matrix 历史记录和设备状态
title: "Matrix 迁移"
---

从之前公开的 `matrix` 插件升级到当前实现。

对大多数用户来说，这是就地升级：

- 该插件仍然是 `@openclaw/matrix`
- 该频道仍然是 `matrix`
- 你的配置仍然位于 `channels.matrix` 下
- 缓存的凭据会迁移到共享的 `state/openclaw.sqlite` 插件状态中
- 运行时状态仍然位于 `~/.openclaw/matrix/`

你不需要重命名配置键，也不需要以新名称重新安装插件。
根 `openclaw` 包不再捆绑 Matrix 运行时代码或 Matrix SDK 依赖项。
如果 `openclaw channels status` 显示已配置 Matrix 但插件未安装，请运行 `openclaw doctor --fix` 或
`openclaw plugins install @openclaw/matrix`；不要将 Matrix SDK 包安装到根 OpenClaw 包中。

## 迁移会自动执行的内容

当你运行 [`openclaw doctor --fix`](/gateway/doctor) 时，会执行 Matrix 迁移。专用 Matrix 存储旁边基于文件的 sidecar 仍保留其客户端启动回退，但凭据文件导入仅限 Doctor 执行；运行时只读取规范的 SQLite 凭据状态。

Doctor 迁移包括：

- 在归档已退役的 `~/.openclaw/credentials/matrix/credentials*.json` 文件之前，对其进行导入和验证
- 保持相同的账户选择和 `channels.matrix` 配置
- 将基于文件的 sidecar 状态（`bot-storage.json` 同步缓存、`recovery-key.json`、`legacy-crypto-migration.json`、IndexedDB 快照）导入到 Matrix SQLite 状态中；已迁移的文件会以 `.migrated` 后缀归档
- 当访问令牌后续发生变化时，为同一 Matrix 账户、homeserver、用户和设备复用最完整的现有 token-hash 存储根目录

## 从早于 2026.4 的 OpenClaw 版本升级

截至 2026.6 版本系列的发布，还迁移了原始的扁平单存储
Matrix 布局（`~/.openclaw/matrix/bot-storage.json` 以及
`~/.openclaw/matrix/crypto/`），并为旧 rust crypto store
中的加密状态恢复做了准备。当前版本不再包含该迁移。

如果你正在升级一个仍然使用扁平布局的安装，首先
升级到 2026.6 版本，运行 `openclaw doctor --fix`，并启动 gateway
一次，这样扁平存储和任何可恢复的房间密钥都会被迁移。然后再更新
到最新版本。

之前的公共 Matrix 插件**不会**自动创建 Matrix 房间密钥备份。如果你的旧安装有仅本地保存、且从未备份过的加密历史，那么无论采用哪种迁移路径，一些较旧的加密消息在升级后仍可能无法读取。

## 推荐的升级流程

1. 正常更新 OpenClaw 和 Matrix 插件。
2. 运行：

   ```bash
   openclaw doctor --fix
   ```

3. 启动或重启网关。
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

   如果恢复密钥被接受且备份可用，但 `Cross-signing verified`
   仍然是 `no`，请从另一款 Matrix 客户端完成自我验证：

   ```bash
   openclaw matrix verify self
   ```

   在另一款 Matrix 客户端中接受请求，对比 emoji 或数字，
   只有在它们匹配时才输入 `yes`。该命令会等待完整的 Matrix
   身份信任建立后再报告成功。

8. 如果你有意放弃无法恢复的旧历史记录，并希望为未来消息建立新的备份基线，请运行：

   ```bash
   openclaw matrix verify backup reset --yes
   ```

   仅当旧恢复密钥应当停止解锁新的备份时，才添加 `--rotate-recovery-key`。

9. 如果目前还没有服务器端密钥备份，请为将来的恢复创建一个：

   ```bash
   openclaw matrix verify bootstrap
   ```

## 常见消息及其含义

`Failed migrating legacy Matrix client storage: ...`

- 含义：Matrix 客户端侧回退机制找到了基于文件的 sidecar 状态，但导入到 SQLite 失败了。OpenClaw 会回滚已完成的迁移，并中止该回退，而不是静默地以一个全新的存储开始。
- 该怎么做：检查文件系统权限或冲突，保留旧状态完整不变，并在修复错误后重试。

`Matrix is installed from a custom path: ...`

- 含义：Matrix 固定安装在某个自定义路径上，因此主线更新不会自动将其替换为默认的 Matrix 包。
- 该怎么做：如果你想恢复为默认 Matrix 插件，请使用 `openclaw plugins install @openclaw/matrix` 重新安装。

`Matrix is installed from a custom path that no longer exists: ...`

- 含义：你的插件安装记录指向了一个已经不存在的本地路径。
- 该怎么做：使用 `openclaw plugins install @openclaw/matrix` 重新安装；如果你是从仓库检出版本运行的，则使用 `openclaw plugins install ./path/to/local/matrix-plugin`。`openclaw doctor --fix` 也可以帮你移除过期的 Matrix 插件引用。

### 手动恢复消息

`openclaw matrix verify status` 和 `openclaw matrix verify backup status` 在此设备上的房间密钥备份不健康时，会打印一行 `Backup issue:` 以及 `Next steps:` 指引：

| Backup issue                                                          | 含义                                               | 修复                                                                                                                                      |
| --------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `no room-key backup exists on the homeserver`                         | 没有可供恢复的内容                                   | 使用 `openclaw matrix verify bootstrap` 创建房间密钥备份                                                                                  |
| `backup decryption key is not loaded on this device`                  | 密钥存在，但此处未激活                               | `openclaw matrix verify backup restore`；如果仍无法加载密钥，请通过 `--recovery-key-stdin` 管道传入恢复密钥                            |
| `backup decryption key could not be loaded from secret storage (...)` | secret storage 加载失败或不受支持                     | 通过管道传入恢复密钥：`printf '%s\n' "$MATRIX_RECOVERY_KEY" \| openclaw matrix verify backup restore --recovery-key-stdin`               |
| `backup key mismatch (...)`                                           | 存储的密钥与当前服务器备份不匹配                     | 使用当前服务器备份密钥重新运行 `verify backup restore --recovery-key-stdin`，或用 `verify backup reset --yes` 建立新的基线            |
| `backup signature chain is not trusted by this device`                | 此设备尚未信任跨签名链                               | 先执行 `verify device --recovery-key-stdin`，如果信任仍不完整，再从另一台已验证客户端执行 `verify self`                                |
| `backup exists but is not active on this device`                      | 服务器备份存在，但本地会话未激活                     | 先验证该设备，然后用 `openclaw matrix verify backup status` 重新检查                                                                    |
| `backup trust state could not be fully determined`                    | 诊断结果不明确                                       | `openclaw matrix verify status --verbose`                                                                                                 |

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

## 如果加密历史记录仍然没有恢复

请按顺序运行这些检查：

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin --verbose
```

如果备份成功恢复，但某些旧房间仍然缺少历史记录，那么这些缺失的密钥可能从未被之前的插件备份过。

## 如果你想为未来的消息重新开始

如果你接受丢失无法恢复的旧加密历史记录，并且只想从现在开始建立一个干净的备份基线，请按顺序运行这些命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

如果之后设备仍然未验证，请通过你的 Matrix 客户端完成验证，比较 SAS 表情符号或十进制代码，并确认它们匹配。

## 相关内容

- [Matrix](/channels/matrix)：频道设置和配置。
- [Matrix push rules](/channels/matrix-push-rules)：通知路由。
- [Doctor](/gateway/doctor)：健康检查和自动迁移触发。
- [Migration guide](/install/migrating)：所有迁移路径（机器迁移、跨系统导入）。
- [Plugins](/tools/plugin)：插件安装和注册。
