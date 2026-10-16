---
summary: "`openclaw reset` 的 CLI 参考（重置本地 state/config）"
read_when:
  - "你想清除本地状态，同时保留已安装的 CLI"
  - "你想先进行一次将被移除内容的 dry-run"
title: "重置"
---

# `openclaw reset`

重置本地 config/state（保留安装的 CLI）。

```bash
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config --yes --non-interactive
openclaw reset --scope config+creds+sessions --yes --non-interactive
openclaw reset --scope full --yes --non-interactive
```

## <a id="options"></a> 选项

- `--scope <scope>`：`config`、`config+creds+sessions` 或 `full`
- `--yes`：跳过确认提示
- `--non-interactive`：禁用提示。需要 `--scope` 和 `--yes`。
- `--dry-run`：打印操作而不删除文件

## <a id="scopes"></a> 范围

| 范围                   | 删除内容                                                                                 | 先停止网关 |
| ----------------------- | --------------------------------------------------------------------------------------- | ------------------- |
| `config`                | 仅配置文件                                                                        | no                  |
| `config+creds+sessions` | 配置文件，OAuth/credentials目录，存储SQLite会话历史记录及其存档文件 | 是                 |
| `full`                  | 状态目录（包括共享的 SQLite 数据库）以及工作区目录             | 是                 |

`config+creds+sessions` 和 `full` 会在删除状态之前停止正在运行的受管网关服务。

会话范围从配置和发现的代理存储中删除当前和存档的会话、保留的记录生成、冷历史记录和会话拥有的工件，包括不再在配置中的代理。它保留每个代理的数据库文件，因为它们还包含身份验证配置文件、内存和其他代理状态。工作区文件和身份验证配置文件将保留。没有独立的 `--scope sessions` 选项。

`--dry-run` 列出选择要删除的数据库、会话密钥、transcript/archive 计数和拥有的存档文件，而不写入 SQLite 状态。旧版 JSON/JSONL 进口产品仍归 Doctor 所有；重置不会递归删除会话目录。

## <a id="notes"></a> 说明

- 先运行 `openclaw backup create`，以便在移除本地状态之前创建一个可恢复的快照。
- 删除会话的两个范围都需要独占状态所有权。如果非托管或外部监督的网关仍在运行，重置会拒绝并要求您先停止它。
- 工作空间设置状态和证明是共享 SQLite 数据库中的行。 `full` 将它们与状态目录一起删除。当前没有需要单独删除的证明 sidecar 文件。
- 如果删除会话行后归档文件删除失败，则重置将报告准确的剩余文件以供手动清理。它绝不会仅仅因为不相关的文件的名称看起来像会话存档而删除它们。
- Session 清理失败不会跳过其他代理存储或独立配置和 OAuth 目录清理。失败的商店保留删除被拒绝的所有历史记录。
- 如果不指定 `--scope`，`openclaw reset` 会以交互方式提示选择要移除的范围。
- `--non-interactive` 仅当 `--scope` 和 `--yes` 同时设置时才有效。
- 完成后，`config+creds+sessions` 和 `full` 会输出 `Next: openclaw onboard --install-daemon`。
- 删除失败或会话目录检查退出非零。解决报告的错误，然后重试重置；不完整的重置不会打印入门完成提示。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [`openclaw backup`](/cli/backup) — 重置之前的存档状态
- [`openclaw onboard`](/cli/onboard) — 重置后再次设置安装
- [`openclaw uninstall`](/cli/uninstall) — 删除安装而不是重置它
