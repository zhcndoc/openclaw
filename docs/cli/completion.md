---
summary: "`openclaw completion` 的命令行参考（生成/安装 shell 补全脚本）"
read_when:
  - 你想要 zsh/bash/fish/PowerShell 的 shell 补全
  - 你需要将补全脚本缓存到 OpenClaw 状态目录下
title: "Completion"
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

- `--install` 会向你的 shell 配置文件写入一个小的 “OpenClaw Completion” 块，并将其指向缓存的脚本。
- 如果不使用 `--install` 或 `--write-state`，命令会将脚本打印到 stdout。
- 补全生成会主动加载命令树，因此会包含嵌套子命令。

## 相关内容

- [CLI 参考](/cli)
