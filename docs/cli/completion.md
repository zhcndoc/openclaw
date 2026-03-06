---
summary: "`openclaw completion` 的命令行参考（生成/安装 shell 补全脚本）"
read_when:
  - 你想为 zsh/bash/fish/PowerShell 提供 shell 补全
  - 你需要在 OpenClaw 状态下缓存补全脚本
title: "completion"
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

- `-s, --shell <shell>`：目标 shell（`zsh`、`bash`、`powershell`、`fish`；默认：`zsh`）
- `-i, --install`：通过向 shell 配置文件添加 source 行来安装补全
- `--write-state`：将补全脚本写入 `$OPENCLAW_STATE_DIR/completions`，不输出到标准输出
- `-y, --yes`：跳过安装确认提示

## 说明

- `--install` 会在你的 shell 配置文件中写入一个小的 “OpenClaw Completion” 区块，并指向缓存的脚本。
- 不带 `--install` 或 `--write-state` 时，命令会将补全脚本打印到标准输出。
- 补全生成过程会主动加载命令树，因此会包含嵌套的子命令。
