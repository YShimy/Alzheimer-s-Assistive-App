import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Updates from 'expo-updates';
import { setAppLanguage } from '@/src/shared/i18n';
import { colors } from '@/src/infrastructure/theme/tokens';

export function LanguageToggleButton() {
  const { i18n } = useTranslation();

  const toggleLanguage = async () => {
    const nextLang = i18n.language === 'en' ? 'ar' : 'en';
    await setAppLanguage(nextLang);
    
    if (Platform.OS === 'web') {
      window.location.reload();
    } else {
      try {
        await Updates.reloadAsync();
      } catch (e) {
        Alert.alert('Restart Needed', 'Please manually restart the app to fully apply RTL layout changes in development mode.');
      }
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={toggleLanguage}>
      <Text style={styles.text}>{i18n.language === 'en' ? 'عربي' : 'EN'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary[100],
    borderRadius: 8,
    marginRight: 16,
  },
  text: {
    color: colors.primary[600],
    fontWeight: 'bold',
  },
});
