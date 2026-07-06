---
summary: "用于代理的摄像头采集（iOS/Android 节点 + macOS 应用）：照片（jpg）和短视频片段（mp4）"
read_when:
  - 在 iOS/Android 节点或 macOS 上添加或修改摄像头采集
  - 扩展代理可访问的 MEDIA 临时文件工作流
title: "摄像头采集"
---

OpenClaw 支持面向代理工作流的摄像头采集，适用于配对的 **iOS**、**Android** 和 **macOS** 节点：可通过 Gateway `node.invoke` 拍摄照片（`jpg`）或短视频片段（`mp4`，可选音频）。

所有摄像头访问都受每个平台上由用户控制的设置保护。

## iOS 节点

### iOS 用户设置

- iOS 设置选项卡 → **相机** → **允许相机** (`camera.enabled`)。
  - 默认值：**开启**（缺失的键会被视为已启用）。
  - 当关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### iOS 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应载荷：`devices` — `{ id, name, position, deviceType }` 数组。

- `camera.snap`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `maxWidth`: number（可选；默认 `1600`）
    - `quality`: `0..1`（可选；默认 `0.9`，会被限制在 `[0.05, 1.0]`）
    - `format`: 当前为 `jpg`
    - `delayMs`: number（可选；默认 `0`，内部上限为 `10000`）
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应载荷：`format: "jpg"`、`base64`、`width`、`height`。
  - 载荷保护：照片会重新压缩，以保持 base64 编码后的载荷小于 5MB。

- `camera.clip`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `durationMs`: number（默认 `3000`，会被限制在 `[250, 60000]`）
    - `includeAudio`: boolean（默认 `true`）
    - `format`: 当前为 `mp4`
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应载荷：`format: "mp4"`、`base64`、`durationMs`、`hasAudio`。

### iOS 前台要求

与 `canvas.*` 一样，iOS 节点只允许在**前台**执行 `camera.*` 命令。后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI helper

获取媒体文件的最简单方式是使用 CLI helper，它会将解码后的媒体写入临时文件并打印保存路径。

```bash
openclaw nodes camera snap --node <id>                 # 默认：前后摄像头都拍摄（2 行 MEDIA）
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

`nodes camera snap` 默认使用 `--facing both`，同时捕获前后摄像头，以便让代理同时获得两个视角；当设置了 `--device-id` 时，必须传入单一明确的 facing（若设置了 `--device-id`，`both` 会被拒绝）。输出文件是临时文件（位于操作系统的临时目录中），除非你自己构建包装器。

## Android 节点

### Android 用户设置

- Android 设置页 → **Camera** → **Allow Camera** (`camera.enabled`)。
  - **新安装默认关闭。** 早于此设置的现有安装会迁移为 **开启**，以便升级后不会悄悄丢失此前可用的相机访问权限。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED: enable Camera in Settings`。

### 权限

- `CAMERA` 适用于 `camera.snap` 和 `camera.clip`；缺少/拒绝权限会返回 `CAMERA_PERMISSION_REQUIRED`。
- 当 `includeAudio` 为 `true` 时，`RECORD_AUDIO` 适用于 `camera.clip`；缺少/拒绝权限会返回 `MIC_PERMISSION_REQUIRED`。

应用会在可能的情况下提示申请运行时权限。

### Android 前台要求

与 `canvas.*` 一样，Android 节点仅允许在**前台**调用 `camera.*` 命令。后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE: command requires foreground`。

### Android 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应负载：`devices` — 包含 `{ id, name, position, deviceType }` 的数组。

- `camera.snap`
  - 参数：`facing`（`front|back`，默认 `front`）、`quality`（默认 `0.95`，限制在 `[0.1, 1.0]`）、`maxWidth`（默认 `1600`）、`deviceId`（可选；未知 id 会失败并返回 `INVALID_REQUEST`）。
  - 响应负载：`format: "jpg"`、`base64`、`width`、`height`。
  - 负载保护：会重新压缩，以确保 base64 低于 5MB（与 iOS 相同的预算）。

- `camera.clip`
  - 参数：`facing`（默认 `front`）、`durationMs`（默认 `3000`，限制在 `[200, 60000]`）、`includeAudio`（默认 `true`）、`deviceId`（可选）。
  - 响应负载：`format: "mp4"`、`base64`、`durationMs`、`hasAudio`。
  - 负载保护：原始 MP4 在 base64 编码前上限为 18MB；过大的片段会失败并返回 `PAYLOAD_TOO_LARGE`（减小 `durationMs` 后重试）。

## macOS 应用

### macOS 用户设置

macOS 配套应用提供一个复选框：

- **Settings → General → Allow Camera** (`openclaw.cameraEnabled`).
  - 默认：**关闭**。
  - 关闭时：摄像头请求会返回 `CAMERA_DISABLED: enable Camera in Settings`。

### CLI 辅助工具（node invoke）

使用主 `openclaw` CLI 在 macOS 节点上调用摄像头命令。

```bash
openclaw nodes camera list --node <id>                     # 列出摄像头 ID
openclaw nodes camera snap --node <id>                     # 打印已保存路径
openclaw nodes camera snap --node <id> --max-width 1280
openclaw nodes camera snap --node <id> --delay-ms 2000
openclaw nodes camera snap --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --duration 10s       # 打印已保存路径
openclaw nodes camera clip --node <id> --duration-ms 3000   # 打印已保存路径（旧版标志）
openclaw nodes camera clip --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --no-audio
```

- `openclaw nodes camera snap` 默认使用 `maxWidth=1600`，除非被覆盖。
- `camera.snap` 会在预热/曝光稳定后等待 `delayMs`（默认 2000ms，范围限制在 `[0, 10000]`）再进行拍摄。
- 照片负载会重新压缩，以使 base64 保持在 5MB 以下。

## 安全性 + 实际限制

- 摄像头和麦克风访问会触发常见的操作系统权限提示（并且需要在 `Info.plist` 中提供使用说明字符串）。
- 为避免节点负载过大，视频片段最长限制为 60 秒（base64 开销加上消息大小限制）。

## macOS 屏幕视频（系统级）

对于 _屏幕_ 视频（不是摄像头），请使用 macOS 配套应用：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # 打印保存路径
```

需要 macOS **屏幕录制** 权限（TCC）。

## 相关内容

- [图像和媒体支持](/nodes/images)
- [媒体理解](/nodes/media-understanding)
- [位置命令](/nodes/location-command)
