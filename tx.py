import os
import re

base_dir = r'c:\Users\yshim\Downloads\Bachelor\cognitive-support-app\mobile\app\(caregiver)'

# 1. progress.tsx
prog_path = os.path.join(base_dir, 'progress.tsx')
with open(prog_path, 'r', encoding='utf-8') as f:
    prog_content = f.read()

prog_content = prog_content.replace(
    "import { ScreenContainer, EmptyState } from '@/src/shared/ui';",
    "import { useTranslation } from 'react-i18next';\nimport { ScreenContainer, EmptyState } from '@/src/shared/ui';"
)
prog_content = prog_content.replace(
    "export default function CaregiverProgressScreen() {",
    "export default function CaregiverProgressScreen() {\n  const { t } = useTranslation();"
)
prog_content = prog_content.replace('title="Patient Progress"', "title={t('caregiverProgress.title')}")
prog_content = prog_content.replace('message="Progress tracking and weekly reports for linked patients will be available here once the backend progress endpoints are implemented."', "message={t('caregiverProgress.message')}")

with open(prog_path, 'w', encoding='utf-8') as f:
    f.write(prog_content)


# 2. manage-reminders.tsx
rem_path = os.path.join(base_dir, 'manage-reminders.tsx')
with open(rem_path, 'r', encoding='utf-8') as f:
    rem_content = f.read()

rem_content = rem_content.replace("import { useEffect", "import { useTranslation } from 'react-i18next';\nimport { useEffect")
rem_content = rem_content.replace("export default function CaregiverRemindersScreen() {", "export default function CaregiverRemindersScreen() {\n  const { t } = useTranslation();")

# Simple string replacements inside CaregiverRemindersScreen
rem_content = rem_content.replace('title="No linked patients"', "title={t('caregiverReminders.noLinkedPatients')}")
rem_content = rem_content.replace('message="Link with a patient first to manage their reminders. Go to your home screen and generate an invite code."', "message={t('caregiverReminders.linkFirstMsg')}")
rem_content = rem_content.replace('Managing reminders for', "{t('caregiverReminders.managingFor')}")
rem_content = rem_content.replace('title="Add Reminder"', "title={t('caregiverReminders.addReminder')}")
rem_content = rem_content.replace('title="Active Reminders"', "title={t('caregiverReminders.activeReminders')}")
rem_content = rem_content.replace('No active reminders for this patient.', "{t('caregiverReminders.noActiveReminders')}")
rem_content = rem_content.replace('title="Archived"', "title={t('caregiverReminders.archived')}")
rem_content = rem_content.replace("formMode === 'create' ? 'New Reminder' : 'Edit Reminder'", "formMode === 'create' ? t('caregiverReminders.newReminder') : t('caregiverReminders.editReminder')")

# Form
rem_content = rem_content.replace('label="Title *"', "label={t('caregiverReminders.titleLabel')}")
rem_content = rem_content.replace('placeholder="e.g. Take morning medication"', "placeholder={t('caregiverReminders.titlePlaceholder')}")
rem_content = rem_content.replace('>Category<', ">{t('caregiverReminders.categoryLabel')}<")
rem_content = rem_content.replace('label="Time (HH:mm) *"', "label={t('caregiverReminders.timeLabel')}")
rem_content = rem_content.replace('label="Start Date *"', "label={t('caregiverReminders.startDateLabel')}")
rem_content = rem_content.replace('label="End Date (optional)"', "label={t('caregiverReminders.endDateLabel')}")
rem_content = rem_content.replace('>Repeat on days<', ">{t('caregiverReminders.repeatLabel')}<")
rem_content = rem_content.replace('label="Notes (optional)"', "label={t('caregiverReminders.notesLabel')}")
rem_content = rem_content.replace('placeholder="Any notes for the patient"', "placeholder={t('caregiverReminders.notesPlaceholder')}")

rem_content = rem_content.replace('>Allow snooze<', ">{t('caregiverReminders.allowSnooze')}<")
rem_content = rem_content.replace('>Patient can delay this reminder<', ">{t('caregiverReminders.snoozeSub')}<")
rem_content = rem_content.replace('label="Snooze duration (minutes)"', "label={t('caregiverReminders.snoozeDurationLabel')}")

rem_content = rem_content.replace("submitting ? 'Saving…' : formMode === 'create' ? 'Create Reminder' : 'Save Changes'", "submitting ? t('common.loading') : formMode === 'create' ? t('caregiverReminders.createBtn') : t('caregiverReminders.saveChangesBtn')")
rem_content = rem_content.replace('title="Archive Reminder"', "title={t('caregiverReminders.archiveBtn')}")

# CaregiverReminderCard injection
rem_content = rem_content.replace(
    "function CaregiverReminderCard({\n  reminder,\n  onEdit,\n  onArchive,\n}: {\n  reminder: Reminder;\n  onEdit: () => void;\n  onArchive: () => void;\n}) {",
    "function CaregiverReminderCard({\n  reminder,\n  onEdit,\n  onArchive,\n}: {\n  reminder: Reminder;\n  onEdit: () => void;\n  onArchive: () => void;\n}) {\n  const { t } = useTranslation();"
)
rem_content = rem_content.replace(
    "reminder.scheduledTime} · {reminder.category}",
    "reminder.scheduledTime} · {t('categories.' + reminder.category) || reminder.category}"
)
rem_content = rem_content.replace(
    "reminder.isActive ? 'Active' : 'Archived'",
    "reminder.isActive ? t('caregiverHome.active') : t('caregiverReminders.archived')"
)
rem_content = rem_content.replace('title="Edit"', 'title={t("caregiverPatients.editReminders").split(" ")[0]}')
rem_content = rem_content.replace('title="Archive"', 'title={t("caregiverReminders.archived")}')

with open(rem_path, 'w', encoding='utf-8') as f:
    f.write(rem_content)


# 3. manage-checklists.tsx
chk_path = os.path.join(base_dir, 'manage-checklists.tsx')
with open(chk_path, 'r', encoding='utf-8') as f:
    chk_content = f.read()

chk_content = chk_content.replace("import { useState", "import { useTranslation } from 'react-i18next';\nimport { useState")
chk_content = chk_content.replace("export default function CaregiverChecklistScreen() {", "export default function CaregiverChecklistScreen() {\n  const { t } = useTranslation();")

chk_content = chk_content.replace('>Backend Not Yet Implemented<', ">{t('caregiverChecklists.backendNoticeTitle')}<")
chk_content = chk_content.replace('The checklist API returns HTTP 501. You can still build and validate templates here — they will submit to the real endpoint once it is ready.', "{t('caregiverChecklists.backendNoticeText')}")
chk_content = chk_content.replace('title="Create Template Anyway"', "title={t('caregiverChecklists.createAnywayBtn')}")
chk_content = chk_content.replace('title="New Template"', "title={t('caregiverChecklists.newTemplate')}")
chk_content = chk_content.replace('title="No templates yet"', "title={t('caregiverChecklists.noTemplates')}")
chk_content = chk_content.replace('message="Create step-by-step routine templates that patients can follow."', "message={t('caregiverChecklists.noTemplatesMsg')}")
chk_content = chk_content.replace('title="Create First Template"', "title={t('caregiverChecklists.createFirstBtn')}")
chk_content = chk_content.replace('>Archived<', ">{t('caregiverChecklists.archived')}<")

chk_content = chk_content.replace("formMode === 'create' ? 'New Template' : 'Edit Template'", "formMode === 'create' ? t('caregiverChecklists.newTemplate') : t('caregiverChecklists.editTemplate')")
chk_content = chk_content.replace('label="Title *"', "label={t('caregiverChecklists.titleLabel')}")
chk_content = chk_content.replace('placeholder="e.g. Morning Routine"', "placeholder={t('caregiverChecklists.titlePlaceholder')}")
chk_content = chk_content.replace('label="Description (optional)"', "label={t('caregiverChecklists.descLabel')}")
chk_content = chk_content.replace('placeholder="What is this routine for?"', "placeholder={t('caregiverChecklists.descPlaceholder')}")
chk_content = chk_content.replace('>Category<', ">{t('caregiverChecklists.categoryLabel')}<")
chk_content = chk_content.replace('label="Estimated duration (minutes, optional)"', "label={t('caregiverChecklists.durationLabel')}")

chk_content = chk_content.replace('>Steps ({form.steps.length})<', ">{t('caregiverChecklists.stepsCount', { count: form.steps.length })}<")
chk_content = chk_content.replace('>Add step<', ">{t('caregiverChecklists.addStep')}<")
chk_content = chk_content.replace('No steps yet. Tap "Add step" to begin.', "{t('caregiverChecklists.noStepsMsg')}")
chk_content = chk_content.replace("`Step ${idx + 1} title (required)`", "t('caregiverChecklists.stepTitlePlaceholder', { num: idx + 1 })")
chk_content = chk_content.replace('placeholder="Notes or description (optional)"', "placeholder={t('caregiverChecklists.stepDescPlaceholder')}")
chk_content = chk_content.replace("formMode === 'create' ? 'Create Template' : 'Save Changes'", "formMode === 'create' ? t('caregiverChecklists.createTplBtn') : t('caregiverChecklists.saveChangesBtn')")
chk_content = chk_content.replace('title="Archive Template"', "title={t('caregiverChecklists.archiveTplBtn')}")

# TemplateCard injection
chk_content = chk_content.replace(
    "function TemplateCard({\n  template,\n  onEdit,\n  onArchive,\n}: {\n  template: ChecklistTemplate;\n  onEdit: () => void;\n  onArchive: () => void;\n}) {",
    "function TemplateCard({\n  template,\n  onEdit,\n  onArchive,\n}: {\n  template: ChecklistTemplate;\n  onEdit: () => void;\n  onArchive: () => void;\n}) {\n  const { t } = useTranslation();"
)
chk_content = chk_content.replace(
    "template.isActive ? 'Active' : 'Archived'",
    "template.isActive ? t('caregiverHome.active') : t('caregiverChecklists.archived')"
)
chk_content = chk_content.replace('title="Edit"', 'title={t("caregiverPatients.editReminders").split(" ")[0]}')
chk_content = chk_content.replace('title="Archive"', 'title={t("caregiverChecklists.archived")}')

with open(chk_path, 'w', encoding='utf-8') as f:
    f.write(chk_content)
