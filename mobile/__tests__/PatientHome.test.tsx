import { render, screen } from '@testing-library/react-native';
import PatientHomeScreen from '../app/(patient)/home';

describe('PatientHomeScreen', () => {
  it('renders the greeting', () => {
    render(<PatientHomeScreen />);

    // Should show one of the greetings
    const greetings = ['Good morning', 'Good afternoon', 'Good evening'];
    const found = greetings.some((g) =>
      screen.queryByText(new RegExp(g)),
    );
    expect(found).toBe(true);
  });

  it('renders quick action cards', () => {
    render(<PatientHomeScreen />);

    expect(screen.getByText(/My Reminders/)).toBeTruthy();
    expect(screen.getByText(/Checklists/)).toBeTruthy();
    expect(screen.getByText(/Brain Games/)).toBeTruthy();
    expect(screen.getByText(/Help/)).toBeTruthy();
  });
});
