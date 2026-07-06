---
summary: "文档和示例中的安全扫描器友好型占位符约定"
read_when:
  - 编写包含令牌、API 密钥或凭据片段的文档
  - 更新可能被密钥检测工具扫描的示例
title: "密钥占位符约定"
---

# 密钥占位符约定

使用易于阅读但不类似真实密钥的占位符。

## 推荐样式

- 优先使用描述性值，例如 `example-openai-key-not-real` 或 `example-discord-bot-token`。
- 对于 shell 片段，优先使用 `${OPENAI_API_KEY}`，而不是内联的类令牌字符串。
- 保持示例明显是伪造的，并且限定于其用途（提供商、通道、认证类型）。

## 在文档中避免这些模式

- 字面量 PEM 私钥头或尾文本。
- 看起来像真实凭据的前缀，例如 `sk-...`、`xoxb-...`、`AKIA...`。
- 从运行时日志中复制的、看起来逼真的 bearer token。

## 示例

```bash
# 好
export OPENAI_API_KEY="example-openai-key-not-real"

# 更好（当文档内容是关于环境变量接线时）
export OPENAI_API_KEY="${OPENAI_API_KEY}"
```
