---
summary: "如何创作、发布和发现实验性 Claw 包。"
read_when:
  - "编写 Claw 包"
  - "将 Claw 发布到实验性 ClawHub 部署"
  - "通过包 API 发现已发布的利爪"
---

# <a id="experimental-claw-packages"></a> 实验爪包

Claw 是一个版本控制包，描述了一个完整的 OpenClaw 代理及其所需的可重用资源。 ClawHub 存储并扫描包裹； OpenClaw 拥有本地预览、同意、应用、更新和删除。

默认情况下可以使用爪发布和精确名称读取。托管 Claw 不会在 OpenClaw 中启用本地预览或安装。

对于初始公共目录、包列表、搜索和官方 Claw 源，仅包括由具有当前官方指定的活跃 OpenClaw 发布者组织拥有的 `@openclaw/*` Claw。此目录过滤器不会更改 Claw 出版物或确切名称元数据和工件下载。其他出版商仍须遵守正常的所有权、扫描、审核和访问规则；最初的目录中没有提供他们的爪子。在发布新的限制快照之前，在此限制之前存储的 Claw feed 不可用。如果 `@openclaw` 失去官方状态，则现有的非空 Claw feed 将无法以 `503` 和 `Cache-Control: no-store` 关闭。撤销后发布新的 Feed 快照，以服务于空的符合条件的 Claws 列表。

## <a id="package-shape"></a> 封装形状

可发布的 Claw 是一个普通的包目录，带有指向其清单的 `package.json`：

```json
{
  "name": "@openclaw/github-triage",
  "version": "1.0.0",
  "openclaw": {
    "claw": "CLAW.md"
  }
}
```

`CLAW.md` 以分组的 Claw 开头，表现为 YAML frontmatter。非空 Markdown 正文是便携式代理提示符； OpenClaw 应用其确切的 UTF-8 内容作为新代理的托管 `SOUL.md`。

```markdown
---
schemaVersion: 1
agent:
  id: github-triage
  name: GitHub Triage
  description: Reviews incoming issues.
categories: [engineering, productivity]
workspace:
  files:
    - source: workspace/reference.md
      path: reference.md
packages:
  - kind: skill
    source: clawhub
    ref: "@acme/triage"
    version: 1.2.0
mcpServers: {}
cronJobs: []
---

# GitHub Triage

Reviews and classifies incoming GitHub issues.
```

`categories` 是可选的，接受一到三个不同的小写字母。 ClawHub 新版本接受以下类别：`personal`、`health`、`travel`、`productivity`、`research`、`engineering`、`governance`、`operations`、 `finance`、`sales`、`product` 和 `people`。声明的类别优先； ClawHub 拒绝无法识别的段头。如果省略，ClawHub 会尝试从清单和文档中对 Claw 进行分类，如果分类不可用，则使用 `Other`。要更正推断的类别，请将 `categories` 添加到 `CLAW.md` 并发布新版本。

JSON 清单保持兼容。将`openclaw.claw`设置为与包相关的JSON文件，例如`openclaw.claw.json`； JSON 没有 Markdown 主体，因此当需要等效提示时显式声明 `workspace.bootstrapFiles.SOUL.md`。

请勿将非空 `CLAW.md` 主体与可移植目标为 `SOUL.md` 的显式工作区文件组合。 ClawHub 拒绝这种模棱两可的双重来源。正文中的标题和任务列表是提示文本，而不是打包时命令。

每个 `workspace.*.source` 必须在同一包中命名一个文件。模式、模板、示例和图像等资产是可移植的普通工作区文件；将它们放在 `assets/`、`schemas/` 或 `templates/` 等路径下，并在 `workspace.files` 中声明它们。包名称和版本必须匹配 `package.json`，依赖项版本必须准确，并且 MCP 环境值必须保持未解析的 `${ENV_VAR}` 引用。

## <a id="bootstrap-and-harness-profiles"></a> 引导带和harness型材

可选的包根 `BOOTSTRAP.md` 包含首次运行指令。它通过支撑背带播种一次，并与 `CLAW.md` 体内的可重复使用便携式提示保持分离。不要将根 `BOOTSTRAP.md` 声明为工作区目标；该路径是为包根文件保留的。 ClawHub 在有界目录摘要中包含引导程序的存在，但不包含其内容。

特定于harness的调整使用传统的包路径：

```text
profiles/openclaw.yml
profiles/hermes.yml
profiles/codex.yml
```

`profiles/` 命名空间是为这些小写、单文件 `.yml` 路径保留的。每个配置文件都是 JSON- 兼容的 YAML 映射。 ClawHub 验证通用形状，并根据已发货的 OpenClaw v1 消费者合约验证 `profiles/openclaw.yml`，包括注册的内置工具配置文件和有界工具授权；它不解释外国资料。应用包时，harness仅发现自己的配置文件并忽略其他配置文件。确切发布的工件及其摘要仍然涵盖每个配置文件、引导指令和资产。

退役的 `metadata.openclaw.config` 指针被拒绝。将该文件移至 `profiles/openclaw.yml` 并删除元数据条目。

OpenClaw-native 扩展包属于 `profiles/openclaw.yml`，而便携式 MCP 服务器则保留在 `CLAW.md` 中：

```yaml
schemaVersion: 1
agent:
  tools:
    profile: coding
    allow: [read]
extensions:
  - id: issue-tools
    kind: plugin
    format: openclaw
    source: clawhub
    ref: "@acme/issue-tools"
    version: 2.3.4
```

扩展 ID 和包引用必须是唯一的，并且版本必须准确。其他工具可以使用它们自己的本机配置文件模型来绑定相同的应用程序需求；可移植清单不强加功能名称注册表。

## <a id="validate%2C-build%2C-and-publish"></a><a id="validate-build-and-publish"></a> 验证、构建和发布

验证源项目并使用 OpenClaw 构建其确定性工件：

```bash
openclaw claws validate .
openclaw claws build . --out ./github-triage-1.0.0.tgz
```

预览确切的工件而不上传它，然后通过现有的经过身份验证的包流程发布它：

```bash
clawhub package publish ./github-triage-1.0.0.tgz --family claw --dry-run
clawhub package publish ./github-triage-1.0.0.tgz --family claw --wait
```

当 `package.json` 包含 `openclaw.claw` 时，CLI 会检测到 `family: claw`，因此对于格式良好的封装，`--family claw` 是可选的。

Experimental Claw 出版物仅接受已构建的 npm-pack `.tgz`，而不接受源目录或 GitHub 签出。 CLI随请求发送本地工件SHA-256； ClawHub 在发布之前根据上传的字节对其进行验证，并通过待处理和最终响应返回相同的摘要。

出版拒绝：

- a 缺失、无效或转义 `openclaw.claw` 路径；
- a 源文件夹而不是内置的 `.tgz`；
- 软件包标识或版本不匹配；
- a 缺失或不匹配预期工件 SHA-256；
- 格式错误的 `CLAW.md` frontmatter 或清单字段；
- a 非空 `CLAW.md` 主体与显式 `SOUL.md` 目标相结合；
- 缺少工作区源文件或可移植路径冲突；
- 无效的包根引导指令或常规harness配置文件；
- 已退役的`metadata.openclaw.config`指针；
- 浮动skill/plugin版本并解析了MCP凭证。

接受的包继续通过 ClawHub 的现有所有权、审核、静态扫描、发布和工件存储管道。存储的版本保留了精确的工件以及用于以后搜索和详细表面的非敏感摘要；下载返回相同的字节和摘要，并且 ClawHub 不会将完整清单复制到凸面存储中。

## <a id="discover-published-claws"></a> 发现已发布的爪子

ClawHub 通过现有包 API 暴露 Claws：

```bash
curl "https://clawhub.ai/api/v1/packages?family=claw"
curl "https://clawhub.ai/api/v1/packages?family=claw&category=travel"
curl "https://clawhub.ai/api/v1/packages/search?q=triage&family=claw"
curl "https://clawhub.ai/api/v1/packages/search?q=trip&family=claw&category=travel"
curl "https://clawhub.ai/api/v1/packages/@openclaw%2Fgithub-triage"
```

列表和搜索结果使用正常的包摘要字段。包和版本详细信息响应还可能包括 `clawManifestSummary`，它报告代理身份、可移植资源计数、harness配置文件计数、OpenClaw- 配置文件计数和本机扩展计数，而不暴露完整的清单或配置文件内容。对于无法分类的爪子，请使用 `category=other`。类别过滤器需要`family=claw`；无法识别的类别会返回验证错误。

完整的清单保留在精确的工件中，并且永远不会通过公开发布响应来预测。

## <a id="consume-the-experimental-feed"></a> 消耗实验饲料

ClawHub 将符合条件的官方 `@openclaw` Claws 作为单独的托管源发布：

```bash
curl "https://clawhub.ai/v1/feeds/claws"
```

这使用了专用的实验性 Claw feed 合约，而不是扩展稳定的 plugin/skill 目录 feed v1 架构。

每个条目都提供准确的包版本、工件 SHA-256、发布者信任和 `clawManifestSummary`。消费者解析并验证该工件，将其解压为正常的 Claw 包目录，并将该目录传递给 OpenClaw 进行本地检查或 `claws add --dry-run`。 ClawHub 不会绕过 OpenClaw 的预览或同意边界。

馈送路由返回 `503`，直到发布当前的官方 Claw 快照。

针对 OpenClaw Claws 结帐运行可重复的注册表到 OpenClaw 证明：

```bash
OPENCLAW_CLAWS_CHECKOUT=/path/to/openclaw \
  bunx vitest run scripts/claws-feed-openclaw-e2e.test.ts --maxWorkers=1
```

该证明提供确定性的托管提要和包工件，验证提要和下载的摘要，提取包，并在隔离状态目录中调用实际的 OpenClaw 源 CLI 和 `claws add --dry-run --json`。
