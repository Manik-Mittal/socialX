import type { ImagePickerAsset } from 'expo-image-picker';
import { ReelCamera } from './ReelCamera';

export type CameraStudioProps = {
  onCapture: (asset: ImagePickerAsset) => void;
  onClose: () => void;
  onSystemCamera: () => void;
};

// Metro selects CameraStudio.web.tsx for the browser camera implementation.
export function CameraStudio(props: CameraStudioProps) {
  return <ReelCamera {...props} />;
}
