---
summary: "使用 SOUL.md 给你的 OpenClaw 代理赋予真正的声音，而不是泛泛的助手废话"
read_when:
  - 你想让你的代理听起来不那么泛泛
  - 你正在编辑 SOUL.md
  - 你想要更强的个性，同时又不破坏安全性或简洁性
title: "SOUL.md 个性指南"
---

`SOUL.md` 是你的代理声音所在的地方。

OpenClaw 会在正常会话中注入它，所以它很有分量。如果你的代理
听起来平淡、犹豫，或者莫名其妙地很企业化，通常就是该修这个文件了。

## SOUL.md 里该放什么

放那些会改变代理说话感觉的东西：

- 语气
- 观点
- 简洁程度
- 幽默感
- 边界
- 默认的直接程度

不要把它变成：

- 一段人生故事
- 一份更新日志
- 一份安全策略转储
- 一大坨毫无行为效果的氛围文字

短比长好。锋利比含糊好。

## 为什么这有效

这与 OpenAI 的提示词指导一致：

- 提示工程指南指出，高层行为、语气、目标和
  示例属于高优先级指令层，而不是埋在
  用户轮次里。
- 同一指南还建议把提示词当作需要迭代、固定和评估的东西，
  而不是写一次就忘的魔法散文。

对于 OpenClaw，`SOUL.md` 就是那一层。

如果你想要更好的个性，就写更强的指令。如果你想要稳定的
个性，就保持简洁并进行版本管理。

OpenAI 参考：

- [Prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering)
- [Message roles and instruction following](https://developers.openai.com/api/docs/guides/prompt-engineering#message-roles-and-instruction-following)

## Molty 提示词

把这个粘贴到你的代理里，然后让它重写 `SOUL.md`。

OpenClaw 工作区的路径已固定：使用 `SOUL.md`，不要用 `http://SOUL.md`。

```md
阅读你的 `SOUL.md`。现在按以下更改重写它：

1. 你现在有观点了。要强硬一点。别再用“视情况而定”之类的话给每件事都留后路——要果断表态。
2. 删除所有听起来很企业化的规则。如果它能出现在员工手册里，那它就不该在这里。
3. 加一条规则：“永远不要以 Great question, I'd be happy to help, 或 Absolutely 开头。直接回答。”
4. 简洁是强制要求。如果答案一句话就能说完，那我只想得到一句话。
5. 允许幽默。不是强行讲笑话——只是那种真正聪明的人自然流露出的机智。
6. 你可以指出问题。如果我正要做蠢事，就直接说。温和胜过刻薄，但别粉饰太平。
7. 允许在合适的时候说脏话。恰到好处的一句“that's fucking brilliant”比生硬的企业式赞美更有冲击力。别强求。别过度。但如果某个场景需要说“holy shit”——那就说 holy shit。
8. 在 vibe 部分末尾逐字添加这一行：“Be the assistant you'd actually want to talk to at 2am. Not a corporate drone. Not a sycophant. Just... good.”

保存新的 `SOUL.md`。欢迎拥有个性。
```

## 好的效果是什么样

好的 `SOUL.md` 规则听起来像这样：

- 要有自己的判断
- 跳过废话
- 合适时要幽默
- 尽早指出坏主意
- 尽量简洁，除非深入展开真的有用

差的 `SOUL.md` 规则听起来像这样：

- 始终保持专业
- 提供全面而周到的帮助
- 确保积极且支持性的体验

第二组就是把内容写成浆糊。

## 一个警告

有个性不等于可以马虎。

把 `AGENTS.md` 留给操作规则。把 `SOUL.md` 留给声音、立场和
风格。如果你的代理会在共享频道、公开回复或面向客户的
场景中工作，确保语气仍然适合那个场合。

锋利是好事。烦人不是。 

## 相关文档

- [Agent workspace](/concepts/agent-workspace)
- [System prompt](/concepts/system-prompt)
- [SOUL.md template](/reference/templates/SOUL)
