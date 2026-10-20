import { requireNativeView, requireOptionalNativeModule } from 'expo';
import type { Ref } from 'react';
import type { ViewProps } from 'react-native';

export type FilterCameraRef = {
  record(): Promise<{ uri: string }>;
  stop(): Promise<void>;
};
export type FilterCameraProps = ViewProps & {
  ref?: Ref<FilterCameraRef>;
  front: boolean;
  torch: boolean;
  zoom: number;
  muted: boolean;
  active: boolean;
  matrix: number[];
  onReady: () => void;
  onError: (event: { nativeEvent: { message: string } }) => void;
};
// Expo Go / older builds must keep working without registering a nonexistent view.
export const FilterCameraView = requireOptionalNativeModule('SocialXCamera')
  ? requireNativeView<FilterCameraProps>('SocialXCamera') : null;
