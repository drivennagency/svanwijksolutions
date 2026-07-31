document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('casesGrid');
  if (!grid) return;

  const PER_PAGE = 6;
  const cards = Array.from(grid.querySelectorAll('.case-card'));
  const paginationEls = [
    document.getElementById('casesPaginationTop'),
    document.getElementById('casesPaginationBottom')
  ].filter(Boolean);

  let currentPage = 1;

  function render() {
    const totalPages = Math.max(1, Math.ceil(cards.length / PER_PAGE));
    if (currentPage > totalPages) currentPage = totalPages;

    cards.forEach((c, i) => {
      const page = Math.floor(i / PER_PAGE) + 1;
      c.hidden = page !== currentPage;
    });

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

  render();
});
