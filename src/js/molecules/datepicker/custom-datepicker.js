/**
 * Custom DatePicker Molecule
 * Attach a customized, beautiful datepicker popup (matching exact Figma design)
 * to any input[type="date"], input[type="datetime-local"] or date text input.
 */

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

let currentOutsideClickHandler = null;

export function attachCustomDatePicker(inputEl) {
  if (!inputEl || inputEl.dataset.customDatepickerAttached) return;
  inputEl.dataset.customDatepickerAttached = 'true';

  inputEl.addEventListener('click', (e) => {
    e.preventDefault();
    openDatePickerPopup(inputEl);
  });
}

function setDateValue(inputEl, yyyy, mm, dd) {
  if (inputEl.type === 'datetime-local') {
    let time = '00:00';
    if (inputEl.value && inputEl.value.includes('T')) {
      time = inputEl.value.split('T')[1] || time;
    } else if (inputEl.id && inputEl.id.includes('fin')) {
      time = '23:59';
    }
    inputEl.value = `${yyyy}-${mm}-${dd}T${time}`;
  } else {
    inputEl.value = `${yyyy}-${mm}-${dd}`;
  }
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  inputEl.dispatchEvent(new Event('change', { bubbles: true }));
}

function openDatePickerPopup(inputEl) {
  const existing = document.getElementById('custom-datepicker-popup');
  if (existing && existing._targetInput === inputEl) {
    closeDatePickerPopup();
    return;
  }
  closeDatePickerPopup();

  let selectedDate = new Date();
  if (inputEl.value) {
    const dateStr = inputEl.value.split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        selectedDate = new Date(y, m, d);
      }
    }
  }

  let viewYear = selectedDate.getFullYear();
  let viewMonth = selectedDate.getMonth();

  const popup = document.createElement('div');
  popup.className = 'custom-datepicker-popup';
  popup.id = 'custom-datepicker-popup';
  popup._targetInput = inputEl;

  const rect = inputEl.getBoundingClientRect();
  const popupWidth = 245;
  popup.style.top = `${window.scrollY + rect.bottom + 6}px`;

  let leftPos = window.scrollX + rect.left;
  if (rect.left + popupWidth > window.innerWidth) {
    leftPos = Math.max(10, window.scrollX + rect.right - popupWidth);
  }
  popup.style.left = `${leftPos}px`;

  function renderGrid() {
    const monthName = MONTH_NAMES_ES[viewMonth];
    
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    let startingDay = firstDayOfMonth.getDay() - 1;
    if (startingDay < 0) startingDay = 6;

    const lastDateOfMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const lastDateOfPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    let daysHtml = '';

    for (let i = startingDay - 1; i >= 0; i--) {
      const prevDay = lastDateOfPrevMonth - i;
      daysHtml += `<div class="cdp-day-cell cdp-day-other-month" data-day="${prevDay}" data-month-offset="-1">${prevDay}</div>`;
    }

    for (let day = 1; day <= lastDateOfMonth; day++) {
      const isSelected = 
        selectedDate.getFullYear() === viewYear &&
        selectedDate.getMonth() === viewMonth &&
        selectedDate.getDate() === day;
      const selectedClass = isSelected ? 'cdp-day-selected' : '';
      daysHtml += `<div class="cdp-day-cell ${selectedClass}" data-day="${day}" data-month-offset="0">${day}</div>`;
    }

    const totalCells = startingDay + lastDateOfMonth;
    const nextDaysNeeded = (totalCells > 35 ? 42 : 35) - totalCells;
    for (let day = 1; day <= nextDaysNeeded; day++) {
      daysHtml += `<div class="cdp-day-cell cdp-day-other-month" data-day="${day}" data-month-offset="1">${day}</div>`;
    }

    popup.innerHTML = `
      <div class="cdp-header">
        <div class="cdp-month-year-selector" id="cdp-month-year-label">
          <span>${monthName} ${viewYear}</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
            <path d="M0 0l5 6 5-6z"/>
          </svg>
        </div>
        <div class="cdp-nav-btns">
          <button type="button" class="cdp-nav-btn" id="cdp-btn-prev" aria-label="Mes anterior">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
          <button type="button" class="cdp-nav-btn" id="cdp-btn-next" aria-label="Mes siguiente">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="cdp-weekdays-grid">
        <span class="cdp-weekday-item">M</span>
        <span class="cdp-weekday-item">T</span>
        <span class="cdp-weekday-item">W</span>
        <span class="cdp-weekday-item">T</span>
        <span class="cdp-weekday-item">F</span>
        <span class="cdp-weekday-item">S</span>
        <span class="cdp-weekday-item">S</span>
      </div>

      <div class="cdp-days-grid" id="cdp-days-grid-body">
        ${daysHtml}
      </div>

      <div class="cdp-footer">
        <button type="button" class="cdp-footer-btn" id="cdp-btn-clear">Clear</button>
        <button type="button" class="cdp-footer-btn" id="cdp-btn-today">Today</button>
      </div>
    `;

    popup.querySelector('#cdp-btn-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      viewMonth--;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
      }
      renderGrid();
    });

    popup.querySelector('#cdp-btn-next').addEventListener('click', (e) => {
      e.stopPropagation();
      viewMonth++;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
      }
      renderGrid();
    });

    popup.querySelector('#cdp-btn-clear').addEventListener('click', (e) => {
      e.stopPropagation();
      inputEl.value = '';
      inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      closeDatePickerPopup();
    });

    popup.querySelector('#cdp-btn-today').addEventListener('click', (e) => {
      e.stopPropagation();
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setDateValue(inputEl, yyyy, mm, dd);
      closeDatePickerPopup();
    });

    popup.querySelectorAll('.cdp-day-cell').forEach((cell) => {
      cell.addEventListener('click', (e) => {
        e.stopPropagation();
        const day = parseInt(cell.dataset.day, 10);
        const offset = parseInt(cell.dataset.monthOffset, 10);
        const targetDate = new Date(viewYear, viewMonth + offset, day);
        
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        
        setDateValue(inputEl, yyyy, mm, dd);
        closeDatePickerPopup();
      });
    });
  }

  renderGrid();
  document.body.appendChild(popup);

  setTimeout(() => {
    currentOutsideClickHandler = function onOutsideClick(e) {
      if (!popup.contains(e.target) && e.target !== inputEl) {
        closeDatePickerPopup();
      }
    };
    document.addEventListener('click', currentOutsideClickHandler);
  }, 10);
}

export function closeDatePickerPopup() {
  if (currentOutsideClickHandler) {
    document.removeEventListener('click', currentOutsideClickHandler);
    currentOutsideClickHandler = null;
  }
  const existing = document.getElementById('custom-datepicker-popup');
  if (existing) {
    existing.remove();
  }
}

export function initCustomDatePickers() {
  document.querySelectorAll('input[type="date"], input[type="datetime-local"], .periodo-filter-date, .tiempo-real-filter-date').forEach((input) => {
    attachCustomDatePicker(input);
  });
}
