import { useEffect } from 'react';

import { formatTriggerInputOnBlur } from '../utils/tradePanelInputHelpers';
import type { TriggerType } from '../components/TradePanelTriggerSelect';

export function useTradePanelTpSlFormatEffect(
  takeProfitTriggerType: TriggerType,
  takeProfitValue: string,
  stopLossTriggerType: TriggerType,
  stopLossValue: string,
  symbolDigit: number,
  setTakeProfitValue: (v: string) => void,
  setStopLossValue: (v: string) => void,
) {
  useEffect(() => {
    if (takeProfitValue) {
      const next = formatTriggerInputOnBlur(takeProfitTriggerType, takeProfitValue, symbolDigit);
      if (next !== takeProfitValue) setTakeProfitValue(next);
    }
    // Keep this effect tied to trigger type change only to avoid formatting while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takeProfitTriggerType]);

  useEffect(() => {
    if (stopLossValue) {
      const next = formatTriggerInputOnBlur(stopLossTriggerType, stopLossValue, symbolDigit);
      if (next !== stopLossValue) setStopLossValue(next);
    }
    // Keep this effect tied to trigger type change only to avoid formatting while typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopLossTriggerType]);
}
