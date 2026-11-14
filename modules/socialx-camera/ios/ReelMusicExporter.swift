import AVFoundation
import ExpoModulesCore

enum ReelMusicExporter {
  static func export(video: String, audio: String, keepOriginal: Bool, promise: Promise) {
    Task {
      var output: URL?
      do {
        guard let videoURL = URL(string: video), let audioURL = URL(string: audio) else {
          throw NSError(domain: "SocialXMusic", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid media file."])
        }
        let source = AVURLAsset(url: videoURL), music = AVURLAsset(url: audioURL)
        let duration = try await source.load(.duration)
        guard duration.seconds > 0, duration.seconds <= 60.1,
              let videoTrack = try await source.loadTracks(withMediaType: .video).first,
              let musicTrack = try await music.loadTracks(withMediaType: .audio).first else {
          throw NSError(domain: "SocialXMusic", code: 2, userInfo: [NSLocalizedDescriptionKey: "Choose a readable video up to 60 seconds."])
        }
        let composition = AVMutableComposition()
        let picture = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
        try picture.insertTimeRange(CMTimeRange(start: .zero, duration: duration), of: videoTrack, at: .zero)
        picture.preferredTransform = try await videoTrack.load(.preferredTransform)
        var parameters: [AVAudioMixInputParameters] = []
        if keepOriginal, let original = try await source.loadTracks(withMediaType: .audio).first {
          let track = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
          let range = try await original.load(.timeRange)
          let end = CMTimeMinimum(CMTimeRangeGetEnd(range), duration)
          if CMTimeCompare(end, range.start) > 0 {
            try track.insertTimeRange(CMTimeRange(start: range.start, end: end), of: original, at: range.start)
          }
          let mix = AVMutableAudioMixInputParameters(track: track)
          mix.setVolume(0.8, at: .zero); parameters.append(mix)
        }
        let bed = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
        let musicDuration = try await music.load(.duration)
        guard musicDuration.seconds > 0 else { throw NSError(domain: "SocialXMusic", code: 3) }
        var cursor = CMTime.zero
        while CMTimeCompare(cursor, duration) < 0 {
          let length = CMTimeMinimum(musicDuration, CMTimeSubtract(duration, cursor))
          try bed.insertTimeRange(CMTimeRange(start: .zero, duration: length), of: musicTrack, at: cursor)
          cursor = CMTimeAdd(cursor, length)
        }
        let musicMix = AVMutableAudioMixInputParameters(track: bed)
        musicMix.setVolume(keepOriginal ? 0.55 : 1, at: .zero); parameters.append(musicMix)
        let mix = AVMutableAudioMix(); mix.inputParameters = parameters
        guard let exporter = AVAssetExportSession(asset: composition, presetName: AVAssetExportPreset1280x720) else {
          throw NSError(domain: "SocialXMusic", code: 4)
        }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("reel-music-\(UUID().uuidString).mp4")
        output = url
        exporter.outputURL = url; exporter.outputFileType = .mp4
        exporter.audioMix = mix; exporter.shouldOptimizeForNetworkUse = true
        await exporter.export()
        guard exporter.status == .completed else { throw exporter.error ?? NSError(domain: "SocialXMusic", code: 5) }
        promise.resolve(url.absoluteString)
      } catch {
        if let output { try? FileManager.default.removeItem(at: output) }
        promise.reject("MUSIC_EXPORT", "Could not add music: \(error.localizedDescription)")
      }
    }
  }
}
