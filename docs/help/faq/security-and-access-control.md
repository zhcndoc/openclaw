---
summary: "暴露、即时注入、第三方技能、配对以及授予多少自主权"
title: "安全和访问控制"
read_when:
  - "您将 OpenClaw 暴露给入站消息"
  - "您正在判断插件、技能或自主风险"
---

## <a id="security-and-access-control"></a> 安全与访问控制

<AccordionGroup>
  <Accordion id="is-it-safe-to-expose-openclaw-to-inbound-dms" title="将 OpenClaw 暴露给入站 DM 是否安全？">
    是的 - 在默认为 **pairing** 的频道（大多数支持 DM- 的频道）上，向您的机器人发送 DM 的陌生人永远不会到达该模型：

    - 使用默认配对时，未知发件人会收到配对代码，并且不会处理他们的消息。批准 `openclaw pairing approve --channel <channel> [--account <id>] <code>`。每个通道的待处理请求上限为 **3**；如果代码未到达，请检查 `openclaw pairing list --channel <channel> [--account <id>]`。
    - 公开开放 DM 需要明确选择加入（`dmPolicy: "open"` 和白名单 `"*"`）。

    一些工作区通道提供不同的默认值 - 例如，ClickClack 默认允许工作区成员。检查您的频道页面，然后运行 ​​`openclaw doctor` 以确认您的 DM 政策符合您的预期。

  </Accordion>

  <Accordion id="is-prompt-injection-only-a-concern-for-public-bots" title="即时注入只是公共机器人关心的问题吗？">
    不。提示注入涉及 **不受信任的内容**，而不仅仅是谁可以 DM 机器人。如果您的助手读取外部内容（网页 search/fetch、浏览器页面、电子邮件、文档、附件、粘贴日志），则该内容可能包含尝试劫持模型的指令 - 即使您是唯一的发送者。

    最大的风险是启用工具时：模型可能会被欺骗以窃取上下文或代表您调用工具。限制错误的工具调用可能造成的损害：

    - 使用只读或禁用工具的“reader”代理来总结不可信内容
    - 对启用工具的代理关闭 `web_search` / `web_fetch` / `browser`
    - 也将解码的 file/document 文本视为不可信：OpenResponses `input_file` 和媒体附件提取都将提取的文本包装在显式外部内容边界标记中，而不是传递原始文件文本
    - 进行沙箱隔离并使用严格的工具允许名单

    细节：[Security](/gateway/security)。

  </Accordion>

  <Accordion id="is-openclaw-less-safe-because-it-uses-typescript-node-instead-of-rust-wasm" title="OpenClaw是否因为使用TypeScript/Node而不是Rust/WASM而不太安全？">
    语言和运行时间很重要，但并不是个人代理的主要风险。实际风险是网关暴露、谁可以向机器人发送消息、提示注入、工具范围、凭证处理、浏览器访问、执行访问和第三方 skill/plugin 信任。

    Rust和WASM可以为某些代码类提供更强的隔离，但不能解决提示注入、不良白名单、公共网关暴露、过于广泛的工具或浏览器配置文件已登录到敏感帐户的问题。将这些视为主要控制措施：保持网关私有或经过身份验证，使用 DMs/groups 的配对和白名单，拒绝或沙箱风险工具以处理不受信任的输入，仅安装受信任的插件和技能，并在配置更改后运行 `openclaw security audit --deep`。

    详情：[Security](/gateway/security), [Sandboxing](/gateway/sandboxing)。

  </Accordion>

  <Accordion id="i-saw-reports-about-exposed-openclaw-instances-what-should-i-check" title="我看到了有关暴露的 OpenClaw 实例的报告。我应该检查什么？">
    ```bash
    openclaw security audit --deep
    openclaw gateway status
    ```

    更安全的基线：网关绑定到 `loopback`，或仅通过经过身份验证的私有访问（尾网、SSH 隧道、token/password 身份验证或正确配置的可信代理）公开； DM处于`pairing`或`allowlist`模式；群组访问仅限于您选择的房间（群组许可名单），在成员范围广泛或公开的情况下，具有提及门控或发件人许可名单；高风险工具（`exec`、`browser`、`gateway`、`cron`）被拒绝或严格限制在读取不受信任内容的代理范围内；在工具执行需要更窄的访问范围时启用沙箱。

    未经身份验证的公共绑定、使用工具打开 DMs/groups 以及暴露的浏览器控制是首先要修复的问题。详情：[openclaw安全审核](/gateway/security/running-the-audit#openclaw-security-audit)。

  </Accordion>

  <Accordion id="are-clawhub-skills-and-third-party-plugins-safe-to-install" title="ClawHub技能和第三方插件安装安全吗？">
    将第三方技能和插件视为您选择信任的代码。 ClawHub 技能页面在安装前公开扫描状态，但扫描并不是完整的安全边界。 OpenClaw 在 plugin/skill 安装或更新期间不会运行内置的本地危险代码阻止；使用运营商拥有的 `security.installPolicy` 进行本地 allow/warn/block 决策。

    更安全的模式：更喜欢受信任的作者和固定版本，请阅读skill/plugin在启用之前，请保留plugin/skill允许名单缩小，使用最少的工具在沙箱中运行不受信任的输入工作流程，并避免向第三方代码提供广泛的文件系统、执行、浏览器或秘密访问权限。

    详情：[Skills](/tools/skills), [Plugins](/tools/plugin), [Security](/gateway/security)。

  </Accordion>

  <Accordion id="should-my-bot-have-its-own-email-github-account-or-phone-number" title="我的机器人应该有自己的电子邮件、GitHub 帐户或电话号码吗？">
    是的，对于大多数设置。使用单独的帐户和电话号码隔离机器人可以限制出现问题时造成的损失，并且可以更轻松地轮换凭据或撤销访问权限，而不会影响您的个人帐户。

    从小开始：只授予它实际需要的工具和账号权限，之后如果需要再扩展。

    文档：[Security](/gateway/security), [Pairing](/channels/pairing)。

  </Accordion>

  <Accordion id="can-i-give-it-autonomy-over-my-text-messages-and-is-that-safe" title="我可以赋予它对我的短信的自主权吗？这样安全吗？">
    We do **不是**建议对您的个人消息拥有完全的自主权。最安全的模式：保留 DM**配对模式**或严格的许可名单，请使用**单独的号码或帐户**如果它应该代表您发送消息，请在您的时候起草**发送前批准**。

    如果想试验，请在专用的隔离账号上进行。参见 [Security](/gateway/security)。

  </Accordion>

  <Accordion id="can-i-use-cheaper-models-for-personal-assistant-tasks" title="我可以使用更便宜的模型来执行个人助理任务吗？">
    可以，**前提是**代理只进行聊天且输入是可信的。较小的模型更容易受到指令劫持，因此当代理启用工具或读取不可信内容时，不要使用它们。如果你必须使用较小的模型，请锁定工具并在沙箱中运行。参见 [Security](/gateway/security)。
  </Accordion>

  <Accordion id="i-ran-start-in-telegram-but-did-not-get-a-pairing-code" title="我在 Telegram 中运行 /start 但没有获得配对码">
    当未知发件人向机器人发送消息并且启用 `dmPolicy: "pairing"` 时，仅发送 **** 配对代码； `/start` 本身不会生成代码。

    检查待处理请求：

    ```bash
    openclaw pairing list telegram
    ```

    若要立即访问，请将你的发送者 id 加入允许名单，或为该账号设置 `dmPolicy: "open"`。

  </Accordion>

  <Accordion id="whatsapp-will-it-message-my-contacts-how-does-pairing-work" title="WhatsApp：它会向我的联系人发送消息吗？配对如何进行？">
    不会。默认的 WhatsApp DM 策略是 **配对**。未知发送者只会收到配对码；他们的消息**不会被处理**。OpenClaw 只会回复它收到的聊天，或你触发的显式发送。

    ```bash
    openclaw pairing approve whatsapp <code>
    openclaw pairing list whatsapp
    ```

    向导的电话号码提示会设置您的 **allowlist/owner**，以便允许您自己的 DM - 它不用于自动发送。在您的个人 WhatsApp 号码上，使用该号码并启用 `channels.whatsapp.selfChatMode`。

  </Accordion>
</AccordionGroup>
