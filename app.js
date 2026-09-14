// ==========================================================================
// DIGITAL ATELIER / EDITORIAL AI & SOFTWARE ENGINEER ENGINE
// Source of Truth: Google Stitch Project 6485024908093683440
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initCustomCursor();
  initScrollMeter();
  initMobileMenu();
  initHeroPhysicsCanvas();
  initGitHubHeatmap();
  initTelemetryFluctuations();
  initScrollspy();
  initCertLightbox();
  loadPortfolioData();
});

// --------------------------------------------------------------------------
// 1. CUSTOM TECHNICAL CURSOR
// --------------------------------------------------------------------------
function initCustomCursor() {
  const dot = document.getElementById('custom-cursor-dot');
  const ring = document.getElementById('custom-cursor-ring');

  if (!dot || !ring || window.matchMedia('(pointer: coarse)').matches) return;

  let mouseX = -100, mouseY = -100;
  let ringX = -100, ringY = -100;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.left = `${mouseX}px`;
    dot.style.top = `${mouseY}px`;
  });

  // Smooth trailing for the outer ring
  function renderCursorRing() {
    ringX += (mouseX - ringX) * 0.18;
    ringY += (mouseY - ringY) * 0.18;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;
    requestAnimationFrame(renderCursorRing);
  }
  requestAnimationFrame(renderCursorRing);

  // Hover states on interactive targets
  const interactiveSelector = 'a, button, input, textarea, .credential-row, .working-spotlight-card, .vault-cluster-card, .project-showcase-card, .step-card, .bento-telemetry-card';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(interactiveSelector)) {
      document.body.classList.add('cursor-hover');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(interactiveSelector)) {
      document.body.classList.remove('cursor-hover');
    }
  });
}

// --------------------------------------------------------------------------
// 2. TOP SCROLL PROGRESS METER
// --------------------------------------------------------------------------
function initScrollMeter() {
  const fill = document.getElementById('scroll-meter-fill');
  if (!fill) return;

  window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    fill.style.width = `${progress}%`;
  }, { passive: true });
}

// --------------------------------------------------------------------------
// 3. MOBILE NAVIGATION DRAWER
// --------------------------------------------------------------------------
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
    const icon = toggleBtn.querySelector('.material-symbols-outlined');
    if (icon) {
      icon.textContent = drawer.classList.contains('open') ? 'close' : 'menu';
    }
  });

  drawer.querySelectorAll('.mobile-nav-anchor').forEach(anchor => {
    anchor.addEventListener('click', () => {
      drawer.classList.remove('open');
      const icon = toggleBtn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = 'menu';
    });
  });
}

// --------------------------------------------------------------------------
// 4. HERO VECTOR FIELD PHYSICS CANVAS (REPULSION & GRAPH MESH)
// --------------------------------------------------------------------------
function initHeroPhysicsCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let mouse = { x: -1000, y: -1000, radius: 160 };

  const resize = () => {
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight;
  };
  window.addEventListener('resize', resize);
  resize();

  canvas.parentElement.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.parentElement.addEventListener('mouseleave', () => {
    mouse.x = -1000;
    mouse.y = -1000;
  });

  const nodes = [];
  const nodeCount = Math.min(Math.floor((width * height) / 14000), 75);

  for (let i = 0; i < nodeCount; i++) {
    const isSpecialHalo = i === 2 || i === 5;
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      baseRadius: isSpecialHalo ? 2.5 : (Math.random() > 0.85 ? 2.2 : 1.5),
      isAmber: isSpecialHalo || Math.random() > 0.75,
      hasHaloRing: isSpecialHalo || Math.random() > 0.93
    });
  }

  function drawHero() {
    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      // Mouse repulsion
      const dx = n.x - mouse.x;
      const dy = n.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < mouse.radius && dist > 0) {
        const force = (mouse.radius - dist) / mouse.radius;
        n.x += (dx / dist) * force * 3;
        n.y += (dy / dist) * force * 3;
      }

      // Connect nearby nodes
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const distBetween = Math.hypot(n.x - n2.x, n.y - n2.y);
        if (distBetween < 130) {
          const alpha = (1 - distBetween / 130) * 0.22;
          ctx.strokeStyle = n.isAmber || n2.isAmber
            ? `rgba(255, 185, 95, ${alpha * 1.5})`
            : `rgba(199, 198, 201, ${alpha})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }

      // Halo ring around orbital nodes
      if (n.hasHaloRing) {
        ctx.strokeStyle = 'rgba(255, 185, 95, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = n.isAmber ? '#ffb95f' : 'rgba(215, 218, 225, 0.65)';
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(drawHero);
  }
  requestAnimationFrame(drawHero);
}

// --------------------------------------------------------------------------
// 5. GITHUB CONTRIBUTION HEATMAP GENERATOR
// --------------------------------------------------------------------------
function initGitHubHeatmap() {
  const grid = document.getElementById('github-contrib-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const levels = ['lvl-0', 'lvl-1', 'lvl-2', 'lvl-3', 'lvl-4'];
  const weights = [0.35, 0.25, 0.2, 0.12, 0.08];

  // 28 columns * 7 days = 196 cells
  for (let i = 0; i < 196; i++) {
    const cell = document.createElement('div');
    const rand = Math.random();
    let lvl = 'lvl-0';
    let cumulative = 0;
    for (let w = 0; w < weights.length; w++) {
      cumulative += weights[w];
      if (rand < cumulative) {
        lvl = levels[w];
        break;
      }
    }
    cell.className = `heatmap-cell ${lvl}`;
    grid.appendChild(cell);
  }
}

// --------------------------------------------------------------------------
// 6. TELEMETRY MICRO-FLUCTUATIONS
// --------------------------------------------------------------------------
function initTelemetryFluctuations() {
  const latencyEl = document.getElementById('latency-counter');

  if (latencyEl) {
    setInterval(() => {
      const ms = 11 + Math.floor(Math.random() * 4);
      latencyEl.textContent = `${ms}ms`;
    }, 4000);
  }
}

// --------------------------------------------------------------------------
// 7. SCROLLSPY & NAVIGATION OBSERVER
// --------------------------------------------------------------------------
function initScrollspy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('#main-nav .nav-anchor');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('data-path') === id) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, { threshold: 0.25, rootMargin: '-50px 0px -50px 0px' });

  sections.forEach(s => observer.observe(s));
}

// --------------------------------------------------------------------------
// 8. CERTIFICATE LIGHTBOX MODAL
// --------------------------------------------------------------------------
function initCertLightbox() {
  const lightbox = document.getElementById('cert-lightbox');
  const lightboxImg = document.getElementById('cert-lightbox-img');
  const lightboxCaption = document.getElementById('cert-lightbox-caption');
  const closeBtn = document.getElementById('cert-lightbox-close');
  const backdrop = lightbox?.querySelector('.cert-lightbox-backdrop');

  if (!lightbox || !lightboxImg) return;

  document.addEventListener('click', (e) => {
    const card = e.target.closest('.cert-card');
    if (card) {
      let imgSrc = card.dataset.img || '';
      if (imgSrc.startsWith('public/')) imgSrc = imgSrc.substring(7);
      const title = card.dataset.title || '';
      const issuer = card.dataset.issuer || '';

      lightboxImg.src = imgSrc;
      lightboxCaption.innerHTML = `<strong>${title}</strong> &bull; ${issuer}`;
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  });

  const closeLightbox = () => {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  closeBtn?.addEventListener('click', closeLightbox);
  backdrop?.addEventListener('click', closeLightbox);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) {
      closeLightbox();
    }
  });
}

// --------------------------------------------------------------------------
// 9. LOAD REAL DATA LAYER (PORTFOLIO-DATA.JSON)
// --------------------------------------------------------------------------
function loadPortfolioData() {
  fetch('./portfolio-data.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load portfolio-data.json');
      return res.json();
    })
    .then(data => {
      bindPortfolioData(data);
    })
    .catch(err => {
      console.warn('Using static template fallback:', err);
    });
}

function bindPortfolioData(data) {
  if (!data) return;

  const personal = data.personal;
  if (personal) {
    if (personal.name) {
      document.title = `${personal.name} | Portfolio`;
      const logoEl = document.getElementById('logo-text');
      if (logoEl) logoEl.textContent = personal.name.toUpperCase();
    }

    if (personal.resumeUrl) {
      const resumeBtn = document.getElementById('resume-btn');
      if (resumeBtn) resumeBtn.href = personal.resumeUrl;
    }

    if (personal.socials?.email) {
      const contactBtn = document.getElementById('header-contact-btn');
      const emailBtn = document.getElementById('contact-email-btn');
      if (contactBtn) contactBtn.href = `mailto:${personal.socials.email}`;
      if (emailBtn) emailBtn.href = `mailto:${personal.socials.email}`;
    }

    if (personal.socials?.github) {
      const ghUser = personal.socials.github;
      const ghUrl = ghUser.startsWith('http') ? ghUser : `https://github.com/${ghUser}`;
      const footerGh = document.getElementById('footer-gh-link');
      if (footerGh) {
        footerGh.href = ghUrl;
        footerGh.textContent = `GITHUB: @${ghUser.replace('https://github.com/', '')}`;
      }
    }

    if (personal.socials?.linkedin) {
      const liUser = personal.socials.linkedin;
      const liUrl = liUser.startsWith('http') ? liUser : `https://${liUser}`;
      const footerLi = document.getElementById('footer-li-link');
      if (footerLi) footerLi.href = liUrl;
    }
  }

  // Bind Stats
  if (data.stats) {
    const lc = data.stats.leetcode;
    if (lc) {
      const lcRankEl = document.getElementById('leetcode-ranking');
      if (lcRankEl && lc.ranking) {
        lcRankEl.textContent = `Top ${lc.ranking.replace(/[^0-9%]/g, '') || '5%'}`;
      }
      const lcSolvedEl = document.getElementById('lc-solved-num');
      if (lcSolvedEl && lc.solved) {
        lcSolvedEl.textContent = lc.solved;
      }
      const lcEasyCount = document.getElementById('lc-easy-count');
      if (lcEasyCount && lc.easy && lc.easyTotal) {
        lcEasyCount.textContent = `${lc.easy} / ${lc.easyTotal}`;
      }
      const lcMedCount = document.getElementById('lc-med-count');
      if (lcMedCount && lc.medium && lc.mediumTotal) {
        lcMedCount.textContent = `${lc.medium} / ${lc.mediumTotal}`;
      }
      const lcHardCount = document.getElementById('lc-hard-count');
      if (lcHardCount && lc.hard && lc.hardTotal) {
        lcHardCount.textContent = `${lc.hard} / ${lc.hardTotal}`;
      }

      if (lc.skills) {
        const skillsContainer = document.getElementById('lc-skills-container');
        if (skillsContainer) {
          skillsContainer.innerHTML = '';
          const tiers = [
            { key: 'advanced', label: 'Advanced', dotClass: 'adv-dot' },
            { key: 'intermediate', label: 'Intermediate', dotClass: 'int-dot' },
            { key: 'fundamental', label: 'Fundamental', dotClass: 'fun-dot' }
          ];

          tiers.forEach(tier => {
            const items = lc.skills[tier.key] || [];
            if (items.length > 0) {
              const tierEl = document.createElement('div');
              tierEl.className = 'lc-skill-tier';
              const pillsHtml = items.map(item => `<span class="lc-skill-pill">${item.name} <span class="lc-count">x${item.count}</span></span>`).join('');

              tierEl.innerHTML = `
                <div class="lc-tier-label-wrap">
                  <span class="tier-dot ${tier.dotClass}"></span>
                  <span class="tier-name">${tier.label}</span>
                </div>
                <div class="lc-tier-pills">
                  ${pillsHtml}
                </div>
              `;
              skillsContainer.appendChild(tierEl);
            }
          });
        }
      }
    }

    const gh = data.stats.github;
    if (gh) {
      if (gh.contributionsYTD) {
        const ghEl = document.getElementById('github-contrib-ytd');
        if (ghEl) ghEl.innerHTML = `${gh.contributionsYTD}<span class="accent-amber-text">+</span>`;
      }
      if (gh.repos) {
        const reposEl = document.getElementById('github-repos');
        if (reposEl) reposEl.textContent = gh.repos;
      }
      if (gh.followers) {
        const followersEl = document.getElementById('github-followers');
        if (followersEl) followersEl.textContent = gh.followers;
      }
    }

    const codingHours = data.stats.codingHours;
    if (codingHours) {
      const hoursEl = document.getElementById('coding-hours-total');
      if (hoursEl && codingHours.total) {
        hoursEl.textContent = `${codingHours.total} Hrs`;
      }
    }
  }

  // Bind Certifications dynamically if needed
  if (data.certifications && data.certifications.length > 0) {
    const credContainer = document.getElementById('credentials-container');
    if (credContainer) {
      credContainer.innerHTML = '';
      let credIndex = 1;
      data.certifications.forEach(cat => {
        (cat.items || []).forEach(item => {
          const row = document.createElement('div');
          row.className = 'credential-row cert-card';
          row.dataset.img = item.imageUrl.replace(/^public\//, '');
          row.dataset.title = item.title;
          row.dataset.issuer = item.issuer;

          row.innerHTML = `
            <div class="cred-title-wrap">
              <span class="cred-idx">[0${credIndex}]</span>
              <span class="cred-name">${item.title}</span>
            </div>
            <div class="cred-issuer-wrap">
              <span>ISSUED: ${item.issuer}</span>
              <span class="cred-verified-badge">[VERIFIED ACCREDITATION]</span>
            </div>
          `;
          credContainer.appendChild(row);
          credIndex++;
        });
      });
    }
  }
}
