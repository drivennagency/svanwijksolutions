document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('blogGrid');
  if (!grid) return;

  const PER_PAGE = 12;
  const allCards = Array.from(grid.querySelectorAll('.blog-card'));
  const emptyMsg = document.getElementById('blogEmpty');
  const searchInput = document.getElementById('blogSearch');
  const paginationEls = [
    document.getElementById('blogPaginationTop'),
    document.getElementById('blogPaginationBottom')
  ].filter(Boolean);

  let currentPage = 1;

  function visibleCards() {
    return allCards.filter((c) => !c.dataset.filteredOut);
  }

  function applySearch(query) {
    const q = query.trim().toLowerCase();
    allCards.forEach((card) => {
      const matches = !q || (card.dataset.search || '').includes(q);
      card.dataset.filteredOut = matches ? '' : '1';
    });
    // matches "naar boven": her gefilterde/gematchte kaarten vooraan tonen
    const sorted = [...allCards].sort((a, b) => {
      const aOut = a.dataset.filteredOut ? 1 : 0;
      const bOut = b.dataset.filteredOut ? 1 : 0;
      if (aOut !== bOut) return aOut - bOut;
      return 0;
    });
    sorted.forEach((c) => grid.appendChild(c));
    currentPage = 1;
    render();
  }

  function render() {
    const visible = visibleCards();
    const totalPages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    allCards.forEach((c) => { c.hidden = true; });
    visible.forEach((c, i) => {
      const page = Math.floor(i / PER_PAGE) + 1;
      c.hidden = page !== currentPage;
    });

    emptyMsg.style.display = visible.length === 0 ? 'block' : 'none';
    grid.style.display = visible.length === 0 ? 'none' : '';

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    paginationEls.forEach((el) => {
      el.innerHTML = '';
      if (totalPages <= 1) return;

      const makeBtn = (label, page, opts = {}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'blog-pagination__btn' + (opts.active ? ' active' : '');
        btn.textContent = label;
        btn.disabled = !!opts.disabled;
        btn.addEventListener('click', () => {
          currentPage = page;
          render();
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
        return btn;
      };

      el.appendChild(makeBtn('‹', currentPage - 1, { disabled: currentPage === 1 }));
      for (let p = 1; p <= totalPages; p++) {
        el.appendChild(makeBtn(String(p), p, { active: p === currentPage }));
      }
      el.appendChild(makeBtn('›', currentPage + 1, { disabled: currentPage === totalPages }));
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => applySearch(searchInput.value));
  }

  render();
});
