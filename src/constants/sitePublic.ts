/**
 * Public-facing URLs, social links, and display strings.
 * Update here (or later from an admin API) instead of scattering across pages.
 */

export type SocialLink = {
  id: string;
  label: string;
  labelI18nKey?: string;
  /** Path under /public, e.g. /assets/share/fb.svg */
  iconSrc: string;
  href: string;
};

/**
 * Display order on /about/follow-us (full list).
 */
export const SOCIAL_LINKS: readonly SocialLink[] = [
  {
    id: 'facebook',
    label: 'Facebook',
    labelI18nKey: 'about.social.facebook',
    iconSrc: '/assets/share/fb.svg',
    href: 'https://facebook.com',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    labelI18nKey: 'about.social.telegram',
    iconSrc: '/assets/share/telegram.svg',
    href: 'https://t.me',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    labelI18nKey: 'about.social.instagram',
    iconSrc: '/assets/share/itg.svg',
    href: 'https://instagram.com',
  },
  {
    id: 'x',
    label: 'X',
    labelI18nKey: 'about.social.x',
    iconSrc: '/assets/share/x.svg',
    href: 'https://x.com',
  },
  {
    id: 'discord',
    label: 'Discord',
    labelI18nKey: 'about.social.discord',
    iconSrc: '/assets/share/discord.svg',
    href: 'https://discord.com',
  },
  {
    id: 'youtube',
    label: 'Youtube',
    labelI18nKey: 'about.social.youtube',
    iconSrc: '/assets/share/message.svg',
    href: 'https://youtube.com',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    labelI18nKey: 'about.social.whatsapp',
    iconSrc: '/assets/share/Group.svg',
    href: 'https://wa.me',
  },
];

/** Compact icon row next to “Follow us” on /about — order preserved */
const SOCIAL_ABOUT_ROW_IDS = ['facebook', 'telegram', 'discord', 'instagram', 'x'] as const;

const socialById = new Map(SOCIAL_LINKS.map((s) => [s.id, s]));

export const SOCIAL_LINKS_ABOUT_ROW: SocialLink[] = SOCIAL_ABOUT_ROW_IDS.map((id) =>
  socialById.get(id),
).filter((s): s is SocialLink => s != null);

export const SITE_PUBLIC = {
  appVersionDisplay: 'v1.0.0',
  aboutLogoSrc: '/logo/logo-512x512.png',
  supportEmail: 'cs@mtxtrading.com',
  liveChatUrl: 'https://example.com/live-chat',
  rateUsUrl: 'https://google.com',
} as const;
