import ChangePasswordContent from '@/components/featured/security/change-password/ChangePasswordContent';

type ChangePasswordPageProps = {
  searchParams?: Promise<{
    hasPassword?: string;
  }>;
};

export default async function ChangePasswordPage({ searchParams }: ChangePasswordPageProps) {
  const resolvedSearchParams = await searchParams;
  const hasPassword = resolvedSearchParams?.hasPassword !== 'false';

  return <ChangePasswordContent hasPassword={hasPassword} />;
}
