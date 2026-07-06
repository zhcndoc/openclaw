---
summary: "OpenClaw 如何就地升级之前的 Matrix 插件，包括加密状态恢复限制和手动恢复步骤。"
read_when:
  - 升级现有的 Matrix 安装
  - 迁移加密的 Matrix 历史记录和设备状态
title: "Matrix 迁移"
---

从之前公开的 `matrix` 插件升级到当前实现。

对大多数用户来说，这是就地升级：

- 插件仍然是 `@openclaw/matrix`
- channel 仍然是 `matrix`
- 你的配置仍然位于 `channels.matrix`
- 缓存凭据仍然位于 `~/.openclaw/credentials/matrix/`
- 运行时状态仍然位于 `~/.openclaw/matrix/`

你不需要重命名配置键，也不需要以新名称重新安装插件。
根 `openclaw` 包不再捆绑 Matrix 运行时代码或 Matrix SDK 依赖项。
如果 `openclaw channels status` 显示已配置 Matrix 但插件未安装，请运行 `openclaw doctor --fix` 或
`openclaw plugins install @openclaw/matrix`；不要将 Matrix SDK 包安装到根 OpenClaw 包中。

## 迁移会自动执行的内容

Matrix migration runs when the gateway starts (through the loaded Matrix plugin), when you run [`openclaw doctor --fix`](/gateway/doctor), and as a fallback when the Matrix client starts and still finds old on-disk state. Before any actionable migration step mutates on-disk state, OpenClaw creates or reuses a focused recovery snapshot.

当你使用 `openclaw update` 时，具体触发方式取决于 OpenClaw 的安装方式：

- 源码安装会在更新流程中运行一次非交互式的 `openclaw doctor --fix`，然后默认重启 gateway
- 通过包管理器安装时会更新包，运行 `openclaw doctor --non-interactive --fix`，然后依赖默认的 gateway 重启，以便启动过程完成 Matrix 迁移
- 如果你使用 `openclaw update --no-restart`，则依赖启动的 Matrix 迁移会被延后，直到你之后运行 `openclaw doctor --fix` 并重启 gateway

自动迁移涵盖：

- 在 `~/Backups/openclaw-migrations/` 下创建或复用迁移前快照
- 复用你缓存的 Matrix 凭据
- 保持相同的账户选择和 `channels.matrix` 配置
- 当目标账户能够被安全解析时，将旧的扁平 Matrix 同步存储和加密存储迁移到当前按账户划分的位置
- 将基于文件的旁车状态（`bot-storage.json` 同步缓存、`recovery-key.json`、`legacy-crypto-migration.json`、IndexedDB 快照）导入到 Matrix SQLite 状态中；已迁移的文件会以 `.migrated` 后缀归档
- 当该密钥在本地存在时，从旧的 rust crypto store 中提取之前保存的 Matrix 房间密钥备份解密密钥
- 当访问令牌之后发生变化时，针对同一个 Matrix 账户、homeserver、用户和设备，复用最完整的现有 token-hash 存储根目录
- 在 Matrix 访问令牌已更改但账户/设备身份保持不变时，扫描同级 token-hash 存储根目录中待处理的加密状态恢复元数据
- 在下一次 Matrix 启动时，将已备份的房间密钥恢复到新的加密存储中

快照详情：

- OpenClaw 在成功创建快照后，会在 `~/.openclaw/matrix/migration-snapshot.json` 写入一个标记文件，以便后续启动和修复流程复用同一归档
- 这些自动 Matrix 迁移快照只备份配置和状态（`includeWorkspace: false`）
- 如果 Matrix 只有警告级别的迁移状态，例如因为 `userId` 或 `accessToken` 仍然缺失，OpenClaw 还不会创建快照，因为没有可执行的 Matrix 变更
- 如果快照步骤失败，OpenClaw 会在该次运行中跳过 Matrix 迁移，而不是在没有恢复点的情况下修改状态

关于多账户升级：

- 扁平的 Matrix 存储（`~/.openclaw/matrix/bot-storage.json` 和 `~/.openclaw/matrix/crypto/`）来自单存储布局，因此 OpenClaw 只能将其迁移到一个已解析的 Matrix 账户目标
- 已经按账户划分的旧版 Matrix 存储会根据配置的每个 Matrix 账户分别检测并准备

## 迁移无法自动完成的内容

之前公开的 Matrix 插件并**不会**自动创建 Matrix 房间密钥备份。它会保留本地加密状态并请求设备验证，但并不能保证你的房间密钥已经备份到 homeserver。

这意味着某些加密安装只能部分迁移。

OpenClaw 不能自动恢复：

- 从未备份过的仅本地房间密钥
- 当目标 Matrix 账户仍无法解析，因为 `homeserver`、`userId` 或 `accessToken` 仍不可用时的加密状态
- 当旧的 crypto store 没有记录该账户的设备 ID 时的加密状态
- 当配置了多个 Matrix 账户但未设置 `channels.matrix.defaultAccount` 时，单个共享平面 Matrix 存储的自动迁移
- 绑定到仓库路径而非标准 Matrix 包的自定义插件路径安装（由 `openclaw doctor` 暴露）
- 当旧存储中有已备份的密钥但未在本地保留解密密钥时，缺失的恢复密钥

如果你的旧安装包含从未备份的仅本地加密历史记录，那么升级后某些较旧的加密消息可能仍然无法读取。

## 推荐的升级流程

1. 正常更新 OpenClaw 和 Matrix 插件。
   建议直接使用不带 `--no-restart` 的 `openclaw update`，这样启动阶段就能立即完成 Matrix 迁移。
2. 运行：

   ```bash
   openclaw doctor --fix
   ```

   如果 Matrix 有可执行的迁移工作，doctor 会先创建或复用迁移前快照，并打印归档路径。

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

## 加密迁移的工作方式

加密迁移是一个两阶段流程：

1. 启动时或 `openclaw doctor --fix` 会在加密迁移可执行时创建或重用预迁移快照，然后通过 Matrix 插件内置的加密检查器检查旧的 Matrix Rust 加密存储。
2. 如果找到了备份解密密钥，OpenClaw 会将其导入 Matrix SQLite 状态，并将房间密钥恢复标记为待处理。
3. 在下一次 Matrix 启动时，OpenClaw 会自动将已备份的房间密钥恢复到新的加密存储中。如果访问令牌在此期间发生了轮换，也会从同级的 token-hash 存储根中获取待处理的恢复状态。

如果旧存储报告了一些从未备份过的房间密钥，OpenClaw 会发出警告，而不是假装恢复成功。

## 常见消息及其含义

### 升级和检测消息

`Matrix plugin upgraded in place.` (doctor) or `matrix: plugin upgraded in place for account "..."` (startup)

- 含义：检测到旧的磁盘 Matrix 状态，并已迁移到当前布局。
- 该怎么做：无需操作，除非同一输出中也包含警告。

`Matrix migration snapshot created before applying Matrix upgrades.` / `Matrix migration snapshot reused before applying Matrix upgrades.`

- 含义：doctor 在修改 Matrix 状态之前创建了一个恢复归档，或者找到了现有的快照标记，并复用了该归档，而不是创建重复备份。启动日志中的对应内容为 `matrix: created pre-migration backup snapshot: ...` / `matrix: reusing existing pre-migration backup snapshot: ...`。
- 该怎么做：在确认迁移成功之前，请保留打印出的归档路径。

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- 含义：存在旧的 Matrix 状态，但 OpenClaw 还无法将其映射到当前 Matrix 账户，因为尚未配置 Matrix。
- 该怎么做：配置 `channels.matrix`，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含义：OpenClaw 找到了旧状态，但仍无法确定准确的当前账户/设备根目录。
- 该怎么做：先用可工作的 Matrix 登录启动一次网关，或者在缓存凭据存在后重新运行 `openclaw doctor --fix`。

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含义：OpenClaw 找到一个共享的平面 Matrix 存储，但它不会猜测应将其分配给哪个命名的 Matrix 账户。
- 该怎么做：将 `channels.matrix.defaultAccount` 设为目标账户，然后重新运行 `openclaw doctor --fix` 或重启网关。

当被阻塞的是旧的加密 crypto 存储时，以上三条警告也会以前缀 `Legacy Matrix encrypted state detected at ...` 出现。

`Matrix legacy sync store not migrated because the target already exists (...)` / `Matrix legacy crypto store not migrated because the target already exists (...)`

- 含义：新的按账户分隔位置已经有同步或加密存储，因此 OpenClaw 没有自动覆盖它。
- 该怎么做：在手动删除或移动冲突目标之前，先确认当前账户是否正确。

`Failed migrating Matrix legacy sync store (...)` 或 `Failed migrating Matrix legacy crypto store (...)`

- 含义：OpenClaw 尝试移动旧的 Matrix 状态，但文件系统操作失败了。
- 该怎么做：检查文件系统权限和磁盘状态，然后重新运行 `openclaw doctor --fix`。

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- 含义：OpenClaw 检测到旧的 Matrix 状态，但迁移仍因缺少身份或凭据数据而被阻止。启动时会记录为 `matrix: migration remains in a warning-only state; no pre-migration snapshot was needed yet`。
- 该怎么做：完成 Matrix 登录或配置设置，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix encrypted state was detected, but the Matrix crypto inspector is unavailable.`

- 含义：OpenClaw 找到了旧的加密 Matrix 状态，但 Matrix 插件构建缺少用于检查旧 rust crypto store 的 crypto inspector 模块。
- 该怎么做：重新安装或修复 Matrix 插件（`openclaw plugins install @openclaw/matrix`，或者如果是仓库检出版本则使用 `openclaw plugins install ./path/to/local/matrix-plugin`），然后重新运行 `openclaw doctor --fix` 或重启网关。

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- 含义：OpenClaw 因无法先创建恢复快照而拒绝修改 Matrix 状态。
- 该怎么做：解决备份错误，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Failed migrating legacy Matrix client storage: ...`

- 含义：Matrix 客户端侧回退发现了旧存储，但迁移失败了。OpenClaw 会回滚已完成的移动，并中止该回退，而不是静默地以全新的存储启动。如果当前启动的账户与 flat store 目标不一致，也会出现此错误。
- 该怎么做：检查文件系统权限或冲突，保留旧状态不变，并在修复错误后重试。

`Matrix is installed from a custom path: ...`

- 含义：Matrix 固定安装在某个路径上，因此主线更新不会自动将其替换为默认的 Matrix 包。
- 该怎么做：如果你想恢复为默认 Matrix 插件，请使用 `openclaw plugins install @openclaw/matrix` 重新安装。

### 加密状态恢复消息

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- 含义：已成功将备份的房间密钥恢复到新的 crypto store 中。
- 该怎么做：通常无需操作。

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- 含义：某些旧房间密钥只存在于旧的本地存储中，从未上传到 Matrix 备份中。在准备过程中，同样的限制会显示为 `Legacy Matrix encrypted state for account "..." contains N room key(s) that were never backed up.`。
- 该怎么做：除非你能从另一台已验证的客户端手动恢复这些密钥，否则部分旧的加密历史将仍然不可用。

`Legacy Matrix encrypted state detected at ... but no device ID was found for account "..."`

- 含义：旧的 crypto store 没有记录它属于哪个 Matrix 设备，因此 OpenClaw 无法安全检查它。
- 该怎么做：旧的加密历史无法自动恢复；OpenClaw 会在不恢复它的情况下继续。

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key <key>" after upgrade if they have the recovery key.`

- 含义：备份存在，但 OpenClaw 无法自动恢复恢复密钥。
- 该怎么做：运行 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`（优先于把密钥作为参数传入）。

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- 含义：OpenClaw 找到了旧的加密存储，但无法安全地检查它以准备恢复。
- 该怎么做：重新运行 `openclaw doctor --fix`。如果问题反复出现，请保持旧的状态目录完整，并使用另一台已验证的 Matrix 客户端，再配合 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin` 进行恢复。

`Legacy Matrix backup key was found for account "...", but Matrix SQLite state already contains a different recovery key. Leaving the existing state unchanged.`

- 含义：OpenClaw 检测到备份密钥冲突，并拒绝自动覆盖当前的 recovery-key 状态。
- 该怎么做：在重试任何恢复命令之前，先确认哪个恢复密钥才是正确的。

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- 含义：这是旧存储格式的硬性限制。
- 该怎么做：仍然可以恢复已备份的密钥，但仅本地保存的加密历史记录可能仍不可用。

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- 含义：新插件尝试恢复，但 Matrix 返回了错误。
- 该怎么做：运行 `openclaw matrix verify backup status`，然后按需重试 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`。

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

### 自定义插件安装消息

`Matrix is installed from a custom path that no longer exists: ...`

- 含义：你的插件安装记录指向了一个已经不存在的本地路径。
- 该怎么做：重新安装 `openclaw plugins install @openclaw/matrix`；如果你是从仓库检出版本运行的，则使用 `openclaw plugins install ./path/to/local/matrix-plugin`。`openclaw doctor --fix` 也可以帮你移除过期的 Matrix 插件引用。

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
