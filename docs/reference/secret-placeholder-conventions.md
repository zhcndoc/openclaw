---
summary: "文档和示例中的安全扫描器友好型占位符约定"
read_when:
  - "编写包含令牌、API 密钥或凭据片段的文档"
  - "更新可能被密钥检测工具扫描的示例"
title: "密钥占位符约定"
---

# <a id="secret-placeholder-conventions"></a> 秘密占位符约定

使用易于阅读但不类似真实密钥的占位符。

## <a id="recommended-style"></a> 推荐样式

- 优先使用描述性值，例如 `example-openai-key-not-real` 或 `example-discord-bot-token`。
- 对于 shell 片段，优先使用 `${OPENAI_API_KEY}`，而不是内联的类令牌字符串。
- 保持示例明显是伪造的，并且限定于其用途（提供商、通道、认证类型）。

## <a id="avoid-these-patterns-in-docs"></a> 在文档中避免这些模式

- 字面量 PEM 私钥头或尾文本。
- 类似于实时凭证的前缀，e.g. `sk-...`、`xoxb-...`、`AKIA...`。
- 从运行时日志中复制的、看起来逼真的 bearer token。

## <a id="example"></a> 示例

```bash
# Good
export OPENAI_API_KEY="example-openai-key-not-real"

# Better (when the doc is about env wiring)
export OPENAI_API_KEY="${OPENAI_API_KEY}"
```
