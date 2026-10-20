package expo.modules.socialxcamera

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.view.Surface
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.media3.effect.Media3Effect
import androidx.camera.video.*
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import androidx.media3.effect.RgbMatrix
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.File
import java.util.UUID

@SuppressLint("ViewConstructor", "UnsafeOptInUsageError", "MissingPermission")
class SocialXCameraView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  val onReady by EventDispatcher()
  val onError by EventDispatcher()
  var front = true
  var active = true
  var muted = false
  var torch = false
  var zoom = 0f
  private val executor = ContextCompat.getMainExecutor(context)
  private val previewView = PreviewView(context).apply { implementationMode = PreviewView.ImplementationMode.COMPATIBLE }
  private var provider: ProcessCameraProvider? = null
  private var camera: Camera? = null
  private var preview: Preview? = null
  private var video: VideoCapture<Recorder>? = null
  private var effect: Media3Effect? = null
  private var recording: Recording? = null
  private var recordingPromise: Promise? = null
  private var boundFront: Boolean? = null
  private var disposed = false
  private var failed = false
  private var matrix = floatArrayOf(1f,0f,0f,0f, 0f,1f,0f,0f, 0f,0f,1f,0f, 0f,0f,0f,1f)

  init {
    addView(previewView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    val future = ProcessCameraProvider.getInstance(context)
    future.addListener({
      if (!disposed) try { provider = future.get(); updateCamera() }
      catch (e: Exception) { fail(e.message ?: "Camera unavailable") }
    }, executor)
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    previewView.layout(0, 0, right - left, bottom - top)
  }

  fun updateMatrix(values: List<Double>) {
    if (recordingPromise != null) return
    if (values.size != 16 || values.any { !it.isFinite() }) return
    matrix = values.map { it.toFloat() }.toFloatArray()
    applyFilter()
  }

  private fun applyFilter() {
    val snapshot = matrix.copyOf()
    effect?.setEffects(listOf(object : RgbMatrix {
      override fun getMatrix(presentationTimeUs: Long, useHdr: Boolean): FloatArray = snapshot
    }))
  }

  fun updateCamera() {
    val provider = provider ?: return
    if (disposed) return
    if (!active) {
      stop()
      // Preserve the bound pipeline until recording finalization, then release it.
      if (recordingPromise == null) unbind()
      return
    }
    if (recordingPromise != null) return
    try {
      if (boundFront != front || camera == null) {
        unbind()
        failed = false
        val owner = appContext.currentActivity as? LifecycleOwner ?: error("Camera activity is not ready")
        val selector = if (front) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
        if (!provider.hasCamera(selector)) error("This camera is unavailable. Try the other camera.")
        val p = Preview.Builder().setTargetRotation(Surface.ROTATION_0).build()
        p.setSurfaceProvider(previewView.surfaceProvider)
        val recorder = Recorder.Builder().setTargetVideoEncodingBitRate(2_500_000)
          .setQualitySelector(QualitySelector.from(Quality.HD, FallbackStrategy.lowerQualityOrHigherThan(Quality.HD))).build()
        val v = VideoCapture.Builder(recorder).setTargetRotation(Surface.ROTATION_0)
          .setMirrorMode(MirrorMode.MIRROR_MODE_ON_FRONT_ONLY).build()
        val fx = Media3Effect(context, CameraEffect.PREVIEW or CameraEffect.VIDEO_CAPTURE, executor) {
          fail("Filter processing failed. Close and reopen the camera.")
        }
        effect = fx
        applyFilter()
        preview = p; video = v
        camera = provider.bindToLifecycle(owner, selector, UseCaseGroup.Builder().addUseCase(p).addUseCase(v).addEffect(fx).build())
        boundFront = front
        previewView.previewStreamState.observe(owner) { state ->
          if (!disposed && active && !failed && state == PreviewView.StreamState.STREAMING) onReady(emptyMap<String, Any>())
        }
      }
      camera?.cameraControl?.enableTorch(torch && !front)
      camera?.cameraControl?.setLinearZoom(zoom)
    } catch (e: Exception) { fail(e.message ?: "Could not open camera") }
  }

  fun record(promise: Promise) {
    val recorder = video?.output
    if (!active || disposed || failed || recorder == null || recordingPromise != null) {
      promise.reject("E_CAMERA", "Camera is not ready to record", null); return
    }
    val file = File(context.cacheDir, "socialx-${UUID.randomUUID()}.mp4")
    try {
      val options = FileOutputOptions.Builder(file).setDurationLimitMillis(59_000).setFileSizeLimit(24L * 1024 * 1024).build()
      var pending = recorder.prepareRecording(context, options)
      if (!muted) {
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) error("Microphone permission is required for sound")
        pending = pending.withAudioEnabled()
      }
      recordingPromise = promise
      recording = pending.start(executor) { event ->
        if (event is VideoRecordEvent.Finalize) {
          val reply = recordingPromise
          recordingPromise = null; recording = null
          val success = event.error == VideoRecordEvent.Finalize.ERROR_NONE ||
            event.error == VideoRecordEvent.Finalize.ERROR_DURATION_LIMIT_REACHED ||
            event.error == VideoRecordEvent.Finalize.ERROR_FILE_SIZE_LIMIT_REACHED
          if (success && !failed && !disposed && file.length() > 0) reply?.resolve(mapOf("uri" to android.net.Uri.fromFile(file).toString()))
          else { file.delete(); reply?.reject("E_RECORDING", "Recording could not be saved. Please retry.", event.cause) }
          if (!active || disposed) unbind()
        }
      }
    } catch (e: Exception) {
      recordingPromise = null; recording = null; file.delete()
      promise.reject("E_RECORDING", e.message, e)
    }
  }

  fun stop() { recording?.stop() }
  private fun fail(message: String) {
    failed = true; stop()
    if (!disposed) onError(mapOf("message" to message))
  }
  private fun unbind() {
    val useCases = listOfNotNull(preview, video)
    if (useCases.isNotEmpty()) provider?.unbind(*useCases.toTypedArray())
    (appContext.currentActivity as? LifecycleOwner)?.let { previewView.previewStreamState.removeObservers(it) }
    camera = null; preview = null; video = null; boundFront = null
    effect?.close(); effect = null
  }
  fun dispose() { disposed = true; stop(); if (recordingPromise == null) unbind() }
}
