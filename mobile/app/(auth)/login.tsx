import { View, Text, StyleSheet, Pressable, SafeAreaView, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { ScreenContainer, AppButton, AppInput, Icon } from '@/src/shared/ui';
import { colors, typography, spacing, radius, shadows } from '@/src/infrastructure/theme/tokens';
import { authApi } from '@/src/features/auth/api';
import { useSessionStore } from '@/src/state/sessionStore';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

/**
 * Login screen — professional, accessible, low cognitive load.
 * Supports Google Sign-In (future) and test token login for development.
 */
export default function LoginScreen() {
  const setSession = useSessionStore((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<'PATIENT' | 'CAREGIVER'>('PATIENT');
  const [error, setError] = useState('');

  // Configure Google Sign-in lazily just in case env vars change
  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
        // iOS requires iosClientId to be defined if using iOS, but we fallback
      });
    } catch (e) {
      // Ignore config errors in Expo Go
    }
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
        Alert.alert('Configuration Required', 'Please set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env file to enable Google Sign-In.');
        return;
      }

      setLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        throw new Error('Google Sign-In succeeded, but no ID token was returned.');
      }

      // Send the real token to the backend
      const result = await authApi.loginWithGoogle(idToken, selectedRole);
      
      setSession({
        token: result.accessToken,
        role: result.user.role.toUpperCase() as 'PATIENT' | 'CAREGIVER',
        userId: result.user.id,
        displayName: result.user.displayName,
      });

    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
         // User cancelled
      } else if (error.code === statusCodes.IN_PROGRESS) {
         // Operation in progress
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
         Alert.alert('Error', 'Google Play Services are not available.');
      } else if (error?.message?.includes('null is not an object (evaluating \'RNGoogleSignin.hasPlayServices\')') || error?.message?.includes('NativeModule')) {
         Alert.alert(
           'Dev Client Required', 
           'Google Sign-In requires an Expo Development Client with native modules.\n\nRun `npx expo run:android` or use the Dev Login option below for now.'
         );
      } else {
         setError(error.message || 'Google Sign-In failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    if (!testEmail.trim()) {
      setError('Enter an email or name for test login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use the test token format the backend supports: test_<email>_<name>
      const name = testEmail.split('@')[0] || 'TestUser';
      const idToken = `test_${testEmail.trim()}_${name}`;
      const result = await authApi.loginWithGoogle(idToken, selectedRole);

      setSession({
        token: result.accessToken,
        role: result.user.role.toUpperCase() as 'PATIENT' | 'CAREGIVER',
        userId: result.user.id,
        displayName: result.user.displayName,
      });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll={false} backgroundColor={colors.primary[50]}>
      <View style={styles.content}>
        {/* Logo area */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Icon name="heart-outline" size={40} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Cognitive Support</Text>
          <Text style={styles.subtitle}>Your daily support companion</Text>
        </View>

        {/* Login card */}
        <View style={styles.card}>
          {/* Google Sign-In */}
          <AppButton
            title="Sign in with Google"
            onPress={handleGoogleSignIn}
            variant="primary"
            icon={<Icon name="logo-google" size={20} color="#fff" />}
          />

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or test with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Dev login */}
          
          <View style={styles.roleToggle}>
            <Pressable
              style={[
                styles.roleBtn,
                styles.roleBtnLeft,
                selectedRole === 'PATIENT' && styles.roleBtnActivePatient
              ]}
              onPress={() => setSelectedRole('PATIENT')}
            >
              <Text style={[
                styles.roleText,
                selectedRole === 'PATIENT' && styles.roleTextActive
              ]}>Patient</Text>
            </Pressable>
            <Pressable
              style={[
                styles.roleBtn,
                styles.roleBtnRight,
                selectedRole === 'CAREGIVER' && styles.roleBtnActiveCaregiver
              ]}
              onPress={() => setSelectedRole('CAREGIVER')}
            >
              <Text style={[
                styles.roleText,
                selectedRole === 'CAREGIVER' && styles.roleTextActive
              ]}>Caregiver</Text>
            </Pressable>
          </View>

          <AppInput
            label="Test Email"
            placeholder="e.g. user@test.com"
            value={testEmail}
            onChangeText={setTestEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            error={error || undefined}
          />

          <AppButton
            title="Dev Login"
            onPress={handleDevLogin}
            variant="outline"
            loading={loading}
          />
        </View>

        {/* Reassurance */}
        <Text style={styles.note}>
          <Icon name="lock-closed-outline" size={14} color={colors.neutral[400]} />
          {'  '}Your data is private and secure.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: '700',
    color: colors.neutral[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.size.lg,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing['2xl'],
    ...shadows.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral[200],
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.size.sm,
    color: colors.neutral[400],
  },
  note: {
    marginTop: spacing['2xl'],
    fontSize: typography.size.sm,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  roleToggle: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[100],
    padding: spacing.xs,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  roleBtnLeft: {
    marginRight: 2,
  },
  roleBtnRight: {
    marginLeft: 2,
  },
  roleBtnActivePatient: {
    backgroundColor: colors.primary[500],
    ...shadows.sm,
  },
  roleBtnActiveCaregiver: {
    backgroundColor: colors.secondary[500],
    ...shadows.sm,
  },
  roleText: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.neutral[500],
  },
  roleTextActive: {
    color: colors.surface,
  },
});
