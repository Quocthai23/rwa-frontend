'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import ForgotPasswordInput from '../components/ForgotPasswordInput';
import ForgotPasswordVerifyOTP from '../components/ForgotPasswordVerifyOTP';
import ForgotPasswordCreateNewPassword from '../components/ForgotPasswordCreateNewPassword';

enum ForgotPasswordStep {
  Input = 'input',
  VerifyOtp = 'verify-otp',
  CreateNewPassword = 'create-new-password',
}

type ForgotPasswordData = {
  email: string;
  token: string;
};

const DEFAULT_DATA: ForgotPasswordData = {
  email: '',
  token: '',
};

export default function ForgotPasswordClient() {
  const router = useRouter();
  const [step, setStep] = useState<ForgotPasswordStep>(ForgotPasswordStep.Input);
  const [data, setData] = useState<ForgotPasswordData>(DEFAULT_DATA);

  const content = useMemo(() => {
    switch (step) {
      case ForgotPasswordStep.Input:
        return (
          <ForgotPasswordInput
            email={data.email}
            onBack={() => router.back()}
            onEmailChange={(email) => {
              setData((prev) => ({ ...prev, email }));
            }}
            onContinue={(email) => {
              setData((prev) => ({ ...prev, email }));
              setStep(ForgotPasswordStep.VerifyOtp);
            }}
          />
        );
      case ForgotPasswordStep.VerifyOtp:
        return (
          <ForgotPasswordVerifyOTP
            email={data.email}
            onBack={() => setStep(ForgotPasswordStep.Input)}
            onMissingEmail={() => setStep(ForgotPasswordStep.Input)}
            onContinue={({ email, token }) => {
              setData((prev) => ({ ...prev, email, token }));
              setStep(ForgotPasswordStep.CreateNewPassword);
            }}
          />
        );
      case ForgotPasswordStep.CreateNewPassword:
        return (
          <ForgotPasswordCreateNewPassword
            email={data.email}
            resetToken={data.token}
            onBack={() => setStep(ForgotPasswordStep.VerifyOtp)}
            onMissingData={() => setStep(ForgotPasswordStep.Input)}
            onSuccess={() => router.push('/login')}
          />
        );
      default:
        return null;
    }
  }, [step, data.email, data.token, router]);

  return content;
}
