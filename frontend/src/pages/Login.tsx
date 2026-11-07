import { LoginClassroom } from '@/auth/components/LoginClassroom';
import { PageTransition } from '@/components/shared/PageTransition';

export default function Login() {
  return (
    <PageTransition>
      <LoginClassroom />
    </PageTransition>
  );
}
