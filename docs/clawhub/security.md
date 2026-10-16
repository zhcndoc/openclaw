---
summary: "如何报告 ClawHub 安全问题以及何时公开披露漏洞。"
read_when:
  - "报告 ClawHub 安全问题"
  - "了解 ClawHub 漏洞披露"
  - "区分 ClawHub 平台问题与第三方技能或插件问题"
title: "安全"
sidebarTitle: "安全"
---

# <a id="security"></a> 安全

ClawHub 安全问题可以通过 `openclaw/clawhub` 的 GitHub 安全公告进行报告。

使用 GitHub 安全公告来查找 ClawHub 本身的漏洞。好的 ClawHub 咨询报告包括以下方面的错误：

- ClawHub 网站、API 或 CLI
- 注册表发布、下载、安装或工件完整性
- 身份验证、授权或 API 令牌
- 扫描、审核或报告处理

请勿使用 ClawHub 针对第三方技能或插件自身源代码中的漏洞的建议。直接向 ClawHub 列表中链接的发布者或源存储库报告这些内容。

## <a id="vulnerability-disclosure"></a> 漏洞披露

由于ClawHub是托管云应用程序，因此默认情况下不会公开披露ClawHub服务漏洞。当有证据表明存在真正的用户影响或用户需要采取行动时，它们就会被公开披露。

真实用户影响的示例包括已确认的利用、用户数据或秘密的暴露、由于平台故障而到达用户的恶意内容，或者需要用户轮换凭证、更新本地软件或采取其他保护措施的任何问题。

用户安装的软件中的漏洞已公开披露，例如 ClawHub CLI 软件包、二进制文件、库或用户需要在本地更新的其他发布工件。

## <a id="related-pages"></a> 相关页面

有关安装时审核标签、风险级别、结果和解释，请参阅 [Security Audits](/clawhub/security-audits)。

有关市场报告、审核保留、隐藏列表、禁令和帐户信誉，请参阅 [ 审核和帐户 Safety](/clawhub/moderation)。
