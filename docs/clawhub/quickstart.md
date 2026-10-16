---
summary: "开始使用 ClawHub：查找、安装、更新和发布技能或插件。"
read_when:
  - "第一次使用ClawHub"
  - "从注册表安装技能或插件"
  - "发布到 ClawHub"
---

# <a id="quickstart"></a> 快速入门

ClawHub 是 OpenClaw 技能和插件的注册表。

当您将东西安装到 OpenClaw 中时，请使用 OpenClaw。当您登录、发布、管理您自己的列表或使用特定于注册表的工作流程时，请使用 `clawhub` CLI。

## <a id="find-and-install-a-skill"></a> 查找并安装技能

从 OpenClaw 搜索：

```bash
openclaw skills search "calendar"
```

安装技能：

```bash
openclaw skills install @openclaw/demo
```

更新已安装的技能：

```bash
openclaw skills update --all
```

OpenClaw记录了该技能的来源，以便以后的更新可以通过ClawHub继续解决。

## <a id="find-and-install-a-plugin"></a> 查找并安装插件

从 OpenClaw 搜索：

```bash
openclaw plugins search "calendar"
```

使用显式 ClawHub 源安装 ClawHub-hosted 插件：

```bash
openclaw plugins install clawhub:<package>
```

更新已安装的插件：

```bash
openclaw plugins update --all
```

当您希望 OpenClaw 通过 ClawHub 而不是 npm 或其他源解析包时，请使用 `clawhub:` 前缀。

## <a id="sign-in-for-publishing"></a> 登录发布

安装 ClawHub CLI：

```bash
npm i -g clawhub
# or
pnpm add -g clawhub
```

使用 GitHub 登录：

```bash
clawhub login
clawhub whoami
```

无头环境可以使用来自 ClawHub Web UI 的 API 令牌：

```bash
clawhub login --token clh_...
```

## <a id="publish-a-skill"></a> 发布技能

技能是一个包含所需 `SKILL.md` 文件和可选支持文件的文件夹。

```bash
clawhub skill publish ./my-skill \
  --slug my-skill \
  --name "My Skill" \
  --changelog "Initial release"
```

该命令会跳过未更改的内容。新技能从`1.0.0`开始；以后的更改会自动发布下一个补丁版本。使用 `--dry-run` 进行预览或使用 `--version` 选择显式版本。

发布前，检查`SKILL.md`中的元数据。声明所需的环境变量、工具和权限，以便用户在安装技能之前可以了解该技能需要什么。参见[技能格式](/clawhub/skill-format)。

对于包含多个技能的存储库，可重用 GitHub 工作流程为 `skills/` 下的每个直接技能文件夹调用 `skill publish`：

```yaml
jobs:
  preview:
    uses: openclaw/clawhub/.github/workflows/skill-publish.yml@main
    with:
      dry_run: true
```

## <a id="publish-a-plugin"></a> 发布插件

从本地文件夹、GitHub 存储库、GitHub 引用或现有存档发布插件：

```bash
clawhub package publish <source> --family code-plugin --dry-run
clawhub package publish <source> --family code-plugin
```

先使用`--dry-run`预览解析后的包元数据、兼容性字段、来源归属、上传计划，无需发布。

代码插件必须在 `package.json` 中包含 OpenClaw 兼容性元数据，包括 `openclaw.compat.pluginApi` 和 `openclaw.build.openclawVersion`。

## <a id="inspect-before-installing"></a> 安装前检查

安装之前，使用 ClawHub 网页或 CLI 详细命令检查元数据、源链接、版本、更改日志和扫描状态：

```bash
clawhub inspect @openclaw/demo
clawhub package inspect <package>
```

公开列表显示最新的扫描状态。通过审核而保留或阻止的版本可能会在搜索和安装界面中隐藏，直到解决为止。
