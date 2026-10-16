---
summary: "E2EE 设置、设备验证、交叉签名和房间密钥备份"
read_when:
  - "配置 Matrix E2EE 和验证"
  - "恢复失去交叉签名信任的 Matrix 设备"
  - "从 Matrix 备份恢复房间密钥"
title: "Matrix 加密与验证"
sidebarTitle: "加密"
---

为 Matrix 帐户启用端到端加密，验证网关设备，并在加密状态漂移时修复加密状态。

## <a id="encryption-and-verification"></a> 加密与验证

在加密（E2EE）房间中，外发图片事件使用 `thumbnail_file`，因此图片预览会与完整附件一起加密；未加密房间则使用普通的 `thumbnail_url`。无需任何配置——插件会自动检测 E2EE 状态。

所有 `openclaw matrix` 命令都支持 `--verbose`（完整诊断信息）、`--json`（机器可读输出）以及 `--account <id>`（多账户场景）。默认输出较为简洁。

`verify status`、`verify bootstrap` 和 `verify device` 使用正在运行的本地网关的帐户和加密货币所有者。此页面上的其他命令需要首先通过其服务所有者停止本地网关，然后重新启动它。帐户准备和关闭可以保留加密数据，因此离线命令通过该清理保留独占所有权。不受支持的网关版本和失败的路由请求永远不会回退到本地写入。

对于托管安装，请使用正常的[`openclaw update`流动](/install/updating)。更新程序停止并重新启动托管网关并更新官方npm Matrix插件与OpenClaw。如果单独的网关或CLI安装共享帐户状态，停止其旧进程并升级这些安装，然后再恢复并发使用。较旧的进程不尊重加密存储所有者锁。

第一次升级仍然取决于安装的版本完成其最终保存。新版本无法恢复旧进程未能持久保存的密钥或追溯检测该故障。在该进程最后一次成功快照之后收到的密钥可能会丢失。

一旦升级版本拥有该帐户，最终保存失败或进程异常退出会使 OpenClaw 拒绝另一个加密货币所有者。干净关闭后，小型 `.owner.poisoned` 防护仍保留在磁盘上，并且必须与规范 SQLite 快照中的密封相匹配。印章是在最终加密快照和同步游标之后写入的；丢失最终出版物也会阻碍重用。仅守卫存在并不意味着该帐户被封锁。密封快照丢失或畸形的防护需要恢复。

运行`openclaw matrix doctor inspect`列出被封锁的账户商店； `openclaw doctor` 也报告了它们，但 `--fix` 从未清除此拒绝。保留状态目录的副本以供调查。一旦 **all** 网关和 CLI 进程停止，请检查规范的 SQLite 快照和任何备份。如果您认为上次成功快照后收到的密钥可能会丢失，请运行 `openclaw matrix doctor recover --account <id> --accept-snapshot-rollback`，然后重新启动网关。恢复需要该帐户的一个被阻止的存储、一个独占所有者锁以及一个能够独立传递完整 IndexedDB 重放的 SQLite 快照。它发布了新的守卫和印章；它不能证明快照包含失败所有者的最新密钥。如果快照是absent/invalid或者账户有多个阻塞存储，则恢复拒绝；寻求仓库所有者的帮助。不要手动删除 `.owner.poisoned`。如果 Rust 初始化失败，则由于无法确认后端拆卸，因此将保留保管权，直到进程退出。

即使没有阻止所有者标记，无效的规范 SQLite 快照也会停止启动并阻止快照替换。缺少带有剩余块的元数据、格式错误的元数据或有效负载、丢失块以及校验和失败都是错误，而不是新帐户。保留帐户状态和备份，停止使用它的所有进程，并恢复有效的备份或寻求存储所有者的帮助。 Doctor Recovery 不会修复损坏的快照。 Startup 还会在替换保留帐户数据库之前单独重放完整的候选快照；无效的键、模式或索引约束会拒绝启动而不更改这些数据库。

### <a id="enable-encryption"></a> 启用加密

```bash
openclaw matrix encryption setup
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix encryption setup --recovery-key-stdin
```

初始化 secret 存储和交叉签名，必要时创建房间密钥备份，然后打印状态和后续步骤。实用标志：

- `--recovery-key-stdin` 从 stdin 读取恢复密钥，而不会将其暴露在进程参数中；`--recovery-key <key>` 仍可用于兼容性
- `--force-reset-cross-signing` 丢弃当前交叉签名身份并创建新的身份（仅限有意使用）

对于新账户，请在创建时启用 E2EE：

```bash
openclaw matrix account add \
  --homeserver https://matrix.example.org \
  --access-token syt_xxx \
  --enable-e2ee
```

`--encryption` 是 `--enable-e2ee` 的别名。两个设置命令都会在保存启用的配置之前完成其 Matrix 客户端操作；命令完成后重新启动网关。如果引导失败，加密设置仍然保存；使用报告的诊断和后续步骤来完成验证。

安装程序会保留运行时所做的不相关的配置更改。如果所选帐户发生更改，安装程序会保持较新的配置不变，并要求您检查它并重新运行命令。

手动配置等效：

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

### <a id="status-and-trust-signals"></a> 状态与信任信号

```bash
openclaw matrix verify status
openclaw matrix verify status --include-recovery-key --json
```

对于 `--include-recovery-key`，文本输出会确认原始恢复密钥何时可用，并指导您添加 `--json`。文本输出从不打印密钥本身；将包含恢复密钥的 JSON 输出保持私有。

`verify status` 会报告三个独立的信任信号（`--verbose` 会显示全部）：

- `Locally trusted`：仅被此客户端信任
- `Cross-signing verified`：SDK 报告已通过交叉签名验证
- `Signed by owner`：由你自己的自签名密钥签名（仅用于诊断）

仅当`Cross-signing verified`为`yes`时，`Verified by owner`才为`yes`；仅本地信任或所有者签名是不够的。

`--allow-degraded-local-state` 返回尽力诊断，无需先准备 Matrix 帐户；对于离线或部分配置的检查很有用。

### <a id="verify-this-device-with-a-recovery-key"></a> 使用恢复密钥验证此设备

通过 stdin 传递恢复密钥，而不是在命令行中直接传入：

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

该命令会报告三种状态：

- `Recovery key accepted`：Matrix 已接受该密钥用于 secret 存储或设备信任。
- `Backup usable`：可使用受信任的恢复材料加载房间密钥备份。
- `Device verified by owner`：此设备拥有完整的 Matrix 交叉签名身份信任。

即使恢复密钥已解锁备份材料，只要完整身份信任不完整，它仍会以非零状态退出。在这种情况下，请在另一个 Matrix 客户端中完成自我验证：

```bash
openclaw matrix verify self
```

`verify self` 会等待 `Cross-signing verified: yes` 后才成功退出。可使用 `--timeout-ms <ms>` 调整等待时间。

字面量密钥形式 `openclaw matrix verify device "<recovery-key>"` 也可以使用，但密钥会进入 shell 历史记录。

### <a id="bootstrap-or-repair-cross-signing"></a> 初始化或修复交叉签名

```bash
openclaw matrix verify bootstrap
```

用于加密帐户的 repair/setup 命令。按顺序，它：

- 初始化 secret 存储，尽可能复用现有恢复密钥
- 初始化交叉签名并上传缺失的公钥
- 标记并对当前设备进行交叉签名
- 如果服务器端尚不存在房间密钥备份，则创建一个

如果 homeserver 在上传交叉签名密钥时要求 UIA，OpenClaw 会先尝试免认证，然后是 `m.login.dummy`，最后是 `m.login.password`（需要 `channels.matrix.password`）。

实用标志：

- `--recovery-key-stdin`（配合 `printf '%s\n' "$MATRIX_RECOVERY_KEY" | ...`）或 `--recovery-key <key>`
- `--force-reset-cross-signing` 丢弃当前交叉签名身份（仅限有意使用；需要已存储或通过 `--recovery-key-stdin` 提供当前恢复密钥）

### <a id="room-key-backup"></a> 房间密钥备份

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` 会显示是否存在服务器端备份，以及此设备是否可以解密它。`backup restore` 会将备份的房间密钥导入本地 crypto 存储；如果恢复密钥已在磁盘上，则可省略 `--recovery-key-stdin`。

OpenClaw 读取先前的编辑以仅通知新提到的收件人。如果编辑报告其历史记录未完全解密，请使用 `backup restore` 恢复丢失的房间密钥，然后重试编辑。如果这些键不可用，请发送新消息。

若要用新的基线替换损坏的备份（接受丢失无法恢复的旧历史；如果当前备份 secret 无法加载，也可以重新创建 secret 存储）：

```bash
openclaw matrix verify backup reset --yes
```

仅当希望旧恢复密钥有意停止解锁新的备份基线时，才添加 `--rotate-recovery-key`。

### <a id="listing%2C-requesting%2C-and-responding-to-verifications"></a><a id="listing-requesting-and-responding-to-verifications"></a> 列出、请求和响应验证

```bash
openclaw matrix verify list
```

列出所选账户的待处理验证请求。

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

从此帐户发送验证请求。 `--own-user`请求自验证（在同一用户的另一个Matrix客户端接受提示）； `--user-id`/`--device-id`/`--room-id` 瞄准其他人。 `--own-user` 不能与其他定位标志组合。

对于更低层级的生命周期处理——通常是在从另一个客户端影子跟踪传入请求时——这些命令会作用于某个特定请求 `<id>`（由 `verify list` 和 `verify request` 打印）：

| 命令                                    | 用途                                                             |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `openclaw matrix verify accept <id>`       | 接受传入请求                                           |
| `openclaw matrix verify start <id>`        | 开始 SAS 流程                                                  |
| `openclaw matrix verify sas <id>`          | 打印 SAS 表情符号或数字                                     |
| `openclaw matrix verify confirm-sas <id>`  | 确认 SAS 与另一个客户端显示的内容一致            |
| `openclaw matrix verify mismatch-sas <id>` | 当表情符号或数字不一致时拒绝 SAS              |
| `openclaw matrix verify cancel <id>`       | 取消；可选接受 `--reason <text>` 和 `--code <matrix-code>` |

当验证锚定到某个特定的直消息房间时，`accept`、`start`、`sas`、`confirm-sas`、`mismatch-sas` 和 `cancel` 都接受 `--user-id` 和 `--room-id` 作为 DM 后续提示。

### <a id="multi-account-notes"></a> 多账户说明

如果没有 `--account <id>`，Matrix CLI 命令会使用隐式默认账户。对于多个命名账户且未设置 `channels.matrix.defaultAccount` 的情况，命令不会自行猜测，而是要求你选择。对于已命名账户，如果 E2EE 被禁用或不可用，错误信息会指向该账户的配置键，例如 `channels.matrix.accounts.assistant.encryption`。

<AccordionGroup>
  <Accordion id="startup-behavior" title="启动行为">
    当 `encryption: true` 时，`startupVerification` 默认值为 `"if-unverified"`。启动时，未验证设备会在另一个 Matrix 客户端中请求自我验证，跳过重复项并应用冷却期（默认 24 小时）。可通过 `startupVerificationCooldownHours` 调整，或使用 `startupVerification: "off"` 禁用。

    启动还会执行一次保守的 crypto 引导流程，复用当前 secret 存储和交叉签名身份。如果引导状态损坏，即使没有 `channels.matrix.password`，OpenClaw 也会尝试受保护的修复；如果 homeserver 要求密码 UIA，启动会记录警告但不会致命退出。已由所有者签名的设备会被保留。

    完整升级流程请参见 [Matrix 迁移](/channels/matrix-migration)。

  </Accordion>

  <Accordion id="verification-notices" title="核查通知">
    Matrix 将验证生命周期通知作为 `m.notice` 消息发布到严格的 DM 验证室：请求、就绪（使用“通过表情符号验证”指导）、start/completion 和 SAS （emoji/decimal） 详细信息（如果有）。

    来自另一个 Matrix 客户端的传入请求会被跟踪并自动接受。对于自我验证，OpenClaw 会自动开始 SAS 流程，并在表情符号验证可用后自动确认自己这一侧——你仍然需要在你的 Matrix 客户端中比较并确认“两者一致”。

    验证系统通知不会转发到代理聊天管道。

  </Accordion>

  <Accordion id="deleted-or-invalid-matrix-device" title="Matrix 设备已删除或无效">
    如果 `verify status` 表示当前设备已不再列在 homeserver 上，请创建一个新的 OpenClaw Matrix 设备。对于密码登录：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --user-id '@assistant:example.org' \
  --password '<password>' \
  --device-name OpenClaw-Gateway
```

    对于令牌身份验证，请在您的Matrix客户或管理员UI，然后更新OpenClaw：

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --access-token '<token>'
```

    将 `assistant` 替换为失败命令中的账户 ID，或者在默认账户情况下省略 `--account`。

  </Accordion>

  <Accordion id="device-hygiene" title="设备卫生">
    旧的 OpenClaw- 受管设备可以累积。列表和修剪：

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion id="crypto-store" title="加密货币商店">
    Matrix E2EE使用官方的`matrix-js-sdk` Rust加密路径与`fake-indexeddb`作为IndexedDB垫片。加密状态持续存在于账户中`state/openclaw.sqlite`具有限制性文件权限的数据库。七月前的`crypto-idb-snapshot.json`进口已退役；看[矩阵迁移](/channels/matrix-migration#retired-pre-july-state-files)进行康复指导。

    加密运行时状态存储在 `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` 下，包含同步存储、crypto 存储、恢复密钥、IDB 快照、线程绑定和启动验证状态。当令牌变化但账户身份保持不变时，OpenClaw 会复用最合适的现有根目录，以便之前的状态仍然可见。

    单个较旧的 token-hash 根目录可能是正常的令牌轮换连续性路径。如果 OpenClaw 记录了 `matrix: multiple populated token-hash storage roots detected`，请检查账户目录，并且只在确认所选的活动根目录健康后，再将过时的同级根目录归档。优先将过时根目录移入 `_archive/` 目录，而不是立即删除。

  </Accordion>
</AccordionGroup>
