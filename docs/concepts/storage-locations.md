---
summary: "命名存储目标、显式初始化、加密和提供程序配置"
title: "储存地点"
read_when:
  - "配置外部磁盘或其他存储目标"
  - "选择存储加密并初始化位置"
  - "诊断不可用的存储或错误的加密密钥"
---

# <a id="storage-locations"></a> 存储位置

存储位置指定 OpenClaw 工件的目标。核心存储拥有位置身份、加密和健康检查。提供者传输对象，每个消费者决定存储和保留什么。配置位置不会安排备份或移动现有数据。

内置的 `filesystem` 提供程序支持现有目录，包括外部磁盘或已安装的网络文件系统。额外的提供者来自插件。在配置中引用捆绑的提供程序可以通过正常的插件策略启用其所有者插件；显式禁用仍然适用。

对于 Cloudflare R2 对象存储，请按照 [Cloudflare 插件 setup](/plugins/cloudflare) 创建存储桶、配置 SecretRefs 并初始化 `r2` 位置。

## <a id="configure-and-initialize-a-directory"></a> 配置并初始化目录

在初始化存储之前，安装所需的磁盘并在其上创建目标目录。 OpenClaw 从不创建配置的根目录。使用运行 CLI 或网关的进程所看到的绝对路径。

在该进程的环境中设置 `OPENCLAW_STORAGE_PASSPHRASE` 并在秘密管理器中保留其值的可恢复副本。将位置添加到您的配置中：

```json5
{
  storage: {
    locations: {
      archive: {
        provider: "filesystem",
        settings: { path: "/mnt/archive/openclaw" },
        encryption: {
          passphrase: {
            source: "env",
            provider: "default",
            id: "OPENCLAW_STORAGE_PASSPHRASE",
          },
        },
      },
    },
  },
}
```

显式初始化目标，然后验证 write/read/delete 周期：

```bash
openclaw storage init archive
openclaw storage test archive
openclaw storage list --json
```

初始化将 `openclaw-storage.json` 写入根位置。使用相同的加密设置和密码再次运行 `init` 是安全的。运行时操作永远不会创建此标记：空挂载点不得默默地成为系统磁盘上的存储。

## <a id="configuration-reference"></a> 配置参考

存储是可选的；省略`storage` or `storage.locations`没有定义位置。下的每个键`storage.locations`是一个名字匹配`[a-z0-9][a-z0-9-]{0,62}`： 1–63小写字母、数字或连字符，以字母或数字开头。

| 键                                              | 必需的                   | 含义                                                                                    |
| ------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------ |
| `storage.locations.<name>.provider`              | 是                        | 非空提供商 ID；内置`filesystem`。                                            |
| `storage.locations.<name>.settings`              | 是                        | 提供商拥有的 JSON 对象，在打开后端之前进行验证。                            |
| `storage.locations.<name>.encryption`            | 是                        | `{ passphrase: SecretInput }` 或显式字符串 `"none"`。                             |
| `storage.locations.<name>.encryption.passphrase` | 启用加密时 | 密码字符串或 [SecretRef](/gateway/secrets/secretref-contract)；更喜欢参考。 |

文件系统提供程序接受 `settings: { path: "/absolute/existing/directory" }`。它拒绝丢失的根并且永远不会覆盖现有的对象密钥。它的检查会报告可用的可用空间和总文件系统空间。

提供程序设置必须是有限的、有界的 JSON：最多 32 个嵌套级别、4,096 个值、每个对象 512 个键、65,536 的字符串长度以及序列化时的 256 个 KiB。秘密承载设置（包括 `accessKeyId`、`secretAccessKey` 和嵌套凭据）必须使用有效的 SecretRefs。特定于提供者的验证可能会施加额外的约束。 SecretRefs 保留引用，直到提供者通过核心秘密解析器请求它们的值。

## <a id="choose-encryption-deliberately"></a> 刻意选择加密

使用密码，核心存储在提供者接收对象流之前对其进行加密，并在读取时对其进行解密。 `OCSTOR1` 格式使用 scrypt 派生主密钥和经过身份验证的 AES-256-GCM 段，每个对象都有一个单独的密钥。错误的密码会生成 `wrong-key` 并拒绝访问。更改配置的密码不会重新加密现有数据。

保留密码和位置标记。丢失其中任何一个都会导致加密对象无法读取。对象名称和初始化标记对存储提供者仍然可见；加密保护对象内容。

仅将 `encryption: "none"` 设置为显式操作员选择，例如已受磁盘加密保护的目标。 **备份可以包含凭据。** 如果没有存储加密，任何可以读取目标的人都可以读取存储的字节。

## <a id="share-a-location-across-installations"></a> 跨安装共享位置

备份在某个位置内使用 `backups/<namespace>/`。命名空间默认为经过清理的主机名；使用 `--namespace <name>` 为共享目标的每个安装选择一个稳定、独特的名称。

第一次上传创建一个 `owner.json` 声明，其中包含安装的持久网关设备 ID、主机名和声明时间。它使用与存档相同的位置加密设置。备份创建在归档之前检查声明，并在保留之前再次检查声明。不同的设备 ID 拒绝备份并记录失败的尝试，从而防止共享保留发生主机名冲突。保留永远不会删除声明。

将 `--claim-namespace` 传递给 `backup create --to <location>` 以有意接管命名空间，例如在迁移到新硬件后。 `backup enable --to` 也接受该标志，并仅在显式传递时将其存储在调度命令中；这些预定的运行可以取代另一个安装的声明。当两个安装都将继续运行时，首选单独的命名空间。

恢复保持只读：`backup list`、`backup verify` 和 `backup restore` 与 `--from <location>` 不要求或更改声明。不包含 `--namespace` 的列表还显示可用的命名空间及其声明主机名。恢复的安装带有其原始设备标识，并且可以继续其命名空间。同时运行的克隆副本共享该标识，并且必须使用自己的 `--namespace` 以避免共享保留。

备份状态和 Doctor 会保留每种备份类型和目标的最新尝试和最新成功结果以及最新的 200 个全局尝试。繁忙的工作无法隐藏不常去的目标的最后结果。有关命令和状态详细信息，请参阅 [Backups](/install/backups#copy-backups-offsite) 和 [Backup CLI](/cli/backup#recorded-runs-and-freshness)。

## <a id="diagnose-a-location"></a> 诊断位置

`openclaw storage list` 检查配置的位置。 `openclaw storage test <name>` 还在根位置写入临时 `.openclaw-probe-<uuid>` 对象，读取并验证它，然后删除它。每个存储命令均支持`--json`；请参阅 [CLI 参考 ](/cli/storage)。

| 状态           | 下一步                                                                                                                               |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`            | 标记和加密身份有效，后端检查成功。                                                          |
| `unavailable`   | 重新连接磁盘或恢复对配置目标的访问。检查 CLI 和网关是否看到相同的路径和凭据。   |
| `uninitialized` | 确认这是预期的新目标，然后运行 ​​`openclaw storage init <name>`。切勿初始化意外的空挂载点。 |
| `wrong-key`     | 恢复原始密码或更正 SecretRef。请勿更换标记来隐藏不匹配的情况。                               |
| `error`         | 阅读返回的消息并更正提供程序设置、权限或报告的后端故障。                                  |

网关客户端可以使用 `storage.locations.list` 列出配置的位置（不带存储 I/O），并使用 `storage.locations.probe { name }` 请求运行状况检查。两者都需要操作员读取范围。初始化仍然是显式的 CLI 操作。

有关其他配置域的信息，请参阅 [ 配置参考 ](/gateway/configuration-reference)，有关秘密提供程序设置的信息，请参阅 [Secrets](/gateway/secrets)。
