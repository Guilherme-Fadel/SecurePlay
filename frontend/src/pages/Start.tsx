import { PressStartScreen } from "../components/shared/PressStartScreen";
import { PixelCursor } from '../components/ui/visuals/PixelCursor';
import { PageTransition } from "../components/shared/PageTransition";

export default function Start() {
  return (
    <PageTransition>
    <>
      <PixelCursor />
      <PressStartScreen />
    </>
    </PageTransition>
  );
}
