---
summary: "技能文件夹格式、所需文件、支持工件、限制。"
read_when:
  - "出版技巧"
  - "调试发布失败"
---

# <a id="skill-format"></a> 技能格式

## <a id="on-disk"></a> 磁盘上

技能是一个文件夹。

必需的：

- `SKILL.md`（或 `skill.md`；也接受旧版 `skills.md`）

可选项：

- any 支持常规文件（参见“技能文件”）
- `.clawhubignore`（忽略发布模式，旧版 `.clawdhubignore`）
- `.gitignore`（也荣幸）

## <a id="github-import"></a> GitHub 进口

Web GitHub 导入器比本地 publish/sync. 更严格，它仅在已登录的 GitHub 帐户拥有的公共非分叉存储库中发现 `SKILL.md` 或旧版 `skills.md` 文件。它不导入私人存储库、分叉、archived/disabled 存储库或第三方公共存储库。

本地安装元数据（由 CLI 编写）：

- `<skill>/.clawhub/origin.json`（旧版 `.clawdhub`）

Workdir安装状态（由CLI编写）：

- `<workdir>/.clawhub/lock.json`（旧版 `.clawdhub`）

## `SKILL.md`

- Markdown 带有可选的 YAML frontmatter。
- 服务器在发布期间从frontmatter中提取元数据。
- `description`用作UI/search.中的技能摘要

对于便携式 Agent Skills，`name` 应与父目录匹配并使用 1-64 个小写字母、数字或连字符。 ClawHub 将可路由的 slug 和目录显示名称分开，因此其他客户端的现有名称仍然可发布，并且不会默默地重写。目录列表可以在视觉上缩短长名称而不改变存储的名称。

## <a id="frontmatter-metadata"></a> Frontmatter 元数据

技能元数据在 `SKILL.md` 顶部的 YAML frontmatter 中声明。这告诉注册表（和安全分析）您的技能需要运行什么。

### <a id="basic-frontmatter"></a> 基本前置事项

```yaml
---
name: my-skill
description: Short summary of what this skill does.
version: 1.0.0
---
```

### <a id="runtime-metadata-(metadata.openclaw)"></a><a id="runtime-metadata-metadata-openclaw"></a> 运行时元数据 （`metadata.openclaw`）

在 `metadata.openclaw` 下声明您的技能的运行时要求（别名：`metadata.clawdbot`、`metadata.clawdis`）。

```yaml
---
name: my-skill
description: Manage tasks via the Todoist API.
metadata:
  openclaw:
    requires:
      env:
        - TODOIST_API_KEY
      bins:
        - curl
    primaryEnv: TODOIST_API_KEY
---
```

使用 `requires.env` 作为技能运行之前必须存在的环境变量。当您需要每个变量的元数据（包括带有 `required: false` 的可选变量）时，请使用 `envVars`。

### <a id="full-field-reference"></a> 完整现场参考

| 字段              | 类型       | 描述                                                                                                                                  |
| ------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `requires.env`     | `string[]` | 您的技能期望的必需环境变量。                                                                                           |
| `requires.bins`    | `string[]` | 必须全部安装的 CLI 二进制文件。                                                                                                     |
| `requires.anyBins` | `string[]` | CLI 二进制文件，其中至少必须存在一个。                                                                                                  |
| `requires.config`  | `string[]` | 您的技能读取的配置文件路径。                                                                                                          |
| `primaryEnv`       | `string`   | 您的技能的主要凭证环境变量。                                                                                                  |
| `envVars`          | `array`    | 使用 `name`、可选 `required` 和可选 `description` 的环境变量声明。为可选环境变量设置 `required: false`。 |
| `always`           | `boolean`  | 如果是 `true`，则技能始终处于活动状态（无需显式安装）。                                                                              |
| `skillKey`         | `string`   | 覆盖技能的调用键。                                                                                                         |
| `emoji`            | `string`   | 显示技能的表情符号。                                                                                                                 |
| `homepage`         | `string`   | URL 到技能的主页或文档。                                                                                                         |
| `os`               | `string[]` | OS 限制（e.g. `["macos"]`、`["linux"]`）。                                                                                             |
| `install`          | `array`    | 安装依赖项的规范（见下文）。                                                                                                  |
| `nix`              | `object`   | Nix 插件规范（参见 README）。                                                                                                                |
| `config`           | `object`   | Clawdbot 配置规范（参见 README）。                                                                                                           |

### <a id="install-specs"></a> 安装规格

如果您的技能需要安装依赖项，请在 `install` 数组中声明它们：

```yaml
metadata:
  openclaw:
    install:
      - kind: brew
        formula: jq
        bins: [jq]
      - kind: node
        package: typescript
        bins: [tsc]
```

支持的安装类型：`brew`、`node`、`go`、`uv`。

### <a id="optional-environment-variables"></a> 可选环境变量

在 `metadata.openclaw.envVars` 下声明可选环境变量并设置 `required: false`。不要将可选条目添加到 `requires.env`，因为 `requires.env` 意味着技能没有它们就无法运行。

```yaml
metadata:
  openclaw:
    primaryEnv: TODOIST_API_KEY
    envVars:
      - name: TODOIST_API_KEY
        required: true
        description: Todoist API token used for authenticated requests.
      - name: TODOIST_PROJECT_ID
        required: false
        description: Optional default project ID when the user does not specify one.
```

### <a id="why-this-matters"></a> 为什么这很重要

ClawHub 的安全分析会检查您的技能声明是否与实际相符。如果您的代码引用了 `TODOIST_API_KEY`，但您的 frontmatter 未在 `requires.env`、`primaryEnv` 或 `envVars` 下声明它，则分析将标记元数据不匹配。保持声明准确有助于您的技能通过审核并帮助用户了解他们正在安装的内容。

### <a id="example%3A-complete-frontmatter"></a><a id="example-complete-frontmatter"></a> 示例：完整的 frontmatter

```yaml
---
name: todoist-cli
description: Manage Todoist tasks, projects, and labels from the command line.
version: 1.2.0
metadata:
  openclaw:
    requires:
      env:
        - TODOIST_API_KEY
      bins:
        - curl
    primaryEnv: TODOIST_API_KEY
    envVars:
      - name: TODOIST_API_KEY
        required: true
        description: Todoist API token.
      - name: TODOIST_PROJECT_ID
        required: false
        description: Optional default project ID.
    emoji: "\u2705"
    homepage: https://github.com/example/todoist-cli
---
```

## <a id="skill-files"></a> 技能文件

发布接受技能文件夹中的所有常规文件，无论扩展名如何。忽略文件、隐藏路径、符号链接、macOS 元数据和服务器端大小限制仍然适用。

- 包含有效 UTF-8 的 Bounded 文件可以作为转义纯文本进行预览，并包含在有界文本分析中。
- 其他文件保留其确切字节并可供下载。
- 安全扫描仪接收完整的存储工件；文本检测是一个渲染和分析问题，而不是上传白名单。

限制（服务器端）：

- 捆绑包总大小：50MB。
- 嵌入文本包括 `SKILL.md` + 最多约 40 个有界 UTF-8 文件（尽力而为上限）。

## <a id="slugs"></a> 子弹

- 默认情况下源自文件夹名称。
- Package 范围必须与 ClawHub 发布者句柄完全匹配。发布者句柄可以使用小写字母、数字、连字符、点和下划线；它们必须以小写字母或数字开头和结尾。
- 封装段必须为小写且 npm- 安全，例如 `@example.tools/demo-plugin` 或 `demo-plugin`。

## <a id="versioning-%2B-tags"></a><a id="versioning-+-tags"></a> 版本控制 + 标签

- 每次发布都会创建一个新版本（semver）。
- Tags 是指向版本的字符串指针；常用的是`latest`。

## <a id="license"></a> 许可证

- ClawHub上发布的所有技能均已获得`MIT-0`的许可。
- 任何人都可以使用、修改和重新分发已发布的技能，包括商业用途。
- 不需要归属。
- 不要在`SKILL.md`中添加冲突的许可条款； ClawHub 不支持按技能许可证覆盖。

## <a id="paid-skills"></a> 付费技能

- ClawHub 不支持付费技能、按技能定价、付费专区或收益分享。
- 不向`SKILL.md`添加定价元数据；它不是技能格式的一部分，不会使已发布的技能付费。
- 如果您的技能与付费第三方服务集成，请在技能说明和环境声明中清楚地记录外部成本和所需帐户（`requires.env` 表示必需变量，或 `envVars` 和 `required: false` 表示可选变量）。
