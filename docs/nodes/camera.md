---
summary: "用于代理的摄像头采集（iOS/Android 节点 + macOS 应用）：照片（jpg）和短视频片段（mp4）"
read_when:
  - 在 iOS/Android 节点或 macOS 上添加或修改摄像头采集
  - 扩展代理可访问的 MEDIA 临时文件工作流
title: "摄像头采集"
---

OpenClaw 支持用于代理工作流的**摄像头采集**：

- **iOS 节点**（通过 Gateway 配对）：通过 `node.invoke` 采集**照片**（`jpg`）或**短视频片段**（`mp4`，可选音频）。
- **Android 节点**（通过 Gateway 配对）：通过 `node.invoke` 采集**照片**（`jpg`）或**短视频片段**（`mp4`，可选音频）。
- **macOS 应用**（通过 Gateway 的节点）：通过 `node.invoke` 采集**照片**（`jpg`）或**短视频片段**（`mp4`，可选音频）。

所有摄像头访问都受**用户控制的设置**限制。

## iOS 节点

### 用户设置（默认开启）

- iOS 设置标签页 → **相机** → **允许相机** (`camera.enabled`)
  - 默认：**开启**（缺失的键会被视为已启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应负载：
    - `devices`：`{ id, name, position, deviceType }` 数组

- `camera.snap`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `maxWidth`: number（可选；iOS 节点默认 `1600`）
    - `quality`: `0..1`（可选；默认 `0.9`）
    - `format`: 当前为 `jpg`
    - `delayMs`: number（可选；默认 `0`）
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应负载：
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - 负载保护：照片会重新压缩，以将 base64 负载保持在 5 MB 以下。

- `camera.clip`
  - 参数：
    - `facing`: `front|back`（默认：`front`）
    - `durationMs`: number（默认 `3000`，最大值限制为 `60000`）
    - `includeAudio`: boolean（默认 `true`）
    - `format`: 当前为 `mp4`
    - `deviceId`: string（可选；来自 `camera.list`）
  - 响应负载：
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前台要求

与 `canvas.*` 一样，iOS 节点只允许在**前台**执行 `camera.*` 命令。后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI 辅助工具（临时文件 + MEDIA）

获取附件的最简单方式是使用 CLI 辅助工具，它会将解码后的媒体写入临时文件并打印 `MEDIA:<path>`。

示例：

```bash
openclaw nodes camera snap --node <id>               # 默认：前后两个视角（2 行 MEDIA）
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

注意：

- `nodes camera snap` 默认使用**前后两个**视角，以便代理同时获得两个角度。
- 输出文件是临时文件（位于操作系统临时目录中），除非你自己构建包装器。

## Android 节点

### Android 用户设置（默认开启）

- Android 设置面板 → **相机** → **允许相机** (`camera.enabled`)
  - 默认：**开启**（缺失的键会被视为已启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 权限

- Android 需要运行时权限：
  - `CAMERA` 用于 `camera.snap` 和 `camera.clip`。
  - 当 `includeAudio=true` 时，`RECORD_AUDIO` 用于 `camera.clip`。

如果缺少权限，应用会在可能时提示；如果被拒绝，`camera.*` 请求会以
`*_PERMISSION_REQUIRED` 错误失败。

### Android 前台要求

与 `canvas.*` 一样，Android 节点只允许在**前台**执行 `camera.*` 命令。后台调用会返回 `NODE_BACKGROUND_UNAVAILABLE`。

### Android 命令（通过 Gateway `node.invoke`）

- `camera.list`
  - 响应负载：
    - `devices`：`{ id, name, position, deviceType }` 数组

### 负载保护

照片会重新压缩，以将 base64 负载保持在 5 MB 以下。

## macOS 应用

### 用户设置（默认关闭）

macOS 配套应用提供一个复选框：

- **设置 → 通用 → 允许相机** (`openclaw.cameraEnabled`)
  - 默认：**关闭**
  - 关闭时：摄像头请求返回“Camera disabled by user”。

### CLI 辅助工具（node invoke）

使用主 `openclaw` CLI 在 macOS 节点上调用摄像头命令。

示例：

```bash
openclaw nodes camera list --node <id>            # 列出 camera id
openclaw nodes camera snap --node <id>            # 打印 MEDIA:<path>
openclaw nodes camera snap --node <id> --max-width 1280
openclaw nodes camera snap --node <id> --delay-ms 2000
openclaw nodes camera snap --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --duration 10s          # 打印 MEDIA:<path>
openclaw nodes camera clip --node <id> --duration-ms 3000      # 打印 MEDIA:<path>（旧参数）
openclaw nodes camera clip --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --no-audio
```

注意：

- 除非另有覆盖，`openclaw nodes camera snap` 默认使用 `maxWidth=1600`。
- 在 macOS 上，`camera.snap` 会在热身/曝光稳定后等待 `delayMs`（默认 2000ms）再进行拍摄。
- 照片负载会重新压缩，以将 base64 保持在 5 MB 以下。

## 安全性 + 实际限制

- 摄像头和麦克风访问会触发常规的 OS 权限提示（并且需要在 Info.plist 中提供用途字符串）。
- 视频片段有上限（当前 `<= 60s`），以避免节点负载过大（base64 开销 + 消息限制）。

## macOS 屏幕视频（系统级）

对于 _屏幕_ 视频（不是摄像头），请使用 macOS 配套应用：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # 打印 MEDIA:<path>
```

注意：

- 需要 macOS **屏幕录制** 权限（TCC）。

## 相关内容

- [Image and media support](/nodes/images)
- [Media understanding](/nodes/media-understanding)
- [Location command](/nodes/location-command)
