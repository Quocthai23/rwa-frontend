'use client';

import { useAssetDeploymentStore } from '@/store/useAssetDeploymentStore';
import { useKycStore } from '@/store/useKycStore';
import { AssetDeploymentSheet } from '@/components/featured/asset-deployment/AssetDeploymentSheet';
import { KycFlowSheet } from '@/components/featured/kyc/web/KycFlowSheet';

export function GlobalModals() {
  const { isOpen: isDeploymentOpen, setOpen: setDeploymentOpen } = useAssetDeploymentStore();
  const { isOpen: isKycOpen, setOpen: setKycOpen } = useKycStore();

  return (
    <>
      <AssetDeploymentSheet open={isDeploymentOpen} onOpenChange={setDeploymentOpen} />
      <KycFlowSheet open={isKycOpen} onOpenChange={setKycOpen} />
    </>
  );
}
