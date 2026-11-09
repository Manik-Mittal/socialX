# Mobile camera effects

SocialX uses its local `socialx-camera` Expo module for native color filters. The filters are defined in `src/camera/filters.ts` and can be adjusted before recording. This module requires a new development or production build; Expo Go uses the `expo-camera` fallback without color filters. The web camera implementation is separate.

The native camera supports front/back switching, rear torch, zoom, sound on/off, and preview/retake. Microphone denial allows silent recording. Camera denial offers settings and the phone camera fallback. Recordings become persistent only after a reel is posted.

## Required device checks

On both platforms: allow and deny camera and microphone permissions; switch cameras; adjust zoom; record with and without sound; stop manually and at the time limit; background during recording; preview and retake; publish and play a test reel from another account. In a custom build, verify that each color filter appears in both the preview and saved video. In Expo Go, verify that the unfiltered fallback records successfully.

The fallback caps recordings at 59 seconds or 24 MiB. Native module compilation and filtered recording still require device validation; lint and TypeScript checks do not establish native compatibility.
