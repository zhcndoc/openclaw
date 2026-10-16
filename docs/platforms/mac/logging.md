---
summary: "macOS 应用程序日志编辑、选择加入诊断文件和本机 OSLog 隐私标志"
read_when:
  - "捕获 macOS 日志或调查私有数据日志记录"
  - "调试语音 wake/session 生命周期问题"
title: "macOS 日志"
---

# <a id="logging-(macos)"></a><a id="logging-macos"></a> 日志（macOS）

## <a id="rolling-diagnostics-file-log-(debug-pane)"></a><a id="rolling-diagnostics-file-log-debug-pane"></a> 滚动诊断文件日志（调试面板）

macOS 应用通过 swift-log（默认使用统一日志）进行日志记录，并且还可以写入轮转的本地文件日志，以便持久保存捕获内容（`DiagnosticsFileLog`）。

- 启用：**调试面板 -> 日志 -> 应用日志 -> “写入滚动诊断日志（JSONL）”**（默认关闭）。
- Verbosity：**调试窗格 -> 日志 -> 应用程序日志记录 -> Verbosity** 选择器。更改立即应用于现有的应用程序记录器；无需重新启动。
- 位置：`~/Library/Logs/OpenClaw/diagnostics.jsonl`。
- 轮转：在 5 MB 时轮转；最多保留 5 个备份，后缀为 `.1`...`.5`（最旧的会被删除）。
- 清除：**调试面板 -> 日志 -> 应用日志 -> “清除”** 会删除当前文件及所有备份。

文件日志是一个单独的、显式的选择加入。启用它不会禁用应用程序的插值编辑，如下所述。它仍然包括公共和未注释的消息、元数据和直接诊断记录，其中可能包含敏感数据。仅在调试时启用它，之后将其关闭，并在共享之前查看活动文件和备份。

## <a id="export-unified-logs-as-json"></a> 导出统一日志为JSON

运行 `./scripts/clawlog.sh --json` 将最近的统一日志事件作为一个 JSON 数组写入标准输出，或添加 `--output logs.json` 将数组写入文件而不打印它。默认输出包含最近50条日志记录；使用 `--lines 1` 作为最近的记录，或使用 `--all` 作为每个匹配的记录。 `--lines` 在 JSON 模式下统计完整记录，而不是物理行。

JSON 导出不能与 `--follow` 或 `--list-categories` 组合。使用这些选项而不使用 `--json`。

## <a id="app-logger-redaction"></a> App 记录器编辑

macOS 应用程序的 swift-log 桥将消息呈现为文本，然后将其传递给统一日志记录或可选文件日志。它的插值注释是应用程序端规则，而不是本机 OSLog 隐私元数据：

- `privacy: .private` 在任一接收器接收该值之前将其替换为 `<private>`。
- `privacy: .private(mask: .hash)` 使用键控哈希替换该值。相同的值在一个应用程序进程中相互关联；当应用程序重新启动时，哈希值会发生变化。
- `privacy: .public`、未注释的插值和 swift-log 元数据不会自动编辑。不要仅仅因为日志来自统一日志记录就认为它可以安全地共享。

这还可以保护在记录之前连接的字符串中的私有插值。详细程度更改、文件捕获和 macOS 私有数据覆盖无法恢复应用程序桥删除的值。

## <a id="unified-logging-private-data-on-macos"></a> macOS 上的统一日志私有数据

一些共享组件直接使用本机 OSLog，而不是应用程序的 swift-log 桥。原生 OSLog 通常会编辑私有值；明确的公共价值观仍然可见。对于这些本机事件，`/Library/Preferences/Logging/Subsystems/` 中的子系统 plist 可以启用私有数据捕获。这不是揭示桥的 `<private>` 占位符或哈希值的方法。背景：[macOS 记录隐私恶作剧](https://steipete.me/posts/2025/logging-privacy-shenanigans)。

## <a id="enable-for-openclaw-(ai.openclaw)"></a><a id="enable-for-openclaw-ai-openclaw"></a> 为 OpenClaw（`ai.openclaw`）启用

仅当您需要 **native OSLog** 事件的私有值时才使用此选项。首先检查现有的 `ai.openclaw.plist` 并保留它，以便您可以在以后恢复之前的设置。将 plist 写入临时文件，然后以 root 身份自动安装：

```bash
cat <<'EOF' >/tmp/ai.openclaw.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>DEFAULT-OPTIONS</key>
    <dict>
        <key>Enable-Private-Data</key>
        <true/>
    </dict>
</dict>
</plist>
EOF
sudo install -m 644 -o root -g wheel /tmp/ai.openclaw.plist /Library/Preferences/Logging/Subsystems/ai.openclaw.plist
```

在重现问题之前启用覆盖：它会影响新的本机 OSLog 事件，而不是已收集的条目。使用`./scripts/clawlog.sh --category WebChat --last 5m`检查输出（`--last`/`-l`设置时间范围，默认`5m`；`--category`/`-c`按类别过滤）。

## <a id="disable-after-debugging"></a> 调试后禁用

- 如果您为此捕获创建了 plist，请将其删除：`sudo rm /Library/Preferences/Logging/Subsystems/ai.openclaw.plist`。如果之前存在，则恢复保存的版本。
- 覆盖可以在本机事件中公开电话号码和消息正文。仅在需要时才启用它；删除它不会删除已捕获的数据。
- 如果启用了滚动文件捕获，请单独关闭它。 macOS 覆盖不控制该接收器。

## <a id="related"></a> 相关内容

- [macOS 应用](/platforms/macos)
- [网关记录](/gateway/logging)
