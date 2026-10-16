---
summary: "ClawHub 如何为技能、插件、所有者、作用域、发布和审查进行发布。"
read_when:
  - "发布技能或插件时"
  - "调试所有者或包作用域错误时"
  - "添加发布 UI、CLI 或后端行为时"
---

# <a id="publishing"></a> 出版

发布会将技能文件夹或插件包发送到您选择的所有者下的 ClawHub。 ClawHub 检查您的令牌是否可以为该所有者发布，验证元数据、名称、版本、文件和源信息，然后将发布存储为待处理，并对该确切的工件运行自动安全检查。

如果验证失败，则不会发布任何内容。在安全检查通过之前，待发布的版本不会出现在搜索、安装和下载界面中。如果检查发现恶意内容、重复失败或超时，则不会发布该版本。

## <a id="skills"></a> 技能

最简单的发布路径是 CLI。登录，然后发布本地技能文件夹：

```bash
clawhub login
clawhub skill publish ./my-skill \
  --slug my-skill \
  --name "My Skill" \
  --owner <owner>
```

发布给组织所有者时使用 `--owner <handle>`。省略它以作为经过身份验证的用户发布。发布会跳过未更改的内容。新技能从`1.0.0`开始，以后改动自动发布下一个补丁版本。仅当您需要显式版本时才传递 `--version`。

### <a id="skill-catalog-metadata"></a> 技能目录元数据

类别将技能放置在 ClawHub 技能浏览页面的类别过滤器中。主题成为所选类别内提供的过滤器芯片。发布时设置两者：

```bash
clawhub skill publish ./my-skill \
  --categories development,operations \
  --topics "git,worktree,cleanup"
```

两个标志都采用逗号分隔值。类别必须是此列表中的子集，完全匹配，因此 `Development` 被拒绝。主题是自由格式的标签； ClawHub 存储您传递的内容并显示规范化形式，因此 `Git Worktree` 显示为 `#git-worktree`。

| 蛞蝓            | 描述                                                               |
| --------------- | ------------------------------------------------------------------------- |
| `integrations`  | 连接服务、获取数据、协调记录和操作 API。        |
| `automation`    | 构建可重复的流程、计划作业、管道和编排。 |
| `research`      | 搜索、浏览、抓取、总结、监控和提取网络信息。  |
| `development`   | 检查、编辑、测试、构建、调试和操作代码库。                 |
| `productivity`  | 管理任务、日历、电子邮件、会议、项目和业务工作。    |
| `communication` | 消息、发布和运营社交或通信服务。           |
| `creative`      | 创建和编辑图像、视频、音频、音乐、设计和写作。         |
| `knowledge`     | 处理文档、笔记、知识库、教学和学习。      |
| `agents`        | 改变代理计划、反映、学习、记忆或协作的方式。  |
| `operations`    | 检查、监控、部署和操作本地系统或基础设施。    |
| `security`      | 审核、扫描、验证和保护系统或数据。                   |
| `finance`       | 处理支付、预算、银行、购物、市场和商业方面的工作。    |
| `lifestyle`     | 旅行、健康、健身、烹饪、运动、家居和日常生活公用事业。 |
| `other`         | 尚不适合其他浏览类别的技能。                       |

规则 ClawHub 适用于这两个字段：

- A技能最多可携带3个类别，最多5个主题。
- 未知类别 slug 导致发布失败。 `--dry-run` 不检查段塞；发布运行时注册表会验证它们。
- 当 `other` 与特定类别一起传递时，它会被删除。此后应用 3 类别限制，因此 `other,development,operations` 存储两个类别而不是失败。
- 重复项会被丢弃而不是被拒绝，并且它们在标准化后会匹配，因此 `git,Git` 是一个主题。这两个限制都计算此后剩下的内容，而不是您通过的内容。
- 每个主题最多为48个字符，并且主题不能包含不可见的格式字符。
- 这些主题名称由 ClawHub 保留并被拒绝：`approved`、`audited`、`certified`、`clawhub`、`community`、`curated`、`endorsed`、 `featured`、`official`、`officials`、`openclaw`、`recommended`、`staff-pick`、`trusted`、`trusted-publisher`、`verified`。检查以规范化形式运行，因此 `Official` 和 `staff pick` 也会被拒绝。
- A 首​​次在没有 `--categories` 的情况下发布的技能存储为 `other`，因此它仅出现在“其他”类别下。
- 在以后的发布中，省略 `--categories` 或 `--topics` 会保留已存储的值。再次传递标志来更改它们。传递空值会清除字段：`--categories ""` 将技能返回到 `other`，`--topics ""` 删除其主题。
- 即使文件没有更改，传递任一标志也会发布，因此以这种方式修复元数据会创建新的补丁版本。

技能所有者还可以从 ClawHub 上的技能设置页面编辑类别和主题。这是对已发布到 `other` 中的技能的最快修复。

### <a id="publishing-from-a-catalog-repo"></a> 从目录存储库发布

对于目录存储库，请使用 ClawHub 的可重用 [`skill-publish.yml` 工作流程](https://github.com/openclaw/clawhub/blob/main/.github/workflows/skill-publish.yml)。它为 `root`（默认：`skills`）下的每个即时技能文件夹调用 `skill publish`，或仅调用 `skill_path` 提供的文件夹。

```yaml
jobs:
  publish:
    uses: openclaw/clawhub/.github/workflows/skill-publish.yml@main
    with:
      owner: <owner>
      dry_run: false
    secrets:
      clawhub_token: ${{ secrets.CLAWHUB_TOKEN }}
```

使用 `dry_run: true` 预览新的和更改的技能，而无需发布。

自动变更日志生成和预览使用十秒的提供者截止日期，包括响应正文读取。如果提供程序不可用或超时，ClawHub 将返回本地后备注释，以便可以继续发布和预览。

该工作流程将可选的 `changelog`、`categories` 和 `topics` 输入转发到 `skill publish`，以及用于删除技能已携带的元数据的 `clear_categories` 和 `clear_topics`。首次发布的技能如果没有`categories`，则存储为`other`，与[`clawhub sync`](/clawhub/cli#sync)相同；您还可以稍后从技能的设置页面设​​置目录元数据。

与 `tags` 一样，`categories` 和 `topics` 适用于运行发布的 **every** 技能，并提供它们会暂停未更改的技能跳过 — 运行会发布每个选定技能的新补丁版本，包括文件未更改的技能。通过 `skill_path` 将其绑定到一项技能。有关完整行为，请参阅 [ 工作流程说明 ](/clawhub/cli#github-actions-1)。

## <a id="plugins"></a> 插件

插件使用 npm- 风格的包名称。作用域包名称在名称的第一部分包含所有者：

```text
@owner/package-name
```

范围必须与选定的发布所有者匹配。如果您的包名为 `@openclaw/dronzer`，则只能以 `@openclaw` 的形式发布。如果您发布为 `@vintageayu`，请将包重命名为 `@vintageayu/dronzer`。

这可以防止包声明发布者无法控制的组织命名空间。

如果您是已在 ClawHub 上声明或保留的组织、品牌、包范围、所有者句柄或命名空间的合法所有者，请使用公开的非敏感证据打开 [Org / 命名空间声明问题 ](https://github.com/openclaw/clawhub/issues/new?template=org-namespace-claim.yml)。请参阅 [Org 和命名空间 Claims](/clawhub/namespace-claims)，了解要包含的内容以及不包含在公共问题中的内容。

### <a id="before-publishing-a-plugin"></a> 发布插件之前

- 选择与包范围匹配的所有者。
- A 代码插件的清单 `id` 在该发布者的包中必须是唯一的。不同的发布者可以在不同范围的包名称下分发相同的运行时 ID。选择显式范围名称来安装社区包；已知裸机OpenClaw别名选择官方包。一次 OpenClaw 安装仍为每个运行时 ID 使用一个插件。
- 包括`openclaw.plugin.json`。代码插件还需要 `package.json` 以及 `openclaw.compat.pluginApi` 和 `openclaw.build.openclawVersion`。
- 要显示自定义插件目录图标，请在已发布存档的包根目录中包含 `assets/icon.png`。使用不大于 512 KiB 的有效 PNG。
- 包括源存储库和确切的提交元数据，或使用 GitHub- 支持的签出中的 CLI，以便它可以检测到它们。
- 在发布之前运行 `clawhub package validate <source>`。有关包、清单、SDK 导入或工件结果，请参阅 [ 插件验证修复 ](/clawhub/plugin-validation-fixes)。
- 在创建版本之前运行 `clawhub package publish <source> --dry-run`。
- 预计新版本不会出现在公共安装表面，直到自动安全检查和验证完成。

检查员操作故障报告故障阶段。临时工作区清理失败也会阻止发布，并与任何原始检查结果一起出现；它不会消除主要错误。这些失败与插件政策的发现不同。要求维护人员调查时报告阶段和 Convex 请求 ID；请勿在诊断报告中包含凭据或包内容。

### <a id="plugin-icons"></a> 插件图标

ClawHub 使用捆绑的 `assets/icon.png` 作为插件目录图稿。清单 `icon` URL 和路径将被忽略。如果您的 npm 软件包使用 `files` 允许列表，请将资产包含在其中并检查 `npm pack --dry-run` 以确认它将发货。丢失或无效的图稿会退回到插件类别字形。

仅具有清单图标 URL 的现有版本也使用类别字形。发布包含 `assets/icon.png` 的新版本以恢复自定义艺术品。 ClawHub 验证并托管捆绑的 PNG；外部图像 URL 不是受支持的替代品。

部署捆绑图标支持后，维护人员可以使用 `maintenance:repairPluginIconsInternal` 修复现有的最新版本。修复使用版本中已有的资产，或者，对于活跃 OpenClaw 发布者拥有的官方 `@openclaw` 软件包，使用版本记录的 OpenClaw 源提交中的资产。在每个返回的 `cursor` 之后，对 `family: "code-plugin"` 和 `family: "bundle-plugin"` 运行默认的试运行，直到 `isDone`。使用 `dryRun: false` 从初始光标应用，然后重复试运行以验证没有剩余匹配项。 URL-only 没有捆绑资产的版本无法通过此修复恢复。

### <a id="plugin-catalog-metadata"></a> 插件目录元数据

选择某人安装该插件的单一主要原因。代码插件和捆绑插件可以在其根 `openclaw.plugin.json` 中声明一个类别：

```json
{
  "id": "example-agent-runtime",
  "categories": ["agent-runtimes"]
}
```

将 `categories` 字段合并到现有清单中。使用当前插件类别 slug，例如 `context`、`memory` 或 `developer-tools`；显式声明优先于自动分类。每个新版本必须准确声明一个类别或省略该字段。

当省略 `categories` 时，ClawHub 使用其配置的模型从有界包元数据和文档生成一个类别（默认值：GPT-5.6 Luna）。当分类不可用时，它会回退到 `other`。先前版本的类别不是作者声明，并且不会仅仅通过省略而保留。

包 CLI 的 `--categories` 标志和可重用工作流程的 `categories` 和 `clear_categories` 输入已针对插件弃用。它们仍然被接受，但被忽略，并在 stderr 上发出警告。将选定的类别移至清单中；删除该字段以返回自动分类。这也适用于 `--categories ""`，它不再清除插件类别。实验爪发布和技能发布保留其现有的类别行为。

主题保持独立：使用 `--topics` 或工作流程的 `topics` 输入来设置它们，省略输入以保留现有主题，或使用 `--topics ""` / `clear_topics: true` 清除它们。请参阅[软件包CLI参考](/clawhub/cli#package-publish-%3Csource%3E)和[主题规则](#skill-catalog-metadata)。

### <a id="trusted-publishing-for-packages"></a> 包的可信发布

包可信发布是一个两步设置：

1. 通过正常手动或令牌认证的 `clawhub package publish` 发布一次包。这将创建包行并建立可以更改其受信任发布者配置的包管理器。
2. A 包管理器设置 GitHub Actions 可信发布者配置：

```bash
clawhub package trusted-publisher set @owner/package-name \
  --repository owner/repo \
  --workflow-filename package-publish.yml
```

设置配置后，未来支持的 GitHub 操作发布可以使用 OIDC/trusted 发布，而无需在存储库中存储长期存在的 ClawHub 令牌。配置的存储库和工作流文件名必须与 GitHub 操作 OIDC 声明匹配。如果您还传递 `--environment <name>`，则 GitHub 操作环境声明必须与该名称完全匹配。

设置可信发布者配置后，ClawHub 验证配置的 GitHub 存储库。公共存储库可以通过公共 GitHub 元数据进行验证。私有存储库要求 ClawHub 具有对该存储库的 GitHub 访问权限，例如通过未来的 ClawHub GitHub 应用程序安装或其他授权的 GitHub 集成。

当前的可重用包发布工作流支持在 `id-token: write` 可用时发布 `workflow_dispatch` 的无秘密可信发布。标签推送真正的发布仍然需要 `clawhub_token`，因此请保持 `CLAWHUB_TOKEN` 可用于标签发布、首次发布、不受信任的包或打破玻璃发布。

默认情况下，通过可重用工作流程进行真实发布，等待分阶段尝试公开。当安全检查阻止或失败尝试、尝试过期或达到 30 分钟发布截止时间时，工作流将失败。呼叫者可以通过 `publication_timeout_minutes` 调整截止日期。最长为 40 分钟，留出 35 分钟的可重复使用作业时间用于设置、上传和输出捕获。仅针对有意异步发布设置 `wait_for_publication: false`。

使用以下命令检查或删除配置：

```bash
clawhub package trusted-publisher get @owner/package-name
clawhub package trusted-publisher delete @owner/package-name
```

删除受信任的发布者配置是回滚路径。它会禁用未来的可信发布令牌铸造，直到包管理器再次设置配置。

### <a id="openclaw-release-recovery"></a> OpenClaw 释放恢复

OpenClaw 自动发布保持非公开状态，直到其确切的发布父尝试成功为止。如果该父级失败或被取消，则发布尝试将永久失败。人员恢复调度需要受保护环境批准和识别原始授权儿童的版本 2 恢复收据。恢复必须使用相同的工作流程参考和 SHA、候选、工具和包库存。该工作流程路线不接受已取消的父级。

已经失败的分阶段插件尝试可以在新的发布者权限下恢复，而无需更改旧的工作流程或其结果：

```sh
clawhub package recover <attempt-id> \
  --manual-override-reason "Retry the retained release artifacts after workflow failure" \
  --wait --json
```

这使用普通的 ClawHub 用户令牌和当前包发布访问权限。它创建具有相同保留工件和版本的后继者，运行新的安全检查，并将失败的尝试和原始授权保留为审核历史记录。当前令牌或发布者访问权限撤销仍然会阻止发布。它不能推翻审核或恢复主动尝试。如果没有 `--wait`，则结果显式待定。等效的 HTTP 路由是 [`POST /api/v1/publish/attempts/{id}/recover`](/clawhub/http-api#post-%2Fapi%2Fv1%2Fpublish%2Fattempts%2F%7Bid%7D%2Frecover)。

操作员可以预览孤立包尝试，提供精确的 `version`、可选的 `slugPrefix` 或 `attemptIds` 以及 `reason`：

```sh
bunx convex run --prod maintenance:discardStalePackagePublishAttemptsInternal \
  '{"version":"2026.9.1","slugPrefix":"@openclaw/","reason":"Release parent failed after staging"}'
```

默认为试运行；添加 `"dryRun":false` 以放弃每个待处理的版本并取消其尝试。登录管理员可以运行与 `maintenance:discardStalePackagePublishAttempts` 操作相同的操作。原因在 `/api/v1/publish/attempts/<id>` 处显示为 `error`，因此请使用面向发布者的措辞。此操作永远不会丢弃已发布的版本和终端尝试。

## FAQ

### <a id="package-scope-must-match-selected-owner"></a> 包作用域必须与所选所有者匹配

如果包作用域和所选所有者不匹配，ClawHub 会拒绝该发布：

```text
Package scope "@openclaw" must match selected owner "@vintageayu".
Publish as "@openclaw" or rename this package to "@vintageayu/dronzer".
```

要修复此问题，请选择包范围指定的所有者，或重命名包，以便范围与您可以发布的所有者相匹配。

如果包名称已经具有正确的范围，但该包由错误的发布者拥有，请改为转移所有权：

```sh
clawhub package transfer @opik/opik-openclaw --to opik
```

包传输需要当前所有者和目标发布者的管理员访问权限，除非由平台管理员执行。使用 `--to <owner>` 选择现有的活动目标发布者。范围内的包名称只能传输到与其范围匹配的发布者。详细信息请参见 [`package transfer`](/clawhub/cli#package-transfer-%3Cname%3E)。

技能使用单独的 [ 所有权转让工作流程](/clawhub/cli#transfer)。转移给另一个用户通常需要收件人接受。

如果您无权访问当前所有者，但相信您的组织、项目或品牌是合法的命名空间所有者，请打开 [Org/命名空间声明问题 ](https://github.com/openclaw/clawhub/issues/new?template=org-namespace-claim.yml)，并提供公开的非敏感证据供员工审核。归档前请参阅 [Org 和命名空间 Claims](/clawhub/namespace-claims)。

这可以保护组织命名空间。名为 `@openclaw/dronzer` 的包声明了 `@openclaw` 命名空间，因此只有有权访问 `@openclaw` 所有者的发布者才能发布它。
