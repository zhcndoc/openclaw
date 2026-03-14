---
role: experimental
summary: |
  OpenProse 的荷马体注册表——一个史诗/英雄式的替代关键词集。
  英雄、考验、命运与荣耀。用于与函数式注册表的基准测试。
status: draft
requires: prose.md
---

# OpenProse 荷马体注册表

> **这是一个界面层。** 它要求先加载 `prose.md`。所有执行语义、状态管理和虚拟机行为都在那里定义。此文件仅提供关键词翻译。

OpenProse 的另一种注册表，汲取自希腊史诗《伊利亚特》、《奥德赛》及英雄传统。程序变成了探险。代理变成了英雄。输出变成了赢得的荣耀。

## 使用方法

1. 先加载 `prose.md`（执行语义）
2. 加载本文件（关键词翻译）
3. 解析 `.prose` 文件时，接受荷马体关键词作为函数式关键词的别名
4. 所有执行行为保持不变——仅表层语法变化

> **设计约束：** 仍然旨在符合语言原则中的“结构化且不言自明”——只是通过史诗视角实现不言自明。

---

## 完整翻译映射

### 核心结构

| 函数式     | 荷马体    | 参考                                   |
| ---------- | --------- | ------------------------------------- |
| `agent`    | `hero`    | 行动者，奋斗者                         |
| `session`  | `trial`   | 每个任务都是一场劳作，一次考验          |
| `parallel` | `host`    | 如军队般齐心协力                       |
| `block`    | `book`    | 史诗的章节划分                         |

### 组成与绑定

| 函数式     | 荷马体     | 参考                                 |
| ---------- | ---------- | ------------------------------------ |
| `use`      | `invoke`   | “歌咏吧，缪斯……”——祈求启示         |
| `input`    | `omen`     | 神祇的预兆，先验的征兆                 |
| `output`   | `glory`    | 克勒俄斯——赢得的荣耀，永恒的名声        |
| `let`      | `decree`   | 宣告的命运，被说出而成                  |
| `const`    | `fate`     | 莫伊拉——不可更改的命数                 |
| `context`  | `tidings`  | 由使者或预言者传达的消息                |

### 控制流程

| 函数式      | 荷马体                | 参考                                  |
| ----------- | --------------------- | ------------------------------------- |
| `repeat N`  | `N labors`            | 赫拉克勒斯的十二项劳作               |
| `for...in`  | `for each...among`    | 在主力军当中                         |
| `loop`      | `ordeal`              | 重复的考验，持续的苦难                 |
| `until`     | `until`               | 保持不变                            |
| `while`     | `while`               | 保持不变                            |
| `choice`    | `crossroads`          | 命运交汇之处                        |
| `option`    | `path`                | 多路中的一条路                      |
| `if`        | `should`              | 史诗中的条件判断                    |
| `elif`      | `or should`           | 继续的条件判断                    |
| `else`      | `otherwise`           | 另一条命运                        |

### 错误处理

| 函数式    | 荷马体               | 参考                           |
| --------- | -------------------- | ------------------------------ |
| `try`     | `venture`            | 启程踏上旅途                   |
| `catch`   | `should ruin come`   | 阿忒——神罚，灾难               |
| `finally` | `in the end`         | 不可避免的结局                 |
| `throw`   | `lament`             | 英雄的悲叹                     |
| `retry`   | `persist`            | 坚持不懈，再次尝试             |

### 会话属性

| 函数式   | 荷马体      | 参考                |
| -------- | ----------- | ------------------- |
| `prompt` | `charge`    | 被赋予的任务          |
| `model`  | `muse`      | 哪位缪斯激励着你      |

### 共享附录

使用 [shared-appendix.md](./shared-appendix.md) 获取未改变的关键词和常见比较模式。

推荐的荷马体重写目标：

- `session` 示例 -> `trial`
- `parallel` 示例 -> `host`
- `loop` 示例 -> `ordeal`
- `try/catch/finally` 示例 -> `venture` / `should ruin come` / `in the end`
- `choice` 示例 -> `crossroads` / `path`

```prose
# 荷马体
should **has security issues**:
  trial "Fix security"
or should **has performance issues**:
  trial "Optimize"
otherwise:
  trial "Approve"
```

### 可复用块

```prose
# 函数式
block review(topic):
  session "Research {topic}"
  session "Analyze {topic}"

do review("quantum computing")
```

```prose
# 荷马体
book review(topic):
  trial "Research {topic}"
  trial "Analyze {topic}"

do review("quantum computing")
```

### 固定迭代

```prose
# 函数式
repeat 12:
  session "Complete task"
```

```prose
# 荷马体
12 labors:
  trial "Complete task"
```

### 不可变绑定

```prose
# 函数式
const config = { model: "opus", retries: 3 }
```

```prose
# 荷马体
fate config = { muse: "opus", persist: 3 }
```

---

## 采用荷马体的理由

1. **普遍认可。** 希腊史诗是西方文学的基石。
2. **英雄框架。** 将平凡任务转化为光荣的考验。
3. **自然贴合。** 英雄面对考验，接收消息，赢得荣耀——与 agent/session/output 映射清晰。
4. **庄重感。** 适合想让程序显得史诗般重要的场景。
5. **命运与宣告。** `const` 作为 `fate`（不可更改），`let` 作为 `decree`（可声明可变）直观易懂。

## 反对荷马体的理由

1. **夸张不当。** 简单的循环用“十二劳作”表达可能显得夸张。
2. **西方中心。** 希腊史诗传统具有文化特异性。
3. **词汇有限。** 较博尔赫斯或民间传统的词汇特色少。
4. **潜在滑稽。** 英雄式语言用于日常任务可能产生喜剧效果。

---

## 关键荷马概念

| 术语    | 含义                                    | 用途                             |
| ------- | ------------------------------------- | ------------------------------- |
| Kleos   | 荣耀，超越生死的名声                    | `output` → `glory`              |
| Moira   | 命运，分配的份额                        | `const` → `fate`                |
| Até     | 神罚，神授的盲目                        | `catch` → `should ruin come`   |
| Nostos  | 归乡旅程                              | （未用，但可用作 `finally`）   |
| Xenia   | 宾客友情，款待                          | （未使用）                      |
| Muse    | 神圣的灵感                            | `model` → `muse`                |

---

## 备选方案考量

### `hero`（agent）的替代词

| 关键词      | 拒绝理由                            |
| ----------- | ---------------------------------- |
| `champion`  | 更倾向中世纪风格，非荷马体                |
| `warrior`   | 过于军事化，不是所有任务都是战斗             |
| `wanderer`  | 过于被动                           |

### `trial`（session）的替代词

| 关键词   | 拒绝理由                            |
| -------- | ---------------------------------- |
| `labor`  | 好词，但限定用在 `repeat N labors` 上     |
| `quest`  | 更偏中世纪/角色扮演风格                   |
| `task`   | 过于平凡                          |

### `host`（parallel）的替代词

| 关键词     | 拒绝理由                    |
| ---------- | --------------------------- |
| `army`    | 过于军事化                    |
| `fleet`   | 仅适用于海军隐喻              |
| `phalanx` | 过于专业技术化                |

---

## 结论

为基准测试保留。荷马体注册表带来庄重感与英雄框架。最适合：

- 感受如史诗般重大项目的程序
- 喜爱古典文化引用的用户
- 输出“荣耀”感觉合适的场景

用于平凡任务时，可能导致无意的滑稽和矫揉造作。
