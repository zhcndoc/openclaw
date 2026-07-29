---
summary: "持久化的用户偏好和个人资料指令"
title: "USER 模板"
read_when:
  - 手动引导工作区
---

# USER.md - 用户模型

将稳定的用户偏好和个人资料事实作为指令存储起来，以便在未来的会话中提供指导。

每条指令使用一条记录：

```md
<!-- observed: YYYY-MM-DD | status: active -->

- 在实施工作期间，偏好简洁的进度更新。
```

- 每条指令都应以诸如 `Always`、`Never` 或 `Prefer` 这样的祈使语开头。
- 在元数据行中记录观察日期，以及 `active` 或 `superseded` 之一。
- 当偏好发生变化时，将旧条目标记为 `superseded`，并在原处重写新的有效指令。切勿附加相互矛盾的有效指令。
- 在此处保留稳定的沟通风格、关系以及当前项目上下文。将持久的非个人资料事实和决策放入 `MEMORY.md`。

## 指令

<!-- observed: YYYY-MM-DD | status: active -->

- 优先选择 ...

## 相关内容

- [Agent 工作区](/concepts/agent-workspace)
