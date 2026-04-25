import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import { colors, typography, spacing, radius } from '../../../infrastructure/theme/tokens';
import type { ChartSeriesData } from '../../../features/progress/types';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - spacing['2xl'] * 2 - spacing.md * 2; // Screen minus padding minus card padding

interface LineChartProps {
  data: ChartSeriesData[];
  title?: string;
  valueSuffix?: string;
}

export function TrendLineChart({ data, title, valueSuffix = '' }: LineChartProps) {
  const { i18n } = useTranslation();
  const chartData = data.map((d, index) => {
    const dateObj = new Date(d.date);
    const formattedDate = isNaN(dateObj.getTime()) ? d.date.split('-').slice(1).join('/') : new Intl.DateTimeFormat(i18n.language, { month: 'numeric', day: 'numeric' }).format(dateObj);
    return {
      value: d.score || 0,
      label: formattedDate,
      dataPointText: Intl.NumberFormat(i18n.language).format(d.score || 0),
    };
  });

  const maxVal = Math.max(...chartData.map(d => d.value), 10);
  
  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <LineChart
        data={chartData}
        width={CHART_WIDTH}
        height={180}
        thickness={3}
        color={colors.primary[500]}
        maxValue={maxVal + (maxVal * 0.2)}
        noOfSections={4}
        animateOnDataChange
        animationDuration={1000}
        onDataChangeAnimationDuration={300}
        areaChart
        yAxisTextStyle={{ color: colors.neutral[500], fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.neutral[500], fontSize: 10 }}
        startFillColor={colors.primary[500]}
        endFillColor={colors.primary[50]}
        startOpacity={0.4}
        endOpacity={0.05}
        spacing={CHART_WIDTH / Math.max(chartData.length || 7, 7)}
        backgroundColor="transparent"
        rulesColor={colors.neutral[100]}
        rulesType="solid"
        initialSpacing={10}
        yAxisColor="transparent"
        xAxisColor="transparent"
        dataPointsColor={colors.primary[600]}
        dataPointsRadius={4}
      />
    </View>
  );
}

interface BarChartProps {
  data: ChartSeriesData[];
  title?: string;
  type: 'reminders' | 'checklists';
}

export function StackedConsistencyChart({ data, title, type }: BarChartProps) {
  const { i18n } = useTranslation();
  // We'll show completed/acted vs scheduled/started
  const chartData = data.map((d) => {
    const dateObj = new Date(d.date);
    const formattedDate = isNaN(dateObj.getTime()) ? d.date.split('-').slice(1).join('/') : new Intl.DateTimeFormat(i18n.language, { month: 'numeric', day: 'numeric' }).format(dateObj);
    let completed = 0;
    let total = 0;
    if (type === 'reminders') {
      completed = d.actedCount || 0;
      total = d.scheduledCount || 0;
    } else {
      completed = d.completedRuns || 0;
      total = d.startedRuns || 0;
    }

    const missed = Math.max(0, total - completed);

    return {
      stacks: [
        { value: completed, color: colors.success.main },
        { value: missed, color: colors.neutral[200] },
      ],
      label: formattedDate,
    };
  });

  const maxVal = Math.max(...chartData.map(d => d.stacks[0].value + d.stacks[1].value), 5);

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <BarChart
        width={CHART_WIDTH}
        height={160}
        noOfSections={Math.min(5, maxVal)}
        maxValue={maxVal}
        stackData={chartData}
        spacing={CHART_WIDTH / Math.max(chartData.length || 7, 7) - 15}
        barWidth={15}
        barBorderRadius={4}
        yAxisTextStyle={{ color: colors.neutral[500], fontSize: 10 }}
        xAxisLabelTextStyle={{ color: colors.neutral[500], fontSize: 10 }}
        rulesColor={colors.neutral[100]}
        yAxisColor="transparent"
        xAxisColor="transparent"
        hideRules={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  title: {
    fontSize: typography.size.sm,
    fontWeight: '600',
    color: colors.neutral[700],
    marginBottom: spacing.md,
  }
});
