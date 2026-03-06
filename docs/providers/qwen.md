---
summary: "在 OpenClaw 中使用 Qwen OAuth（免费层）"
read_when:
  - 你想在 OpenClaw 中使用 Qwen
  - 你想要免费层的 Qwen Coder OAuth 访问权限
title: "Qwen"
---

# Qwen

Qwen 为 Qwen Coder 和 Qwen Vision 模型提供免费层 OAuth 流程  
（每天 2000 次请求，受 Qwen 速率限制约束）。

## 启用插件

```bash
openclaw plugins enable qwen-portal-auth
```

启用后请重启 Gateway。

## 认证

```bash
openclaw models auth login --provider qwen-portal --set-default
```

此命令会执行 Qwen 设备码 OAuth 流程，并将一个提供者条目写入你的  
`models.json` （并添加一个 `qwen` 别名以便快速切换）。

## 模型 ID

- `qwen-portal/coder-model`
- `qwen-portal/vision-model`

切换模型使用：

```bash
openclaw models set qwen-portal/coder-model
```

## 重用 Qwen Code CLI 登录

如果你已经使用 Qwen Code CLI 登录过，OpenClaw 会在加载认证存储时  
从 `~/.qwen/oauth_creds.json` 同步凭据。你仍然需要一个  
`models.providers.qwen-portal` 条目（使用上述登录命令来创建）。

## 注意事项

- 令牌会自动刷新；如果刷新失败或访问被撤销，请重新运行登录命令。
- 默认基础 URL：`https://portal.qwen.ai/v1`（如果 Qwen 提供了不同的端点，  
  可通过 `models.providers.qwen-portal.baseUrl` 覆盖）。
- 详情请参见 [模型提供者](/concepts/model-providers) 中的提供者通用规则。
