---
summary: "CLI 参考：`openclaw completion`（生成/安装 shell 补全脚本）"
read_when:
  - 你希望为 zsh/bash/fish/PowerShell 提供 shell 补全
  - 你需要将补全脚本缓存到 OpenClaw 状态目录下
title: "补全"
---

# `openclaw completion`

生成 shell 补全脚本，并可选择将其安装到你的 shell 配置文件中。

## 用法

```bash
openclaw completion
openclaw completion --shell zsh
openclaw completion --install
openclaw completion --shell fish --install
openclaw completion --write-state
openclaw completion --shell bash --write-state
```

## 选项

- `-s, --shell <shell>`: shell 目标（`zsh`、`bash`、`powershell`、`fish`；默认：`zsh`）
- `-i, --install`: 通过向你的 shell 配置文件添加一行 source 语句来安装补全
- `--write-state`: 将补全脚本写入 `$OPENCLAW_STATE_DIR/completions`，而不是输出到 stdout
- `-y, --yes`: 跳过安装确认提示

## 说明

- `--install` 会在你的 shell 配置文件中写入一个小的 “OpenClaw Completion” 块，并将其指向缓存的脚本。
- 如果不使用 `--install` 或 `--write-state`，命令会将脚本打印到 stdout。
- 补全生成会主动加载命令树，因此会包含嵌套子命令。

## 相关

- [CLI 参考](/cli)
