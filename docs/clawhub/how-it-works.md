---
summary: "ClawHub 列表、版本、安装、发布、扫描和更新如何工作。"
read_when:
  - "了解列表、版本、安装、发布和审核"
---

# <a id="how-clawhub-works"></a> ClawHub 的工作原理

ClawHub 是 OpenClaw 技能和插件的注册表层。它为用户提供了一个发现包的地方，为发布者提供了一个发布版本的地方，并为 OpenClaw 提供了足够的元数据来安全地安装和更新这些包。

## <a id="registry-records"></a> 注册记录

每个公开列表都是一个注册表记录，其中包含：

- an 所有者和 slug 或包名称
- one或更多已发布版本
- 元数据、摘要、文件和来源归属
- changelog 和标签信息，例如 `latest`
- 下载、安装和星标信号
- 安全扫描和审核状态

列表页面是用户在安装技能或插件之前检查其功能的规范位置。

## <a id="skills"></a> 技能

技能是以 `SKILL.md` 为中心的版本化文本包。它可以包括支持文件、示例、模板和脚本。

ClawHub 阅读 `SKILL.md` frontmatter 以了解技能名称、描述、要求、环境变量和元数据。准确的元数据很重要，因为它可以帮助用户决定是否安装该技能，并帮助自动扫描检测声明的行为和观察到的行为之间的不匹配。

参见[技能格式](/clawhub/skill-format)。

## <a id="plugins"></a> 插件

插件打包为 OpenClaw 扩展。 ClawHub 存储包元数据、兼容性信息、源链接、工件和版本记录。

当 OpenClaw 从 ClawHub 安装插件时，它会在安装之前检查广告的兼容性元数据。包记录可以包括 API 兼容性、最低网关版本、主机目标、环境要求和工件摘要。

当您希望注册表成为真实来源时，请使用显式 ClawHub 安装源：

```bash
openclaw plugins install clawhub:<package>
```

## <a id="publishing"></a> 出版

发布会创建一个新的不可变版本记录。发布者使用 `clawhub` CLI 进行身份验证的注册表工作流程：

```bash
clawhub skill publish ./my-skill
clawhub package publish <source> --family code-plugin --dry-run
clawhub package publish <source> --family code-plugin
```

在上传之前使用试运行来预览已解析的有效负载。然后，公共页面会显示已发布的元数据、文件、来源归属和扫描状态。

## <a id="installs-and-updates"></a> 安装和更新

OpenClaw 安装命令使用 ClawHub 作为包源：

```bash
openclaw skills install @openclaw/demo
openclaw plugins install clawhub:<package>
```

OpenClaw 记录安装源元数据，以便更新可以稍后解析相同的注册表包。 ClawHub CLI 还支持直接技能安装和更新工作流程，适用于希望在完整 OpenClaw 工作区之外使用注册表管理的技能文件夹的用户。

## <a id="security-state"></a> 安全状态

ClawHub 已开放发布，但发布仍需接受上传门、自动检查、用户报告和版主操作。

公共页面会显示可用的扫描摘要。保留、隐藏或阻止的内容可能会从公共搜索和安装流中消失，但所有者仍然可见以进行诊断。

请参阅 [Security](/clawhub/security)、[Security Audits](/clawhub/security-audits)、[ 审核和帐户 Safety](/clawhub/moderation) 和 [ 可接受的用法](/clawhub/acceptable-usage)。

## <a id="api-access"></a> API 访问

ClawHub 公开用于发现、搜索、包详细信息和下载的公共读取 API。第三方目录在链接回规范的 ClawHub 列表时可以使用这些 API，遵守速率限制并避免暗示认可。

请参阅 [Public API](/clawhub/api) 和 [HTTP API](/clawhub/http-api)。
