/* ═══════════════════════════════════════════════════
   EXPLORE PAGE (explore.js) — Search, filter, render
═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── State ──
  let skills = [];
  let categories = [];
  let filters = {
    q: '',
    category: '',
    priceMin: '',
    priceMax: '',
    minRating: '',
    swapOnly: false
  };
  let debounceTimer = null;

  // ── DOM refs ──
  const searchInput    = document.getElementById('exploreSearch');
  const categorySelect = document.getElementById('categorySelect');
  const priceMinInput  = document.getElementById('priceMin');
  const priceMaxInput  = document.getElementById('priceMax');
  const ratingSelect   = document.getElementById('ratingSelect');
  const swapToggle     = document.getElementById('swapToggle');
  const grid           = document.getElementById('skillsGrid');
  const resultsCount   = document.getElementById('resultsCount');
  const categoryPills  = document.getElementById('categoryPills');

  // ── Init ──
  document.addEventListener('DOMContentLoaded', () => {
    // Read ?q= from URL
    const params = new URLSearchParams(window.location.search);
    const urlQuery = params.get('q') || '';
    if (urlQuery) {
      filters.q = urlQuery;
      if (searchInput) searchInput.value = urlQuery;
    }

    loadCategories();
    loadSkills();
    bindEvents();
  });

  // ── Event Binding ──
  function bindEvents() {
    // Debounced search
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          filters.q = searchInput.value.trim();
          updateURL();
          loadSkills();
        }, 300);
      });

      // Enter key
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(debounceTimer);
          filters.q = searchInput.value.trim();
          updateURL();
          loadSkills();
        }
      });
    }

    // Category select
    if (categorySelect) {
      categorySelect.addEventListener('change', () => {
        filters.category = categorySelect.value;
        syncCategoryPills();
        highlightFilterPill('filterCategory', !!filters.category);
        loadSkills();
      });
    }

    // Price inputs
    if (priceMinInput) {
      priceMinInput.addEventListener('change', () => {
        filters.priceMin = priceMinInput.value;
        highlightFilterPill('filterPriceMin', !!(filters.priceMin || filters.priceMax));
        loadSkills();
      });
    }
    if (priceMaxInput) {
      priceMaxInput.addEventListener('change', () => {
        filters.priceMax = priceMaxInput.value;
        highlightFilterPill('filterPriceMin', !!(filters.priceMin || filters.priceMax));
        loadSkills();
      });
    }

    // Rating select
    if (ratingSelect) {
      ratingSelect.addEventListener('change', () => {
        filters.minRating = ratingSelect.value;
        highlightFilterPill('filterRating', !!filters.minRating);
        loadSkills();
      });
    }
  }

  // ── Swap toggle ──
  window.toggleSwapFilter = function () {
    filters.swapOnly = !filters.swapOnly;
    if (swapToggle) swapToggle.classList.toggle('on', filters.swapOnly);
    highlightFilterPill('filterSwap', filters.swapOnly);
    loadSkills();
  };

  // ── Highlight active filter pill ──
  function highlightFilterPill(id, active) {
    const pill = document.getElementById(id);
    if (pill) pill.classList.toggle('active', active);
  }

  // ── URL sync ──
  function updateURL() {
    const url = new URL(window.location);
    if (filters.q) url.searchParams.set('q', filters.q);
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
  }

  // ── Load Categories ──
  async function loadCategories() {
    try {
      const data = await SkillSwapAPI.get('/skills/categories');
      categories = data.categories || data || [];

      // Populate dropdown
      if (categorySelect) {
        const frag = document.createDocumentFragment();
        categories.forEach(cat => {
          const opt = document.createElement('option');
          opt.value = cat;
          opt.textContent = cat;
          frag.appendChild(opt);
        });
        categorySelect.appendChild(frag);
      }

      // Render pills
      renderCategoryPills();
    } catch (err) {
      console.warn('Could not load categories:', err);
      // Fallback categories
      categories = ['Programming', 'Music', 'Design', 'Languages', 'Science', 'Business', 'Arts', 'Sports'];
      renderCategoryPills();
    }
  }

  function renderCategoryPills() {
    if (!categoryPills) return;
    categoryPills.innerHTML = `
      <button class="cat-pill active" data-cat="">All</button>
      ${categories.map(cat => `<button class="cat-pill" data-cat="${cat}">${cat}</button>`).join('')}
    `;
    categoryPills.querySelectorAll('.cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        filters.category = pill.dataset.cat;
        if (categorySelect) categorySelect.value = filters.category;
        syncCategoryPills();
        highlightFilterPill('filterCategory', !!filters.category);
        loadSkills();
      });
    });
  }

  function syncCategoryPills() {
    if (!categoryPills) return;
    categoryPills.querySelectorAll('.cat-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.cat === filters.category);
    });
  }

  // ── Load Skills ──
  async function loadSkills() {
    showSkeletons();

    // Build query params
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.category) params.set('category', filters.category);
    if (filters.priceMin) params.set('priceMin', filters.priceMin);
    if (filters.priceMax) params.set('priceMax', filters.priceMax);
    if (filters.minRating) params.set('minRating', filters.minRating);
    if (filters.swapOnly) params.set('swapOnly', 'true');

    const qs = params.toString();
    const path = `/skills${qs ? '?' + qs : ''}`;

    try {
      const data = await SkillSwapAPI.get(path);
      skills = data.skills || data || [];
      renderSkills();
    } catch (err) {
      console.error('Failed to load skills:', err);
      skills = [];
      renderSkills();
    }
  }

  // ── Render Skills ──
  function renderSkills() {
    if (!grid) return;

    if (skills.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔭</div>
          <h3>No skills found</h3>
          <p>Try adjusting your search or filters. New teachers join every day!</p>
        </div>
      `;
      if (resultsCount) resultsCount.innerHTML = '<strong>0</strong> results';
      return;
    }

    if (resultsCount) {
      resultsCount.innerHTML = `<strong>${skills.length}</strong> skill${skills.length !== 1 ? 's' : ''} found`;
    }

    grid.innerHTML = skills.map((skill, i) => renderSkillCard(skill, i)).join('');

    // Stagger fade-in
    const cards = grid.querySelectorAll('.skill-card');
    cards.forEach((card, idx) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(24px)';
      setTimeout(() => {
        card.style.transition = 'opacity .45s var(--ease-out-expo), transform .45s var(--ease-out-expo)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 60 * idx);
    });

    // Re-init cursor hover on new elements
    if (typeof initCursor === 'function') {
      document.querySelectorAll('.skill-card, .skill-card .btn-primary').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
      });
    }
  }

  function renderSkillCard(skill, index) {
    const teacher = skill.teacher || skill.user || {};
    const teacherName = teacher.name || skill.teacherName || 'Unknown Teacher';
    const university = teacher.university || skill.university || '';
    const avatar = teacher.avatar || skill.avatar || '';
    const initials = teacherName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const gradients = ['avatar-grad-1', 'avatar-grad-2', 'avatar-grad-3', 'avatar-grad-4', 'avatar-grad-5'];
    const gradClass = gradients[index % gradients.length];
    const verified = teacher.verified || skill.verified || false;
    const category = skill.category || 'General';
    const rating = skill.rating || skill.avgRating || 0;
    const reviewCount = skill.reviewCount || skill.reviews || 0;
    const price = skill.price != null ? skill.price : 0;
    const skillName = skill.name || skill.skillName || skill.title || 'Untitled Skill';
    const teacherId = teacher._id || teacher.id || skill.teacherId || skill.userId || '';
    const skillId = skill._id || skill.id || '';

    // Tag color
    const tagColors = { 'Programming': 'tag-teal', 'Music': 'tag-saffron', 'Design': 'tag-rose', 'Languages': 'tag-teal', 'Science': 'tag-saffron', 'Business': 'tag-teal', 'Arts': 'tag-rose', 'Sports': 'tag-saffron' };
    const tagClass = tagColors[category] || 'tag-teal';

    // Stars
    const fullStars = Math.floor(rating);
    const halfStar = (rating - fullStars) >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    const starsHtml = '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);

    // Price display
    let priceHtml = '';
    if (price === 0) {
      priceHtml = '<span class="free-badge">FREE SWAP</span>';
    } else {
      priceHtml = `<strong>₹${price}</strong> / session`;
    }

    return `
      <div class="skill-card tilt-card" onclick="openBookingModal('${teacherId}','${teacherName.replace(/'/g, "\\'")}','${skillId}','${skillName.replace(/'/g, "\\'")}',${price})">
        <div class="skill-card-top">
          <div class="skill-avatar ${gradClass}">
            ${avatar ? `<img src="${avatar}" alt="${teacherName}">` : initials}
            ${verified ? '<div class="verified-dot">✓</div>' : ''}
          </div>
          <div class="skill-card-info">
            <div class="skill-card-name">${teacherName}</div>
            <div class="skill-card-uni">${university || 'Independent Learner'}</div>
          </div>
        </div>
        <div class="skill-card-skill">${skillName}</div>
        <div class="skill-card-meta">
          <span class="skill-tag ${tagClass}">${category}</span>
          <div class="skill-card-stars">
            ${starsHtml}
            <span class="rating-num">${rating > 0 ? rating.toFixed(1) : '—'} (${reviewCount})</span>
          </div>
        </div>
        <div class="skill-card-bottom">
          <div class="skill-card-price">${priceHtml}</div>
          <button class="btn-primary btn-sm" onclick="event.stopPropagation();openBookingModal('${teacherId}','${teacherName.replace(/'/g, "\\'")}','${skillId}','${skillName.replace(/'/g, "\\'")}',${price})">Book Session</button>
        </div>
      </div>
    `;
  }

  // ── Skeletons ──
  function showSkeletons() {
    if (!grid) return;
    const count = 6;
    grid.innerHTML = Array.from({ length: count }, () => `
      <div class="skeleton-card">
        <div class="skel-top">
          <div class="skeleton skel-avatar"></div>
          <div class="skel-lines">
            <div class="skeleton skel-line w60"></div>
            <div class="skeleton skel-line w40"></div>
          </div>
        </div>
        <div class="skeleton skel-title"></div>
        <div class="skel-tags">
          <div class="skeleton skel-tag"></div>
          <div class="skeleton skel-tag" style="width:80px;"></div>
        </div>
        <div class="skel-bottom">
          <div class="skeleton skel-price"></div>
          <div class="skeleton skel-btn"></div>
        </div>
      </div>
    `).join('');
  }

})();
