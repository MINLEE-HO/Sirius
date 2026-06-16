# Integrations

## Google Calendar

Preferred path: Google Calendar API with OAuth consent.

Data to read:

- Event title
- Start and end time
- Location or meeting link
- Attendees, when useful
- Event description, when permission allows

## iPhone Health

Apple Health data usually requires one of these paths:

- Native iOS app with HealthKit permission
- Apple Health export imported by the project
- Shortcuts automation that sends selected health summaries

Potential signals:

- Sleep duration
- Steps
- Workouts
- Resting heart rate
- Mindful minutes, if available

## Notifications

Possible delivery paths:

- macOS local notifications
- iOS app notifications
- Shortcuts-triggered notifications
- Third-party push services, if explicitly chosen later
