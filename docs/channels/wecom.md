---
summary: "安装官方企业微信插件并查找其版本化设置文档"
read_when:
  - 你想将 OpenClaw 连接到企业微信
  - 你需要受支持的企业微信插件及其设置文档
title: "企业微信"
---

OpenClaw 通过由腾讯企业微信团队维护的外部
`@wecom/wecom-openclaw-plugin` 软件包提供企业微信支持。
该插件已列入 OpenClaw 的官方频道目录，但未随核心安装包一起提供。

## 安装

```bash
openclaw channels add --channel wecom
openclaw gateway restart
openclaw channels status --channel wecom
```

OpenClaw 目录会安装 `@wecom/wecom-openclaw-plugin` 的确切版本。

## 配置

WeCom 凭据、连接模式、回调路由和访问控制行为属于外部插件，并且可以独立于
OpenClaw 发生变化。配置频道之前，请参阅已安装版本对应的
[软件包文档](https://www.npmjs.com/package/@wecom/wecom-openclaw-plugin)。

独立升级插件时，请继续参考已安装版本的文档。
