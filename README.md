# Sirius

Sirius is a personal assistant project that reads calendar context and health signals to help summarize schedules, surface tasks, and recommend better daily planning.

## Goal

- Read Google Calendar events and turn them into concise daily briefings.
- Use iPhone health signals, where permission and platform access allow, to adjust recommendations.
- Help the user decide what to do next based on time, energy, and commitments.

## Initial Scope

- Daily schedule summary
- Priority task suggestions
- Health-aware planning hints
- Notification and reminder strategy

## Documents

- [Product Brief](docs/product-brief.md)
- [Integrations](docs/integrations.md)
- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)

## Voice And Calendar

The app includes a browser-based Voice Core:

- Click `Start Listening` to keep the assistant listening.
- Say `hey siri` first, then give a command.
- Example: `hey siri 오늘 일정 알려줘`
- If Google Calendar is not connected, Sirius will ask for a Google OAuth Client ID.
- After Calendar authorization, Sirius fetches today's primary calendar events and reads a Korean TTS summary.
- TTS prefers an available male system/browser voice and lowers pitch for a calmer assistant tone; it does not clone the original JARVIS voice.

Google Calendar requires a Web OAuth client configured in Google Cloud Console:

- Enable the Google Calendar API.
- Create an OAuth Client ID for a web application.
- Add the local origin used to run this app, such as `http://localhost:4173`, to authorized JavaScript origins.
- Paste the Client ID into the app's `Google OAuth Client ID` field and click `Connect`.

Sirius requests only this read-only scope:

```text
https://www.googleapis.com/auth/calendar.readonly
```
