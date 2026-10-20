import ExpoModulesCore

public class SocialXCameraModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SocialXCamera")
    View(SocialXCameraView.self) {
      Events("onReady", "onError")
      Prop("front") { (view: SocialXCameraView, value: Bool) in view.front = value }
      Prop("active") { (view: SocialXCameraView, value: Bool) in view.active = value }
      Prop("muted") { (view: SocialXCameraView, value: Bool) in view.muted = value }
      Prop("torch") { (view: SocialXCameraView, value: Bool) in view.torch = value }
      Prop("zoom") { (view: SocialXCameraView, value: Double) in view.zoom = min(1, max(0, value)) }
      Prop("matrix") { (view: SocialXCameraView, value: [Double]) in view.setMatrix(value) }
      OnViewDidUpdateProps { (view: SocialXCameraView) in view.updateCamera() }
      AsyncFunction("record") { (view: SocialXCameraView, promise: Promise) in view.record(promise) }
      AsyncFunction("stop") { (view: SocialXCameraView) in view.stop() }
    }
  }
}
