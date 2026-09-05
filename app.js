document.addEventListener('DOMContentLoaded', () => {
  // Theme Management
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');
  const body = document.body;

  // Initialize theme from localStorage or system preference
  const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  setTheme(savedTheme);

  themeToggle.addEventListener('click', () => {
    const newTheme = body.classList.contains('light-mode') ? 'dark' : 'light';
    setTheme(newTheme);
  });

  function setTheme(theme) {
    if (theme === 'dark') {
      body.classList.remove('light-mode');
      body.classList.add('dark-mode');
      themeIcon.textContent = 'light_mode';
    } else {
      body.classList.remove('dark-mode');
      body.classList.add('light-mode');
      themeIcon.textContent = 'dark_mode';
    }
    localStorage.setItem('theme', theme);
  }

  // Mobile Menu Drawer
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  mobileMenuToggle.addEventListener('click', () => {
    mobileDrawer.classList.toggle('open');
    const icon = mobileMenuToggle.querySelector('span');
    icon.textContent = mobileDrawer.classList.contains('open') ? 'close' : 'menu';
  });

  // Close mobile drawer when clicking a link
  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      mobileDrawer.classList.remove('open');
      mobileMenuToggle.querySelector('span').textContent = 'menu';
    });
  });

  // Fetch and Render Portfolio Data
  fetch('./portfolio-data.json')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load portfolio-data.json');
      return res.json();
    })
    .then(data => {
      renderPortfolio(data);
      initScrollAnimations();
    })
    .catch(err => {
      console.error('Error rendering portfolio:', err);
    });
});

function renderPortfolio(data) {
  // 1. Personal / Hero Details
  const personal = data.personal;
  document.title = `${personal.name} | Portfolio`;
  document.getElementById('logo-text').textContent = `${personal.name}`;
  document.getElementById('footer-logo').textContent = `${personal.name}`;

  document.getElementById('hero-badge').textContent = personal.badge;
  document.getElementById('hero-title').innerHTML = `Hi, I'm <span class="highlight">${personal.name}</span>`;
  document.getElementById('hero-subtitle').textContent = personal.subtitle;
  document.getElementById('hero-bio').textContent = personal.bio;

  // Set Hero Avatar
  const avatarContainer = document.getElementById('hero-avatar-container');
  const avatarImg = personal.avatarUrl || personal.avatar;
  if (avatarContainer) {
    const existingAvatar = avatarContainer.querySelector('.hero-avatar');
    if (existingAvatar) {
      existingAvatar.remove();
    }
    if (avatarImg) {
      let resolvedAvatar = avatarImg;
      if (resolvedAvatar.startsWith('public/')) {
        resolvedAvatar = resolvedAvatar.substring(7);
      } else if (resolvedAvatar.startsWith('/public/')) {
        resolvedAvatar = resolvedAvatar.substring(8);
      } else if (resolvedAvatar.startsWith('./public/')) {
        resolvedAvatar = resolvedAvatar.substring(9);
      }

      // Add avatar image
      const imgEl = document.createElement('img');
      imgEl.src = resolvedAvatar;
      imgEl.alt = personal.name;
      imgEl.className = 'hero-avatar';
      avatarContainer.appendChild(imgEl);
    }
  }

  // Set Resume Links
  const resumeBtn = document.getElementById('resume-btn');
  const resumeBtnMobile = document.getElementById('resume-btn-mobile');
  if (personal.resumeUrl) {
    resumeBtn.href = personal.resumeUrl;
    resumeBtnMobile.href = personal.resumeUrl;
  }

  // Set Email/Contact Button
  const contactBtn = document.getElementById('hero-contact-btn');
  if (personal.socials?.email) {
    contactBtn.href = `mailto:${personal.socials.email}`;
  }

  // 2. About Section
  document.getElementById('about-text').textContent = personal.about;

  // Render Highlight Cards (GPA, Degree, University based on templates)
  const highlightsContainer = document.getElementById('about-highlights-container');
  highlightsContainer.innerHTML = '';

  const highlights = [
    { icon: 'school', title: 'Education', value: 'B.Tech in Computer Science' },
    { icon: 'military_tech', title: 'Academic Performance', value: 'GPA: 9.41 / 10.0' },
    { icon: 'calendar_today', title: 'Graduation Year', value: 'Batch of 2027' }
  ];

  highlights.forEach(h => {
    const card = document.createElement('div');
    card.className = 'highlight-card reveal';
    card.innerHTML = `
      <div class="highlight-icon-wrapper">
        <span class="material-symbols-outlined">${h.icon}</span>
      </div>
      <div class="highlight-info">
        <h4>${h.title}</h4>
        <p>${h.value}</p>
      </div>
    `;
    highlightsContainer.appendChild(card);
  });

  // 3. Work Experience Timeline
  const experienceTimeline = document.getElementById('experience-timeline');
  experienceTimeline.innerHTML = '';

  data.experience.forEach((exp, idx) => {
    const item = document.createElement('div');
    item.className = `timeline-item reveal ${idx === 0 ? 'active' : ''}`;

    const pointsList = exp.points.map(pt => `<li>${pt}</li>`).join('');

    let logoPath = exp.logoUrl;
    if (logoPath) {
      if (logoPath.startsWith('public/')) {
        logoPath = logoPath.substring(7);
      } else if (logoPath.startsWith('/public/')) {
        logoPath = logoPath.substring(8);
      } else if (logoPath.startsWith('./public/')) {
        logoPath = logoPath.substring(9);
      }
    }

    let companyHtml = '';
    if (logoPath) {
      companyHtml = `
        <a class="timeline-company-link" href="${exp.companyUrl || '#'}" target="_blank">
          <img src="${logoPath}" alt="${exp.company}" class="timeline-company-logo" width="42" height="42" />
          <div>
            <div class="timeline-company-name">${exp.company}</div>
            <div class="timeline-company-sub">${exp.companySub || ''}</div>
          </div>
        </a>
      `;
    } else {
      companyHtml = `<span class="timeline-company">${exp.company}</span>`;
    }

    item.innerHTML = `
      <div class="timeline-node"></div>
      <div class="timeline-header">
        <div class="timeline-title-group">
          <h3>${exp.role}</h3>
          ${companyHtml}
        </div>
        <span class="timeline-duration">${exp.duration}</span>
      </div>
      <ul class="timeline-points">
        ${pointsList}
      </ul>
    `;
    experienceTimeline.appendChild(item);
  });

  // 4. Featured Projects
  const projectsContainer = document.getElementById('projects-container');
  projectsContainer.innerHTML = '';

  data.projects.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'project-card reveal';

    const tagsHtml = proj.technologies.map(t => `<span class="tech-tag">${t}</span>`).join('');

    let linksHtml = '';
    if (proj.codeUrl) {
      linksHtml += `<a class="project-link-icon" href="${proj.codeUrl}" target="_blank" aria-label="View Code"><span class="material-symbols-outlined">code</span></a>`;
    }
    if (proj.liveUrl && proj.liveUrl !== '#') {
      linksHtml += `<a class="project-link-icon" href="${proj.liveUrl}" target="_blank" aria-label="Live Demo"><span class="material-symbols-outlined">open_in_new</span></a>`;
    }

    let projectImg = proj.imageUrl || proj.image;
    if (projectImg) {
      if (projectImg.startsWith('public/')) {
        projectImg = projectImg.substring(7);
      } else if (projectImg.startsWith('/public/')) {
        projectImg = projectImg.substring(8);
      } else if (projectImg.startsWith('./public/')) {
        projectImg = projectImg.substring(9);
      }
    }

    if (projectImg) {
      const isLogo = projectImg.toLowerCase().includes('logo') || proj.title.toLowerCase().includes('foundation');
      card.innerHTML = `
        <div class="project-image-wrapper ${isLogo ? 'is-logo-wrapper' : ''}">
          <img src="${projectImg}" alt="${proj.title}" class="project-image ${isLogo ? 'is-logo' : ''}" loading="lazy" />
          <div class="project-image-overlay">
            ${linksHtml}
          </div>
        </div>
        <div class="project-card-content">
          <h3>${proj.title}</h3>
          <p class="project-desc">${proj.description}</p>
          <div class="project-tags">
            ${tagsHtml}
          </div>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="project-card-content">
          <div class="project-card-header">
            <span class="material-symbols-outlined folder-icon">folder_open</span>
            <div class="project-links">
              ${linksHtml}
            </div>
          </div>
          <h3>${proj.title}</h3>
          <p class="project-desc">${proj.description}</p>
          <div class="project-tags">
            ${tagsHtml}
          </div>
        </div>
      `;
    }
    projectsContainer.appendChild(card);
  });

  // 5. Skills Section
  const skillsContainer = document.getElementById('skills-container');
  skillsContainer.innerHTML = '';

  const skillCategories = [
    { title: 'Languages', key: 'languages' },
    { title: 'Frameworks & Libraries', key: 'frameworks' },
    { title: 'Tools & Platforms', key: 'tools' }
  ];

  skillCategories.forEach(cat => {
    if (data.skills[cat.key] && data.skills[cat.key].length > 0) {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'skill-category reveal';

      const pillsHtml = data.skills[cat.key].map(skill => `<span class="skill-pill">${skill}</span>`).join('');

      categoryDiv.innerHTML = `
        <h3>${cat.title}</h3>
        <div class="skills-list-pills">
          ${pillsHtml}
        </div>
      `;
      skillsContainer.appendChild(categoryDiv);
    }
  });

  // 6. Certifications Section
  if (data.certifications) {
    renderCertifications(data.certifications);
  }

  // 7. Statistics Bento Grid
  // LeetCode Card
  const lc = data.stats.leetcode;
  document.getElementById('leetcode-ranking').textContent = lc.ranking;
  document.getElementById('lc-solved-num').textContent = lc.solved;
  document.getElementById('lc-easy-count').textContent = `${lc.easy}/${lc.easyTotal}`;
  document.getElementById('lc-med-count').textContent = `${lc.medium}/${lc.mediumTotal}`;
  document.getElementById('lc-hard-count').textContent = `${lc.hard}/${lc.hardTotal}`;

  // Calculate LeetCode Bar Percentages
  const easyPct = lc.easyTotal > 0 ? (lc.easy / lc.easyTotal) * 100 : 0;
  const medPct = lc.mediumTotal > 0 ? (lc.medium / lc.mediumTotal) * 100 : 0;
  const hardPct = lc.hardTotal > 0 ? (lc.hard / lc.hardTotal) * 100 : 0;

  document.getElementById('lc-easy-bar').style.width = `${easyPct}%`;
  document.getElementById('lc-med-bar').style.width = `${medPct}%`;
  document.getElementById('lc-hard-bar').style.width = `${hardPct}%`;

  // Single Overall Progress Ring for Leetcode
  const overallPct = lc.totalQuestions > 0 ? (lc.solved / lc.totalQuestions) * 100 : 0;
  const rOverall = 40;
  const cOverall = 2 * Math.PI * rOverall;

  const circleOverall = document.getElementById('lc-progress-circle');
  circleOverall.setAttribute('r', rOverall);
  circleOverall.style.strokeDasharray = `${cOverall} ${cOverall}`;
  circleOverall.style.strokeDashoffset = cOverall; // Start fully hidden

  // Trigger animation after loaded using timeout
  setTimeout(() => {
    circleOverall.style.strokeDashoffset = cOverall - (overallPct / 100) * cOverall;
  }, 300);

  // GitHub Card
  const gh = data.stats.github;
  document.getElementById('github-contrib-ytd').textContent = gh.contributionsYTD.toLocaleString();
  document.getElementById('github-repos').textContent = gh.repos;

  if (personal.socials?.github) {
    const ghLink = document.getElementById('github-link');
    const ghUser = personal.socials.github;
    ghLink.href = ghUser.startsWith('http') ? ghUser : `https://github.com/${ghUser}`;
  }

  // Generate Simulated GitHub Contributions Calendar heat cells (80 cells)
  const calendarGrid = document.getElementById('github-contrib-grid');
  calendarGrid.innerHTML = '';

  // Base representation: we distribute contributions among 80 days
  // More contributions YTD -> higher average levels
  const avgIntensity = Math.min(4, Math.max(0, Math.floor(gh.contributionsYTD / 250)));

  for (let i = 0; i < 80; i++) {
    const cell = document.createElement('div');
    cell.className = 'contrib-cell';

    // Simulate intensity organically
    // level 0: empty, 1: low, 2: medium-low, 3: medium-high, 4: high
    let level = 0;
    const rand = Math.random();

    if (rand < 0.2) level = 0;
    else if (rand < 0.5) level = Math.max(0, avgIntensity - 1);
    else if (rand < 0.8) level = avgIntensity;
    else level = Math.min(4, avgIntensity + 1);

    cell.classList.add(`contrib-level-${level}`);

    // Add title attribute for tooltip
    const dateMock = new Date();
    dateMock.setDate(dateMock.getDate() - (80 - i));
    const formattedDate = dateMock.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const contributionsMock = level === 0 ? 'No' : level * 2 + Math.floor(Math.random() * 3);
    cell.title = `${contributionsMock} contributions on ${formattedDate}`;

    calendarGrid.appendChild(cell);
  }

  // Coding Hours Card
  const hours = data.stats.codingHours;
  document.getElementById('coding-hours-total').textContent = hours.total;

  const langsContainer = document.getElementById('langs-progress-container');
  langsContainer.innerHTML = '';

  hours.languages.forEach(lang => {
    const item = document.createElement('div');
    item.className = 'lang-stat-item';
    item.innerHTML = `
      <div class="lang-label-group">
        <span>${lang.name}</span>
        <span class="lang-percentage">${lang.percentage}%</span>
      </div>
      <div class="lang-track">
        <div class="lang-fill" style="width: 0%"></div>
      </div>
    `;
    langsContainer.appendChild(item);

    // Trigger progress fill animation
    setTimeout(() => {
      item.querySelector('.lang-fill').style.width = `${lang.percentage}%`;
    }, 400);
  });

  // 7. Footer Social Links
  const footerSocials = document.getElementById('footer-socials-list');
  footerSocials.innerHTML = '';

  const socials = [
    { name: 'LinkedIn', url: personal.socials?.linkedin ? (personal.socials.linkedin.startsWith('http') ? personal.socials.linkedin : `https://${personal.socials.linkedin}`) : null, active: !!personal.socials?.linkedin && personal.socials.linkedin !== '#' },
    { name: 'GitHub', url: personal.socials?.github ? (personal.socials.github.startsWith('http') ? personal.socials.github : `https://github.com/${personal.socials.github}`) : null, active: !!personal.socials?.github },
    { name: 'LeetCode', url: personal.socials?.leetcode ? (personal.socials.leetcode.startsWith('http') ? personal.socials.leetcode : `https://leetcode.com/u/${personal.socials.leetcode}`) : null, active: !!personal.socials?.leetcode },
    { name: 'Twitter', url: personal.socials?.twitter, active: !!personal.socials?.twitter && personal.socials.twitter !== '#' },
    { name: 'Email', url: personal.socials?.email ? `mailto:${personal.socials.email}` : null, active: !!personal.socials?.email }
  ];

  socials.forEach(s => {
    if (s.active && s.url) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.name}</a>`;
      footerSocials.appendChild(li);
    }
  });
}

function initScrollAnimations() {
  // Intersection Observer for scroll reveal effect
  const revealElements = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        // Once revealed, no need to track it anymore
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => observer.observe(el));

  // Scrollspy for navbar highlights
  const sections = document.querySelectorAll('section[id], header[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 100;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    // Fallback to active hero if scroll is at the very top
    if (scrollY < 100) {
      current = 'hero';
    }

    navLinks.forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href').substring(1);

      // If we are at hero, highlight about or none
      if (href === current) {
        link.classList.add('active');
      } else if (current === 'hero' && href === 'about') {
        // Highlight about by default when at top as starting point
      }
    });
  });
}

function renderCertifications(certifications) {
  const tabsContainer = document.getElementById('cert-tabs-container');
  const contentContainer = document.getElementById('cert-content-container');
  if (!tabsContainer || !contentContainer || !certifications || certifications.length === 0) return;

  tabsContainer.innerHTML = '';
  contentContainer.innerHTML = '';

  // Render Tabs & Panels
  certifications.forEach((cat, index) => {
    const isFirst = index === 0;

    // Tab Button
    const tabBtn = document.createElement('button');
    tabBtn.className = `cert-tab-btn ${isFirst ? 'active' : ''}`;
    tabBtn.dataset.target = cat.id;
    tabBtn.innerHTML = `
      <span class="material-symbols-outlined">${cat.icon || 'workspace_premium'}</span>
      <span>${cat.category}</span>
    `;
    tabsContainer.appendChild(tabBtn);

    // Panel
    const panel = document.createElement('div');
    panel.className = `cert-panel ${isFirst ? 'active slide-in' : ''}`;
    panel.id = `cert-panel-${cat.id}`;

    const cardsHtml = cat.items.map(cert => {
      let imgPath = cert.imageUrl || cert.image;
      if (imgPath) {
        if (imgPath.startsWith('public/')) imgPath = imgPath.substring(7);
        else if (imgPath.startsWith('/public/')) imgPath = imgPath.substring(8);
        else if (imgPath.startsWith('./public/')) imgPath = imgPath.substring(9);
      }

      return `
        <div class="cert-card" data-img="${imgPath}" data-title="${cert.title}" data-issuer="${cert.issuer}">
          <div class="cert-card-image-wrapper">
            <img src="${imgPath}" alt="${cert.title}" loading="lazy" class="cert-card-img" />
            <div class="cert-card-overlay">
              <span class="material-symbols-outlined zoom-icon">zoom_in</span>
              <span class="zoom-label">Preview Certificate</span>
            </div>
          </div>
          <div class="cert-card-body">
            <div class="cert-card-badge">${cat.badge || 'Certificate'}</div>
            <h4 class="cert-card-title">${cert.title}</h4>
            <p class="cert-card-issuer">Issued by <span>${cert.issuer}</span></p>
          </div>
        </div>
      `;
    }).join('');

    panel.innerHTML = cardsHtml;
    contentContainer.appendChild(panel);
  });

  // Tab Switching Logic with Smooth Animations
  const tabBtns = tabsContainer.querySelectorAll('.cert-tab-btn');
  const panels = contentContainer.querySelectorAll('.cert-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      if (btn.classList.contains('active')) return;

      // Update Active Tab Button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Smooth Switch Panels
      panels.forEach(p => {
        if (p.id === `cert-panel-${targetId}`) {
          p.classList.add('active');
          // Trigger smooth slide in animation
          p.classList.remove('slide-in');
          void p.offsetWidth; // Force reflow
          p.classList.add('slide-in');
        } else {
          p.classList.remove('active', 'slide-in');
        }
      });
    });
  });

  // Init Lightbox Modal Preview
  initCertLightbox();
}

function initCertLightbox() {
  const lightbox = document.getElementById('cert-lightbox');
  const lightboxImg = document.getElementById('cert-lightbox-img');
  const lightboxCaption = document.getElementById('cert-lightbox-caption');
  const closeBtn = document.getElementById('cert-lightbox-close');
  const backdrop = lightbox?.querySelector('.cert-lightbox-backdrop');

  if (!lightbox || !lightboxImg) return;

  // Delegate click on certificate cards
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.cert-card');
    if (card) {
      const imgSrc = card.dataset.img;
      const title = card.dataset.title;
      const issuer = card.dataset.issuer;

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
