import { ChevronRight } from '@untitledui/icons';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';

// we don't use SlideUpPanel on web; parent page controls layout

type Method = {
  comingSoon?: boolean;
  icon: string;
  id: string;
  limit: string;
  name: string;
  processingTime: string;
};

function WithdrawSelection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const methods: Method[] = [
    {
      icon: '/assets/images/tether.png',
      id: 'tether-1',
      limit: t('withdraw.method.limit'),
      name: t('withdraw.method.usdt'),
      processingTime: t('withdraw.method.instantTime15Min'),
    },
    {
      icon: '/assets/images/tether.png',
      id: 'tether-2',
      limit: t('withdraw.method.limit'),
      name: t('withdraw.method.usdt'),
      processingTime: t('withdraw.method.instantTime15Min'),
    },
  ];

  return (
    <div className="p-6">
      {methods.map((method, index) => (
        <button
          key={`${method.id}-${index}`}
          className={`bg-card border-border hover:border-primary-300 hover:bg-primary-50/30 mb-3 flex w-full items-center rounded-xl border p-4 text-left transition ${
            method.comingSoon ? 'opacity-80' : ''
          }`}
          disabled={method.comingSoon}
          onClick={() => {
            if (!method.comingSoon) {
              router.push(
                `/withdraw?methodId=${method.id}&methodName=${encodeURIComponent(method.name)}`,
              );
            }
          }}
        >
          <div className="relative mr-4">
            <Image
              src={method.icon}
              alt={method.name}
              width={40}
              height={40}
              className="object-contain"
            />
            {index === 0 && (
              <div className="bg-card absolute -right-1 -bottom-1 rounded-full p-[2px]">
                <Image src="/assets/images/tether-1.png" alt="" width={14} height={14} />
              </div>
            )}
            {index === 1 && (
              <div className="bg-card absolute -right-1 -bottom-1 rounded-full p-[2px]">
                <Image src="/assets/images/tether-2.png" alt="" width={14} height={14} />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="text-foreground mb-1 text-base font-bold">{method.name}</div>
            <div className="text-muted-foreground text-sm">
              {t('topUp.processingTime')}:{' '}
              <span className="text-foreground text-body-small-semibold">
                {method.processingTime}
              </span>
            </div>
            <div className="text-muted-foreground text-sm">
              {t('topUp.limit')}:{' '}
              <span className="text-foreground text-body-small-semibold">{method.limit}</span>
            </div>
          </div>
          {!method.comingSoon && <ChevronRight className="text-muted-foreground" size={20} />}
        </button>
      ))}
    </div>
  );
}

export default WithdrawSelection;
