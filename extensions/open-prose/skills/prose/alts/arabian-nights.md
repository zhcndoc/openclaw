---
role: experimental
summary: |
  阿拉伯之夜语域用于 OpenProse —— 一套叙述性/嵌套的替代关键词集。
  精灵、故事中的故事、愿望与誓言。用于针对功能性语域的基准测试。
status: draft
requires: prose.md
---

# OpenProse 阿拉伯之夜语域

> **这是一层皮肤层。** 需要先加载 `prose.md`。所有执行语义、状态管理和虚拟机行为都在那里定义。本文件仅提供关键词翻译。

OpenProse 的一个替代语域，取材自《一千零一夜》。程序变成了谢赫拉萨德讲述的故事。递归变成故事中的故事。代理变成被束缚服务的精灵。

## 使用方法

1. 先加载 `prose.md`（执行语义）
2. 加载本文件（关键词翻译）
3. 解析 `.prose` 文件时，接受阿拉伯之夜关键词作为功能性关键词的别名
4. 所有执行行为保持不变——仅表层语法有所变化

> **设计约束：** 仍然旨在符合语言原则中的“结构化但自明”，只是通过讲故事的视角使其自明。

---

## 完整翻译映射表

### 核心结构

| 功能性    | 阿拉伯之夜 | 参考                              |
| --------- | -------- | --------------------------------- |
| `agent`   | `djinn`  | 被束缚服务的灵体，赐予愿望       |
| `session` | `tale`   | 讲述的故事，叙述单元             |
| `parallel`| `bazaar` | 众声喧哗，摊位众多，万象齐聚     |
| `block`   | `frame`  | 包含其他故事的故事               |

### 组合与绑定

| 功能性    | 阿拉伯之夜    | 参考                       |
| --------- | ------------ | -------------------------- |
| `use`     | `conjure`    | 从他处召唤                 |
| `input`   | `wish`       | 向精灵请求之物             |
| `output`  | `gift`       | 精灵所赐之物               |
| `let`     | `name`       | 命名即赋予力量（同民间说法）|
| `const`   | `oath`       | 不可违背的誓言，已封印     |
| `context` | `scroll`     | 被书写并传递的内容         |

### 控制流

| 功能性      | 阿拉伯之夜           | 参考                          |
| ----------- | -------------------- | ----------------------------- |
| `repeat N`  | `N nights`           | “千零一夜……”                |
| `for...in`  | `for each...among`   | 商贩之间，故事之间            |
| `loop`      | `telling`            | 讲述继续                     |
| `until`     | `until`              | 保持不变                     |
| `while`     | `while`              | 保持不变                     |
| `choice`    | `crossroads`         | 故事叉路                     |
| `option`    | `path`               | 故事可能走向之一             |
| `if`        | `should`             | 叙述条件                     |
| `elif`      | `or should`          | 继续条件                     |
| `else`      | `otherwise`          | 另一个说辞                   |

### 错误处理

| 功能性      | 阿拉伯之夜                 | 参考                      |
| ----------- | -------------------------- | ------------------------- |
| `try`       | `venture`                  | 启程，踏上征程            |
| `catch`     | `should misfortune strike` | 故事变得黑暗              |
| `finally`   | `and so it was`            | 不可避免的结局            |
| `throw`     | `curse`                    | 下恶咒                    |
| `retry`     | `persist`                  | 英雄再次尝试              |

### 会话属性

| 功能性    | 阿拉伯之夜 | 参考                      |
| --------- | ---------- | ------------------------- |
| `prompt`  | `command`  | 对精灵的命令              |
| `model`   | `spirit`   | 哪个灵体答复              |

### 共享附录

未改变的关键词和通用比较模式请参阅 [shared-appendix.md](./shared-appendix.md)。

推荐的阿拉伯之夜重写示例：

- `session` 示例 -> `tale`
- `parallel` 示例 -> `bazaar`
- `loop` 示例 -> `telling`
- `try/catch/finally` 示例 -> `venture` / `should misfortune strike` / `and so it was`
- `choice` 示例 -> `crossroads` / `path`

```prose
# Nights
should **has security issues**:
  tale "Fix security"
or should **has performance issues**:
  tale "Optimize"
otherwise:
  tale "Approve"
```

### 可复用区块（嵌套故事）

```prose
# Functional
block review(topic):
  session "Research {topic}"
  session "Analyze {topic}"

do review("quantum computing")
```

```prose
# Nights
frame review(topic):
  tale "Research {topic}"
  tale "Analyze {topic}"

tell review("quantum computing")
```

### 固定迭代

```prose
# Functional
repeat 1001:
  session "Tell a story"
```

```prose
# Nights
1001 nights:
  tale "Tell a story"
```

### 不可变绑定

```prose
# Functional
const config = { model: "opus", retries: 3 }
```

```prose
# Nights
oath config = { spirit: "opus", persist: 3 }
```

---

## 支持阿拉伯之夜语域的理由

1. **嵌套叙事即递归。** 故事中的故事完美对应嵌套程序调用。
2. **精灵/愿望/馈赠。** 代理/输入/输出映射极为清晰。
3. **丰富传统。** 《一千零一夜》家喻户晓。
4. **“Bazaar” 代指 parallel。** 众多商贩和摊位，同时活跃的生动隐喻。
5. **“Oath” 代表 const。** 不可违背的誓言是不可变性的绝佳隐喻。
6. **“1001 nights”** 作为循环次数的设计非常巧妙。

## 反对阿拉伯之夜语域的理由

1. **文化敏感度。** 需尊重文化，避免东方主义刻板印象。
2. **“Djinn” 发音。** 对不熟悉者可能不确定发音（jinn？djinn？genie？）。
3. **部分映射较牵强。** “Bazaar” 作为 parallel 生动但不直观。
4. **“Should misfortune strike”** 作为 `catch` 较长。

---

## 关键的阿拉伯之夜概念

| 术语          | 含义                               | 用途                   |
| ------------- | ---------------------------------- | ---------------------- |
| Scheherazade  | 为了生存讲述故事的叙述者            | （程序作者）           |
| Djinn         | 被束缚服务的超自然灵体              | `agent` → `djinn`      |
| Frame story   | 包含其他故事的故事                   | `block` → `frame`      |
| Wish          | 向精灵请求的内容                     | `input` → `wish`       |
| Oath          | 不可违背的承诺                      | `const` → `oath`       |
| Bazaar        | 市场，众多商贩                     | `parallel` → `bazaar`  |

---

## 备选考虑

### `djinn`（agent）

| 关键词    | 被拒绝原因                    |
| --------- | ----------------------------- |
| `genie`   | 迪士尼联想，不够文学化        |
| `spirit`  | 已用于 `model`               |
| `ifrit`   | 太专一（一种 djinn 类型）     |
| `narrator`| 太元叙述，Scheherazade 是用户 |

### `tale`（session）

| 关键词     | 被拒原因                    |
| ---------- | --------------------------- |
| `story`    | 不错，但 `tale` 更文学化     |
| `night`    | 预留给 `repeat N nights`    |
| `chapter`  | 更偏西方小说用语            |

### `bazaar`（parallel）

| 关键词     | 被拒原因                            |
| ---------- | ---------------------------------- |
| `caravan`  | 顺序含义（一个接一个）             |
| `chorus`   | 希腊文化，不合传统                  |
| `souk`     | 知名度不够                        |

### `scroll`（context）

| 关键词     | 被拒原因        |
| ---------- | --------------- |
| `letter`   | 太小/太私人     |
| `tome`     | 太大            |
| `message`  | 太普通          |

---

## 结论

保留用于基准测试。阿拉伯之夜语域提供了一个自然映射递归、嵌套程序的叙述框架。精灵/愿望/馈赠三元组特别优雅。

最适合：

- 深度嵌套（故事中的故事）程序
- 形同实现愿望的工作流
- 喜欢叙事框架的用户

特别适合 reusable block 的 `frame` 关键词——谢赫拉萨德的框架故事包含千百个故事。
