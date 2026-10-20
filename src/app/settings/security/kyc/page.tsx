'use client';
import { useRouter } from 'next/navigation';
import { KycVerificationFlow } from '@/components/featured/kyc/KycVerificationFlow';
export default function KycPage() {
  const router = useRouter();
  return (
    <main className="bg-background min-h-dvh p-3 sm:p-6">
      <div className="border-border mx-auto max-w-3xl overflow-hidden rounded-2xl border">
        <KycVerificationFlow onClose={() => router.back()} />
      </div>
    </main>
  );
}
