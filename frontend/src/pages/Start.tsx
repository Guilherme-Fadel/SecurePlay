import { WelcomeScreen } from "@/components/shared/WelcomeScreen";
import { PageTransition } from "@/components/shared/PageTransition";

export default function Start() {
  return (
    <PageTransition>
    <>
      <WelcomeScreen />
    </>
    </PageTransition>
  );
}
