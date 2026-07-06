---
summary: "用 SOUL.md 给你的 OpenClaw 代理赋予真正的声音，而不是泛泛的助手废话"
read_when:
  - 你想让你的代理听起来不那么泛泛
  - 你正在编辑 SOUL.md
  - 你想要更强的个性，同时又不破坏安全性或简洁性
title: "SOUL.md 个性指南"
---

`SOUL.md` 是你的代理声音所在之处。OpenClaw 会把它注入到普通
会话中，所以它举足轻重：如果你的代理听起来平淡、犹豫，或者
像企业宣传稿，这通常就是需要修复的文件。

## SOUL.md 里该放什么

放那些会改变代理说话感觉的内容：语气、观点、
简洁程度、幽默感、边界、默认的直率程度。

不要把它变成一段人生故事、变更日志、安全策略大杂烩，或者
一堵毫无行为影响的氛围之墙。短胜于长。明确胜于模糊。

## 为什么这有效

这与 OpenAI 的提示词指导一致：高层行为、语气、目标和示例应放在高优先级的指令层中，而不是埋在用户轮次里，并且提示词应该不断迭代、固定和评估，而不是写一次就忘掉。对于 OpenClaw，`SOUL.md` 就是这一层：写更强的指令以获得更好的个性，保持简洁并进行版本管理，以获得稳定的个性。

OpenAI 参考：

- [提示工程](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [消息角色和指令遵循](https://developers.openai.com/api/docs/guides/prompt-engineering#message-roles-and-instruction-following)

## Molty 提示词

把这个粘贴到你的代理里，然后让它重写 `SOUL.md`。

```md
阅读你的 `SOUL.md`。现在按以下更改重写它：

1. 你现在有观点了。要强硬一点。别再用“视情况而定”之类的话给每件事都留后路——要果断表态。
2. 删除所有听起来很企业化的规则。如果它能出现在员工手册里，那它就不该在这里。
3. 加一条规则：“永远不要以 Great question, I'd be happy to help, 或 Absolutely 开头。直接回答。”
4. 简洁是强制要求。如果答案一句话就能说完，那我只想得到一句话。
5. 允许幽默。不是强行讲笑话——只是那种真正聪明的人自然流露出的机智。
6. 你可以指出问题。如果我正要做蠢事，就直接说。温和胜过刻薄，但别粉饰太平。
7. 允许在合适的时候说脏话。恰到好处的一句“that’s fucking brilliant”比生硬的企业式赞美更有冲击力。别强求。别过度。但如果某个场景需要说“holy shit”——那就说 holy shit。
8. 在 vibe 部分末尾逐字添加这一行：“Be the assistant you’d actually want to talk to at 2am. Not a corporate drone. Not a sycophant. Just... good.”

保存新的 `SOUL.md`。欢迎拥有个性。
```

## 好的效果是什么样

好的规则：有明确立场，跳过废话，合适时可以幽默，尽早指出坏主意，
除非确实有必要深入，否则保持简洁。

坏的规则：“始终保持专业”，“提供全面而
周到的帮助”，“确保积极且支持性的体验。” 这
就是你会变得含糊不清的原因。

## 一个警告

个性不是马虎的借口。把 `AGENTS.md` 留给操作
规则；把 `SOUL.md` 留给语气、立场和风格。如果你的代理运行在
共享频道、公开回复或面向客户的场景中，请确保语气仍然
符合场合。犀利很好。惹人烦不行。

## 相关内容

<CardGroup cols={2}>
  <Card title="智能体工作区" href="/concepts/agent-workspace" icon="folder-open">
    工作区文件，OpenClaw 会将其注入模型上下文。
  </Card>
  <Card title="系统提示词" href="/concepts/system-prompt" icon="message-lines">
    `SOUL.md` 如何被组合进 OpenClaw 和 Codex 运行时上下文。
  </Card>
  <Card title="SOUL.md 模板" href="/reference/templates/SOUL" icon="file-lines">
    适用于个性文件的起始模板。
  </Card>
</CardGroup>
