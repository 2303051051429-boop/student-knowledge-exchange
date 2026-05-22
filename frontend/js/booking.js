/* ═══════════════════════════════════════════════════
   BOOKING MODAL (booking.js)
═══════════════════════════════════════════════════ */

let bookingState = { teacherId: '', teacherName: '', skillId: '', skillName: '', price: 0, date: '', timeSlot: '', meetLink: '', step: 1 };

function openBookingModal(teacherId, teacherName, skillId, skillName, price) {
  if (!SkillSwapAPI.isLoggedIn()) { openAuthModal(); return; }

  bookingState = { teacherId, teacherName, skillId, skillName, price: price || 0, date: '', timeSlot: '', meetLink: '', step: 1 };

  if (document.getElementById('bookingModal')) document.getElementById('bookingModal').remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay booking-modal';
  overlay.id = 'bookingModal';
  overlay.innerHTML = `
    <div class="modal" style="max-width:520px">
      <button class="modal-close" onclick="closeBookingModal()">✕</button>
      <div class="modal-header">
        <h2>Book a Session</h2>
        <p>with <strong>${teacherName}</strong> · ${skillName}</p>
      </div>
      <div class="modal-body">
        <div class="booking-steps">
          <div class="booking-step-dot active" data-step="1"></div>
          <div class="booking-step-dot" data-step="2"></div>
          <div class="booking-step-dot" data-step="3"></div>
          <div class="booking-step-dot" data-step="4"></div>
        </div>

        <!-- Step 1: Calendar -->
        <div class="booking-panel active" id="bookStep1">
          <h3 style="font-family:var(--font-display);font-size:16px;font-weight:700;margin-bottom:16px;">Select a Date</h3>
          <div class="calendar" id="bookingCalendar"></div>
          <button class="btn-primary btn-sm" style="width:100%;" id="bookStep1Next" onclick="bookingNextStep(2)" disabled>Continue →</button>
        </div>

        <!-- Step 2: Time Slots -->
        <div class="booking-panel" id="bookStep2">
          <h3 style="font-family:var(--font-display);font-size:16px;font-weight:700;margin-bottom:8px;">Select a Time</h3>
          <p style="font-size:13px;color:var(--ink-faint);font-style:italic;margin-bottom:16px;" id="bookDateLabel"></p>
          <div class="slots-grid" id="slotsGrid"><div class="skeleton" style="height:120px;grid-column:1/-1;"></div></div>
          <div style="display:flex;gap:10px;margin-top:16px;">
            <button class="btn-outline btn-sm" style="flex:1;color:var(--ink-muted);border-color:var(--card-border);" onclick="bookingNextStep(1)">← Back</button>
            <button class="btn-primary btn-sm" style="flex:1;" id="bookStep2Next" onclick="bookingNextStep(3)" disabled>Continue →</button>
          </div>
        </div>

        <!-- Step 3: Confirm & Pay -->
        <div class="booking-panel" id="bookStep3">
          <h3 style="font-family:var(--font-display);font-size:16px;font-weight:700;margin-bottom:16px;">Confirm Booking</h3>
          <div class="payment-summary" id="paymentSummary"></div>
          <div class="form-group">
            <label>Notes for Teacher (optional)</label>
            <textarea id="bookNotes" rows="2" placeholder="Any specific topics you'd like to cover?"></textarea>
          </div>
          <div style="display:flex;gap:10px;">
            <button class="btn-outline btn-sm" style="flex:1;color:var(--ink-muted);border-color:var(--card-border);" onclick="bookingNextStep(2)">← Back</button>
            <button class="btn-primary btn-sm btn-teal" style="flex:1;" onclick="confirmBooking()">Confirm & Book ✓</button>
          </div>
        </div>

        <!-- Step 4: Success -->
        <div class="booking-panel" id="bookStep4">
          <div class="booking-success">
            <div class="success-icon">🎉</div>
            <h3 style="font-family:var(--font-display);font-size:22px;font-weight:900;margin-bottom:8px;">Session Booked!</h3>
            <p style="font-size:14px;color:var(--ink-muted);font-style:italic;margin-bottom:20px;">You'll receive a confirmation notification.</p>
            <div class="meet-link-box" id="meetLinkBox"></div>
            <button class="btn-primary" style="width:100%;margin-top:12px;" onclick="closeBookingModal()">Done</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('active'), 10);
  renderCalendar();
}

function closeBookingModal() {
  const m = document.getElementById('bookingModal');
  if (m) { m.classList.remove('active'); setTimeout(() => m.remove(), 300); }
}

function bookingNextStep(step) {
  bookingState.step = step;
  document.querySelectorAll('.booking-step-dot').forEach(d => {
    const s = parseInt(d.dataset.step);
    d.classList.toggle('active', s === step);
    d.classList.toggle('done', s < step);
  });
  document.querySelectorAll('.booking-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`bookStep${step}`).classList.add('active');

  if (step === 2) loadSlots();
  if (step === 3) renderPaymentSummary();
}

// ── Calendar ────────────────────────────────────────
let calMonth, calYear;

function renderCalendar() {
  const now = new Date();
  calMonth = now.getMonth();
  calYear  = now.getFullYear();
  drawCalendar();
}

function drawCalendar() {
  const container = document.getElementById('bookingCalendar');
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const today = new Date();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  let html = `
    <div class="calendar-header">
      <button class="calendar-nav" onclick="calPrev()">◀</button>
      <h3>${monthNames[calMonth]} ${calYear}</h3>
      <button class="calendar-nav" onclick="calNext()">▶</button>
    </div>
    <div class="calendar-grid">
      ${dayNames.map(d => `<div class="cal-day-header">${d}</div>`).join('')}
  `;
  for (let i = 0; i < firstDay; i++) html += '<div></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(calYear, calMonth, d);
    const iso = date.toISOString().split('T')[0];
    const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isToday = date.toDateString() === today.toDateString();
    const isSelected = bookingState.date === iso;
    html += `<div class="cal-day${isPast?' disabled':''}${isToday?' today':''}${isSelected?' selected':''}" onclick="selectDate('${iso}')">${d}</div>`;
  }
  html += '</div>';
  container.innerHTML = html;
}

function calPrev() { calMonth--; if(calMonth<0){calMonth=11;calYear--;} drawCalendar(); }
function calNext() { calMonth++; if(calMonth>11){calMonth=0;calYear++;} drawCalendar(); }

function selectDate(iso) {
  bookingState.date = iso;
  drawCalendar();
  document.getElementById('bookStep1Next').disabled = false;
}

// ── Slots ───────────────────────────────────────────
async function loadSlots() {
  document.getElementById('bookDateLabel').textContent = new Date(bookingState.date).toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const grid = document.getElementById('slotsGrid');
  grid.innerHTML = '<div class="skeleton" style="height:120px;grid-column:1/-1;"></div>';

  try {
    const data = await SkillSwapAPI.get(`/sessions/slots/${bookingState.teacherId}/${bookingState.date}`);
    const allSlots = ['09:00','10:00','11:00','12:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
    grid.innerHTML = allSlots.map(s => {
      const taken = data.booked.includes(s);
      const sel   = bookingState.timeSlot === s;
      return `<button class="slot-btn${taken?' taken':''}${sel?' selected':''}" onclick="selectSlot('${s}')"${taken?' disabled':''}>${s}${taken?' ✗':''}</button>`;
    }).join('');
  } catch { grid.innerHTML = '<p style="color:var(--ink-faint);font-style:italic;grid-column:1/-1;text-align:center;">Could not load slots</p>'; }
}

function selectSlot(time) {
  bookingState.timeSlot = time;
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.toggle('selected', b.textContent.startsWith(time)));
  document.getElementById('bookStep2Next').disabled = false;
}

// ── Payment Summary ─────────────────────────────────
function renderPaymentSummary() {
  const dateStr = new Date(bookingState.date).toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
  document.getElementById('paymentSummary').innerHTML = `
    <div class="payment-row"><span>Skill</span><strong>${bookingState.skillName}</strong></div>
    <div class="payment-row"><span>Teacher</span><strong>${bookingState.teacherName}</strong></div>
    <div class="payment-row"><span>Date & Time</span><strong>${dateStr} at ${bookingState.timeSlot}</strong></div>
    <div class="payment-row"><span>Duration</span><strong>60 min</strong></div>
    <div class="payment-row"><span>Total</span><strong>${bookingState.price > 0 ? '₹'+bookingState.price : 'Free (Skill Swap)'}</strong></div>
  `;
}

// ── Confirm ─────────────────────────────────────────
async function confirmBooking() {
  try {
    const data = await SkillSwapAPI.post('/sessions', {
      teacherId: bookingState.teacherId,
      skillId:   bookingState.skillId,
      skillName: bookingState.skillName,
      date:      bookingState.date,
      timeSlot:  bookingState.timeSlot,
      durationMin: 60,
      notes:     document.getElementById('bookNotes')?.value || ''
    });
    bookingState.meetLink = data.meetLink;
    document.getElementById('meetLinkBox').innerHTML = `
      <span class="meet-icon">📹</span>
      <div class="meet-info">
        <div class="meet-label">GOOGLE MEET</div>
        <a href="${data.meetLink}" target="_blank">${data.meetLink}</a>
      </div>
    `;
    bookingNextStep(4);
    showToast('Session booked successfully! 🎉', 'success');
  } catch (err) {
    showToast(err.error || 'Booking failed', 'error');
  }
}

window.openBookingModal  = openBookingModal;
window.closeBookingModal = closeBookingModal;
window.bookingNextStep   = bookingNextStep;
window.calPrev = calPrev;
window.calNext = calNext;
window.selectDate = selectDate;
window.selectSlot = selectSlot;
window.confirmBooking = confirmBooking;
