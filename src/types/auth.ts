export type AuthResponse = LoginResponse;

export type AuthChallengeFactor = 'TOTP' | 'EMAIL_OTP';

export type LoginSuccessResponse = {
  accessToken: string;
  refreshToken: string;
  user: User;
};

export type LoginChallengeRequiredResponse = {
  status: 'challenge_required';
  challengeId: string;
  purpose: 'LOGIN';
  requiredFactors: AuthChallengeFactor[];
};

export type LoginResponse = LoginSuccessResponse | LoginChallengeRequiredResponse;

export type VerifyAuthChallengeResponse =
  | {
      completed: true;
      challengeId: string;
      purpose: 'LOGIN';
      accessToken: string;
      refreshToken: string;
      user: User;
    }
  | {
      completed: false;
      challengeId: string;
      purpose: 'SETUP_MFA';
      nextFactor: 'TOTP' | 'EMAIL_OTP';
      otpAuthUrl: string;
      secret: string;
    }
  | {
      completed: true;
      challengeId: string;
      purpose: 'SETUP_MFA';
      trustLevel: number;
      trustExpiresAt: string;
    }
  | {
      completed: true;
      challengeId: string;
      purpose: 'DISABLE_MFA';
    };

export type RegisterResponse = {
  accessToken?: string;
  refreshToken?: string;
  user: User;
};

export type User = {
  hasPassword: boolean;
  avatar: null | string;
  coverAvatar?: null | string;
  bio?: null | string;
  displayName?: null | string;
  createdAt: string;
  email: string;
  gender: null | string;
  id: string;
  location?: null | string;
  // Whether user has MFA/TOTP enabled
  enabledMfa?: boolean;
  status: number;
  username: string;
  referenceCode?: string;
  referenceId?: string;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isBlocking?: boolean;
  isBlockedBy?: boolean;
  kycStatus?: 'NONE' | 'PENDING' | 'APPROVING' | 'APPROVED' | 'REJECTED';
};

/** Partial update: avatar only, username only, or gender + username */
export type UpdateProfilePayload = {
  avatar?: string;
  coverAvatar?: string;
  username?: string;
  displayName?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  bio?: string;
  location?: string;
};

export type UpdateProfileResponse = {
  success: true;
};

export type UpdateReferralPayload = {
  referenceCode: string;
};

export type UpdateReferralResponse = {
  success: true;
};
