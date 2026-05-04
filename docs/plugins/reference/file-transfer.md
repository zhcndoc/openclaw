---
summary: "通过专用的节点命令在配对节点上获取、列出和写入文件。对最大 16 MB 的二进制文件，使用 node.invoke 上的 base64 方式绕过 bash stdout 截断。"
read_when:
  - 你正在安装、配置或审计文件传输插件
title: "文件传输插件"
---

# 文件传输插件

通过专用的节点命令在配对节点上获取、列出和写入文件。对最大 16 MB 的二进制文件，使用 node.invoke 上的 base64 方式绕过 bash stdout 截断。

## 分发

- Package: `@openclaw/file-transfer`
- Install route: included in OpenClaw

## 接口

contracts: tools
