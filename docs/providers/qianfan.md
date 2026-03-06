---
summary: "使用千帆的统一 API 访问 OpenClaw 中的多个模型"
read_when:
  - 你想用一个 API key 访问多个大语言模型
  - 你需要百度千帆的设置指导
title: "千帆"
---

# 千帆提供者指南

千帆是百度的 MaaS 平台，提供一个**统一的 API**，通过单一的端点和 API key 路由请求到多个模型。它兼容 OpenAI，因此大多数 OpenAI SDK 只需切换基础 URL 即可使用。

## 前提条件

1. 拥有一个具备千帆 API 访问权限的百度云账号
2. 从千帆控制台获取一个 API key
3. 已在系统中安装 OpenClaw

## 获取你的 API key

1. 访问 [千帆控制台](https://console.bce.baidu.com/qianfan/ais/console/apiKey)
2. 创建一个新应用或选择已有应用
3. 生成一个 API key（格式：`bce-v3/ALTAK-...`）
4. 复制该 API key 用于 OpenClaw

## CLI 设置

```bash
openclaw onboard --auth-choice qianfan-api-key
```

## 相关文档

- [OpenClaw 配置](/gateway/configuration)
- [模型提供者](/concepts/model-providers)
- [代理设置](/concepts/agent)
- [千帆 API 文档](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)
