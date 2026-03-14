import { ScreenContainer, EmptyState, Icon } from '@/src/shared/ui';
import { colors } from '@/src/infrastructure/theme/tokens';

/**
 * Patient checklists screen — placeholder for checklist module.
 */
export default function PatientChecklistScreen() {
  return (
    <ScreenContainer>
      <EmptyState
        icon="checkbox-outline"
        title="Checklists coming soon"
        message="Step-by-step routines and daily checklists will appear here once the backend module is ready."
      />
    </ScreenContainer>
  );
}
