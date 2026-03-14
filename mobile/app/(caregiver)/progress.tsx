import { ScreenContainer, EmptyState } from '@/src/shared/ui';

/**
 * Caregiver progress view — placeholder for patient progress tracking.
 */
export default function CaregiverProgressScreen() {
  return (
    <ScreenContainer>
      <EmptyState
        icon="trending-up-outline"
        title="Patient Progress"
        message="Progress tracking and weekly reports for linked patients will be available here once the backend progress endpoints are implemented."
      />
    </ScreenContainer>
  );
}
