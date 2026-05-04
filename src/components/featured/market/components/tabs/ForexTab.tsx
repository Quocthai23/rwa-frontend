import { CATEGORY_CODE } from '@/constants/category';

import AssetListTab from './AssetListTab';

function ForexTab() {
  return <AssetListTab categoryCode={CATEGORY_CODE.FOREX} />;
}

export default ForexTab;
