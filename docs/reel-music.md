# Reel music

After recording or importing a reel, select an instrumental in **Add music**, listen,
choose whether to keep the original sound, then tap **Apply music**. Review the resulting
video before publishing. **Original audio only** restores the original recording.

The export embeds music in the video file. Existing publishing, feed playback, shared
reels and downloaded files therefore use the same soundtrack without a database migration.
The picker does not offer commercial songs or permit arbitrary audio uploads.
Track provenance is documented in `assets/music/README.md`.

## Platforms

- iOS: AVFoundation composition/export in the local SocialXCamera Expo module.
- Android: Media3 Transformer 1.9.1 composition with a looping audio sequence.
- Web: canvas + Web Audio + MediaRecorder export. Keep the page visible. Export happens
  in real time and requires a browser supporting these APIs. MP4 is preferred when
  supported, otherwise WebM is used. WebM may not play in every external app.
- Expo Go and older custom builds: the picker explains that music export needs a new
  SocialX app build. Build with EAS using the existing project profile. JavaScript
  updates alone cannot install the native exporter.

## Validation still needed on devices

Native compilation and device export have not been verified on this Windows workstation.
Before release, test both platforms with a short silent clip, a clip with speech, and a
60-second portrait clip. Verify keeping/removing original sound, looping, orientation,
preview, upload, playback from another account, and external sharing. Check a browser
recording as well as an imported file. Confirm older builds show the unavailable state.
