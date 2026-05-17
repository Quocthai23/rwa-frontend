import {
  MessageChatSquare,
  ArrowNarrowDown,
  ArrowNarrowUp,
  SwitchHorizontal01,
  ClockRewind,
  Globe02,
  Copy04,
  Share07,
  Award03,
  Award05,
  File02,
  HelpSquare,
  DotsGrid,
  Certificate01,
} from '@untitledui/icons';
import { createElement, type FC, type SVGProps } from 'react';

export enum FeatureId {
  Ranking = 'ranking',
  Deposit = 'deposit',
  Withdraw = 'withdraw',
  Social = 'social',
  Copy = 'copy',
  Chat = 'chat',
  More = 'more',
  Transfer = 'transfer',
  History = 'history',
  HelpCenter = 'help_center',
  Feedback = 'feedback',
  Dao = 'dao',
  Redemption = 'redemption',
}

export type UntitledIcon = FC<
  SVGProps<SVGSVGElement> & {
    color?: string;
    size?: number;
  }
>;

export interface Feature {
  id: FeatureId;
  label: string;
  labelKey?: string;
  path: string;
  icon: UntitledIcon;
}

export const FEATURES_CONFIG: Feature[] = [
  {
    id: FeatureId.Ranking,
    label: 'Ranking',
    labelKey: 'features.ranking',
    path: '/ranking',
    icon: Award05,
  },
  {
    id: FeatureId.Deposit,
    label: 'Deposit',
    labelKey: 'features.deposit',
    path: '/deposit',
    icon: ArrowNarrowDown,
  },
  {
    id: FeatureId.Withdraw,
    label: 'Withdraw',
    labelKey: 'features.withdraw',
    path: '/withdraw',
    icon: ArrowNarrowUp,
  },
  {
    id: FeatureId.Transfer,
    label: 'Transfer',
    labelKey: 'features.transfer',
    path: '/transfer',
    icon: SwitchHorizontal01,
  },
  {
    id: FeatureId.History,
    label: 'History',
    labelKey: 'features.history',
    path: '/transaction-history',
    icon: ClockRewind,
  },
  {
    id: FeatureId.Social,
    label: 'Social',
    labelKey: 'features.social',
    path: '/social',
    icon: Globe02,
  },
  {
    id: FeatureId.Copy,
    label: 'Copy Trading',
    labelKey: 'features.copyTrading',
    path: '/copytrading',
    icon: (({
      size = 24,
      className = '',
      color,
    }: {
      size?: number;
      className?: string;
      color?: string;
    }) =>
      createElement('div', {
        className: color ? className : `bg-current ${className}`.trim(),
        style: {
          width: size,
          height: size,
          backgroundColor: color,
          WebkitMaskImage: 'url(/assets/icons/home/Frame.svg)',
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: 'url(/assets/icons/home/Frame.svg)',
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        },
      })) as unknown as UntitledIcon,
  },
  {
    id: FeatureId.Chat,
    label: 'Chat',
    labelKey: 'features.chat',
    path: '/',
    icon: MessageChatSquare,
  },
  {
    id: FeatureId.HelpCenter,
    label: 'Help Center',
    labelKey: 'features.helpCenter',
    path: '/help-center',
    icon: HelpSquare,
  },
  {
    id: FeatureId.Feedback,
    label: 'Feedback',
    labelKey: 'features.feedback',
    path: '/settings/feedback',
    icon: File02,
  },
  {
    id: FeatureId.Dao,
    label: 'DAO Governance',
    labelKey: 'features.dao',
    path: '/dao',
    icon: Certificate01,
  },
  {
    id: FeatureId.Redemption,
    label: 'Asset Redemption',
    labelKey: 'features.redemption',
    path: '/redemption',
    icon: File02,
  },
  {
    id: FeatureId.More,
    label: 'More',
    labelKey: 'features.more',
    path: '/more',
    icon: DotsGrid,
  },
];

// Feature sections for More component
export const FEATURE_SECTIONS = [
  {
    title: 'Core Features',
    titleKey: 'features.sections.coreFeatures',
    featureIds: [FeatureId.Deposit, FeatureId.Withdraw, FeatureId.Transfer, FeatureId.History],
  },
  {
    title: 'Discover',
    titleKey: 'features.sections.discover',
    featureIds: [FeatureId.Social, FeatureId.Copy, FeatureId.Chat],
  },
  {
    title: 'Event',
    titleKey: 'features.sections.event',
    featureIds: [FeatureId.Ranking],
  },
  {
    title: 'Governance & RWA',
    titleKey: 'features.sections.governanceAndRwa',
    featureIds: [FeatureId.Dao, FeatureId.Redemption],
  },
  {
    title: 'Help',
    titleKey: 'features.sections.help',
    featureIds: [FeatureId.HelpCenter, FeatureId.Feedback],
  },
];

// Features for Home page grid (only 8 featured items)
export const HOME_FEATURES_IDS: FeatureId[] = [
  FeatureId.Ranking,
  FeatureId.Deposit,
  FeatureId.Withdraw,
  FeatureId.Social,
  FeatureId.Copy,
  FeatureId.Chat,
  FeatureId.More,
];

/**
 * Get feature config by ID
 */
export const getFeatureById = (id: FeatureId): Feature | undefined => {
  return FEATURES_CONFIG.find((feature) => feature.id === id);
};

/**
 * Get features by section
 */
export const getFeaturesBySection = (sectionTitle: string): Feature[] => {
  const section = FEATURE_SECTIONS.find((s) => s.title === sectionTitle);
  if (!section) return [];
  return section.featureIds
    .map((id) => getFeatureById(id))
    .filter((feature): feature is Feature => feature !== undefined);
};
