/**
 * Molecule: Search Field Controller
 * Manages search input events, clear button visibility, and item filtering.
 */
export function initSearch(inputSelector = '#component-search', itemsSelector = '.card') {
  const searchInput = document.querySelector(inputSelector);
  if (!searchInput) return;

  const searchWrapper = searchInput.closest('.search-field');
  const clearBtn = searchWrapper?.querySelector('.clear-btn');
  const cards = document.querySelectorAll(itemsSelector);

  function handleFilter(query) {
    const normalized = query.trim().toLowerCase();

    cards.forEach((card) => {
      const title = card.querySelector('.card-title')?.textContent?.toLowerCase() || '';
      const body = card.querySelector('.card-body')?.textContent?.toLowerCase() || '';
      const match = title.includes(normalized) || body.includes(normalized);
      card.style.display = match ? '' : 'none';
    });

    if (searchWrapper) {
      if (normalized.length > 0) {
        searchWrapper.classList.add('has-value');
      } else {
        searchWrapper.classList.remove('has-value');
      }
    }
  }

  searchInput.addEventListener('input', (e) => {
    handleFilter(e.target.value);
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      handleFilter('');
      searchInput.focus();
    });
  }
}
