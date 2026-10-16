---
summary: "安装外部 WeCom 插件并查找其版本化安装文档"
read_when:
  - "您想要将 OpenClaw 连接到 WeCom"
  - "您需要支持的 WeCom 插件及其设置文档"
title: "WeCom"
---

OpenClaw 通过腾讯 WeCom 团队维护的外部 `@wecom/wecom-openclaw-plugin` 包公开 WeCom。该插件列在 OpenClaw 的官方频道目录中，但未与核心安装捆绑在一起。

## <a id="install"></a> 安装

```bash
openclaw channels add --channel wecom
openclaw channels status --channel wecom
```

OpenClaw 目录安装 `@wecom/wecom-openclaw-plugin` 的精确版本。如果网关离线，则启动网关；请参阅 [ 应用更改并检查 ](/plugins/manage-plugins#apply-changes-and-inspect)。

## <a id="configure"></a> 配置

WeCom 凭据、连接模式、回调路由和访问控制行为属于外部插件，并且可以独立于 OpenClaw 发生变化。配置频道之前，请参阅已安装版本对应的 [软件包文档](https://www.npmjs.com/package/@wecom/wecom-openclaw-plugin)。

独立升级插件时，请继续参考已安装版本的文档。
