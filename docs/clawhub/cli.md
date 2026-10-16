---
summary: "CLI 参考：命令、标志、配置和锁定文件行为。"
read_when:
  - "使用 ClawHub CLI"
  - "调试安装、更新或发布"
---

# CLI

CLI 封装：`clawhub`，仓位：`clawhub`。

使用 npm 或 pnpm 进行全局安装：

```bash
npm i -g clawhub
# or
pnpm add -g clawhub
```

然后验证一下：

```bash
clawhub --help
clawhub login
clawhub whoami
```

## <a id="global-flags"></a> 全局标志

- `--workdir <dir>`：工作目录（默认：cwd；如果配置，则回退到 Clawdbot 工作区）
- `--dir <dir>`：workdir下的安装目录（默认：`skills`）
- `--site <url>`：用​​于注册表发现和设备验证的站点基础 URL（默认值：`https://clawhub.ai`）
- `--registry <url>`：API 基础 URL（默认：已发现，否则 `https://clawhub.ai`）
- `--no-input`：禁用提示

环境等效项：

- `CLAWHUB_SITE`（旧版 `CLAWDHUB_SITE`）
- `CLAWHUB_REGISTRY`（旧版 `CLAWDHUB_REGISTRY`）
- `CLAWHUB_WORKDIR`（旧版 `CLAWDHUB_WORKDIR`）

### <a id="http-proxy"></a> HTTP 代理

CLI 尊重公司代理或受限网络后面的系统的标准 HTTP 代理环境变量：

- `HTTPS_PROXY` / `https_proxy`
- `HTTP_PROXY` / `http_proxy`
- `NO_PROXY` / `no_proxy`

当设置这些变量中的任何一个时，CLI 通过指定的代理路由出站请求。 `HTTPS_PROXY` 用于 HTTPS 请求，`HTTP_PROXY` 用于普通 HTTP。 `NO_PROXY` / `no_proxy` 可以绕过特定主机或域的代理。

这在直接出站连接被阻止的系统（e.g. Docker 容器、带有仅代理互联网的 Hetzner VPS、企业防火墙）上是必需的。

示例：

```bash
export HTTPS_PROXY=http://proxy.example.com:3128
export NO_PROXY=localhost,127.0.0.1
clawhub search "my query"
```

当未设置代理变量时，行为保持不变（直接连接）。

## <a id="config-file"></a> 配置文件

存储您的 API 令牌 + 缓存注册表 URL。

- macOS: `~/Library/Application Support/clawhub/config.json`
- Linux/XDG: `$XDG_CONFIG_HOME/clawhub/config.json` or `~/.config/clawhub/config.json`
- Windows: `%APPDATA%\\clawhub\\config.json`
- Legacy 回退：如果 `clawhub/config.json` 尚不存在但 `clawdhub/config.json` 存在，则 CLI 重用旧路径
- 覆盖：`CLAWHUB_CONFIG_PATH`（旧版 `CLAWDHUB_CONFIG_PATH`）

## <a id="commands"></a> 命令

### `login` / `auth login`

- 默认：打印一次性代码和验证URL。在此设备或其他设备上打开打印的 URL，根据需要使用 GitHub 登录，然后选择 **Authorize**。 CLI 轮询批准，通过 `whoami` 验证 API 令牌，并将其保存在您的配置中。它不会打开浏览器或启动本地回调服务器。
- `--device`：显式选择默认设备流。
- `--no-browser`：接受无`--token`；设备登录已打印 URL。
- `--label <label>`：标记设备登录创建的令牌（默认：`CLI device login`）。不重命名 `--token` 提供的令牌。
- Unattended/CI：`clawhub login --token <token>` 验证并存储现有的 API 令牌。仅`--no-input`仍在等待设备批准。

请参阅 [CLI 登录](/clawhub/auth#cli-login) 了解审批步骤和到期指南。

### `whoami`

- 通过 `/api/v1/whoami` 验证存储的令牌。

### `token`

- 将存储的 API 令牌打印到标准输出。
- 用于将本地登录令牌传递到 CI 秘密设置命令中。

### `star <skill>` / `unstar <skill>`

- Adds/removes 您书签中的一项技能。为了兼容性，命令名称保留为 `star` 和 `unstar`。
- 称为 `POST /api/v1/stars/<slug>` 和 `DELETE /api/v1/stars/<slug>`。
- `--yes` 跳过确认。

### `search <query...>`

- 调用`/api/v1/search?q=...`。
- Output 包括技能段、所有者句柄、显示名称和相关性分数。
- Search 在下载流行之前倾向于精确的 slug/name 令牌匹配。诸如 `map` 之类的独立 slug 标记与 `personal-map` 的匹配度比 `amap` 内的子字符串更强。
- 受欢迎程度只是一个小排名，并不能保证排名靠前。
- `--prefix`：通过`/api/v1/skills`列出匹配slugs的确定性页面；传递打印的 `--cursor` 继续，直到没有光标剩余。
- `--exact`：将相关性搜索限制为精确的段匹配。
- `--prefix` 和 `--exact` 是互斥的。
- `--cursor` 仅与 `--prefix` 一起有效。
- 如果技能应该出现但没有出现，请在登录时运行 `clawhub inspect @owner/slug`，以在重命名元数据之前检查所有者可见的审核诊断。

### `explore`

- 通过`/api/v1/skills?limit=...&sort=createdAt`列出最新技能（按`createdAt` desc排序）。
- 标志：
  - `--limit <n>`（1-200，默认：25）
  - `--sort newest|updated|rating|downloads|trending`（默认：最新）。旧版安装排序别名仍然适用于兼容性。
  - `--json`（机器可读输出）
- 输出：`<ownerHandle>/<slug>  v<version>  <age>  <summary>`（摘要被截断为 50 个字符）。
- 使用 `--registry` 选择的旧版自定义注册表可能会省略所有者或最新版本字段。 CLI 保留其仅 slug 输出，并显示 `v?` 的省略版本；显式的 `latestVersion: null` 也被接受。

### `inspect @owner/slug`

- 获取技能元数据和版本文件而不安装。
- `--version <version>`：检查特定版本（默认：最新）。
- `--tag <tag>`：检查标记版本（e.g. `latest`）。
- `--versions`：列出版本历史记录（第一页）。
- `--limit <n>`：列出的最大版本 （1-200）。
- `--files`：列出所选版本的文件。
- `--file <path>`：获取原始文件字节（10MB限制）。
- `--json`：机器可读输出； `--file` 包括准确的字节作为 base64 和 UTF-8 文本（如果可用）。

### `install @owner/slug`

- 解决指定所有者和技能的最新版本。
- 通过 `/api/v1/download` 下载 zip。
- 提取到`<workdir>/<dir>/<slug>`中。
- 拒绝覆盖固定技能；首先运行 `clawhub unpin <skill>`。
- 写道：
  - `<workdir>/.clawhub/lock.json`（旧版 `.clawdhub`）
  - `<skill>/.clawhub/origin.json`（旧版 `.clawdhub`）

如果删除旧备份失败，已完成的替换仍会保持安装状态。文件锁释放后，可以删除剩余的 `.backup-` 目录。替换完成之前出现的故障仍会恢复之前的安装。

### `uninstall <skill>`

- 删除 `<workdir>/<dir>/<slug>` 并删除锁定文件条目。
- 不发送卸载遥测或减少 ClawHub 安装计数。运行 `clawhub sync` 不会协调删除。
- Interactive：要求确认。
- 非交互式 （`--no-input`）：需要 `--yes`。

### `list`

- 读取 `<workdir>/.clawhub/lock.json`（旧版 `.clawdhub`）。
- 在使用 `clawhub pin` 冻结的技能旁边显示 `pinned`，包括可选原因。

### `pin <skill>`

- 将已安装的技能标记为固定在锁定文件中。
- `--reason <text>`记录了技能被冻结的原因。
- 固定技能被 `update --all` 跳过并被直接 `update <skill>` 拒绝。
- Pinned 技能也会拒绝 `install --force`，因此本地字节不会被意外替换。

### `unpin <skill>`

- 从已安装的技能中删除锁定文件 pin，以便将来的更新可以对其进行修改。

### `update [@owner/slug]` / `update --all`

- 从本地文件计算指纹。
- 如果指纹与已知版本匹配：无提示。
- 如果指纹不匹配：
  - 默认拒绝
  - 用 `--force` 覆盖（或提示，如果是交互式的）
- `--force` 永远不会更新固定技能。
- `update <skill>` 固定技能快速失败，并告诉您首先运行 `clawhub unpin <skill>`。
- `update --all` 跳过固定的段头并打印保持冻结的摘要。

### `skill publish <path>`

- 将本地捆绑包指纹与ClawHub进行比较，并在内容已发布时成功退出。
- 新技能默认为`1.0.0`；更改技能默认为下一个补丁版本。
- `--version <version>` 显式选择版本并发布，即使内容与现有版本匹配也是如此。
- `--dry-run` 解决发布但不上传； `--json` 打印机器可读的结果。
- 当参与者具有发布者访问权限时，`--owner <handle>` 在 org/user 发布者句柄下发布。
- `--migrate-owner` 在发布新版本时将现有技能移至 `--owner`。需要两个发布者的 admin/owner 访问权限。
- `--categories <slugs>` 和 `--topics <topics>` 采用逗号分隔值并设置技能在浏览过滤器中的显示位置。首次发布的技能如果没有 `--categories`，则存储为 `other`；稍后发布的版本如果省略该标志，则会保留已存储的内容。 [Skill 目录元数据](/clawhub/publishing#skill-catalog-metadata) 中列出了有效的类别段、限制和保留主题名称。
- 所有者和审阅行为在 `docs/publishing.md` 中进行了解释。
- 发布技能意味着该技能是在ClawHub上的`MIT-0`下发布的。
- 发布的技能可以免费使用、修改和重新分发，无需归属。
- ClawHub 不支持付费技能或按技能定价。
- 旧别名：`publish <path>`。

```bash
clawhub skill publish ./my-skill --dry-run
clawhub skill publish ./my-skill
clawhub skill publish ./my-skill --version 2.0.0
```

#### <a id="github-actions"></a> GitHub 行动

ClawHub 的可重用 [`skill-publish.yml`](https://github.com/openclaw/clawhub/blob/main/.github/workflows/skill-publish.yml) 工作流程为一个 `skill_path` 或 `root` 下的每个直接技能文件夹调用 `skill publish`（默认值：`skills`）。它会跳过未更改的技能并使用相同的自动补丁版本行为。

将 `dry_run: true` 设置为无需令牌即可预览。真正的发布需要 `clawhub_token` 密钥。

可选的 `changelog`、`categories` 和 `topics` 输入映射到匹配的 `skill publish` 标志，并且 `clear_categories` / `clear_topics` 删除技能已携带的元数据。首次发布的技能（不含 `categories`）存储为 `other`，与 `sync` 相同。由于目录元数据适用于运行发布的每项技能，并暂停上述未更改的技能跳过，因此在目录范围内设置之前，请参阅 [GitHub Actions](#github-actions-1) 下的注释。

### `sync`

- 扫描当前工作目录、配置的技能目录以及任何 `--root <dir>` 文件夹，查找包含 `SKILL.md` 或 `skill.md` 的本地技能文件夹。
- 将每个本地技能指纹与 ClawHub 进行比较，并仅发布新的或更改的技能。
- 新技能发布为`1.0.0`；更改的技能默认发布下一个补丁版本。使用 `--bump minor|major` 进行应按较大 semver 步长移动的更新批次。
- `--dry-run` 显示未上传的发布计划； `--json` 打印机器可读的计划。
- `--all` 在没有提示的情况下发布每个新的或更改的技能。如果没有`--all`，交互式终端可以让您选择要发布的技能。
- 当参与者具有发布者访问权限时，`--owner <handle>` 在 org/user 发布者句柄下发布。
- `sync` 仅为单向发布。它不会安装、更新、下载或报告 install/download 遥测数据。
- `sync` 没有 `--categories` 或 `--topics`。首次通过 `sync` 发布的技能将存储为 `other`，直到有人在其上设置 [ 技能目录元数据](/clawhub/publishing#skill-catalog-metadata)。

```bash
clawhub sync --all --dry-run
clawhub sync --all
clawhub sync --root ./skills --owner openclaw --bump minor
```

### `scan --slug <slug>`

- 需要 `clawhub login`。
- 通过 `POST /api/v1/skills/-/scan` 运行 ClawHub ClawScan，然后轮询直到扫描结束。
- Scan 是异步的，可能需要一些时间才能完成。排队时，终端旋转器会显示当前优先扫描位置以及前面有多少扫描。
- Published 扫描需要所有权或发布者管理访问权限。 Moderators/admins 可以通过 `clawhub-admin` 使用相同的后端。
- `--update`仅与`--slug`一起有效；它将成功发布的扫描结果写回所选版本。
- `--output <file.zip>` 下载包含 `manifest.json`、`clawscan.json`、`skillspector.json`、`static-analysis.json`、`virustotal.json` 和 `README.md` 的完整报告存档。
- `--json` 打印完整的轮询响应以实现自动化。
- 不再支持本地路径扫描。上传新版本，然后使用 `scan download` 检索该提交版本的存储扫描结果。

```bash
clawhub scan --slug gifgrep
clawhub scan --slug gifgrep --version 1.2.3
clawhub scan --slug gifgrep --update --output report.zip
```

### `scan download <name>`

- 需要 `clawhub login`。
- 下载已提交技能或插件版本的存储扫描报告 ZIP，包括被 ClawHub 安全检查阻止或隐藏的版本。
- 技能下载使用技能别名，默认为`--kind skill`。
- 插件下载使用包名称并需要`--kind plugin`。
- `--version` 是必需的，因此作者检查 ClawHub 阻止的确切提交版本。
- `--output <file.zip>` 选择目标路径。

```bash
clawhub scan download gifgrep --version 1.2.3
clawhub scan download @scope/demo --version 2.0.0 --kind plugin --output report.zip
```

#### <a id="github-actions-1"></a> GitHub 行动

ClawHub 在 [`/.github/workflows/skill-publish.yml`](https://github.com/openclaw/clawhub/blob/37217f07f1bf4658388202cb19cea8477cd00d17/.github/workflows/skill-publish.yml) 上为技能存储库和目录存储库提供了官方可重用工作流程。

典型的目录设置：

```yaml
name: Skill Publish

on:
  pull_request:
  workflow_dispatch:

jobs:
  dry-run:
    if: github.event_name == 'pull_request'
    uses: openclaw/clawhub/.github/workflows/skill-publish.yml@v1
    with:
      owner: nvidia
      dry_run: true

  publish:
    if: github.event_name == 'workflow_dispatch'
    uses: openclaw/clawhub/.github/workflows/skill-publish.yml@v1
    with:
      owner: nvidia
      dry_run: false
      changelog: "Describe the changes in this release."
      categories: "automation"
      topics: "code-review,linting"
    secrets:
      clawhub_token: ${{ secrets.CLAWHUB_TOKEN }}
```

注意：

- 对于目录存储库，`root` 默认为 `skills`。
- 通过 `skill_path: skills/review-helper` 处理一个技能文件夹。
- `owner` 映射到 CLI `--owner` 标志；省略它以作为经过身份验证的用户发布。
- `changelog`、`categories` 和 `topics` 映射到匹配的 `skill publish` 标志，并且是可选的。省略它们会使已发布的元数据保持不变。
- 和`tags`一样，这三个适用于**every**技能的运行发布。当值描述一项技能而不是整个目录时，通过 `skill_path`。
- **`categories` 和 `topics` 暂停上述“跳过未更改的技能”行为。** CLI 将提供的目录元数据视为权威并绕过其已发布的短路，因此目录范围内的运行会发布**每个选定技能的新补丁版本**，包括文件未更改的技能。 `clear_categories` 和 `clear_topics` 标志算作提供的元数据并执行相同的操作。 `changelog` 不会：仅通过 `changelog` 的运行仍会将未更改的技能报告为 `alreadySynced`。使用 `skill_path` 可以防止元数据编辑发布整个目录。
- `changelog` 逐字到达 CLI，即 `skill publish --changelog` 存储它的方式，因此 Markdown 缩进和尾随硬中断空格在工作流程中保留下来；仅包含空格的值被视为省略。 `categories` 和 `topics` 被修剪，成为段列表。
- 类别和主题以逗号分隔并在服务器端进行验证，因此未知类别 slug 或超过每个技能限制的主题在运行已构建并验证技能后会导致发布失败。
- 要删除技能上已有的类别或主题，请设置 `clear_categories: true` 或 `clear_topics: true`。工作流输入无法区分 `categories: ""` 和省略的 `categories`，因此空字符串始终表示“别管它们”，而布尔值是发送 CLI 的 `--categories ""` 的值。将非空值及其 `clear_` 标志一起设置会使运行失败，而不是默默地选择一个。 `changelog` 没有这样的标志：CLI 已将省略的 `--changelog` 读取为空。
- 运行日志回显每个目标的已解析 `skill publish` 命令，因此转发标志在 CI 输出中可见。保持值不敏感。
- V1技能发布使用`clawhub_token`； GitHub OIDC 可信发布目前仅包含包。

### `delete <skill>`

- 如果没有 `--version`，则软删除技能（所有者、版主或管理员）。
- 调用`DELETE /api/v1/skills/{slug}`。
- Owner 发起的软删除会将 slug 保留 30 天；该命令打印到期时间。
- `--version <version>` 通过故障关闭、特定于版本的路线撤回一个拥有的非最新版本。版本号保留，不能以不同的内容重新发布。在删除当前最新版本之前发布替换版本。平台工作人员不会绕过此仅版本流程的所有权。
- `--reason <text>` 在整个技能软删除和审核日志上记录审核注释。
- `--note <text>` 是 `--reason` 的别名。
- `--yes` 跳过确认。
- 旧版 `POST /api/cli/skill/delete` 端点拒绝提供的 `version`，而不是将其解释为整体技能删除。

### `undelete <skill>`

- 恢复隐藏技能（所有者、版主或管理员）。
- 调用`POST /api/v1/skills/{slug}/undelete`。
- `--version <version>` 仅恢复同一所有者演员先前撤回的精确保留文物。它不会使恢复的版本成为最新版本或重新创建已删除的标签。
- 版本恢复调用`POST /api/v1/skills/{slug}/versions/{version}/restore`。
- `--reason <text>` 在技能和审核日志上记录审核注释。
- `--note <text>` 是 `--reason` 的别名。
- `--yes` 跳过确认。

### `skill tag <skill> <version>`

- 将拥有的技能标签移动到现有的公共版本； `latest` 是默认值。
- 调用`POST /api/v1/skills/{slug}/tags/{tag}`。
- Org 发布者需要所有者或管理员会员身份，匹配版本撤销。
- 在意外发布更高版本后，使用此功能回滚 `latest`；故意单独发布较低版本并不会取代最高 semver 的最新版本。
- `--tag <tag>` 选择另一个标签。
- `--yes` 跳过确认。

示例：

```bash
clawhub skill tag @owner/example 1.2.3 --yes
```

### `hide <skill>`

- H隐藏技能（所有者、版主或管理员）。
- `delete` 的别名。

### `unhide <skill>`

- 取消隐藏技能（所有者、主持人或管理员）。
- `undelete` 的别名。

### `skill rename <skill> <new-name>`

- 重命名拥有的技能并保留之前的slug作为重定向别名。
- 调用`POST /api/v1/skills/{slug}/rename`。
- `--yes` 跳过确认。

### `skill merge <source> <target>`

- 将一项拥有的技能合并到另一项拥有的技能中。
- 源 slug 停止公开列出并成为目标的重定向别名。
- 调用`POST /api/v1/skills/{sourceSlug}/merge`。
- `--yes` 跳过确认。

### `transfer`

- 所有权转让工作流程。
- 对另一个用户的请求通常会创建接收者接受的待处理请求。
- 向组织或您自己的个人发布商发出的请求使用直接发布商移动。 API 调用者还可以使用 `toOwner` 或 `toPublisherHandle` 显式选择此路径。
- Direct 发布者移动会立即应用，并且需要当前所有者和目标发布者的管理员访问权限，除非由平台管理员执行。目标必须处于活动状态；审核限制仍然适用。
- 子命令：
  - `transfer request <skill> <handle> [--message "..."] [--yes]`
  - `transfer list [--outgoing]`
  - `transfer accept <skill> [--yes]`
  - `transfer reject <skill> [--yes]`
  - `transfer cancel <skill> [--yes]`
- 端点：
  - `POST /api/v1/skills/{slug}/transfer`
  - `POST /api/v1/skills/{slug}/transfer/accept`
  - `POST /api/v1/skills/{slug}/transfer/reject`
  - `POST /api/v1/skills/{slug}/transfer/cancel`
  - `GET /api/v1/transfers/incoming`
  - `GET /api/v1/transfers/outgoing`

### `package explore [query...]`

- 通过 `GET /api/v1/packages` 和 `GET /api/v1/packages/search` 浏览或搜索统一软件包目录。
- 将此用于插件和其他包系列条目；顶级 `search` 仍然是技能搜索界面。
- 标志：
  - `--family skill|code-plugin|bundle-plugin`
  - `--official`
  - `--executes-code`
  - `--target <target>`, `--os <os>`, `--arch <arch>`, `--libc <libc>`
  - `--requires-browser`, `--requires-desktop`, `--requires-native-deps`
  - `--requires-external-service`, `--external-service <name>`
  - `--binary <name>`, `--os-permission <name>`
  - `--artifact-kind legacy-zip|npm-pack`
  - `--npm-mirror`
  - `--limit <n>`（1-100，默认：25）
  - `--json`

示例：

```bash
clawhub package explore --family code-plugin
clawhub package explore --family code-plugin --os darwin --requires-desktop
clawhub package explore --family code-plugin --artifact-kind npm-pack
clawhub package explore --npm-mirror
clawhub package explore episodic-claw --family code-plugin
```

### `package inspect <name>`

- 无需安装即可获取包元数据。
- 使用此插件元数据、兼容性、验证、源和 version/file 检查。
- `--version <version>`：检查特定版本（默认：最新）。
- `--tag <tag>`：检查标记版本（e.g. `latest`）。
- `--versions`：列出版本历史记录（第一页）。
- `--limit <n>`：列出的最大版本 （1-100）。
- `--files`：列出所选版本的文件。
- `--file <path>`：获取有界的 UTF-8 文本预览（200KB 限制）。
- `--json`：机器可读的输出。

### `package download <name>`

- 通过 `GET /api/v1/packages/{name}/versions/{version}/artifact` 解析软件包版本。
- 从解析器的 `downloadUrl` 下载工件。
- 验证所有工件的 ClawHub SHA-256。
- 对于 ClawPack npm-pack 工件，还验证 npm `sha512` 完整性、npm shasum 和 tarball 的 `package.json` name/version.
- 旧版 ZIP 版本通过旧版 ZIP 路径下载。
- 标志：
  - `--version <version>`：下载特定版本。
  - `--tag <tag>`：下载标记版本（默认：`latest`）。
  - `-o, --output <path>`：输出文件或目录。
  - `--force`：覆盖现有输出文件。
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package download @openclaw/example-plugin --tag latest
clawhub package download @openclaw/example-plugin --version 1.2.3 -o artifacts/
```

### `package verify <file>`

- 计算本地工件的 ClawHub SHA-256、npm `sha512` 完整性和 npm shasum。
- 使用 `--package`，解析来自 ClawHub 的预期元数据，并将本地文件与已发布的工件元数据进行比较。
- 使用直接摘要标志，无需网络查找即可进行验证。
- 标志：
  - `--package <name>`：用​​于解析预期工件元数据的包名称。
  - `--version <version>` 或 `--tag <tag>`：预期的软件包版本。
  - `--sha256 <hex>`：预期为 ClawHub SHA-256。
  - `--npm-integrity <sri>`：预期 npm 完整性。
  - `--npm-shasum <sha1>`：预期为 npm shasum。
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package verify ./example-plugin-1.2.3.tgz --package @openclaw/example-plugin --version 1.2.3
clawhub package verify ./example-plugin-1.2.3.tgz --sha256 <hex>
```

### `package validate <source>`

- 22.x 线上需要 Node.js 22.13+ 或 Node.js 24+；在 Node.js 下运行已安装的 CLI，而不是此命令的 Bun 快捷方式。
- 针对本地插件包文件夹运行 ClawHub CLI 的捆绑插件检查器。
- 默认为 offline/static 验证，无需查找或导入本地 OpenClaw 结账。
- Hard 兼容性错误退出非零。仅打印警告结果，但退出为零。
- 标志：
  - `--out <dir>`：将 Plugin Inspector 报告写入此目录。
  - `--openclaw <path>`：检查显式本地 OpenClaw 结账。
  - `--runtime`：启用运行时捕获；导入插件代码。
  - `--allow-execute`：允许在隔离工作区中进行运行时捕获。
  - `--no-mock-sdk`：在运行时捕获期间禁用模拟的 OpenClaw SDK。
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package validate ./example-plugin
```

如果验证报告包、清单、SDK 导入或工件查找，请参阅 [Plugin 验证修复 ](/clawhub/plugin-validation-fixes)，然后重新运行该命令。

### `package delete <name>`

- 如果没有 `--version`，则软删除软件包和所有版本。
- `--version <version>` 通过故障关闭、特定于版本的路线撤回一个拥有的非最新版本。版本号保留，不能以不同的内容重新发布。在删除当前最新版本之前发布替换版本。此仅版本流程需要包所有者或组织发布者管理员；平台工作人员不会绕过包所有权。
- 整个包软删除需要包所有者、组织发布者 owner/admin、平台管理员或平台管理员。
- 标志：
  - `--version <version>`：撤回一个非最新版本。
  - `--yes`：跳过确认。
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package delete @openclaw/example-plugin --yes
clawhub package delete @openclaw/example-plugin --version 1.2.3 --yes
```

### `package undelete <name>`

- 恢复软删除的包并释放。
- 需要包所有者、组织发布者 owner/admin、平台管理员或平台管理员。
- 调用`POST /api/v1/packages/{name}/undelete`。
- `--version <version>` 仅恢复同一所有者 actor 先前撤回的确切保留版本。它不会使版本最新或重新创建已删除的包 tags/dist-tags.
- 版本恢复调用`POST /api/v1/packages/{name}/versions/{version}/restore`。
- 标志：
  - `--version <version>`：恢复一个所有者撤回的版本。
  - `--yes`：跳过确认。
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package undelete @openclaw/example-plugin --yes
```

### `package transfer <name>`

- 将包传输到另一个发布者。
- 需要当前包所有者和目标发布者的管理员访问权限，除非由平台管理员执行。
- Scoped 包名称必须传输到匹配的范围所有者。
- 调用`POST /api/v1/packages/{name}/transfer`。
- 标志：
  - `--to <owner>`：目标发布者句柄。
  - `--reason <text>`：可选审核原因。
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package transfer @openclaw/example-plugin --to openclaw
```

### `package report`

- 用于向管理员报告包的经过身份验证的命令。
- 调用`POST /api/v1/packages/{name}/report`。
- Reports 是包级别的，可以选择与版本绑定，并且对版主可见以供审阅。
- Reports 不会自动隐藏包或自行阻止下载。
- 标志：
  - `--version <version>`：附加到报告的可选包版本。
  - `--reason <text>`：必填报告原因。
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package report @openclaw/example-plugin --version 1.2.3 --reason "suspicious native payload"
```

### `package moderation-status`

- Owner 命令用于检查包审核可见性。
- 调用`GET /api/v1/packages/{name}/moderation`。
- 显示当前包扫描状态、打开报告计数、最新版本手动审核状态、下载阻止状态和审核原因。
- 标志：
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package moderation-status @openclaw/example-plugin
```

### `package readiness <name>`

- 检查包是否已准备好供将来使用 OpenClaw。
- 调用`GET /api/v1/packages/{name}/readiness`。
- 报告拦截器的官方状态、ClawPack 可用性、工件摘要、源出处、OpenClaw 兼容性、主机目标、环境元数据和扫描状态。
- 标志：
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package readiness @openclaw/example-plugin
```

### `package migration-status <name>`

- 显示可能替换捆绑的 OpenClaw 插件的软件包的面向操作员的迁移状态。
- 调用与 `package readiness` 相同的计算就绪端点，但打印以迁移为中心的状态、最新版本、官方包状态、检查和阻止程序。
- 标志：
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package migration-status @openclaw/example-plugin
```

### `publisher create <handle>`

- 创建由经过身份验证的用户拥有的组织发布者。
- 句柄标准化为小写，可以带或不带 `@` 传递。
- 默认情况下，新创建的组织发布者不是 trusted/official。
- 如果句柄已被现有发布者、用户或保留路由使用，则失败。

```bash
clawhub publisher create opik --display-name "Opik"
```

### `package publish <source>`

- 通过`POST /api/v1/packages`发布代码插件或捆绑插件。
- `<source>` 接受：
  - 本地文件夹路径：`./my-plugin`
  - 本地 ClawPack npm-pack tarball：`./my-plugin-1.2.3.tgz`
  - GitHub 仓库：`owner/repo` 或 `owner/repo@ref`
  - GitHub URL: `https://github.com/owner/repo`
- 元数据是从`package.json`、`openclaw.plugin.json`和真实的OpenClaw捆绑标记（例如`.codex-plugin/plugin.json`、`.claude-plugin/plugin.json`和`.cursor-plugin/plugin.json`）自动检测的。
- `.tgz` 源被视为 ClawPack。 CLI 上传确切的 npm-pack 字节，并使用提取的 `package/` 内容仅用于验证和元数据预填充。
- 实验爪必须从已构建的`.tgz`发布。 Claw源文件夹和GitHub源被拒绝；首先使用 `openclaw claws build`。发布请求绑定本地 SHA-256，ClawHub 在接受确切的字节后返回该摘要。
- Code 插件文件夹在上传之前打包到 ClawPack npm tarball 中，因此 OpenClaw 安装可以验证确切的工件。捆绑插件文件夹仍使用提取的文件发布路径。
- 对于 GitHub 源，源属性是从存储库、已解析的提交、引用和子路径自动填充的。
- 对于本地文件夹，当源远程指向 GitHub 时，会从本地 git 自动检测源归属。
- 外部代码插件必须显式声明`openclaw.compat.pluginApi`和`openclaw.build.openclawVersion`。顶级 `package.json.version` 不用作发布验证的后备。
- `--dry-run` 预览已解析的发布负载，无需上传。
- `--json` 发出 CI 的机器可读输出。
- `--wait` 等待发布前安全检查，仅在版本发布或达到最终失败状态后返回。
- `--wait-timeout <seconds>` 设置 `--wait` 截止时间（默认值：1800）。
- 当参与者具有发布者访问权限时，`--owner <handle>` 在用户或组织发布者句柄下发布。
- Code-plugin和bundle-plugin类别来自`openclaw.plugin.json`。仅声明一个类别，例如 `"categories": ["agent-runtimes"]`。显式清单声明优先。如果省略该字段，ClawHub 使用其配置的模型（默认值：GPT-5.6 Luna）从有界包元数据和文档中生成一个类别，并在分类不可用时使用 `other` 作为后备。省略不会保留先前发布中提供的类别。请参阅 [ 插件目录元数据](/clawhub/publishing#plugin-catalog-metadata)。
- `--categories <slugs>` 仍然接受兼容性，但在插件发布中被忽略，包括 `--categories ""`。 CLI 向 stderr 打印弃用警告，包括 `--json` 和 `--dry-run`。将声明移至清单中；删除请求自动分类的字段。实验性 [`--family claw`](/clawhub/claws) 按原样发布通过此标志传递的静态存储类别。
- `--topics <topics>` 与类别分开，并且仍然接受逗号分隔值。省略它以保留现有主题；通过 `--topics ""` 来清除它们。 [主题规则](/clawhub/publishing#skill-catalog-metadata)适用于每个家庭，包括`claw`。
- 作用域包名称必须与所选所有者匹配。参见 `docs/publishing.md`。
- 现有标志（`--family`、`--name`、`--version`、`--source-repo`、`--source-commit`、`--source-ref`、`--source-path`）仍可用作覆盖。
- 私人 GitHub 存储库需要 `GITHUB_TOKEN`。

```bash
clawhub package publish ./plugin.tgz --owner openclaw
```

#### <a id="recommended-local-flow"></a> 推荐本地流量

首先使用 `--dry-run`，以便您可以在创建实时版本之前确认已解析的包元数据和源属性：

```bash
npm pack
clawhub package publish ./my-plugin-1.2.3.tgz --family code-plugin --dry-run
clawhub package publish ./my-plugin-1.2.3.tgz --family code-plugin --wait
```

#### <a id="local-folder-flow"></a> 本地文件夹流程

对于代码插件，文件夹发布会从包文件夹中构建并上传 ClawPack 工件。这种便利不适用于利爪：

```bash
clawhub package publish ./my-plugin --family code-plugin --dry-run
clawhub package publish ./my-plugin --family code-plugin
```

#### <a id="minimal-package.json-for---family-code-plugin"></a><a id="minimal-package-json-for-family-code-plugin"></a> `--family code-plugin` 的最小 `package.json`

外部代码插件需要 `package.json` 中的少量 OpenClaw 元数据。这个最小的清单足以成功发布：

```json
{
  "name": "@myorg/openclaw-my-plugin",
  "version": "1.0.0",
  "type": "module",
  "openclaw": {
    "extensions": ["./index.ts"],
    "compat": {
      "pluginApi": ">=2026.3.24-beta.2"
    },
    "build": {
      "openclawVersion": "2026.3.24-beta.2"
    }
  }
}
```

必填字段：

- `openclaw.compat.pluginApi`
- `openclaw.build.openclawVersion`

注意：

- `package.json.version` 是您的软件包发布版本，但它不用作 OpenClaw compatibility/build 验证的后备版本。
- `openclaw.hostTargets` 和 `openclaw.environment` 是可选元数据。 ClawHub 可能会在存在时显示它们，但发布时不需要它们。
- 如果您想发布更详细的兼容性元数据，`openclaw.compat.minGatewayVersion` 和 `openclaw.build.pluginSdkVersion` 是可选的附加项。
- 如果您使用的是较旧的 `clawhub` CLI 版本，请在发布之前升级，以便在上传之前运行本地预检检查。
- 如果验证报告修复代码，请参阅 [插件验证修复](/clawhub/plugin-validation-fixes)。

#### <a id="github-actions-2"></a><a id="github-actions-3"></a> GitHub 行动

ClawHub 还在 [`/.github/workflows/package-publish.yml`](https://github.com/openclaw/clawhub/blob/37217f07f1bf4658388202cb19cea8477cd00d17/.github/workflows/package-publish.yml) 上为插件存储库提供了官方可重用工作流程。

典型的呼叫者设置：

```yaml
name: Package Publish

on:
  pull_request:
  workflow_dispatch:
  push:
    tags:
      - "v*"

jobs:
  dry-run:
    if: github.event_name == 'pull_request'
    uses: openclaw/clawhub/.github/workflows/package-publish.yml@v0.12.0
    with:
      dry_run: true

  publish:
    if: github.event_name == 'workflow_dispatch' || startsWith(github.ref, 'refs/tags/')
    permissions:
      contents: read
      id-token: write
    uses: openclaw/clawhub/.github/workflows/package-publish.yml@v0.12.0
    with:
      dry_run: false
    secrets:
      clawhub_token: ${{ secrets.CLAWHUB_TOKEN }}
```

要附加版本和目录元数据，请将匹配的 CLI 值添加到作业的现有 `with` 块。让 `dry_run: true` 继续执行拉取请求作业；仅在上面显示的可信发布作业上使用 `dry_run: false`。

```yaml
with:
  changelog: "Describe the changes in this release."
  topics: "automation,productivity"
```

注意：

- 可重用工作流默认将 `source` 发送给调用者存储库。
- 对于 monorepos，传递 `source_path`，以便工作流发布插件包文件夹，例如 `source_path: extensions/codex`。
- `changelog` 和 `topics` 是可选的，并映射到匹配的 CLI 标志。主题使用逗号分隔值。省略 `topics` 以保留现有主题，或设置 `clear_topics: true` 以删除它们。请勿将 `topics` 与 `clear_topics: true` 组合使用。
- 对于插件，请在 `openclaw.plugin.json` 中准确声明一个类别，如 [插件目录元数据](/clawhub/publishing#plugin-catalog-metadata) 中所述。省略该字段，让 ClawHub 使用其配置的模型自动对版本进行分类（默认值：GPT-5.6 Luna）。
- 传统的 `categories` 和 `clear_categories` 输入仍转发 `--categories` 以实现兼容性。插件发布忽略两者并打印弃用警告；他们无法设置、保留或清除插件的类别。将声明迁移到清单时删除这些工作流输入。 Experimental Claw 出版商保留其现有的类别行为。
- 将可重用工作流程固定到稳定标签或完全提交 SHA。不要从 `@main` 运行发布发布。
- `pull_request` 应使用 `dry_run: true`，以便 CI 保持无污染。
- Real 发布应仅限于可信事件，例如 `workflow_dispatch` 或标签推送。
- 无秘密可信发布仅适用于`workflow_dispatch`；标签推送仍然需要`clawhub_token`。
- 保持 `clawhub_token` 可用于首次发布、不受信任的包或破坏性发布。
- Real默认发布等待最终发布。仅当调用者有意想要旧的提交和返回行为时才设置 `wait_for_publication: false`。
- `publication_timeout_minutes` 控制发布等待期限，默认为 30 分钟（最大值：40）。
- 工作流将 JSON 结果作为工件上传，并将其公开为工作流输出。

### `package trusted-publisher get <name>`

- 显示包的 GitHub Actions 可信发布者配置。
- 设置配置后使用此选项来确认存储库、工作流程文件名和可选环境 pin。
- 标志：
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package trusted-publisher get @openclaw/example-plugin
```

### `package trusted-publisher set <name>`

- 附加或替换现有包的 GitHub Actions 可信发布者配置。
- 必须首先通过正常手动或令牌认证的 `clawhub package publish` 创建包。
- 设置配置后，未来支持的 GitHub 操作发布可以使用 OIDC/trusted 发布，而无需长期的 ClawHub 令牌。
- `--repository <repo>` 必须是 `owner/repo`。
- `--workflow-filename <file>` 必须与 `.github/workflows/` 中的工作流程文件名匹配。
- `--environment <name>` 是可选的。配置后，OIDC 声明中的 GitHub 操作环境必须完全匹配。
- 当此命令运行时，ClawHub 验证配置的 GitHub 存储库。公共存储库可以通过公共 GitHub 元数据进行验证。私有存储库要求 ClawHub 具有对该存储库的 GitHub 访问权限，例如通过未来的 ClawHub GitHub 应用程序安装或其他授权的 GitHub 集成。
- 标志：
  - `--repository <repo>`：GitHub 存储库，例如 `openclaw/example-plugin`。
  - `--workflow-filename <file>`：工作流程文件名，例如`package-publish.yml`。
  - `--environment <name>`：可选的完全匹配 GitHub 操作环境。
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package trusted-publisher set @openclaw/example-plugin \
  --repository openclaw/example-plugin \
  --workflow-filename package-publish.yml \
  --environment release
```

### `package trusted-publisher delete <name>`

- 从包中删除受信任的发布者配置。
- 如果需要禁用或重新创建工作流程、存储库或环境 pin，请将此用作回滚。
- 未来的真实发布必须使用正常的身份验证发布，直到再次设置配置。
- 标志：
  - `--json`：机器可读的输出。

示例：

```bash
clawhub package trusted-publisher delete @openclaw/example-plugin
```

### <a id="install-telemetry"></a> 安装遥测

- 登录时在 `clawhub install <slug>` 之后发送，除非设置了 `CLAWHUB_DISABLE_TELEMETRY=1`。
- 已尽力报告。如果遥测不可用，安装命令不会失败。
- 详细信息：`docs/telemetry.md`。
