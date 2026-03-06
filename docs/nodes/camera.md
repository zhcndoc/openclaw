---
summary: "供代理使用的摄像头捕捉（iOS/Android 节点 + macOS 应用）：照片（jpg）和短视频剪辑（mp4）"
read_when:
  - 添加或修改 iOS/Android 节点或 macOS 上的摄像头捕捉功能时
  - 扩展代理可访问的 MEDIA 临时文件工作流时
title: "摄像头捕捉"
---

# 摄像头捕捉（代理）

OpenClaw 支持用于代理工作流的**摄像头捕捉**：

- **iOS 节点**（通过网关配对）：通过 `node.invoke` 捕捉**照片**（`jpg`）或**短视频剪辑**（`mp4`，可选带音频）。
- **Android 节点**（通过网关配对）：通过 `node.invoke` 捕捉**照片**（`jpg`）或**短视频剪辑**（`mp4`，可选带音频）。
- **macOS 应用**（节点通过网关）：通过 `node.invoke` 捕捉**照片**（`jpg`）或**短视频剪辑**（`mp4`，可选带音频）。

所有摄像头访问均需通过**用户控制的设置**。

## iOS 节点

### 用户设置（默认开启）

- iOS 设置页 → **摄像头** → **允许摄像头**（`camera.enabled`）
  - 默认：**开启**（缺失该键视为启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 命令（通过网关 `node.invoke`）

- `camera.list`
  - 响应数据：
    - `devices`：数组，元素为 `{ id, name, position, deviceType }`

- `camera.snap`
  - 参数：
    - `facing`：`front|back`（默认：`front`）
    - `maxWidth`：数字（可选； iOS 节点默认 `1600`）
    - `quality`：`0..1`（可选；默认 `0.9`）
    - `format`：当前支持 `jpg`
    - `delayMs`：数字（可选；默认 `0`）
    - `deviceId`：字符串（可选；来自 `camera.list`）
  - 响应数据：
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - 数据保护：照片会重新压缩以保证 base64 数据不超过 5 MB。

- `camera.clip`
  - 参数：
    - `facing`：`front|back`（默认：`front`）
    - `durationMs`：数字（默认 `3000`，最大限制为 `60000`）
    - `includeAudio`：布尔值（默认 `true`）
    - `format`：当前支持 `mp4`
    - `deviceId`：字符串（可选；来自 `camera.list`）
  - 响应数据：
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### 前台要求

与 `canvas.*` 类似，iOS 节点只允许在**前台**执行 `camera.*` 命令。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`。

### CLI 辅助工具（临时文件 + MEDIA）

获取附件最简单方式是通过 CLI 辅助工具，它会解码媒体到临时文件并打印 `MEDIA:<path>`。

示例：

```bash
openclaw nodes camera snap --node <id>               # 默认：前后摄像头各一张（输出两行 MEDIA）
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

注意：

- `nodes camera snap` 默认对两个摄像头同时拍摄，以提供双视角。
- 输出文件为临时文件，存储在操作系统的临时目录，除非自行封装调用。

## Android 节点

### Android 用户设置（默认开启）

- Android 设置面板 → **摄像头** → **允许摄像头**（`camera.enabled`）
  - 默认：**开启**（缺失该键视为启用）。
  - 关闭时：`camera.*` 命令返回 `CAMERA_DISABLED`。

### 权限

- Android 需要运行时权限：
  - `CAMERA`：用于 `camera.snap` 和 `camera.clip`
  - `RECORD_AUDIO`：当 `camera.clip` 启用音频时（`includeAudio=true`）

若权限缺失，应用会自动请求；若拒绝，`camera.*` 请求返回 `*_PERMISSION_REQUIRED` 错误。

### Android 前台要求

与 `canvas.*` 类似，Android 节点只允许在**前台**执行 `camera.*` 命令。后台调用返回 `NODE_BACKGROUND_UNAVAILABLE`。

### Android 命令（通过网关 `node.invoke`）

- `camera.list`
  - 响应数据：
    - `devices`：数组，元素为 `{ id, name, position, deviceType }`

### 数据保护

照片会重新压缩以保证 base64 数据不超过 5 MB。

## macOS 应用

### 用户设置（默认关闭）

macOS 配套应用提供了一个复选框：

- **设置 → 通用 → 允许摄像头**（`openclaw.cameraEnabled`）
  - 默认：**关闭**
  - 关闭时：摄像头请求返回 “Camera disabled by user”。

### CLI 辅助工具（节点调用）

使用主 `openclaw` CLI 调用 macOS 节点的摄像头命令。

示例：

```bash
openclaw nodes camera list --node <id>            # 列出摄像头 ID
openclaw nodes camera snap --node <id>            # 输出 MEDIA:<path>
openclaw nodes camera snap --node <id> --max-width 1280
openclaw nodes camera snap --node <id> --delay-ms 2000
openclaw nodes camera snap --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --duration 10s          # 输出 MEDIA:<path>
openclaw nodes camera clip --node <id> --duration-ms 3000      # 输出 MEDIA:<path>（旧参数）
openclaw nodes camera clip --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --no-audio
```

注意：

- `openclaw nodes camera snap` 默认 `maxWidth=1600`，除非指定覆盖。
- macOS 上 `camera.snap` 会在预热和曝光调整完成后等待 `delayMs`（默认 2000 毫秒）再拍摄。
- 照片数据会重新压缩，保证 base64 不超过 5 MB。

## 安全与实际限制

- 摄像头和麦克风访问会触发常规的系统权限弹窗（并要求 Info.plist 中提供使用说明）。
- 视频剪辑时长有限制（当前限时 `<= 60s`），防止节点负载过大（base64 增加和消息大小限制）。

## macOS 屏幕视频（系统级）

对于**屏幕**视频（非摄像头），使用 macOS 配套应用：

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # 输出 MEDIA:<path>
```

注意：

- 需 macOS **屏幕录制**权限（TCC）。
