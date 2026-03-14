/** Users module types */

export interface AccessibilitySettings {
  textSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  audioCuesEnabled: boolean;
}

export interface UserProfile {
  id: string;
  role: string;
  displayName: string;
  email: string;
  language: string;
  timezone: string;
  isActive: boolean;
  accessibilitySettings: AccessibilitySettings;
  preferredNotificationMode: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserInput {
  displayName?: string;
  language?: string;
  timezone?: string;
  accessibilitySettings?: Partial<AccessibilitySettings>;
  preferredNotificationMode?: string;
}
