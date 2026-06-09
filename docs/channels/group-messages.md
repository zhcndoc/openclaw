---
summary: "WhatsApp group message handling — activation, allowlists, sessions, and context injection"
read_when:
  - specifically configuring WhatsApp groups
  - changing WhatsApp activation mode (`mention` vs `always`)
  - adjusting the WhatsApp group session key or pending-message context
title: "WhatsApp Group Messages"
sidebarTitle: "WhatsApp Groups"
---

For the cross-channel group model (Discord, iMessage, Matrix, Microsoft Teams, Signal, Slack, Telegram, WhatsApp, Zalo), see [Groups](/channels/groups). This page describes the WhatsApp-specific behavior layered on top of that model: activation, group allowlists, per-group session keys, and pending-message context injection.

Goal: keep OpenClaw in WhatsApp groups, wake it only when mentioned, and keep that thread separate from personal DM sessions.

<Note>
`agents.list[].groupChat.mentionPatterns` is also used by Telegram, Discord, Slack, and iMessage. For multi-agent setups, configure it per agent, or use `messages.groupChat.mentionPatterns` as a global fallback.
</Note>

## Behavior

- Activation modes: `mention` (default) or `always`. `mention` requires a ping (real WhatsApp @-mentions via `mentionedJids`, safe regex patterns, or the bot's E.164 anywhere in the text). `always` wakes the agent on every message, but it should reply only when it can add meaningful value; otherwise it returns the exact silent token `NO_REPLY` / `no_reply`. Defaults can be set in config (`channels.whatsapp.groups`) and overridden per group via `/activation`. When `channels.whatsapp.groups` is set, it also acts as a group allowlist (include `"*"` to allow all).
- Group policy: `channels.whatsapp.groupPolicy` controls whether group messages are accepted (`open|disabled|allowlist`). `allowlist` uses `channels.whatsapp.groupAllowFrom` (fallback: explicit `channels.whatsapp.allowFrom`). Default is `allowlist` (blocked until you add senders).
- Per-group sessions: session keys look like `agent:<agentId>:whatsapp:group:<jid>` so commands such as `/verbose on`, `/trace on`, or `/think high` (sent as standalone messages) are scoped to that group; personal DM state is untouched. Heartbeats are skipped for group threads.
- Context injection: **pending-only** group messages (default 50) that _did not_ trigger a run are prefixed under `[Chat messages since your last reply - for context]`, with the triggering line under `[Current message - respond to this]`. Messages already in the session are not re-injected.
- Sender surfacing: every group batch now ends with `[from: Sender Name (+E164)]` so OpenClaw knows who is speaking.
- Ephemeral/view-once: we unwrap those before extracting text/mentions, so pings inside them still trigger.
- Group system prompt: on the first turn of a group session (and whenever `/activation` changes the mode) we inject a short blurb into the system prompt like `You are replying inside the WhatsApp group "<subject>". Group members: Alice (+44...), Bob (+43...), ... Activation: trigger-only ... Address the specific sender noted in the message context.` If metadata isn't available we still tell the agent it's a group chat.

## Configuration Example (WhatsApp)

Add a `groupChat` block to `~/.openclaw/openclaw.json` so display-name mentions still work even when WhatsApp strips the visible `@` from the text body:

```json5
{
  channels: {
    whatsapp: {
      groups: {
        "*": { requireMention: true },
      },
    },
  },
  agents: {
    list: [
      {
        id: "main",
        groupChat: {
          historyLimit: 50,
          mentionPatterns: ["@?openclaw", "\\+?15555550123"],
        },
      },
    ],
  },
}
```

Notes:

- These regular expressions are case-insensitive and use the same safe-regex protections as the rest of the config regex surface; invalid patterns and unsafe nested repetition are ignored.
- When someone taps a contact, WhatsApp still sends normalized mentions via `mentionedJids`, so the number fallback is rarely needed, but it is useful as a safety net.

### Activation Commands (owner only)

Use the group chat commands:

- `/activation mention`
- `/activation always`

Only the owner number (from `channels.whatsapp.allowFrom`, or the bot's own E.164 number if unset) can change this. Send `/status` as a standalone message in the group to see the current activation mode.

## Usage

1. Add your WhatsApp account (the one running OpenClaw) to the group.
2. Send `@openclaw …` (or include its number). Unless you set `groupPolicy: "open"`, only senders on the allowlist can trigger it.
3. The agent prompt will include recent group context plus a trailing `[from: …]` marker so it can reply to the right person.
4. Session-level commands (`/verbose on`, `/trace on`, `/think high`, `/new` or `/reset`, `/compact`) apply only to that group's session; send them as standalone messages for them to take effect. Your personal DM session stays separate.

## Testing / Verification

- Manual smoke test:
  - Send a single `@openclaw` ping in the group and confirm the reply references the sender's name.
  - Send a second ping and verify the history block is included, then cleared on the next turn.
- Check gateway logs (run with `--verbose`) for `inbound web message` entries showing `from: <groupJid>` plus the `[from: …]` suffix.

## Known Caveats

- Group heartbeats are intentionally skipped to avoid noisy broadcasts.
- Echo suppression uses the merged batch string; if you send the exact same text twice without a mention, only the first one gets a response.
- Session storage entries appear as `agent:<agentId>:whatsapp:group:<jid>` (default at `~/.openclaw/agents/<agentId>/sessions/sessions.json`); a missing entry just means that group has not triggered a run yet.
- Typing indicators in groups follow `agents.defaults.typingMode`. When the visible reply uses message-only tool mode, typing starts immediately by default so group members can see the agent working even if no final reply is auto-sent. Explicit typing-mode config still takes precedence.

## Related

- [Groups](/channels/groups)
- [Channel Routing](/channels/channel-routing)
- [Broadcast Groups](/channels/broadcast-groups)
