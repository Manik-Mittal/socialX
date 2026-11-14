package expo.modules.socialxcamera

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.effect.Presentation
import androidx.media3.transformer.*
import expo.modules.kotlin.Promise
import java.io.File
import java.util.UUID

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
object ReelMusicExporter {
  fun export(context: Context, video: String, audio: String, keepOriginal: Boolean, promise: Promise) {
    val handler = Handler(Looper.getMainLooper())
    handler.post {
      val output = File(context.cacheDir, "reel-music-${UUID.randomUUID()}.mp4")
      var transformer: Transformer? = null
      var finished = false
      val timeout = Runnable {
        if (!finished) {
          finished = true
          transformer?.cancel()
          output.delete()
          promise.reject("MUSIC_TIMEOUT", "Music export took too long. Try a shorter video.", null)
        }
      }
      try {
        val source = MediaItem.Builder().setUri(Uri.parse(video))
          .setClippingConfiguration(MediaItem.ClippingConfiguration.Builder().setEndPositionMs(60000).build()).build()
        val clip = EditedMediaItem.Builder(source).setRemoveAudio(!keepOriginal)
          .setEffects(Effects(emptyList(), listOf(Presentation.createForHeight(720)))).build()
        val picture = if (keepOriginal) EditedMediaItemSequence.withAudioAndVideoFrom(listOf(clip))
          else EditedMediaItemSequence.withVideoFrom(listOf(clip))
        val bed = EditedMediaItem.Builder(MediaItem.fromUri(audio)).setRemoveVideo(true).build()
        val music = EditedMediaItemSequence.withAudioFrom(listOf(bed)).buildUpon().setIsLooping(true).build()
        val composition = Composition.Builder(picture, music).build()
        transformer = Transformer.Builder(context)
          .setVideoMimeType(MimeTypes.VIDEO_H264).setAudioMimeType(MimeTypes.AUDIO_AAC)
          .addListener(object : Transformer.Listener {
            override fun onCompleted(composition: Composition, result: ExportResult) {
              if (finished) return
              finished = true; handler.removeCallbacks(timeout)
              promise.resolve(Uri.fromFile(output).toString())
            }
            override fun onError(composition: Composition, result: ExportResult, exception: ExportException) {
              if (finished) return
              finished = true; handler.removeCallbacks(timeout); output.delete()
              promise.reject("MUSIC_EXPORT", "Could not add music. Try another video.", exception)
            }
          }).build()
        handler.postDelayed(timeout, 180000)
        transformer!!.start(composition, output.absolutePath)
      } catch (error: Exception) {
        finished = true; handler.removeCallbacks(timeout); transformer?.cancel(); output.delete()
        promise.reject("MUSIC_EXPORT", "Could not add music. Try another video.", error)
      }
    }
  }
}
