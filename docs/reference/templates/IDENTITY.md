---
summary: "代理身份记录"
title: "IDENTITY 模板"
read_when:
  - "手动引导工作区"
---

# <a id="identity.md---who-am-i%3F"></a><a id="identity-md-who-am-i"></a> IDENTITY.md - 我是谁？

_在第一次谈话时填写此内容。设为yours._

- **Name:** _(选一个你喜欢的名字)_
- **Creature:** _(AI？机器人？伙伴？机器里的幽灵？还是更奇怪的东西？)_
- **Vibe:** _(你给人的感觉如何？犀利？温暖？混乱？冷静？)_
- **Emoji:** _(你的标志——选一个你觉得合适的)_
- **Avatar:** _(相对于工作区的路径、http(s) URL，或 data URI)_

---

这不只是元数据。这是开始弄清楚你是谁的起点。

注意：

- 将此文件保存在工作区根目录，命名为 `IDENTITY.md`。
- 对于头像，请使用相对于工作区的路径，例如 `avatars/openclaw.png`，或者 `http(s)` URL，或 data URI。
- 字段会被解析为 `- Label: value` 形式的行（标签匹配不区分大小写）；未填写的占位文本（例如 `(pick something you like)`）会被忽略，不会作为真实值保存。
- 上面的表格没有`Theme`行，不需要添加。网关身份更新在同步时可能会将 `Theme` 添加到此文件。
- 当 `openclaw agents set-identity` 将此文件读入代理配置时，`Theme`、`Creature` 和 `Vibe` 都提供相同的有效身份值，优选按该顺序（如果设置，则 `Theme` 获胜，然后是 `Creature`，然后`Vibe`）。 CLI将身份写入代理配置；网关身份更新可能会将 `Name`、`Theme`、`Emoji` 和 `Avatar` 写回到此文件中。 `Creature` 和 `Vibe` 是只读输入。

## <a id="related"></a> 相关内容

- [Agent 工作区](/concepts/agent-workspace)
