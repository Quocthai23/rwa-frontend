import { ArrowDown, ArrowUp, Minus } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { StrategyResultItem } from '@/types/strategy';

type AnalysisTabProps = {
  strategy?: StrategyResultItem;
};

function AnalysisTab({ strategy }: Readonly<AnalysisTabProps>) {
  const { t } = useTranslation();

  if (!strategy) {
    return (
      <div className="bg-background flex-1 overflow-y-auto">
        <div className="text-body-small-regular text-muted-foreground py-4">
          {t('common.noData', { defaultValue: 'No data' })}
        </div>
      </div>
    );
  }

  const normalizeTimeMs = (time?: number) => {
    const t = time ?? 0;
    return t > 1e12 ? t : t * 1000;
  };

  const periodUpper = (strategy.period ?? '').toUpperCase();
  const periodLabel =
    periodUpper === 'ST' || periodUpper === 'INTRADAY'
      ? t('symbolDetail.analysis.shortTerm')
      : periodUpper === 'MT'
        ? t('symbolDetail.analysis.mediumTerm')
        : strategy.period;
  const directionLower = (strategy.direction ?? '').toLowerCase();
  const badgeTone =
    directionLower === 'down'
      ? 'bg-red-50 text-red-500'
      : directionLower === 'up'
        ? 'bg-green-50 text-green-600'
        : 'bg-muted text-muted-foreground';
  const isDown = directionLower === 'down';
  const isUp = directionLower === 'up';

  return (
    <div className="bg-background flex-1 overflow-y-auto">
      <div>
        <div className="text-h2-semibold pt-4 pb-2">{t('symbolDetail.tabs.strategy')}</div>
        <div className="flex items-center gap-3 pb-3">
          <div
            className={`inline-flex shrink-0 flex-nowrap items-center rounded px-2.5 py-1.5 whitespace-nowrap ${badgeTone}`}
          >
            {isDown ? <ArrowDown size={16} /> : isUp ? <ArrowUp size={16} /> : <Minus size={16} />}
            <span className="text-caption-medium ml-1">{periodLabel}</span>
          </div>

          <div className="text-body-small-medium line-clamp-2">{strategy.title}</div>
        </div>

        <StrategyContent strategy={strategy} releaseTime={dayjs(normalizeTimeMs(strategy.time))} />
      </div>
    </div>
  );
}

export default AnalysisTab;

function StrategyContent({
  strategy,
  releaseTime,
}: {
  readonly strategy: StrategyResultItem;
  readonly releaseTime: dayjs.Dayjs;
}) {
  const { t } = useTranslation();
  const fallbackText = t('common.noData', { defaultValue: 'No data' });
  const releaseTimeLabel = t('symbolDetail.analysis.releaseTime');
  const releaseTimePrefix = releaseTimeLabel.includes(':')
    ? releaseTimeLabel.split(':')[0]
    : releaseTimeLabel;

  return (
    <div>
      <div className="text-body-small-regular text-muted-foreground mb-3">
        {`${releaseTimePrefix}: ${releaseTime.format('DD MMM, HH:mm')}`}
      </div>

      <div className="mb-4">
        <div className="flex items-center">
          <div className="bg-primary-500 mr-2 h-2 w-2 rounded-full" />
          <div className="text-body-large-regular">{t('symbolDetail.analysis.ourPreference')}</div>
        </div>
        <div className="text-body-small-regular text-muted-foreground ml-4">
          {strategy.preference || fallbackText}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center">
          <div className="bg-primary-500 mr-2 h-2 w-2 rounded-full" />
          <div className="text-body-regular">{t('symbolDetail.analysis.alternativeScenario')}</div>
        </div>
        <div className="text-body-small-regular text-muted-foreground ml-4">
          {strategy.alternative || fallbackText}
        </div>
      </div>

      <div className="mb-1">
        <div className="flex items-center">
          <div className="bg-primary-500 mr-2 h-2 w-2 rounded-full" />
          <div className="text-body-regular">{t('symbolDetail.analysis.comment')}</div>
        </div>
        <div className="text-body-small-regular text-muted-foreground ml-4">
          {strategy.technology || fallbackText}
        </div>
      </div>
    </div>
  );
}
