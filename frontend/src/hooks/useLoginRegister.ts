import { useState } from 'react';

type Mode = 'login' | 'register';

export function useLoginRegister() {
  const [mode, setMode] = useState<Mode>('login');
  const [isLoading, setIsLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const startLoading = () => setIsLoading(true);
  const stopLoading = () => setIsLoading(false);

  const resetRegisterForm = () => {
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterConfirmPassword('');
    setAcceptTerms(false);
    setErrors({});
  };

  const resetLoginForm = () => {
    setLoginEmail('');
    setLoginPassword('');
    setErrors({});
  };

  const reseteSenhaLoginForm = () => {
    setLoginPassword('');
    setErrors({});
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setErrors({});

    if (newMode === 'login') {
      resetRegisterForm();
    }
  };

  return {
    mode,
    switchMode,

    loading: {
      isLoading,
      start: startLoading,
      stop: stopLoading,
    },

    login: {
      email: loginEmail,
      password: loginPassword,
      setEmail: setLoginEmail,
      setPassword: setLoginPassword,
      reset: resetLoginForm,
      resetPassword: reseteSenhaLoginForm,
    },

    register: {
      name: registerName,
      email: registerEmail,
      password: registerPassword,
      confirmPassword: registerConfirmPassword,
      acceptTerms,
      setName: setRegisterName,
      setEmail: setRegisterEmail,
      setPassword: setRegisterPassword,
      setConfirmPassword: setRegisterConfirmPassword,
      setAcceptTerms,
      reset: resetRegisterForm,
    },

    errors,
};
}
