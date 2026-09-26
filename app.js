// ==========================================================================
// NATURE EXPEDITION PORTFOLIO & SCROLL ANIMATION ENGINE
// Source of Truth: Stitch Project 5247180114431518927
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initThemeModeSwitcher();
  initHeroPhysicsCanvas();
  initHeroMouseParallax();
  initScrollParallax();
  initScrollReveal();
  initNavigationScrollspy();
  initMobileMenu();
  initGitHubHeatmap();
  initStatsCounter();
  initCertLightbox();
  loadPortfolioData();
});

// --------------------------------------------------------------------------
// 1. NATURE THEME MODE SWITCHER (Mountain & Forest Modes)
// --------------------------------------------------------------------------
function initThemeModeSwitcher() {
  const btnMountain = document.getElementById('btn-theme-mountain');
  const btnForest = document.getElementById('btn-theme-forest');
  const body = document.body;
  const heroMountain = document.getElementById('hero-img-mountain');
  const heroForest = document.getElementById('hero-img-forest');

  const THEME_KEY = 'portfolio_nature_theme';

  function applyTheme(theme) {
    if (theme === 'forest') {
      body.classList.add('theme-forest');
      if (btnForest) {
        btnForest.classList.add('active');
        btnForest.setAttribute('aria-checked', 'true');
      }
      if (btnMountain) {
        btnMountain.classList.remove('active');
        btnMountain.setAttribute('aria-checked', 'false');
      }
      if (heroForest) {
        heroForest.style.opacity = '0.45';
        heroForest.style.pointerEvents = 'none';
      }
      if (heroMountain) {
        heroMountain.style.opacity = '0';
        heroMountain.style.pointerEvents = 'none';
      }
    } else {
      body.classList.remove('theme-forest');
      if (btnMountain) {
        btnMountain.classList.add('active');
        btnMountain.setAttribute('aria-checked', 'true');
      }
      if (btnForest) {
        btnForest.classList.remove('active');
        btnForest.setAttribute('aria-checked', 'false');
      }
      if (heroMountain) {
        heroMountain.style.opacity = '0.45';
        heroMountain.style.pointerEvents = 'none';
      }
      if (heroForest) {
        heroForest.style.opacity = '0';
        heroForest.style.pointerEvents = 'none';
      }
    }
  }

  // Load saved theme or default to Mountain
  const savedTheme = localStorage.getItem(THEME_KEY) || 'mountain';
  applyTheme(savedTheme);

  btnMountain?.addEventListener('click', () => {
    applyTheme('mountain');
    localStorage.setItem(THEME_KEY, 'mountain');
  });

  btnForest?.addEventListener('click', () => {
    applyTheme('forest');
    localStorage.setItem(THEME_KEY, 'forest');
  });
}

// --------------------------------------------------------------------------
// 2. HERO SUBTLE MOUSE PARALLAX (Natural Drift: 2-4px)
// --------------------------------------------------------------------------
function initHeroMouseParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768) return;

  const root = document.documentElement;
  const heroSection = document.getElementById('hero');
  if (!heroSection) return;

  let mouseX = 0;
  let mouseY = 0;
  let currentX = 0;
  let currentY = 0;
  let isHovering = false;
  let rafId = null;

  heroSection.addEventListener('mouseenter', () => {
    isHovering = true;
    if (!rafId) animateMouseDrift();
  });

  heroSection.addEventListener('mousemove', (e) => {
    const rect = heroSection.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const relX = e.clientX - rect.left - centerX;
    const relY = e.clientY - rect.top - centerY;

    // Shift of 2-4px max
    mouseX = (relX / centerX) * 4;
    mouseY = (relY / centerY) * 4;
  });

  heroSection.addEventListener('mouseleave', () => {
    isHovering = false;
    mouseX = 0;
    mouseY = 0;
  });

  function animateMouseDrift() {
    currentX += (mouseX - currentX) * 0.06;
    currentY += (mouseY - currentY) * 0.06;

    root.style.setProperty('--mouse-shift-x', `${currentX.toFixed(2)}px`);
    root.style.setProperty('--mouse-shift-y', `${currentY.toFixed(2)}px`);

    if (isHovering || Math.abs(currentX) > 0.01 || Math.abs(currentY) > 0.01) {
      rafId = requestAnimationFrame(animateMouseDrift);
    } else {
      root.style.setProperty('--mouse-shift-x', '0px');
      root.style.setProperty('--mouse-shift-y', '0px');
      rafId = null;
    }
  }
}

// --------------------------------------------------------------------------
// 3. HERO CINEMATIC PARALLAX, TRAIL METER & PROGRESSIVE DRAW
// --------------------------------------------------------------------------
function initScrollParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  const expTimeline = document.getElementById('experience-timeline');
  let ticking = false;

  function updateParallax() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollHeight > 0 ? (scrollY / scrollHeight) * 100 : 0;

    // Update trail progress meter in HUD
    root.style.setProperty('--scroll-progress', `${progress.toFixed(2)}%`);

    // Hero Layered Parallax (only near top)
    if (scrollY < window.innerHeight * 1.5) {
      const bgY = scrollY * 0.22;
      const textY = scrollY * 0.12;
      const opacity = Math.max(0, 1 - (scrollY / (window.innerHeight * 0.85)));

      root.style.setProperty('--hero-bg-y', `${bgY.toFixed(1)}px`);
      root.style.setProperty('--hero-text-y', `${textY.toFixed(1)}px`);
      root.style.setProperty('--hero-opacity', opacity.toFixed(3));
    }

    // Experience Trail connecting line drawing progression
    if (expTimeline) {
      const rect = expTimeline.getBoundingClientRect();
      const windowH = window.innerHeight;
      if (rect.top < windowH && rect.bottom > 0) {
        const drawPercent = Math.min(100, Math.max(0, ((windowH * 0.8 - rect.top) / rect.height) * 100));
        const progLine = expTimeline.querySelector('.trail-timeline-progress');
        if (progLine) {
          progLine.style.height = `${drawPercent}%`;
        }
      }
    }

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });

  updateParallax();
}

// --------------------------------------------------------------------------
// 4. GLOBAL SCROLL REVEAL & SECTION ON-VIEW APPEAR OBSERVER
// --------------------------------------------------------------------------
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  const sections = document.querySelectorAll('section[id], footer[id]');

  // Reduced motion check
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealElements.forEach(el => el.classList.add('is-revealed'));
    sections.forEach(s => s.classList.add('is-revealed', 'section-visible'));
    return;
  }

  // 1. Element-level reveals
  const elementObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => elementObserver.observe(el));

  // 2. Section-level view-appear observer
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed', 'section-visible');
      }
    });
  }, {
    threshold: 0.05,
    rootMargin: '0px 0px -50px 0px'
  });

  sections.forEach(s => sectionObserver.observe(s));
}

// --------------------------------------------------------------------------
// 4. STATS NUMERIC COUNT-UP & HEATMAP CASCADE ANIMATION
// --------------------------------------------------------------------------
function initStatsCounter() {
  const statsSection = document.getElementById('stats');
  if (!statsSection) return;

  let hasAnimated = false;

  function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
  }

  function animateValue(el, start, end, duration, formatFn) {
    if (!el) return;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const current = Math.floor(start + (end - start) * eased);

      el.textContent = formatFn ? formatFn(current) : current;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatFn ? formatFn(end) : end;
      }
    }
    requestAnimationFrame(step);
  }

  function runStatsAnimation() {
    if (hasAnimated) return;
    hasAnimated = true;

    // Reduced motion check
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // 1. LeetCode Solved Count
    const lcSolvedEl = document.getElementById('lc-solved-num');
    if (lcSolvedEl) {
      const target = parseInt(lcSolvedEl.getAttribute('data-count') || '517', 10);
      animateValue(lcSolvedEl, 0, target, 1400, val => `${val} Solved`);
    }

    // 2. LeetCode Easy/Medium/Hard Breakdown
    const easyEl = document.getElementById('lc-easy-count');
    if (easyEl) {
      const solved = parseInt(easyEl.getAttribute('data-solved') || '232', 10);
      const total = easyEl.getAttribute('data-total') || '962';
      animateValue(easyEl, 0, solved, 1200, val => `${val} / ${total}`);
    }

    const medEl = document.getElementById('lc-med-count');
    if (medEl) {
      const solved = parseInt(medEl.getAttribute('data-solved') || '253', 10);
      const total = medEl.getAttribute('data-total') || '2109';
      animateValue(medEl, 0, solved, 1300, val => `${val} / ${total}`);
    }

    const hardEl = document.getElementById('lc-hard-count');
    if (hardEl) {
      const solved = parseInt(hardEl.getAttribute('data-solved') || '32', 10);
      const total = hardEl.getAttribute('data-total') || '971';
      animateValue(hardEl, 0, solved, 1400, val => `${val} / ${total}`);
    }

    // 3. GitHub Metrics
    const ghContribEl = document.getElementById('github-contrib-ytd');
    if (ghContribEl) {
      const target = parseInt(ghContribEl.getAttribute('data-count') || '579', 10);
      animateValue(ghContribEl, 0, target, 1400, val => `${val}+`);
    }

    const ghReposEl = document.getElementById('github-repos');
    if (ghReposEl) {
      const target = parseInt(ghReposEl.getAttribute('data-count') || '48', 10);
      animateValue(ghReposEl, 0, target, 1100, val => `${val}`);
    }

    const ghFollowersEl = document.getElementById('github-followers');
    if (ghFollowersEl) {
      const target = parseInt(ghFollowersEl.getAttribute('data-count') || '13', 10);
      animateValue(ghFollowersEl, 0, target, 1000, val => `${val}`);
    }

    // 4. Coding Hours
    const hoursEl = document.getElementById('coding-hours-total');
    if (hoursEl) {
      const target = parseInt(hoursEl.getAttribute('data-count') || '850', 10);
      animateValue(hoursEl, 0, target, 1500, val => `${val}+ Hrs`);
    }
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        runStatsAnimation();
      }
    });
  }, { threshold: 0.2 });

  observer.observe(statsSection);
}

// --------------------------------------------------------------------------
// 5. HERO CONSTELLATION & VECTOR PHYSICS CANVAS
// --------------------------------------------------------------------------
function initHeroPhysicsCanvas() {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height;
  let mouse = { x: -1000, y: -1000, radius: 150 };

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
  const nodeCount = Math.min(Math.floor((width * height) / 16000), 65);

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      baseRadius: Math.random() > 0.8 ? 2.2 : 1.4
    });
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);

    const isForest = document.body.classList.contains('theme-forest');
    const nodeColor = isForest ? 'rgba(134, 239, 172, 0.7)' : 'rgba(147, 197, 253, 0.7)';
    const lineColor = isForest ? 'rgba(74, 222, 128, ' : 'rgba(96, 165, 250, ';

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      // Mouse interactive repulsion force
      const dx = n.x - mouse.x;
      const dy = n.y - mouse.y;
      const dist = Math.hypot(dx, dy);
      if (dist < mouse.radius && dist > 0) {
        const force = (mouse.radius - dist) / mouse.radius;
        n.x += (dx / dist) * force * 2.5;
        n.y += (dy / dist) * force * 2.5;
      }

      // Connect nearby nodes
      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const distBetween = Math.hypot(n.x - n2.x, n.y - n2.y);
        if (distBetween < 120) {
          const alpha = (1 - distBetween / 120) * 0.2;
          ctx.strokeStyle = `${lineColor}${alpha})`;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }

      ctx.fillStyle = nodeColor;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}

// --------------------------------------------------------------------------
// 6. NAVIGATION SCROLLSPY
// --------------------------------------------------------------------------
function initNavigationScrollspy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('#main-nav .hud-link');
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
  }, { threshold: 0.25, rootMargin: '-70px 0px -50px 0px' });

  sections.forEach(s => observer.observe(s));
}

// --------------------------------------------------------------------------
// 7. MOBILE NAVIGATION DRAWER
// --------------------------------------------------------------------------
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const drawer = document.getElementById('mobile-drawer');
  if (!toggleBtn || !drawer) return;

  toggleBtn.addEventListener('click', () => {
    drawer.classList.toggle('open');
  });

  drawer.querySelectorAll('.mobile-nav-link').forEach(anchor => {
    anchor.addEventListener('click', () => {
      drawer.classList.remove('open');
    });
  });

  document.addEventListener('click', (e) => {
    if (!drawer.contains(e.target) && !toggleBtn.contains(e.target) && drawer.classList.contains('open')) {
      drawer.classList.remove('open');
    }
  });
}

// --------------------------------------------------------------------------
// 8. GITHUB CONTRIBUTION HEATMAP GENERATOR (Cascading Reveal)
// --------------------------------------------------------------------------
function initGitHubHeatmap() {
  const grid = document.getElementById('github-contrib-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const levels = ['lvl-0', 'lvl-1', 'lvl-2', 'lvl-3', 'lvl-4'];
  const weights = [0.3, 0.28, 0.22, 0.12, 0.08];

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

    // Cascading stagger transition delay across the heatmap grid
    const col = Math.floor(i / 7);
    const row = i % 7;
    cell.style.transitionDelay = `${(col * 14 + row * 18)}ms`;

    grid.appendChild(cell);
  }
}

// --------------------------------------------------------------------------
// 9. CERTIFICATE LIGHTBOX MODAL
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
// 10. DYNAMIC DATA BINDING (PORTFOLIO-DATA.JSON)
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
      console.log('Using static content as base:', err.message);
    });
}

function bindPortfolioData(data) {
  if (!data) return;

  const personal = data.personal;
  if (personal) {
    if (personal.name) {
      document.title = `${personal.name} — Software Engineer Portfolio`;
      const logoEl = document.getElementById('logo-text');
      if (logoEl) logoEl.textContent = personal.name.toUpperCase();
      const heroCallsign = document.getElementById('hero-name-callsign');
      if (heroCallsign) heroCallsign.textContent = personal.name.toUpperCase();
      const aboutSpecName = document.getElementById('about-spec-name');
      if (aboutSpecName) aboutSpecName.textContent = `NAME: ${personal.name.toUpperCase()}`;
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
        footerGh.textContent = `[ GITHUB: @${ghUser.replace('https://github.com/', '')} ]`;
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
      const heroLcRank = document.getElementById('hero-lc-rank');
      if (heroLcRank && lc.ranking) {
        heroLcRank.textContent = `LEETCODE TOP ${lc.ranking.replace(/[^0-9%]/g, '') || '5%'}`;
      }
      const heroLcSolved = document.getElementById('hero-lc-solved');
      if (heroLcSolved && lc.solved) {
        heroLcSolved.textContent = `${lc.solved}+ PROBLEMS SOLVED`;
      }

      const lcRankEl = document.getElementById('leetcode-ranking');
      if (lcRankEl && lc.ranking) {
        lcRankEl.textContent = `Top ${lc.ranking.replace(/[^0-9%]/g, '') || '5%'}`;
      }
      const lcSolvedEl = document.getElementById('lc-solved-num');
      if (lcSolvedEl && lc.solved) {
        lcSolvedEl.setAttribute('data-count', lc.solved);
        lcSolvedEl.textContent = `${lc.solved} Solved`;
      }
      const lcEasyCount = document.getElementById('lc-easy-count');
      if (lcEasyCount && lc.easy && lc.easyTotal) {
        lcEasyCount.setAttribute('data-solved', lc.easy);
        lcEasyCount.setAttribute('data-total', lc.easyTotal);
        lcEasyCount.textContent = `${lc.easy} / ${lc.easyTotal}`;
      }
      const lcMedCount = document.getElementById('lc-med-count');
      if (lcMedCount && lc.medium && lc.mediumTotal) {
        lcMedCount.setAttribute('data-solved', lc.medium);
        lcMedCount.setAttribute('data-total', lc.mediumTotal);
        lcMedCount.textContent = `${lc.medium} / ${lc.mediumTotal}`;
      }
      const lcHardCount = document.getElementById('lc-hard-count');
      if (lcHardCount && lc.hard && lc.hardTotal) {
        lcHardCount.setAttribute('data-solved', lc.hard);
        lcHardCount.setAttribute('data-total', lc.hardTotal);
        lcHardCount.textContent = `${lc.hard} / ${lc.hardTotal}`;
      }

      if (lc.skills) {
        const skillsContainer = document.getElementById('lc-skills-container');
        if (skillsContainer) {
          skillsContainer.innerHTML = '';
          const tiers = [
            { key: 'advanced', label: 'Advanced' },
            { key: 'intermediate', label: 'Intermediate' },
            { key: 'fundamental', label: 'Fundamental' }
          ];

          tiers.forEach(tier => {
            const items = lc.skills[tier.key] || [];
            if (items.length > 0) {
              const tierEl = document.createElement('div');
              tierEl.className = 'topic-tier';
              const pillsHtml = items.map(item => `<span class="topic-pill">${item.name} x${item.count}</span>`).join('');

              tierEl.innerHTML = `
                <span class="topic-tier-label">${tier.label}</span>
                <div class="topic-pills-row">
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
        if (ghEl) {
          ghEl.setAttribute('data-count', gh.contributionsYTD);
          ghEl.textContent = `${gh.contributionsYTD}+`;
        }
      }
      if (gh.repos) {
        const reposEl = document.getElementById('github-repos');
        if (reposEl) {
          reposEl.setAttribute('data-count', gh.repos);
          reposEl.textContent = `${gh.repos}`;
        }
      }
      if (gh.followers) {
        const followersEl = document.getElementById('github-followers');
        if (followersEl) {
          followersEl.setAttribute('data-count', gh.followers);
          followersEl.textContent = `${gh.followers}`;
        }
      }
    }

    const codingHours = data.stats.codingHours;
    if (codingHours) {
      const hoursEl = document.getElementById('coding-hours-total');
      if (hoursEl && codingHours.total) {
        const cleanHours = codingHours.total.replace(/[^0-9]/g, '');
        hoursEl.setAttribute('data-count', cleanHours || '850');
        hoursEl.textContent = `${codingHours.total} Hrs`;
      }
    }
  }

  // Bind Certifications dynamically if present
  if (data.certifications && data.certifications.length > 0) {
    const credContainer = document.getElementById('credentials-container');
    if (credContainer) {
      credContainer.innerHTML = '';
      let credIndex = 1;
      data.certifications.forEach(cat => {
        (cat.items || []).forEach(item => {
          const card = document.createElement('div');
          card.className = `card-surface cert-card reveal-on-scroll reveal-stagger-${credIndex % 4}`;
          card.dataset.img = item.imageUrl.replace(/^public\//, '');
          card.dataset.title = item.title;
          card.dataset.issuer = item.issuer;

          card.innerHTML = `
            <span class="cert-idx">[0${credIndex}]</span>
            <h4 class="cert-title">${item.title}</h4>
            <div class="cert-issuer-row">
              <span>ISSUED: ${item.issuer} </span>
              <span class="cert-verified">[VERIFIED ACCREDITATION]</span>
            </div>
          `;
          credContainer.appendChild(card);
          credIndex++;
        });
      });
      // Re-init reveal observer for dynamic elements
      initScrollReveal();
    }
  }
}
