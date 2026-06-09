---
summary: "Use ElevenLabs voice, Scribe STT, and real-time transcription with OpenClaw"
read_when:
  - You want to use ElevenLabs text-to-speech in OpenClaw
  - You want to use ElevenLabs Scribe speech-to-text for audio attachments
  - You want to use ElevenLabs real-time transcription for Voice Call or Google Meet
title: "ElevenLabs"
---

OpenClaw uses ElevenLabs for text-to-speech, Scribe v2 for batch speech-to-text, and Scribe v2 Realtime for streaming STT.

| Capability              | OpenClaw surface                                                  | Default value            |
| ----------------------- | ----------------------------------------------------------------- | ------------------------ |
| Text to speech          | `messages.tts` / `talk`                                          | `eleven_multilingual_v2` |
| Batch speech to text    | `tools.media.audio`                                               | `scribe_v2`              |
| Streaming speech to text| Voice Call streaming or Google Meet `realtime.transcriptionProvider` | `scribe_v2_realtime`     |

## Authentication

Set `ELEVENLABS_API_KEY` in your environment. For compatibility with existing ElevenLabs tools, `XI_API_KEY` is also accepted.

```bash
export ELEVENLABS_API_KEY="..."
```

## Text to Speech

```json5
{
  messages: {
    tts: {
      providers: {
        elevenlabs: {
          apiKey: "${ELEVENLABS_API_KEY}",
          speakerVoiceId: "pMsXgVXv3BLzUgSXRplE",
          modelId: "eleven_multilingual_v2",
        },
      },
    },
  },
}
```

Set `modelId` to `eleven_v3` to use ElevenLabs v3 TTS. OpenClaw will keep
`eleven_multilingual_v2` as the default for existing installations.

Discord voice channels use ElevenLabs' streaming TTS endpoint when ElevenLabs is selected as the `voice.tts`/`messages.tts` provider. Playback starts from the returned audio stream instead of waiting for OpenClaw to download and write the full audio file first. `latencyTier` maps to the `optimize_streaming_latency` query parameter used by ElevenLabs for models that accept it; OpenClaw omits that parameter for `eleven_v3` because it rejects it.

## Speech to Text

Use Scribe v2 for incoming audio attachments and short recorded voice clips:

```json5
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "elevenlabs", model: "scribe_v2" }],
      },
    },
  },
}
```

OpenClaw sends multipart audio to ElevenLabs `/v1/speech-to-text` and uses
`model_id: "scribe_v2"`. Language hints are mapped to `language_code` when present.

## Streaming STT

The bundled `elevenlabs` plugin registers Scribe v2 Realtime streaming transcription for Voice Call and Google Meet agent modes.

| Setting        | Config path                                                            | Default value                              |
| -------------- | --------------------------------------------------------------------------- | ------------------------------------------ |
| API key        | `plugins.entries.voice-call.config.streaming.providers.elevenlabs.apiKey` | Falls back to `ELEVENLABS_API_KEY` / `XI_API_KEY` |
| Model          | `...elevenlabs.modelId`                                                | `scribe_v2_realtime`                       |
| Audio format   | `...elevenlabs.audioFormat`                                            | `ulaw_8000`                                |
| Sample rate    | `...elevenlabs.sampleRate`                                             | `8000`                                     |
| Commit strategy | `...elevenlabs.commitStrategy`                                         | `vad`                                      |
| Language       | `...elevenlabs.languageCode`                                           | (unset)                                    |

```json5
{
  plugins: {
    entries: {
      "voice-call": {
        config: {
          streaming: {
            enabled: true,
            provider: "elevenlabs",
            providers: {
              elevenlabs: {
                apiKey: "${ELEVENLABS_API_KEY}",
                audioFormat: "ulaw_8000",
                commitStrategy: "vad",
                languageCode: "en",
              },
            },
          },
        },
      },
    },
  },
}
```

<Note>
Voice Call receives media from Twilio in 8 kHz G.711 μ-law format. The ElevenLabs realtime
provider defaults to `ulaw_8000`, so phone frames can be forwarded directly without transcoding.
</Note>

For Google Meet agent mode, set
`plugins.entries.google-meet.config.realtime.transcriptionProvider` to
`"elevenlabs"` and configure the same provider block under
`plugins.entries.google-meet.config.realtime.providers.elevenlabs`.

## Related

- [Text to speech](/tools/tts)
- [Google Meet](/plugins/google-meet)
- [Model selection](/concepts/model-providers)
