const configuredBackendBase = String(import.meta.env.PUBLIC_BACKEND_URL || '').trim().replace(/\/+$/, '');

    (() => {
      const runtimeBackendBase = String(window.__FISIO_RUNTIME_CONFIG__?.PUBLIC_BACKEND_URL || '').trim().replace(/\/+$/, '');
      const defaultBackend = window.location.hostname.includes('b5xbaf.easypanel.host')
        ? 'https://fisio-backend.b5xbaf.easypanel.host'
        : ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
          ? 'http://localhost:3001'
          : '');
      const BACKEND_BASE = runtimeBackendBase
        || configuredBackendBase
        || defaultBackend;

      const params = new URLSearchParams(window.location.search);
      const professionalId = params.get('professional_id') || params.get('profesional_id') || '';
      const recoveryStorageKey = `fisio:public-booking:${professionalId.toLowerCase()}`;

      const clinicNameEl = document.getElementById('clinicName');
      const clinicLocationEl = document.getElementById('clinicLocation');
      const clinicLeadEl = document.getElementById('clinicLead');
      const professionalNameEl = document.getElementById('professionalName');
      const professionalMetaEl = document.getElementById('professionalMeta');
      const clinicContactRowEl = document.getElementById('clinicContactRow');
      const clinicContactEl = document.getElementById('clinicContact');
      const timezoneEl = document.getElementById('bookingTimezone');
      const dateInput = document.getElementById('bookingDate');
      const windowHintEl = document.getElementById('bookingWindowHint');
      const slotsStateEl = document.getElementById('slotsState');
      const slotsGridEl = document.getElementById('slotsGrid');
      const bookingForm = document.getElementById('bookingForm');
      const patientNameInput = document.getElementById('patientNameInput');
      const patientPhoneInput = document.getElementById('patientPhoneInput');
      const patientEmailInput = document.getElementById('patientEmailInput');
      const reasonInput = document.getElementById('bookingReasonInput');
      const summaryEl = document.getElementById('bookingSummary');
      const feedbackEl = document.getElementById('bookingFeedback');
      const submitBtn = document.getElementById('bookingSubmitBtn');
      const successEl = document.getElementById('bookingSuccess');
      const successTextEl = document.getElementById('bookingSuccessText');
      const resetBtn = document.getElementById('bookingResetBtn');

      let bookingConfig = null;
      let selectedSlot = null;
      let currentSlots = [];
      let slotsRequestVersion = 0;
      let bookingInFlight = false;
      let pendingBooking = null;
      let bookingNeedsClinic = false;
      const defaultSubmitText = submitBtn?.textContent || 'Confirmar reserva';

      if (!BACKEND_BASE) {
        if (slotsStateEl) slotsStateEl.textContent = 'La reserva online no esta configurada en este entorno.';
        if (windowHintEl) windowHintEl.textContent = 'Configuracion pendiente';
        return;
      }

      const setFeedback = (text = '', state = 'error') => {
        if (!feedbackEl) return;
        if (!text) {
          feedbackEl.hidden = true;
          feedbackEl.textContent = '';
          feedbackEl.removeAttribute('data-state');
          return;
        }
        feedbackEl.hidden = false;
        feedbackEl.textContent = text;
        feedbackEl.setAttribute('data-state', state);
        feedbackEl.setAttribute('role', state === 'error' ? 'alert' : 'status');
      };

      const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const buildUrl = (path, extra = {}) => {
        const base = BACKEND_BASE || window.location.origin;
        const url = new URL(path, base);
        if (professionalId) url.searchParams.set('professional_id', professionalId);
        Object.entries(extra).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
        });
        return url.toString();
      };

      const fetchJson = async (url, options = {}) => {
        const response = await fetch(url, options);
        const rawText = await response.text();
        const payload = rawText ? JSON.parse(rawText) : {};
        if (!response.ok) {
          const error = new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
          error.payload = payload;
          error.status = response.status;
          throw error;
        }
        return payload;
      };

      const setSummary = (slot = null) => {
        if (!summaryEl) return;
        if (!slot) {
          summaryEl.innerHTML = '<strong>Sin hueco seleccionado</strong><p>Elige primero una fecha y una hora para continuar.</p>';
          return;
        }
        summaryEl.innerHTML = `
          <strong>${escapeHtml(slot.date_label || '')} · ${escapeHtml(slot.start_local)} - ${escapeHtml(slot.end_local)}</strong>
          <p>Tu reserva se registrara para ${escapeHtml(bookingConfig?.professional?.nombre_completo || 'el profesional')} en horario ${escapeHtml(bookingConfig?.booking?.time_zone || 'Europe/Madrid')}.</p>
        `;
      };

      const updateSubmitState = () => {
        const hasContact = Boolean(String(patientPhoneInput?.value || '').trim() || String(patientEmailInput?.value || '').trim());
        const ready = Boolean(!bookingInFlight && !bookingNeedsClinic && successEl?.hidden && (pendingBooking || (selectedSlot && String(patientNameInput?.value || '').trim() && hasContact)));
        if (submitBtn) submitBtn.disabled = !ready;
      };

      const setBookingBusy = (busy) => {
        bookingInFlight = busy;
        const locked = busy || Boolean(pendingBooking);
        if (dateInput) dateInput.disabled = locked || !successEl?.hidden;
        bookingForm?.setAttribute('aria-busy', String(busy));
        bookingForm?.querySelectorAll('input, textarea').forEach((input) => { input.disabled = locked; });
        slotsGridEl?.querySelectorAll('.slot-pill').forEach((button) => { button.disabled = locked; });
        if (submitBtn) submitBtn.textContent = bookingNeedsClinic ? 'Consulta con la clínica' : pendingBooking && !busy ? 'Comprobar reserva' : defaultSubmitText;
        updateSubmitState();
      };

      const renderSlots = (slots = [], dateValue = '') => {
        currentSlots = Array.isArray(slots) ? slots : [];
        if (slotsGridEl) slotsGridEl.innerHTML = '';
        if (!slotsStateEl) return;

        if (!dateValue) {
          slotsStateEl.textContent = 'Selecciona un dia para ver horas disponibles.';
          slotsStateEl.hidden = false;
          setSummary(null);
          selectedSlot = null;
          updateSubmitState();
          return;
        }

        if (!currentSlots.length) {
          slotsStateEl.textContent = 'No quedan huecos en ese dia. Prueba otra fecha.';
          slotsStateEl.hidden = false;
          setSummary(null);
          selectedSlot = null;
          updateSubmitState();
          return;
        }

        slotsStateEl.hidden = true;
        const dateLabel = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${dateValue}T12:00:00`));
        currentSlots.forEach((slot) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'slot-pill';
          button.setAttribute('aria-pressed', 'false');
          button.setAttribute('aria-label', `${slot.start_local} a ${slot.end_local}`);
          button.innerHTML = `<strong>${escapeHtml(slot.start_local)}</strong><span>${escapeHtml(slot.end_local)}</span>`;
          button.addEventListener('click', () => {
            if (bookingInFlight || pendingBooking || !successEl?.hidden) return;
            selectedSlot = { ...slot, date_label: dateLabel };
            slotsGridEl.querySelectorAll('.slot-pill').forEach((node) => {
              node.classList.remove('is-selected');
              node.setAttribute('aria-pressed', 'false');
            });
            button.classList.add('is-selected');
            button.setAttribute('aria-pressed', 'true');
            setSummary(selectedSlot);
            setFeedback();
            updateSubmitState();
          });
          slotsGridEl.appendChild(button);
        });
        updateSubmitState();
      };

      const loadConfig = async () => {
        const payload = await fetchJson(buildUrl('/api/profesional/public-booking/config'));
        bookingConfig = payload?.data || null;
        if (!bookingConfig) throw new Error('No se pudo cargar la configuracion de reserva online.');

        if (clinicNameEl) clinicNameEl.textContent = bookingConfig.clinic?.name || 'Fisio Clinical';
        if (clinicLocationEl) clinicLocationEl.textContent = bookingConfig.clinic?.location || '';
        if (clinicLeadEl) clinicLeadEl.textContent = `Reserva online con ${bookingConfig.professional?.nombre_completo || 'tu fisioterapeuta'} y huecos reales sincronizados con la agenda activa.`;
        if (professionalNameEl) professionalNameEl.textContent = bookingConfig.professional?.nombre_completo || 'Fisioterapeuta';
        if (professionalMetaEl) professionalMetaEl.textContent = bookingConfig.professional?.email || 'Agenda sincronizada con Google Calendar';
        if (timezoneEl) timezoneEl.textContent = bookingConfig.booking?.time_zone || 'Europe/Madrid';
        if (dateInput) {
          dateInput.min = bookingConfig.booking?.min_date || '';
          dateInput.max = bookingConfig.booking?.max_date || '';
          dateInput.value = bookingConfig.booking?.min_date || '';
        }

        const contactLines = [bookingConfig.clinic?.phone, bookingConfig.clinic?.email].filter(Boolean);
        if (clinicContactRowEl && clinicContactEl && contactLines.length) {
          clinicContactRowEl.hidden = false;
          clinicContactEl.textContent = contactLines.join(' · ');
        }

        const windowsText = Array.isArray(bookingConfig.booking?.windows)
          ? bookingConfig.booking.windows.map((window) => `${window.start}-${window.end}`).join(' · ')
          : '09:00-13:00 · 15:00-19:00';
        if (windowHintEl) windowHintEl.textContent = `${windowsText} · bloques de ${bookingConfig.booking?.slot_minutes || 60} min`;
      };

      const loadSlots = async (clearFeedback = true) => {
        if (bookingInFlight || pendingBooking || !successEl?.hidden) return;
        const requestVersion = ++slotsRequestVersion;
        const dateValue = dateInput?.value || '';
        selectedSlot = null;
        setSummary(null);
        updateSubmitState();
        if (slotsStateEl) {
          slotsStateEl.hidden = false;
          slotsStateEl.textContent = 'Consultando huecos disponibles...';
        }
        if (slotsGridEl) slotsGridEl.innerHTML = '';
        if (clearFeedback) setFeedback();

        if (!dateValue) {
          renderSlots([], '');
          return;
        }

        try {
          const payload = await fetchJson(buildUrl('/api/profesional/public-booking/slots', { date: dateValue }));
          if (requestVersion !== slotsRequestVersion || dateInput?.value !== dateValue) return;
          renderSlots(payload?.data?.slots || [], dateValue);
        } catch (error) {
          if (requestVersion !== slotsRequestVersion || dateInput?.value !== dateValue) return;
          if (slotsStateEl) {
            slotsStateEl.hidden = false;
            slotsStateEl.textContent = 'No se pudieron consultar los horarios. Vuelve a seleccionar una fecha para reintentar.';
          }
          setFeedback(error.message || 'No se pudieron cargar los huecos.', 'error');
        }
      };

      dateInput?.addEventListener('change', loadSlots);
      patientNameInput?.addEventListener('input', updateSubmitState);
      patientPhoneInput?.addEventListener('input', updateSubmitState);
      patientEmailInput?.addEventListener('input', updateSubmitState);

      const confirmBooking = (slot, professionalName) => {
        pendingBooking = null;
        if (bookingForm) bookingForm.hidden = true;
        if (successEl) successEl.hidden = false;
        if (successTextEl) successTextEl.textContent = `Tu cita para ${slot.date_label || 'la fecha elegida'} a las ${slot.start_local} ha quedado registrada con ${professionalName || bookingConfig?.professional?.nombre_completo || 'la clínica'}.`;
        if (slotsGridEl) slotsGridEl.innerHTML = '';
        if (slotsStateEl) { slotsStateEl.hidden = true; slotsStateEl.textContent = ''; }
        setFeedback();
        successEl?.focus();
      };

      const recoverPendingBooking = async () => {
        if (!pendingBooking || bookingInFlight || bookingNeedsClinic) return;
        setBookingBusy(true);
        setFeedback('Comprobando tu reserva anterior...', 'success');
        try {
          const response = await fetchJson(buildUrl('/api/profesional/public-booking/recovery'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': pendingBooking.key },
            body: JSON.stringify({professional_id: professionalId || bookingConfig?.professional?.id || ''}),
          });
          if (response.state === 'registered') {
            const start = new Date(response.data?.inicio_en || '');
            const end = new Date(response.data?.fin_en || '');
            if (!response.data?.id || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) throw new Error('Respuesta incompleta');
            const timeZone = bookingConfig?.booking?.time_zone || 'Europe/Madrid';
            const parts = new Intl.DateTimeFormat('es-ES', {year:'numeric',month:'2-digit',day:'2-digit',timeZone}).formatToParts(start);
            if (dateInput) dateInput.value = ['year','month','day'].map(type => parts.find(part => part.type === type)?.value).join('-');
            confirmBooking({
              date_label: new Intl.DateTimeFormat('es-ES', {weekday:'long',day:'numeric',month:'long',timeZone}).format(start),
              start_local: new Intl.DateTimeFormat('es-ES', {hour:'2-digit',minute:'2-digit',timeZone}).format(start),
            });
          } else if (response.state === 'changed') {
            bookingNeedsClinic = true;
            setFeedback('La clínica ha actualizado el estado de tu cita. Contacta con ella para comprobarlo antes de reservar otra.', 'error');
          } else {
            setFeedback('Tu solicitud anterior todavía no está confirmada. Comprueba de nuevo o contacta con la clínica antes de reservar otra.', 'error');
          }
        } catch {
          setFeedback('No hemos podido comprobar tu reserva anterior. Inténtalo de nuevo o contacta con la clínica antes de reservar otra.', 'error');
        } finally { setBookingBusy(false); }
      };

      bookingForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (bookingInFlight || bookingNeedsClinic || !successEl?.hidden) return;
        if (pendingBooking) { await recoverPendingBooking(); return; }
        if (!selectedSlot) {
          setFeedback('Selecciona antes un hueco disponible.', 'error');
          return;
        }

        const submittedSlot = { ...selectedSlot };
        setBookingBusy(true);
        setFeedback('Registrando reserva...', 'success');

        try {
          const payload = {
            professional_id: professionalId || bookingConfig?.professional?.id || '',
            full_name: patientNameInput?.value?.trim() || '',
            phone: patientPhoneInput?.value?.trim() || '',
            email: patientEmailInput?.value?.trim() || '',
            reason: reasonInput?.value?.trim() || '',
            start_at: submittedSlot.start_at,
            end_at: submittedSlot.end_at,
          };
          const key = crypto.randomUUID();
          try { window.sessionStorage.setItem(recoveryStorageKey, key); }
          catch { throw Object.assign(new Error('No se pudo preparar tu reserva. Prueba de nuevo o contacta con la clínica.'), {status:400}); }
          pendingBooking = {key};

          const response = await fetchJson(buildUrl('/api/profesional/public-booking/appointments'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Idempotency-Key': pendingBooking.key },
            body: JSON.stringify(payload),
          });
          if (!response?.data?.id) throw new Error('No se pudo confirmar la reserva guardada.');

          confirmBooking(submittedSlot, response?.booking?.professional_name);
        } catch (error) {
          const payload = error?.payload || {};
          if ((payload?.available === false || (error.status && error.status < 500 && !payload.code?.startsWith('BOOKING_'))) && pendingBooking) {
            try { window.sessionStorage.removeItem(recoveryStorageKey); }
            catch { bookingNeedsClinic = true; setFeedback('No se pudo cerrar la solicitud anterior. Contacta con la clínica antes de reservar otra.', 'error'); return; }
          }
          if (payload?.available === false) {
            pendingBooking = null;
            setBookingBusy(false);
            setFeedback('Ese hueco acaba de ocuparse. Te muestro los horarios actualizados.', 'error');
            await loadSlots(false);
          } else if (['BOOKING_KEY_REUSED', 'BOOKING_ALREADY_CHANGED', 'BOOKING_CALENDAR_UNCERTAIN'].includes(payload.code)) {
            bookingNeedsClinic = true;
            setFeedback(payload.error || 'Contacta con la clínica para comprobar esta reserva.', 'error');
          } else if (!error.status || error.status >= 500) {
            setFeedback('No hemos podido confirmar la respuesta. Pulsa «Comprobar reserva» para recuperar esta misma solicitud antes de elegir otra hora.', 'error');
          } else {
            pendingBooking = null;
            setFeedback(error.message || 'No se pudo registrar la reserva.', 'error');
          }
          updateSubmitState();
        } finally {
          setBookingBusy(false);
        }
      });

      resetBtn?.addEventListener('click', async () => {
        if (pendingBooking || bookingInFlight || bookingNeedsClinic) return;
        try { window.sessionStorage.removeItem(recoveryStorageKey); }
        catch { if (successTextEl) successTextEl.textContent = 'Tu cita sigue registrada. No se pudo iniciar otra reserva; contacta con la clínica.'; return; }
        if (bookingForm) bookingForm.hidden = false;
        if (successEl) successEl.hidden = true;
        bookingForm?.reset();
        selectedSlot = null;
        setSummary(null);
        setBookingBusy(false);
        await loadSlots();
      });

      (async () => {
        try {
          try {
            const key = window.sessionStorage.getItem(recoveryStorageKey);
            if (key) {
              if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) throw new Error('Referencia inválida');
              pendingBooking = {key};
              setBookingBusy(false);
            }
          } catch {
            bookingNeedsClinic = true;
            setBookingBusy(true);
            setFeedback('No hemos podido comprobar si tienes una reserva pendiente. Contacta con la clínica antes de reservar otra.', 'error');
            return;
          }
          await loadConfig();
          if (pendingBooking) await recoverPendingBooking();
          else await loadSlots();
        } catch (error) {
          setFeedback(error.message || 'No se pudo cargar la reserva online.', 'error');
          if (slotsStateEl) slotsStateEl.textContent = 'La reserva online no esta disponible ahora mismo.';
        }
      })();
    })();
