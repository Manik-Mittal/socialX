const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

// Camera Kit's 0.6.0 wrapper disables iOS input audio. Apply a checked,
// idempotent change during prebuild so recordings can include microphone audio.
function enableAudio(source) {
  const before = 'AVSessionInput(session: captureSession, audioEnabled: false)';
  const after = 'AVSessionInput(session: captureSession, audioEnabled: true)';
  if (source.includes(after)) return source;
  if (!source.includes(before)) throw new Error('Camera Kit audio patch no longer matches. Review the SDK before building.');
  return source.replace(before, after);
}
module.exports = config => withDangerousMod(config, ['ios', async mod => {
  const root = path.dirname(require.resolve('@snap/camera-kit-react-native/package.json', { paths: [mod.modRequest.projectRoot] }));
  const metadata = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  if (metadata.version !== '0.6.0') throw new Error('Review the Camera Kit audio patch for this SDK version.');
  const target = path.join(root, 'ios', 'CameraKitContextModule.swift');
  const source = await fs.readFile(target, 'utf8');
  const next = enableAudio(source);
  if (next !== source) await fs.writeFile(target, next);
  return mod;
}]);
module.exports.enableAudio = enableAudio;
