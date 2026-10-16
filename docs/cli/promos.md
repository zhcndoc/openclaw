---
summary: "`openclaw promos` 的 CLI 参考（列出并领取促销模型优惠）"
read_when:
  - "你想尝试 ClawHub 提供的免费促销模型优惠"
  - "你正在通过促销而不是 onboarding 来配置提供商"
title: "促销"
---

# `openclaw promos`

发现并领取在 ClawHub 上发布的促销模型优惠。领取促销会配置提供商（在需要时包括 auth 和 plugin）并注册该促销的模型——无需重新运行 onboarding，也不会更改你的默认模型，除非你明确这样做。

相关：

- 默认模型和回退： [Models](/cli/models)
- 提供商身份验证设置：[入门](/start/getting-started)

## <a id="commands"></a> 命令

```bash
openclaw promos list
openclaw promos claim <slug>
openclaw promos claim <slug> --api-key <key> --set-default
```

## `openclaw promos list`

列出当前正在进行的促销活动，以及它们的模型、建议的默认项、剩余时间和精确的领取命令。`--json` 会打印原始负载。

## `openclaw promos claim <slug>`

申领一个进行中的促销：

1. 从 ClawHub 获取促销，并验证其是否处于有效时间窗口内。
2. 根据你已安装的 OpenClaw 版本，验证促销的提供商、认证方式和声明的插件包。 不认识的 id 或包不匹配都会被拒绝——促销绝不会让 CLI 去运行任何它本来就不知道如何执行的内容。
3. 重新使用您拥有的现有提供商凭据。否则，它会执行提供商的正常身份验证流程（首先打印促销注册 URL 以获得免费密钥）。 `--api-key <key>` 在没有提示的情况下完成 API-key 身份验证，匹配 `openclaw onboard` 非交互式标志；要使密钥远离命令行，请导出提供程序的环境变量（例如 `OPENROUTER_API_KEY`） - 会自动检测现有的 env 凭据，并且不需要任何标志。
4. 将促销中的模型及其别名注册进去。已有别名绝不会被覆盖。
5. 询问是否将促销推荐的模型设为默认值—— `--set-default` 会跳过此问题；否则你的默认设置不会有任何变化。

当促销时间窗口结束后，提供商将停止提供这些免费模型； 你的配置和凭据不会受到影响。你可以随时使用 `openclaw models set <model>` 切换回来。

<a id="passive-discovery-in-models-list" />

## <a id="model-inventory-and-offers"></a> 模型库存及报价

运行 `openclaw promos list` 以发现当前优惠及其声明命令。普通 `openclaw models list` 读取模型目录，无需刷新促销源、添加促销通知或更改通知状态。现有的声明模型配置和凭据仍然可用。

声明会针对实时 ClawHub API 重新验证要约，因此即使较旧的缓存副本仍显示已撤回的要约，也会拒绝该要约。

## <a id="related"></a> 相关内容

- [CLI 参考](/cli)
- [`openclaw models`](/cli/models) — 这些促销活动适用的模型
