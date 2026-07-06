---
summary: "每个收件人的 Matrix 推送规则：用于静默最终版预览编辑"
read_when:
  - 为自托管 Synapse 或 Tuwunel 配置 Matrix 静默流式传输
  - 用户只希望在块完成后收到通知，而不是每次预览编辑都通知
title: "Matrix 静默预览推送规则"
---

当 `channels.matrix.streaming` 为 `"quiet"` 时，OpenClaw 会通过就地编辑单个预览事件来流式传输回复。预览会作为不触发通知的 `m.notice` 事件发送，而最终编辑会被标记为 `content["com.openclaw.finalized_preview"] = true`。只有当某个按用户配置的推送规则匹配到该标记时，Matrix 客户端才会对这次最终编辑发出通知。此页面面向自行托管 Matrix、并希望为每个收件人账户安装该规则的运维人员。

`streaming: "progress"` 也会通过相同路径完成其草稿，因此同样的规则也会对 progress 模式下的最终编辑生效。

如果你只想使用标准的 Matrix 通知行为，请使用 `streaming: "partial"` 或保持 streaming 关闭。参见 [Matrix 频道设置](/channels/matrix#streaming-previews)。

## 前提条件

- recipient user = 应接收通知的人
- bot user = 发送回复的 OpenClaw Matrix 账户
- 对下面的 API 调用使用接收者用户的访问令牌
- 将 push rule 中的 `sender` 与 bot 用户的完整 MXID 匹配
- 接收者账户必须已经有正常工作的推送器；静默预览规则仅在正常的 Matrix 推送投递运行良好时才有效

## 步骤

<Steps>
  <Step title="配置静默预览">

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

  </Step>

  <Step title="获取收件人的访问令牌">
    尽可能复用现有的客户端会话令牌。如需生成一个新的：

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": { "type": "m.id.user", "user": "@alice:example.org" },
    "password": "已隐藏"
  }'
```

  </Step>

  <Step title="验证 pushers 是否存在">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

如果没有返回任何 pushers，请先为该账户修复正常的 Matrix 推送投递，再继续。

  </Step>

  <Step title="安装覆盖推送规则">
    安装一条匹配最终预览标记以及发送者为 bot MXID 的规则：

```bash
curl -sS -X PUT \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "conditions": [
      { "kind": "event_match", "key": "type", "pattern": "m.room.message" },
      {
        "kind": "event_property_is",
        "key": "content.m\\.relates_to.rel_type",
        "value": "m.replace"
      },
      {
        "kind": "event_property_is",
        "key": "content.com\\.openclaw\\.finalized_preview",
        "value": true
      },
      { "kind": "event_match", "key": "sender", "pattern": "@bot:example.org" }
    ],
    "actions": [
      "notify",
      { "set_tweak": "sound", "value": "default" },
      { "set_tweak": "highlight", "value": false }
    ]
  }'
```

    运行前请替换：

    - `https://matrix.example.org`：你的 homeserver 基础 URL
    - `$USER_ACCESS_TOKEN`：收件人用户的访问令牌
    - `openclaw-finalized-preview-botname`：每个 bot、每个收件人都唯一的规则 ID（模式：`openclaw-finalized-preview-<botname>`）
    - `@bot:example.org`：你的 OpenClaw bot MXID，不是收件人的

  </Step>

  <Step title="验证">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

然后测试一次流式回复。在 quiet 模式下，房间会显示一个静默的草稿预览，并在块或轮次结束时发送一次通知。

  </Step>
</Steps>

以后如需移除该规则，可使用收件人的令牌对同一个规则 URL 执行 `DELETE`。

## 多 bot 说明

推送规则按 `ruleId` 键控：对同一个 ID 重复执行 `PUT` 会更新同一条规则。对于多个 OpenClaw bot 向同一收件人发送通知的情况，请为每个 bot 创建一条规则，并使用不同的 sender 匹配。

新的用户自定义 `override` 规则会插入到服务器默认的 suppress 规则之前，因此不需要额外的排序参数。该规则只影响可在原处完成最终确认的纯文本预览编辑；媒体回复、过期预览的回退，以及会触发 Matrix 提及的最终文本，都会改为正常的通知消息发送。

## homeserver 说明

<AccordionGroup>
  <Accordion title="Synapse">
    不需要对 `homeserver.yaml` 做特殊更改。如果正常的 Matrix 通知已经能送达该用户，那么收件人令牌 + 上面的 `pushrules` 调用就是主要配置步骤。

    如果你在反向代理或 workers 后面运行 Synapse，请确保 `/_matrix/client/.../pushrules/` 能正确到达 Synapse。推送投递由主进程或 `synapse.app.pusher` / 已配置的 pusher workers 处理——请确保它们运行正常。

    该规则使用的是 `event_property_is` 推送规则条件（MSC3758，push rule v1.10），它于 2023 年加入 Synapse。旧版 Synapse 会接受 `PUT pushrules/...` 调用，但会悄悄地从不匹配该条件——如果最终预览编辑没有收到通知，请升级 Synapse。

  </Accordion>

  <Accordion title="Tuwunel">
    与 Synapse 的流程相同；无需为最终预览标记做任何 Tuwunel 专属配置。

    如果用户在另一台设备上活跃时通知消失，请检查是否启用了 `suppress_push_when_active`。Tuwunel 在 1.4.2（2025 年 9 月）中加入了此选项，它可以在某台设备活跃时有意抑制向其他设备发送推送。

  </Accordion>
</AccordionGroup>

## 相关内容

- [Matrix 频道设置](/channels/matrix)
- [流式传输概念](/concepts/streaming)
