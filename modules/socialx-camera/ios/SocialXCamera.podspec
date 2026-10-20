Pod::Spec.new do |s|
  s.name = 'SocialXCamera'
  s.version = '1.0.0'
  s.summary = 'SocialX live color camera and filtered video recorder'
  s.description = s.summary
  s.license = { :type => 'Proprietary' }
  s.author = 'SocialX'
  s.homepage = 'https://github.com/Manik-Mittal/socialX'
  s.source = { :git => 'https://github.com/Manik-Mittal/socialX.git' }
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'CoreImage', 'MetalKit'
  s.source_files = '**/*.swift'
end
