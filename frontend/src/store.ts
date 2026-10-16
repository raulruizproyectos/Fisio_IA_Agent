import { atom, map } from 'nanostores';

export const isSidebarOpen = atom(false);
export const activePage = atom('dashboard');

export const assistantState = map({
  isOpen: false,
  activeMode: 'new-plan' as 'new-plan' | 'update-plan' | 'next-session',
  telegramLinkState: null as any,
  diagnosticExpanded: false,
});

export const modalState = map({
  firma: { isOpen: false, tipo: null as string | null },
  confirm: { isOpen: false, options: {} as any },
  patientForm: { isOpen: false },
});
