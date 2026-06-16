# Architecture

## Initial Shape

Sirius should start as a small, local-first project with clear integration boundaries.

## Components

- Calendar connector: fetches and normalizes Google Calendar events.
- Health connector: imports or receives health summaries from an approved source.
- Context engine: combines events, tasks, and health signals.
- Briefing generator: creates daily summaries and next-action suggestions.
- Notification layer: sends summaries through the selected channel.

## Data Principles

- Ask for explicit permission before reading personal data.
- Store only the minimum useful information.
- Keep raw health data separate from generated recommendations.
- Make deletion/export straightforward.

## Open Decisions

- Native iOS app versus Shortcuts-based health bridge
- Local-only storage versus cloud sync
- CLI, desktop app, or web dashboard as the first interface
