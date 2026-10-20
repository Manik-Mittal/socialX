import ExpoModulesCore
import AVFoundation
import CoreImage
import MetalKit

final class SocialXCameraView: ExpoView, AVCaptureVideoDataOutputSampleBufferDelegate, AVCaptureAudioDataOutputSampleBufferDelegate, MTKViewDelegate {
  let onReady = EventDispatcher()
  let onError = EventDispatcher()
  var front = true
  var active = true
  var muted = false
  var torch = false
  var zoom = 0.0
  private let session = AVCaptureSession()
  // Session mutation, sample processing, writer state and filter state share one queue.
  private let queue = DispatchQueue(label: "socialx.camera")
  private let metal = MTLCreateSystemDefaultDevice()
  private lazy var context = metal.map { CIContext(mtlDevice: $0, options: [.cacheIntermediates: false]) }
  private lazy var commands = metal?.makeCommandQueue()
  private lazy var canvas = MTKView(frame: .zero, device: metal)
  private let colorSpace = CGColorSpaceCreateDeviceRGB()
  private var device: AVCaptureDevice?
  private var boundFront: Bool?
  private var boundMuted: Bool?
  private var videoOutput: AVCaptureVideoDataOutput?
  private var audioOutput: AVCaptureAudioDataOutput?
  private var matrix: [CGFloat] = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]
  private var ready = false
  private var detached = false
  private var writer: AVAssetWriter?
  private var videoInput: AVAssetWriterInput?
  private var audioInput: AVAssetWriterInput?
  private var adaptor: AVAssetWriterInputPixelBufferAdaptor?
  private var promise: Promise?
  private var outputURL: URL?
  private var firstTime: CMTime?
  private var timeout: DispatchWorkItem?
  private var finishing = false
  private var previewImage: CIImage?
  private let previewLock = NSLock()
  private var previewPending = false
  private var observers: [NSObjectProtocol] = []

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    canvas.framebufferOnly = false
    canvas.isPaused = true
    canvas.enableSetNeedsDisplay = false
    canvas.delegate = self
    canvas.colorPixelFormat = .bgra8Unorm
    addSubview(canvas)
    for name in [AVCaptureSession.wasInterruptedNotification, AVCaptureSession.runtimeErrorNotification, UIApplication.didEnterBackgroundNotification] {
      observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: nil) { [weak self] _ in
        self?.queue.async { [weak self] in
          guard let self else { return }
          self.finish(error: "Camera was interrupted. Please record again.")
          self.ready = false
          self.session.stopRunning()
        }
      })
    }
  }

  override func layoutSubviews() { super.layoutSubviews(); canvas.frame = bounds }
  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window != nil { queue.async { self.detached = false }; updateCamera() }
    else {
      queue.async {
        self.detached = true
        self.finish(error: "Camera closed")
        self.session.stopRunning()
        self.ready = false
      }
    }
  }

  func setMatrix(_ values: [Double]) {
    guard values.count == 16, values.allSatisfy({ $0.isFinite }) else { return }
    queue.async { if self.promise == nil { self.matrix = values.map { CGFloat($0) } } }
  }

  func updateCamera() {
    let config = (front, active && window != nil, muted, torch, zoom)
    queue.async {
      guard !self.detached else { return }
      if !config.1 { self.finish(); self.session.stopRunning(); self.ready = false; return }
      guard self.promise == nil, !self.finishing else { return }
      do {
        guard self.metal != nil else { throw self.failure("This device does not support the effects camera") }
        if self.boundFront != config.0 || self.boundMuted != config.2 {
          try self.configure(front: config.0, muted: config.2)
        }
        if let device = self.device {
          try device.lockForConfiguration()
          // Match Android's linear zoom fraction in field-of-view space.
          let maximum = min(device.activeFormat.videoMaxZoomFactor, 8)
          device.videoZoomFactor = 1 / (1 - CGFloat(config.4) * (1 - 1 / maximum))
          if device.hasTorch { device.torchMode = config.3 && !config.0 ? .on : .off }
          device.unlockForConfiguration()
        }
        if !self.session.isRunning { self.session.startRunning() }
      } catch { self.report(error.localizedDescription) }
    }
  }

  private func configure(front: Bool, muted: Bool) throws {
    session.beginConfiguration()
    defer { session.commitConfiguration() }
    ready = false
    session.inputs.forEach { session.removeInput($0) }
    session.outputs.forEach { session.removeOutput($0) }
    boundFront = nil; boundMuted = nil; audioOutput = nil; videoOutput = nil
    session.sessionPreset = .hd1280x720
    guard let captureDevice = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: front ? .front : .back) else { throw failure("Camera unavailable") }
    let input = try AVCaptureDeviceInput(device: captureDevice)
    guard session.canAddInput(input) else { throw failure("Could not start camera") }
    session.addInput(input)
    let video = AVCaptureVideoDataOutput()
    video.alwaysDiscardsLateVideoFrames = true
    video.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA]
    video.setSampleBufferDelegate(self, queue: queue)
    guard session.canAddOutput(video) else { throw failure("Could not process camera frames") }
    session.addOutput(video)
    if let connection = video.connection(with: .video) {
      if connection.isVideoOrientationSupported { connection.videoOrientation = .portrait }
      if connection.isVideoMirroringSupported { connection.automaticallyAdjustsVideoMirroring = false; connection.isVideoMirrored = front }
    }
    if !muted {
      guard AVCaptureDevice.authorizationStatus(for: .audio) == .authorized,
        let microphone = AVCaptureDevice.default(for: .audio) else { throw failure("Microphone access is required for sound") }
      let audio = try AVCaptureDeviceInput(device: microphone)
      guard session.canAddInput(audio) else { throw failure("Could not open microphone") }
      session.addInput(audio)
      let output = AVCaptureAudioDataOutput()
      output.setSampleBufferDelegate(self, queue: queue)
      guard session.canAddOutput(output) else { throw failure("Could not capture sound") }
      session.addOutput(output); audioOutput = output
    }
    videoOutput = video; device = captureDevice; boundFront = front; boundMuted = muted
  }

  func record(_ reply: Promise) {
    queue.async {
      guard self.ready, self.session.isRunning, self.promise == nil, !self.finishing, !self.detached else {
        reply.reject("E_CAMERA", "Camera is not ready to record"); return
      }
      self.promise = reply
      self.outputURL = FileManager.default.temporaryDirectory.appendingPathComponent("socialx-\(UUID().uuidString).mp4")
      let timeout = DispatchWorkItem { [weak self] in self?.finish() }
      self.timeout = timeout
      self.queue.asyncAfter(deadline: .now() + 59, execute: timeout)
    }
  }
  func stop() { queue.async { self.finish() } }

  private func beginWriter(_ buffer: CVPixelBuffer, time: CMTime) throws {
    guard let url = outputURL else { throw failure("Missing recording destination") }
    let width = CVPixelBufferGetWidth(buffer), height = CVPixelBufferGetHeight(buffer)
    let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
    let video = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: width, AVVideoHeightKey: height, AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 2_500_000]])
    video.expectsMediaDataInRealTime = true
    guard writer.canAdd(video) else { throw failure("Video encoding unavailable") }
    writer.add(video)
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: video, sourcePixelBufferAttributes: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height, kCVPixelBufferIOSurfacePropertiesKey as String: [:]])
    if audioOutput != nil {
      let audio = AVAssetWriterInput(mediaType: .audio, outputSettings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 44100, AVNumberOfChannelsKey: 1, AVEncoderBitRateKey: 96000])
      audio.expectsMediaDataInRealTime = true
      guard writer.canAdd(audio) else { throw failure("Audio encoding unavailable") }
      writer.add(audio); audioInput = audio
    }
    guard writer.startWriting() else { throw writer.error ?? failure("Could not start recording") }
    writer.startSession(atSourceTime: time)
    self.writer = writer; videoInput = video; self.adaptor = adaptor; firstTime = time
  }

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    guard !detached else { return }
    let time = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    if output === audioOutput {
      if !finishing, let firstTime, time >= firstTime, let audioInput, audioInput.isReadyForMoreMediaData, writer?.status == .writing {
        if !audioInput.append(sampleBuffer) { finish(error: "Could not record audio") }
      }
      return
    }
    guard let buffer = CMSampleBufferGetImageBuffer(sampleBuffer), let context else { return }
    let m = matrix
    let image = CIImage(cvPixelBuffer: buffer).applyingFilter("CIColorMatrix", parameters: [
      "inputRVector": CIVector(x: m[0], y: m[4], z: m[8], w: 0),
      "inputGVector": CIVector(x: m[1], y: m[5], z: m[9], w: 0),
      "inputBVector": CIVector(x: m[2], y: m[6], z: m[10], w: 0),
      "inputAVector": CIVector(x: 0, y: 0, z: 0, w: 1),
      "inputBiasVector": CIVector(x: m[12], y: m[13], z: m[14], w: 0)
    ])
    if !ready { ready = true; DispatchQueue.main.async { self.onReady([:]) } }
    previewLock.lock()
    previewImage = image
    let schedule = !previewPending
    previewPending = true
    previewLock.unlock()
    if schedule { DispatchQueue.main.async { [weak self] in self?.canvas.draw() } }
    guard promise != nil, !finishing else { return }
    do {
      if writer == nil { try beginWriter(buffer, time: time) }
      if let firstTime, CMTimeGetSeconds(time - firstTime) >= 59 { finish(); return }
      guard writer?.status == .writing else { throw writer?.error ?? failure("Video encoder stopped") }
      guard videoInput?.isReadyForMoreMediaData == true, let adaptor, let pool = adaptor.pixelBufferPool else { return }
      var destination: CVPixelBuffer?
      guard CVPixelBufferPoolCreatePixelBuffer(nil, pool, &destination) == kCVReturnSuccess, let destination else { throw failure("Not enough memory to record") }
      context.render(image, to: destination, bounds: image.extent, colorSpace: colorSpace)
      if !adaptor.append(destination, withPresentationTime: time) { throw writer?.error ?? failure("Could not save video frame") }
    } catch { finish(error: error.localizedDescription) }
  }

  private func finish(error: String? = nil) {
    guard let reply = promise, !finishing else { return }
    finishing = true; timeout?.cancel(); timeout = nil
    let url = outputURL, writer = writer
    videoInput?.markAsFinished(); audioInput?.markAsFinished()
    let complete: () -> Void = {
      let succeeded = error == nil && writer?.status == .completed && !self.detached
      if succeeded, let url { reply.resolve(["uri": url.absoluteString]) }
      else {
        if let url { try? FileManager.default.removeItem(at: url) }
        reply.reject("E_RECORDING", error ?? writer?.error?.localizedDescription ?? "No video recorded. Please try again.")
      }
      self.promise = nil; self.writer = nil; self.videoInput = nil; self.audioInput = nil
      self.adaptor = nil; self.firstTime = nil; self.outputURL = nil; self.finishing = false
    }
    if error != nil { writer?.cancelWriting(); complete() }
    else if let writer, writer.status == .writing { writer.finishWriting { self.queue.async(execute: complete) } }
    else { complete() }
  }

  func draw(in view: MTKView) {
    previewLock.lock(); let image = previewImage; previewPending = false; previewLock.unlock()
    guard let image, let drawable = view.currentDrawable, let context, let command = commands?.makeCommandBuffer() else { return }
    let size = view.drawableSize
    guard size.width > 0, size.height > 0 else { return }
    let scale = max(size.width / image.extent.width, size.height / image.extent.height)
    let scaled = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let centered = scaled.transformed(by: CGAffineTransform(translationX: (size.width - scaled.extent.width) / 2, y: (size.height - scaled.extent.height) / 2))
    context.render(centered, to: drawable.texture, commandBuffer: command, bounds: CGRect(origin: .zero, size: size), colorSpace: colorSpace)
    command.present(drawable); command.commit()
  }
  func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {}
  private func failure(_ message: String) -> NSError { NSError(domain: "SocialXCamera", code: 1, userInfo: [NSLocalizedDescriptionKey: message]) }
  private func report(_ message: String) { DispatchQueue.main.async { self.onError(["message": message]) } }
  deinit { observers.forEach { NotificationCenter.default.removeObserver($0) }; timeout?.cancel() }
}
