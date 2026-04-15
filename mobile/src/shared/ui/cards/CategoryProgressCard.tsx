import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius, shadows } from '../../../infrastructure/theme/tokens';
import type { CategoryMetric } from '../../../features/progress/types';

interface CategoryProgressProps {
  categories: CategoryMetric[];
  title: string;
}

export function CategoryProgressCard({ categories, title }: CategoryProgressProps) {
  if (!categories || categories.length === 0) {
    return null;
  }

  // Sort by highest completion
  const sorted = [...categories].sort((a, b) => b.completionRate - a.completionRate);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      
      {sorted.map((item, idx) => (
        <View key={idx} style={styles.row}>
          <Text style={styles.catName} numberOfLines={1}>
            {item.category.charAt(0).toUpperCase() + item.category.slice(1).toLowerCase()}
          </Text>
          
          <View style={styles.barContainer}>
            <View 
              style={[
                styles.fill, 
                { width: `${Math.max(2, item.completionRate * 100)}%`, backgroundColor: getBarColor(item.completionRate) }
              ]} 
            />
          </View>
          
          <Text style={styles.percentage}>
            {Math.round(item.completionRate * 100)}%
          </Text>
        </View>
      ))}
    </View>
  );
}

function getBarColor(rate: number) {
  if (rate >= 0.8) return colors.success.main;
  if (rate >= 0.5) return colors.warning.main;
  return colors.error.light;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderRadius: radius.xl,
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.size.base,
    fontWeight: '600',
    color: colors.neutral[800],
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  catName: {
    width: 90,
    fontSize: typography.size.sm,
    color: colors.neutral[700],
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[100],
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    width: 40,
    textAlign: 'right',
    fontSize: typography.size.xs,
    color: colors.neutral[500],
    fontWeight: '600',
  }
});
