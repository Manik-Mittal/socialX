# Mobile camera effects — integration pending device validation

SocialX uses `@snap/camera-kit-react-native` 0.6.0 for native lenses and processed video capture. This is an experimental integration: Snap describes its React Native wrapper as an example, not officially supported for production. Compilation against Expo 57 / React Native 0.86 and camera recording have not yet been verified on devices. Do not release it until the checks below pass.

## Activate lenses

1. Follow [Snap's project setup guide](https://developers.snap.com/camera-kit/getting-started/setting-up-accounts). The project owner must select their organization and enable Camera Kit for SocialX.
2. Obtain the **iOS and Android client API tokens** from the project overview. These are client credentials, not server secrets. Register the actual app identifiers in Snap; do not use a web token for mobile.
3. Publish or assign lenses to two groups: one for color looks and one for face effects. The app lists real group contents; it does not include a licensed catalog of Snapchat's lenses. Sample lenses can be used to test the connection. Staging tokens can add a watermark.
4. Set these values in `.env.local` and in the EAS build environment:

```dotenv
EXPO_PUBLIC_CAMERA_KIT_IOS_TOKEN=
EXPO_PUBLIC_CAMERA_KIT_ANDROID_TOKEN=
EXPO_PUBLIC_CAMERA_KIT_COLOR_GROUP_ID=
EXPO_PUBLIC_CAMERA_KIT_FACE_GROUP_ID=
```

5. Configure the real `ios.bundleIdentifier` and `android.package` in app.json to match Snap, then configure the Expo/EAS project and signing. No identifiers, account ownership or signing credentials have been assumed here.
6. Build a development app with `npx eas-cli@latest build --platform android --profile development` or the same command with `--platform ios`. EAS requires login; physical iPhone distribution requires appropriate Apple signing. Install it and run `npx expo start --dev-client`.

Expo Go continues to show a standard-camera fallback. Lens recording requires the custom build. The web camera is separate and unchanged. No paid lens packs or service subscriptions have been purchased.

## Behavior and limits

- Circular Colors / Faces selectors, Original, camera flip, preview and use/retake.
- One lens at a time. To combine a color look with a face mask, author a combined lens in Lens Studio.
- Select the lens before recording; switching during recording is disabled.
- Recording stops at approximately 59 seconds to leave room for encoder finalization. Preview validates actual duration before accepting it; the existing 25 MB upload limit still applies.
- Backgrounding stops an active recording. Leaving the screen closes the native session. Temporary unused captures remain in the app's cache until normal system cleanup.
- `plugins/withCameraKitAudio.js` enables iOS microphone input in the wrapper during prebuild, which otherwise has audio disabled. It checks the installed wrapper version and is idempotent. This native change still requires an iPhone recording test.
- Snap's React Native wrapper is experimental. Validate licensing, attribution, production access and current commercial terms in the project's Snap account before launch.

## Required device checks

On both platforms: deny/allow camera and microphone permissions; launch with missing/invalid tokens; load both groups; select a color look and a face lens; flip cameras; record with microphone audio; verify the saved video's effect and audio; retake; record to the time limit; background during capture; close/reopen the camera; publish and play a test reel from another account. Confirm failure paths leave the rest of SocialX usable.

No Camera Kit project, tokens, live lenses or device build were available during implementation. TypeScript/lint checks do not establish native compatibility or successful recording.
