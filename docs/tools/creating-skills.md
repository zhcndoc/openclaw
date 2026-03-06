---
title: "创建技能"
summary: "使用 SKILL.md 构建和测试自定义工作区技能"
read_when:
  - 您正在工作区中创建新的自定义技能
  - 您需要一个基于 SKILL.md 技能的快速入门工作流程
---

# 创建自定义技能 🛠

OpenClaw 设计为易于扩展。“技能”是为您的助手添加新功能的主要方式。

## 什么是技能？

技能是一个包含 `SKILL.md` 文件（向大语言模型提供指令和工具定义）的目录，并且可选地包含一些脚本或资源。

## 逐步指导：您的第一个技能

### 1. 创建目录

技能存放在您的工作区，通常是 `~/.openclaw/workspace/skills/`。为您的技能创建一个新文件夹：

```bash
mkdir -p ~/.openclaw/workspace/skills/hello-world
```

### 2. 定义 `SKILL.md`

在该目录中创建一个 `SKILL.md` 文件。此文件使用 YAML 头部块定义元数据，使用 Markdown 撰写指令。

```markdown
---
name: hello_world
description: 一个简单的问候技能。
---

# Hello World 技能

当用户请求问候时，使用 `echo` 工具说 "Hello from your custom skill!"。
```

### 3. 添加工具（可选）

您可以在头部块中定义自定义工具，或者指示代理使用现有的系统工具（例如 `bash` 或 `browser`）。

### 4. 刷新 OpenClaw

让您的代理“刷新技能”或重启网关。OpenClaw 会发现新目录并索引 `SKILL.md` 文件。

## 最佳实践

- **简明扼要**：指示模型 _做什么_，而非如何作为 AI 来做。
- **安全第一**：若您的技能使用 `bash`，确保提示信息不允许从不可信用户输入注入任意命令。
- **本地测试**：使用 `openclaw agent --message "use my new skill"` 进行测试。

## 共享技能

您也可以浏览并贡献技能到 [ClawHub](https://clawhub.com)。
