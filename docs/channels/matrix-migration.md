---
summary: "OpenClaw 如何就地升级之前的 Matrix 插件，包括加密状态恢复限制和手动恢复步骤。"
read_when:
  - 升级现有的 Matrix 安装
  - 迁移加密的 Matrix 历史记录和设备状态
title: "Matrix 迁移"
---

从之前公开的 `matrix` 插件升级到当前实现。

对于大多数用户，升级是就地进行的：

- 插件保持为 `@openclaw/matrix`
- 通道保持为 `matrix`
- 你的配置保持在 `channels.matrix` 下
- 缓存的凭据保持在 `~/.openclaw/credentials/matrix/` 下
- 运行时状态保持在 `~/.openclaw/matrix/` 下

你不需要重命名配置键或以新名称重新安装插件。

## 迁移自动执行的操作

当网关启动时，以及当你运行 [`openclaw doctor --fix`](/gateway/doctor) 时，OpenClaw 会尝试自动修复旧的 Matrix 状态。
在任何可操作的 Matrix 迁移步骤改变磁盘状态之前，OpenClaw 会创建或重用一个聚焦的恢复快照。

当你使用 `openclaw update` 时，确切触发取决于 OpenClaw 的安装方式：

- 源码安装会在更新流程中运行 `openclaw doctor --fix`，然后默认重启网关
- 包管理器安装会更新包，运行非交互式的 doctor 检查，然后依赖默认的网关重启以便启动完成 Matrix 迁移
- 如果你使用 `openclaw update --no-restart`，启动后端的 Matrix 迁移将推迟到你稍后运行 `openclaw doctor --fix` 并重启网关时

自动迁移涵盖：

- 在 `~/Backups/openclaw-migrations/` 下创建或重用迁移前快照
- 重用你缓存的 Matrix 凭据
- 保持相同的账户选择和 `channels.matrix` 配置
- 将最旧的扁平 Matrix 同步存储移动到当前账户作用域位置
- 当目标账户可以安全解析时，将最旧的扁平 Matrix 加密存储移动到当前账户作用域位置
- 当该密钥本地存在时，从旧的 rust 加密存储中提取之前保存的 Matrix 房间密钥备份解密密钥
- 当访问令牌稍后更改时，重用同一 Matrix 账户、homeserver 和用户的最完整的现有令牌哈希存储根
- 当 Matrix 访问令牌更改但账户/设备身份保持不变时，扫描兄弟令牌哈希存储根以查找待处理的加密状态恢复元数据
- 在下次 Matrix 启动时将备份的房间密钥恢复到新的加密存储中

快照详情：

- OpenClaw 在成功快照后在 `~/.openclaw/matrix/migration-snapshot.json` 写入标记文件，以便后来的启动和修复通行证可以重用相同的归档。
- 这些自动 Matrix 迁移快照仅备份配置 + 状态（`includeWorkspace: false`）。
- 如果 Matrix 仅有警告级迁移状态，例如因为 `userId` 或 `accessToken` 仍然缺失，OpenClaw 尚不会创建快照，因为没有可操作的 Matrix 变更。
- 如果快照步骤失败，OpenClaw 会跳过该次运行的 Matrix 迁移，而不是在没有恢复点的情况下改变状态。

关于多账户升级：

- 最旧的扁平 Matrix 存储（`~/.openclaw/matrix/bot-storage.json` 和 `~/.openclaw/matrix/crypto/`）来自单存储布局，因此 OpenClaw 只能将其迁移到一个已解析的 Matrix 账户目标
- 已账户作用域的旧版 Matrix 存储会被检测并按配置的 Matrix 账户准备

## 迁移无法自动执行的操作

之前的公共 Matrix 插件**不**会自动创建 Matrix 房间密钥备份。它持久化本地加密状态并请求设备验证，但不保证你的房间密钥已备份到 homeserver。

这意味着某些加密安装只能部分迁移。

OpenClaw 无法自动恢复：

- 从未备份的仅本地房间密钥
- 当目标 Matrix 账户尚无法解析时的加密状态，因为 `homeserver`、`userId` 或 `accessToken` 仍不可用
- 当配置了多个 Matrix 账户但未设置 `channels.matrix.defaultAccount` 时，一个共享扁平 Matrix 存储的自动迁移
- 固定到仓库路径而不是标准 Matrix 包的自定义插件路径安装
- 当旧存储有备份密钥但未本地保留解密密钥时的缺失恢复密钥

当前警告范围：

- 自定义 Matrix 插件路径安装会通过网关启动和 `openclaw doctor` 显示

如果你的旧安装拥有从未备份的仅本地加密历史，升级后一些旧的加密消息可能仍然不可读。

## 推荐的升级流程

1. 正常更新 OpenClaw 和 Matrix 插件。
   首选 plain `openclaw update` 不带 `--no-restart`，以便启动可以立即完成 Matrix 迁移。
2. 运行：

   ```bash
   openclaw doctor --fix
   ```

   如果 Matrix 有可操作的迁移工作，doctor 将首先创建或重用迁移前快照并打印归档路径。

3. 启动或重启网关。
4. 检查当前验证和备份状态：

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. 如果 OpenClaw 告诉你需要恢复密钥，运行：

   ```bash
   openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"
   ```

6. 如果此设备仍未验证，运行：

   ```bash
   openclaw matrix verify device "<your-recovery-key>"
   ```

   如果恢复密钥被接受且备份可用，但 `Cross-signing verified`
   仍然是 `no`，请从另一个 Matrix 客户端完成自我验证：

   ```bash
   openclaw matrix verify self
   ```

   在另一个 Matrix 客户端中接受请求，比较表情符号或数字，
   只有在它们匹配时才输入 `yes`。该命令仅在
   `Cross-signing verified` 变为 `yes` 后才会成功退出。

7. 如果你有意放弃无法恢复的旧历史，并希望为未来消息建立一个新的备份基线，请运行：

   ```bash
   openclaw matrix verify backup reset --yes
   ```

8. 如果尚不存在服务器端密钥备份，为未来恢复创建一个：

   ```bash
   openclaw matrix verify bootstrap
   ```

## 加密迁移的工作原理

加密迁移是一个两阶段过程：

1. 启动或 `openclaw doctor --fix` 如果加密迁移可操作，则创建或重用迁移前快照。
2. 启动或 `openclaw doctor --fix` 通过活动的 Matrix 插件安装检查旧的 Matrix 加密存储。
3. 如果找到备份解密密钥，OpenClaw 将其写入新的恢复密钥流程并标记房间密钥恢复为待处理。
4. 在下次 Matrix 启动时，OpenClaw 自动将备份的房间密钥恢复到新的加密存储中。

如果旧存储报告从未备份过的房间密钥，OpenClaw 会警告而不是假装恢复成功。

## 常见消息及其含义

### 升级和检测消息

`Matrix plugin upgraded in place.`

- 含义：检测到旧的磁盘上 Matrix 状态并迁移到当前布局。
- 操作：除非同一输出还包含警告，否则无需操作。

`Matrix migration snapshot created before applying Matrix upgrades.`

- 含义：OpenClaw 在改变 Matrix 状态之前创建了恢复归档。
- 操作：保留打印的归档路径，直到你确认迁移成功。

`Matrix migration snapshot reused before applying Matrix upgrades.`

- 含义：OpenClaw 找到现有的 Matrix 迁移快照标记并重用该归档，而不是创建重复备份。
- 操作：保留打印的归档路径，直到你确认迁移成功。

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- 含义：存在旧的 Matrix 状态，但 OpenClaw 无法将其映射到当前 Matrix 账户，因为 Matrix 尚未配置。
- 操作：配置 `channels.matrix`，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含义：OpenClaw 找到了旧状态，但仍无法确定确切的当前账户/设备根。
- 操作：使用有效的 Matrix 登录启动网关一次，或在缓存凭据存在后重新运行 `openclaw doctor --fix`。

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含义：OpenClaw 找到了一个共享扁平 Matrix 存储，但拒绝猜测哪个命名的 Matrix 账户应该接收它。
- 操作：将 `channels.matrix.defaultAccount` 设置为预期账户，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix legacy sync store not migrated because the target already exists (...)`

- 含义：新的账户作用域位置已经有一个同步或加密存储，因此 OpenClaw 没有自动覆盖它。
- 操作：在手动删除或移动冲突目标之前，验证当前账户是否正确。

`Failed migrating Matrix legacy sync store (...)` or `Failed migrating Matrix legacy crypto store (...)`

- 含义：OpenClaw 尝试移动旧的 Matrix 状态但文件系统操作失败。
- 操作：检查文件系统权限和磁盘状态，然后重新运行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but channels.matrix is not configured yet.`

- 含义：OpenClaw 找到了旧的加密 Matrix 存储，但没有当前的 Matrix 配置可附加。
- 操作：配置 `channels.matrix`，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix encrypted state detected at ... but the account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- 含义：加密存储存在，但 OpenClaw 无法安全地决定它属于哪个当前账户/设备。
- 操作：使用有效的 Matrix 登录启动网关一次，或在缓存凭据可用后重新运行 `openclaw doctor --fix`。

`Legacy Matrix encrypted state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- 含义：OpenClaw 找到了一个共享扁平旧版加密存储，但拒绝猜测哪个命名的 Matrix 账户应该接收它。
- 操作：将 `channels.matrix.defaultAccount` 设置为预期账户，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- 含义：OpenClaw 检测到旧的 Matrix 状态，但迁移仍因缺少身份或凭据数据而被阻止。
- 操作：完成 Matrix 登录或配置设置，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Legacy Matrix encrypted state was detected, but the Matrix plugin helper is unavailable. Install or repair @openclaw/matrix so OpenClaw can inspect the old rust crypto store before upgrading.`

- 含义：OpenClaw 找到了旧的加密 Matrix 状态，但无法从通常检查该存储的 Matrix 插件加载帮助器入口点。
- 操作：重新安装或修复 Matrix 插件（`openclaw plugins install @openclaw/matrix`，或对于仓库检出使用 `openclaw plugins install ./path/to/local/matrix-plugin`），然后重新运行 `openclaw doctor --fix` 或重启网关。

`Matrix plugin helper path is unsafe: ... Reinstall @openclaw/matrix and try again.`

- 含义：OpenClaw 发现了一个转义插件根或失败插件边界检查的帮助器文件路径，因此拒绝导入它。
- 操作：从可信路径重新安装 Matrix 插件，然后重新运行 `openclaw doctor --fix` 或重启网关。

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- 含义：OpenClaw 拒绝改变 Matrix 状态，因为它无法首先创建恢复快照。
- 操作：解决备份错误，然后重新运行 `openclaw doctor --fix` 或重启网关。

`Failed migrating legacy Matrix client storage: ...`

- 含义：Matrix 客户端侧回退找到了旧的扁平存储，但移动失败。OpenClaw 现在中止该回退，而不是静默地使用新存储启动。
- 操作：检查文件系统权限或冲突，保持旧状态完好，并在修复错误后重试。

`Matrix is installed from a custom path: ...`

- 含义：Matrix 固定到路径安装，因此主线更新不会自动将其替换为仓库的标准 Matrix 包。
- 操作：当你想返回默认 Matrix 插件时使用 `openclaw plugins install @openclaw/matrix` 重新安装。

### 加密状态恢复消息

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- 含义：备份的房间密钥已成功恢复到新的加密存储中。
- 操作：通常无需操作。

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- 含义：一些旧房间密钥仅存在于旧的本地存储中，且从未上传到 Matrix 备份。
- 操作：除非你能从另一个已验证客户端手动恢复这些密钥，否则预计一些旧的加密历史将仍然不可用。

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key <key>" after upgrade if they have the recovery key.`

- 含义：备份存在，但 OpenClaw 无法自动恢复恢复密钥。
- 操作：运行 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"`。

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- 含义：OpenClaw 找到了旧的加密存储，但无法足够安全地检查它以准备恢复。
- 操作：重新运行 `openclaw doctor --fix`。如果重复出现，保持旧状态目录完好，并使用另一个已验证的 Matrix 客户端加上 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"` 进行恢复。

`Legacy Matrix backup key was found for account "...", but .../recovery-key.json already contains a different recovery key. Leaving the existing file unchanged.`

- 含义：OpenClaw 检测到备份密钥冲突并拒绝自动覆盖当前的恢复密钥文件。
- 操作：在重试任何恢复命令之前验证哪个恢复密钥是正确的。

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- 含义：这是旧存储格式的硬性限制。
- 操作：备份的密钥仍然可以恢复，但仅本地的加密历史可能仍然不可用。

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- 含义：新插件尝试恢复但 Matrix 返回了错误。
- 操作：运行 `openclaw matrix verify backup status`，然后在需要时使用 `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"` 重试。

### 手动恢复消息

`Backup key is not loaded on this device. Run 'openclaw matrix verify backup restore' to load it and restore old room keys.`

- 含义：OpenClaw 知道你应该有一个备份密钥，但它在此设备上未激活。
- 操作：运行 `openclaw matrix verify backup restore`，或在需要时传递 `--recovery-key`。

`Store a recovery key with 'openclaw matrix verify device <key>', then run 'openclaw matrix verify backup restore'.`

- 含义：此设备当前未存储恢复密钥。
- 操作：首先使用你的恢复密钥验证设备，然后恢复备份。

`Backup key mismatch on this device. Re-run 'openclaw matrix verify device <key>' with the matching recovery key.`

- 含义：存储的密钥与活动的 Matrix 备份不匹配。
- 操作：使用正确的密钥重新运行 `openclaw matrix verify device "<your-recovery-key>"`。

如果你接受放弃不可恢复的旧加密历史，你可以改为使用 `openclaw matrix verify backup reset --yes` 重置
当前备份基线。当存储的备份密钥已损坏时，该重置也可能重新创建密钥存储，
以便新的备份密钥在重启后可以正确加载。

`Backup trust chain is not verified on this device. Re-run 'openclaw matrix verify device <key>'.`

- 含义：备份存在，但此设备尚不足以信任交叉签名链。
- 操作：重新运行 `openclaw matrix verify device "<your-recovery-key>"`。

`Matrix recovery key is required`

- 含义：你在需要恢复密钥时尝试恢复步骤而未提供恢复密钥。
- 操作：使用你的恢复密钥重新运行命令。

`Invalid Matrix recovery key: ...`

- 含义：提供的密钥无法解析或不符合预期格式。
- 操作：使用来自你的 Matrix 客户端或恢复密钥文件的确切恢复密钥重试。

`Matrix recovery key was applied, but this device still lacks full Matrix identity trust.`

- 含义：OpenClaw 可以应用恢复密钥，但 Matrix 仍未为此设备建立完整的交叉签名身份信任。请检查命令输出中的 `Recovery key accepted`、`Backup usable`、`Cross-signing verified` 和 `Device verified by owner`。
- 操作：运行 `openclaw matrix verify self`，在另一个 Matrix 客户端中接受请求，比较 SAS，并且只有在匹配时才输入 `yes`。该命令会等待完整的 Matrix 身份信任后再报告成功。仅当你有意替换当前交叉签名身份时，才使用 `openclaw matrix verify bootstrap --recovery-key "<your-recovery-key>" --force-reset-cross-signing`。

`Matrix key backup is not active on this device after loading from secret storage.`

- 含义：秘密存储未在此设备上产生活动的备份会话。
- 操作：首先验证设备，然后使用 `openclaw matrix verify backup status` 重新检查。

`Matrix crypto backend cannot load backup keys from secret storage. Verify this device with 'openclaw matrix verify device <key>' first.`

- 含义：在完成设备验证之前，此设备无法从秘密存储恢复。
- 操作：首先运行 `openclaw matrix verify device "<your-recovery-key>"`。

### 自定义插件安装消息

`Matrix is installed from a custom path that no longer exists: ...`

- 含义：你的插件安装记录指向一个已消失的本地路径。
- 操作：使用 `openclaw plugins install @openclaw/matrix` 重新安装，或者如果你从仓库检出运行，使用 `openclaw plugins install ./path/to/local/matrix-plugin`。

## 如果加密历史记录仍然无法恢复

按顺序运行以下检查：

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
openclaw matrix verify backup restore --recovery-key "<your-recovery-key>" --verbose
```

如果备份成功恢复，但某些旧房间仍然缺少历史记录，那么这些缺失的密钥可能从未被之前的插件备份过。

## 如果您想为未来的消息重新开始

如果您接受丢失无法恢复的旧加密历史记录，并且只希望从现在开始建立一个干净的备份基线，请按顺序运行以下命令：

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

如果此后设备仍未验证，请在您的 Matrix 客户端中通过比较 SAS 表情符号或十进制代码来完成验证，并确认它们匹配。

## 相关

- [Matrix](/channels/matrix): 频道设置和配置。
- [Matrix push rules](/channels/matrix-push-rules): 通知路由。
- [Doctor](/gateway/doctor): 健康检查和自动迁移触发器。
- [Migration guide](/install/migrating): 所有迁移路径（机器迁移、跨系统导入）。
- [Plugins](/tools/plugin): 插件安装和注册。
