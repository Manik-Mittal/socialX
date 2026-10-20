package expo.modules.socialxcamera

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SocialXCameraModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SocialXCamera")
    View(SocialXCameraView::class) {
      Events("onReady", "onError")
      Prop("front") { view: SocialXCameraView, value: Boolean -> view.front = value }
      Prop("active") { view: SocialXCameraView, value: Boolean -> view.active = value }
      Prop("muted") { view: SocialXCameraView, value: Boolean -> view.muted = value }
      Prop("torch") { view: SocialXCameraView, value: Boolean -> view.torch = value }
      Prop("zoom") { view: SocialXCameraView, value: Double -> view.zoom = value.toFloat().coerceIn(0f, 1f) }
      Prop("matrix") { view: SocialXCameraView, value: List<Double> -> view.updateMatrix(value) }
      OnViewDidUpdateProps { view: SocialXCameraView -> view.updateCamera() }
      OnViewDestroys { view: SocialXCameraView -> view.dispose() }
      AsyncFunction("record") { view: SocialXCameraView, promise: Promise -> view.record(promise) }
      AsyncFunction("stop") { view: SocialXCameraView -> view.stop() }
    }
  }
}
