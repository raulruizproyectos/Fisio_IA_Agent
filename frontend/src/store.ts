import { atom, map } from 'nanostores';

export const isSidebarOpen = atom(false);
export const activePage = atom('dashboard');

export const patientState = map({
  selectedPatientId: null as string | null,
  selectedPatientName: '',
  catalog: [] as Array<{ id: string; nombre_completo: string; email?: string | null }>,
});

export const dashboardRuntime = map({
  agendaState: 'loading' as 'loading' | 'ready' | 'error',
  intakeState: 'loading' as 'loading' | 'ready' | 'error',
  weekAppointments: [] as any[],
  todayAppointments: [] as any[],
  nextAppointment: null as any | null,
  pendingIntakes: [] as any[],
  syncUi: null as null | {
    uiStatus: string;
    chipLabel: string;
    chipClass: string;
    title: string;
    meta: string;
    facts: Array<{ label: string; value: string }>;
  },
});

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
