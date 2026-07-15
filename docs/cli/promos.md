---
summary: "openclaw promos 的 CLI 参考（列出并领取促销模型优惠）"
read_when:
  - 你想尝试 ClawHub 提供的免费促销模型优惠
  - 你正在通过促销而不是 onboarding 来配置提供商
title: "Promos"
---

# `openclaw promos`

发现并领取在 ClawHub 上发布的促销模型优惠。领取促销会配置提供商（在需要时包括 auth 和 plugin）并注册该促销的模型——无需重新运行 onboarding，也不会更改你的默认模型，除非你明确这样做。

相关内容：

- 默认模型和回退： [Models](/cli/models)
- 提供商 auth 设置： [Getting started](/start/getting-started)

## 命令

```bash
openclaw promos list
openclaw promos claim <slug>
openclaw promos claim <slug> --api-key <key> --set-default
```

## `openclaw promos list`

列出当前正在进行的促销活动，以及它们的模型、建议的
默认项、剩余时间和精确的领取命令。`--json` 会打印原始
负载。

## `openclaw promos claim <slug>`

申领一个进行中的促销：

1. 从 ClawHub 获取促销，并验证其是否处于有效时间窗口内。
2. 根据你已安装的 OpenClaw 版本，验证促销的提供商、认证方式和声明的插件包。
   不认识的 id 或包不匹配都会被拒绝——促销绝不会让 CLI 去运行任何它本来
   就不知道如何执行的内容。
3. 在你已有提供商凭据时复用它们。否则会走该提供商的常规认证流程（首先会打印
   促销的注册 URL，以便申请免费密钥）。`--api-key <key>` 可在无提示的情况下完成
   API 密钥认证，与 `openclaw onboard` 的非交互式标志一致；如果想避免把密钥放在命令行上，
   请改为导出该提供商的环境变量（例如 `OPENROUTER_API_KEY`）——系统会自动检测
   现有的环境变量凭据，无需额外标志。
4. 将促销中的模型及其别名注册进去。已有别名绝不会被覆盖。
5. 询问是否将促销推荐的模型设为默认值——
   `--set-default` 会跳过此问题；否则你的默认设置不会有任何变化。

当促销时间窗口结束后，提供商将停止提供这些免费模型；
你的配置和凭据不会受到影响。你可以随时使用
`openclaw models set <model>` 切换回来。

## `models list` 中的被动发现

`openclaw models list` 还会在你没有直接向 ClawHub 询问时，展示促销活动：

- 你尚未配置其模型的有效优惠会出现在表格下方的“可通过促销获取”分组中，每个优惠都带有其领取命令。
- 你通过 `promos claim` 注册的模型会带有 `promo` 标签；当优惠窗口结束后，该标签会变为 `promo ended`。
- 第一次看到新的优惠时，会有一次性提示指向 `openclaw promos list`。你已经列出或领取过的优惠不会再次被公告。

这会读取 ClawHub 托管促销信息流的本地缓存副本（通常每天通过条件请求刷新一次，或者在缓存快照过期时更早刷新；刷新失败会被静默跳过）。过期刷新最多等待 2.5 秒，并且绝不会中断列表显示。`--json` 和 `--plain` 输出保持机器友好：不会包含任何促销分组或提示。

领取时始终会根据实时的 ClawHub API 重新验证，因此即使缓存副本仍然显示某个优惠，若其已提前撤回，也会被拒绝。
