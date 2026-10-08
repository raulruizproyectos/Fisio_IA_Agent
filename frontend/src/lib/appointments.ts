export function upcomingAppointments(appointments: any[], now = Date.now()) {
  const start = (appointment: any) => new Date(appointment.inicio_en || appointment.fecha_hora || '').getTime();
  return appointments.filter(appointment => start(appointment) >= now
    && !['cancelada', 'completada', 'no_show', 'calendar_cancelled'].includes(appointment.estado))
    .sort((a, b) => start(a) - start(b));
}
