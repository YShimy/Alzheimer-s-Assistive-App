/** Users feature types */
export interface UserProfile {
  id: string;
  role: string;
  displayName: string;
  email: string;
  language: string;
  timezone: string;
  isActive: boolean;
  accessibilitySettings: {
    textSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
    audioCuesEnabled: boolean;
  };
  preferredNotificationMode: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserInput {
  displayName?: string;
  language?: string;
  timezone?: string;
}
