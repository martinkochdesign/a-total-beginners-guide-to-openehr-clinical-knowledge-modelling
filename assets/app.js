// Global overlay and transform state
let imgOverlay = null;
let currentScale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;
let hasDragged = false;

function openImg(img) {
  const source = img.src;
  const altText = img.alt || 'Image preview';

  if (!imgOverlay) {
    imgOverlay = document.createElement('div');
    imgOverlay.id = 'image-zoom-overlay';
    imgOverlay.innerHTML = `
      <div class="zoom-backdrop"></div>
      <div class="zoom-controls">
        <button type="button" class="zoom-btn" id="zoom-in" title="Zoom in">+</button>
        <button type="button" class="zoom-btn" id="zoom-out" title="Zoom out">−</button>
        <button type="button" class="zoom-btn" id="zoom-reset" title="Reset zoom">100%</button>
        <button type="button" class="zoom-btn zoom-close" id="zoom-close" title="Close (Esc)">✕</button>
      </div>
      <div class="zoom-stage">
        <img id="zoom-active-img" src="" alt="" draggable="false">
      </div>
    `;
    document.body.appendChild(imgOverlay);

    const stage = imgOverlay.querySelector('.zoom-stage');
    const zoomImg = imgOverlay.querySelector('#zoom-active-img');

    // Close button
    imgOverlay.querySelector('#zoom-close').addEventListener('click', closeImgOverlay);

    // Close when clicking empty backdrop (but NOT if we just dragged the image)
    stage.addEventListener('click', (e) => {
      if (e.target === stage && !hasDragged) {
        closeImgOverlay();
      }
    });

    // Zoom buttons
    imgOverlay.querySelector('#zoom-in').addEventListener('click', () => adjustZoom(0.3));
    imgOverlay.querySelector('#zoom-out').addEventListener('click', () => adjustZoom(-0.3));
    imgOverlay.querySelector('#zoom-reset').addEventListener('click', resetTransform);

    // Scroll wheel zoom
    imgOverlay.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      adjustZoom(delta);
    }, { passive: false });

    // Double-click image to toggle 100% / 200%
    zoomImg.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (currentScale > 1.2) {
        resetTransform();
      } else {
        currentScale = 2;
        applyTransform(true);
      }
    });

    // --- PAN / DRAG LOGIC (MOUSE) ---
    function onPointerDown(clientX, clientY, target) {
      // Don't drag if clicking buttons
      if (target.closest('.zoom-controls')) return;

      isPanning = true;
      hasDragged = false;
      startX = clientX - translateX;
      startY = clientY - translateY;

      // Disable transition while dragging for instant, lag-free response
      zoomImg.style.transition = 'none';
      stage.classList.add('is-panning');
    }

    function onPointerMove(clientX, clientY) {
      if (!isPanning) return;
      hasDragged = true;
      translateX = clientX - startX;
      translateY = clientY - startY;
      applyTransform(false);
    }

    function onPointerUp() {
      if (!isPanning) return;
      isPanning = false;
      stage.classList.remove('is-panning');
      // Re-enable smooth transition for zoom actions
      zoomImg.style.transition = 'transform 0.15s ease-out';
    }

    // Mouse listeners
    stage.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // left click only
      e.preventDefault(); // CRUCIAL: stops browser ghost drag & text selection
      onPointerDown(e.clientX, e.clientY, e.target);
    });

    window.addEventListener('mousemove', (e) => {
      if (isPanning) {
        e.preventDefault();
        onPointerMove(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mouseup', onPointerUp);

    // Touch support (Mobile/Tablet)
    stage.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        onPointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target);
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (isPanning && e.touches.length === 1) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: false });

    window.addEventListener('touchend', onPointerUp);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && imgOverlay.classList.contains('active')) {
        closeImgOverlay();
      }
    });
  }

  // Load new image and reset transform
  const activeImg = imgOverlay.querySelector('#zoom-active-img');
  activeImg.src = source;
  activeImg.alt = altText;
  resetTransform();

  // Show overlay cleanly
  imgOverlay.style.display = 'flex';
  requestAnimationFrame(() => {
    imgOverlay.classList.add('active');
  });
  document.body.style.overflow = 'hidden';
}

function adjustZoom(delta) {
  currentScale = Math.min(Math.max(currentScale + delta, 0.5), 5); // 50% to 500%
  applyTransform(true);
}

function resetTransform() {
  currentScale = 1;
  translateX = 0;
  translateY = 0;
  applyTransform(true);
}

function applyTransform(withTransition = false) {
  const activeImg = document.getElementById('zoom-active-img');
  const resetBtn = document.getElementById('zoom-reset');
  if (activeImg) {
    activeImg.style.transition = withTransition ? 'transform 0.15s ease-out' : 'none';
    activeImg.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentScale})`;
  }
  if (resetBtn) {
    resetBtn.textContent = `${Math.round(currentScale * 100)}%`;
  }
}

function closeImgOverlay() {
  if (imgOverlay) {
    imgOverlay.classList.remove('active');
    setTimeout(() => {
      if (!imgOverlay.classList.contains('active')) {
        imgOverlay.style.display = 'none'; // Completely hidden, leaves 0 ghost layer
      }
    }, 200);
    document.body.style.overflow = '';
  }
}

/**
 * openEHR Guide Interactive Application Engine
 * Handles:
 * - Dynamic part loading (all parts or individual parts)
 * - Automatic Heading Slugs & Table of Contents Generation
 * - Instant Text & Heading Search
 * - ScrollSpy active heading tracking
 * - Language switching (English <-> Català)
 * - Modal & Print handling
 */

(function () {
  'use strict';

  // Configuration for Guide Parts
 const PARTS_CONFIG = [
  {
    id: 'part0',
    title: {
      en: 'Part 0: About this document',
      ca: 'Part 0: Sobre aquest document',
      es: 'Parte 0: Sobre este documento',
      de: 'Teil 0: Über dieses Dokument',
      nb: 'Del 0: Om dette dokumentet'
    },
    files: {
      en: 'parts/part0_en.html',
      ca: 'parts/part0_ca.html',
      es: 'parts/part0_es.html',
      de: 'parts/part0_de.html',
      nb: 'parts/part0_nb.html'
    }
  },
  {
    id: 'part1',
    title: {
      en: 'Part 1: Introduction to basic concepts',
      ca: 'Part 1: Introducció als conceptes bàsics',
      es: 'Parte 1: Introducción a los conceptos básicos',
      de: 'Teil 1: Einführung in die grundlegenden Konzepte',
      nb: 'Del 1: Innføring i grunnleggende konsepter'
    },
    files: {
      en: 'parts/part1_en.html',
      ca: 'parts/part1_ca.html',
      es: 'parts/part1_es.html',
      de: 'parts/part1_de.html',
      nb: 'parts/part1_nb.html'
    }
  },
  {
    id: 'part2',
    title: {
      en: 'Part 2: Practical modelling',
      ca: 'Part 2: Modelatge pràctic',
      es: 'Parte 2: Modelado práctico',
      de: 'Teil 2: Praktische Modellierung',
      nb: 'Del 2: Praktisk modellering'
    },
    files: {
      en: 'parts/part2_en.html',
      ca: 'parts/part2_ca.html',
      es: 'parts/part2_es.html',
      de: 'parts/part2_de.html',
      nb: 'parts/part2_nb.html'
    }
  },
  {
    id: 'part3',
    title: {
      en: 'Part 3: Storing and querying data in the CDR',
      ca: 'Part 3: Emmagatzematge i consulta de dades al CDR',
      es: 'Parte 3: Almacenamiento y consulta de datos en el CDR',
      de: 'Teil 3: Speichern und Abfragen von Daten im CDR',
      nb: 'Del 3: Lagring og spørring av data i CDR'
    },
    files: {
      en: 'parts/part3_en.html',
      ca: 'parts/part3_ca.html',
      es: 'parts/part3_es.html',
      de: 'parts/part3_de.html',
      nb: 'parts/part3_nb.html'
    }
  },
  {
    id: 'part4',
    title: {
      en: 'Part 4: Next steps',
      ca: 'Part 4: Passos següents',
      es: 'Parte 4: Próximos pasos',
      de: 'Teil 4: Nächste Schritte',
      nb: 'Del 4: Neste steg'
    },
    files: {
      en: 'parts/part4_en.html',
      ca: 'parts/part4_ca.html',
      es: 'parts/part4_es.html',
      de: 'parts/part4_de.html',
      nb: 'parts/part4_nb.html'
    }
  }
];

  // Application State
  const state = {
    currentLang: 'en',
    activePartFilter: 'all', // 'all', 'part1', 'part2'
    headings: [],
    searchIndex: []
  };

  // DOM Elements
  const contentStage = document.getElementById('contentStage');
  const tocNav = document.getElementById('tocNav');
  const langSelect = document.getElementById('langSelect');
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
  const searchInput = document.getElementById('searchInput');
  const searchClear = document.getElementById('searchClear');
  const searchResults = document.getElementById('searchResults');
  const printBtn = document.getElementById('printBtn');
  const aboutBtn = document.getElementById('aboutBtn');
  const aboutModal = document.getElementById('aboutModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalDoneBtn = document.getElementById('modalDoneBtn');
  const partPills = document.querySelectorAll('.part-pill');

  // --------------------------------------------------------------------------
  // Core: Load Guide Parts
  // --------------------------------------------------------------------------
  async function loadGuideContent() {
    contentStage.innerHTML = '<div class="loading-state">Loading guide parts...</div>';

    const partsToLoad = state.activePartFilter === 'all'
      ? PARTS_CONFIG
      : PARTS_CONFIG.filter(p => p.id === state.activePartFilter);

    try {
      const partHTMLs = await Promise.all(partsToLoad.map(async (part) => {
        const filePath = part.files[state.currentLang] || part.files['en'];
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Could not load ${filePath}`);
        const html = await response.text();
        return `
          <article class="guide-part-container" id="${part.id}" data-part-title="${part.title[state.currentLang]}">
            <span class="part-badge-header">${part.title[state.currentLang]}</span>
            ${html}
          </article>
        `;
      }));

      contentStage.innerHTML = partHTMLs.join('');
      
      // Post-process loaded DOM: Generate Slugs, TOC, Search Index & ScrollSpy
      processHeadingsAndTOC();
      buildSearchIndex();

    } catch (err) {
      contentStage.innerHTML = `
        <div class="callout callout-warning">
          <strong>Error loading guide content:</strong> ${err.message}. 
          Please make sure the files are placed inside the <code>parts/</code> directory and accessed via a web server.
        </div>
      `;
    }
  }

  // --------------------------------------------------------------------------
  // Heading Slugs, Anchors, and Dynamic TOC Generation
  // --------------------------------------------------------------------------
  function processHeadingsAndTOC() {
    const headings = contentStage.querySelectorAll('h1, h2, h3');
    tocNav.innerHTML = '';
    state.headings = [];

    const slugCounts = {};

    headings.forEach((heading, index) => {
      // Create clean URL slug
      const rawText = heading.textContent.trim();
      let baseSlug = rawText
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      
      if (!baseSlug) baseSlug = `section-${index}`;

      if (slugCounts[baseSlug] !== undefined) {
        slugCounts[baseSlug]++;
        baseSlug = `${baseSlug}-${slugCounts[baseSlug]}`;
      } else {
        slugCounts[baseSlug] = 0;
      }

      heading.id = baseSlug;

      // Add to state for ScrollSpy & search
      state.headings.push({
        id: baseSlug,
        element: heading,
        text: rawText,
        level: heading.tagName.toLowerCase()
      });

      // Build TOC link
      /*
      const link = document.createElement('a');
      link.href = `#${baseSlug}`;
      link.className = `toc-link toc-${heading.tagName.toLowerCase()}`;
      link.textContent = rawText;
      link.addEventListener('click', (e) => {
        e.preventDefault();
        heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, null, `#${baseSlug}`);
        if (window.innerWidth < 768) {
          sidebar.classList.add('collapsed');
          mainContent.classList.add('expanded');
        }
      });*/

      // Build TOC link
      const link = document.createElement('a');
      link.href = `#${baseSlug}`;
      link.className = `toc-link toc-${heading.tagName.toLowerCase()}`;
      link.textContent = rawText;
      link.addEventListener('click', (e) => {
        e.preventDefault();

        // Define top offset (e.g. 70px header + 16px padding)
        const topbarOffset = 86; 
        const elementPosition = heading.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - topbarOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });

        history.pushState(null, null, `#${baseSlug}`);
        if (window.innerWidth < 768) {
          sidebar.classList.add('collapsed');
          mainContent.classList.add('expanded');
        }
      });

      tocNav.appendChild(link);
    });


    setupScrollSpy();
  }

  // --------------------------------------------------------------------------
  // ScrollSpy: Highlight TOC Link on Scroll
  // --------------------------------------------------------------------------
  function setupScrollSpy() {
    let scrollTimeout;

    window.addEventListener('scroll', () => {
      if (scrollTimeout) cancelAnimationFrame(scrollTimeout);
      scrollTimeout = requestAnimationFrame(() => {
        const fromTop = window.scrollY + 120;
        let currentHeading = null;

        for (let i = 0; i < state.headings.length; i++) {
          const h = state.headings[i];
          const top = h.element.getBoundingClientRect().top + window.scrollY;
          if (top <= fromTop) {
            currentHeading = h;
          } else {
            break;
          }
        }

        if (currentHeading) {
          document.querySelectorAll('.toc-link').forEach(link => {
            if (link.getAttribute('href') === `#${currentHeading.id}`) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, { passive: true });
  }

  // --------------------------------------------------------------------------
  // Instant Search Engine across Headings and Paragraphs
  // --------------------------------------------------------------------------
  function buildSearchIndex() {
    state.searchIndex = [];
    const articles = contentStage.querySelectorAll('.guide-part-container');

    articles.forEach(article => {
      const partTitle = article.getAttribute('data-part-title') || '';
      const nodes = article.querySelectorAll('h1, h2, h3, p, li');

      nodes.forEach(node => {
        const text = node.textContent.trim();
        if (text.length > 5) {
          // Find nearest preceding heading for anchor link
          let anchor = node;
          if (!node.id) {
            let prev = node.previousElementSibling;
            while (prev && !prev.matches('h1, h2, h3')) {
              prev = prev.previousElementSibling;
            }
            anchor = prev || article;
          }

          state.searchIndex.push({
            targetId: anchor.id || article.id,
            tag: node.tagName.toLowerCase(),
            text: text,
            partTitle: partTitle
          });
        }
      });
    });
  }

  function performSearch(query) {
    if (!query || query.trim().length < 2) {
      searchResults.classList.add('hidden');
      searchResults.innerHTML = '';
      return;
    }

    const q = query.toLowerCase().trim();
    const matches = [];

    for (const item of state.searchIndex) {
      const idx = item.text.toLowerCase().indexOf(q);
      if (idx !== -1) {
        // Snippet preview
        const start = Math.max(0, idx - 40);
        const end = Math.min(item.text.length, idx + q.length + 60);
        let snippet = item.text.substring(start, end);
        if (start > 0) snippet = '...' + snippet;
        if (end < item.text.length) snippet = snippet + '...';

        matches.push({
          targetId: item.targetId,
          partTitle: item.partTitle,
          snippet: snippet
        });

        if (matches.length >= 8) break; // Limit dropdown results
      }
    }

    if (matches.length === 0) {
      searchResults.innerHTML = `<div class="search-result-item"><div class="search-result-snippet">No matches found for "${query}"</div></div>`;
    } else {
      searchResults.innerHTML = matches.map(m => `
        <div class="search-result-item" data-target="${m.targetId}">
          <div class="search-result-title">${m.partTitle}</div>
          <div class="search-result-snippet">${m.snippet}</div>
        </div>
      `).join('');

      searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const targetId = item.getAttribute('data-target');
          const el = document.getElementById(targetId);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.pushState(null, null, `#${targetId}`);
            searchResults.classList.add('hidden');
            searchInput.value = '';
            searchClear.classList.add('hidden');
          }
        });
      });
    }

    searchResults.classList.remove('hidden');
  }

  // --------------------------------------------------------------------------
  // Event Listeners & UI Controls
  // --------------------------------------------------------------------------

  // Search input events
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.length > 0) searchClear.classList.remove('hidden');
    else searchClear.classList.add('hidden');
    performSearch(val);
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.add('hidden');
    searchResults.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.topbar-search')) {
      searchResults.classList.add('hidden');
    }
  });

  // Sidebar toggle
  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
  });

  if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', () => {
      sidebar.classList.add('collapsed');
      mainContent.classList.add('expanded');
    });
  }

  // Parts filter pills
  partPills.forEach(pill => {
    pill.addEventListener('click', () => {
      partPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activePartFilter = pill.getAttribute('data-part');
      loadGuideContent();
    });
  });
  // Localized label for the "All parts" tab across all supported languages
  const ALL_PARTS_LABELS = {
    en: 'All Parts (Full Guide)',
    ca: 'Totes les parts (Guia completa)',
    es: 'Todas las partes (Guía completa)',
    de: 'Alle Teile (Vollständiger Leitfaden)',
    nb: 'Alle deler (Komplett veiledning)'
  };

  langSelect.addEventListener('change', (e) => {

    const lang = e.target.value;
    state.currentLang = lang;

    // Optional: update the HTML tag's lang attribute for accessibility/SEO
    document.documentElement.lang = lang;

    // Update parts pills labels according to selected language
    partPills.forEach(pill => {
      const partKey = pill.getAttribute('data-part');
      if (partKey === 'all') {
        pill.textContent = ALL_PARTS_LABELS[lang] || ALL_PARTS_LABELS['en'];
      } else {
        const conf = PARTS_CONFIG.find(p => p.id === partKey);
        if (conf && conf.title) {
          pill.textContent = conf.title[lang] || conf.title['en'];
        }
      }
    });

    // Re-render the active view with the new language files
    // loadActiveContent(); 
    loadGuideContent();
    buildSearchIndex();
    
  });


  // Print to PDF
  printBtn.addEventListener('click', () => {
    window.print();
  });

  // About Modal
  aboutBtn.addEventListener('click', () => {
    aboutModal.classList.remove('hidden');
  });

  modalCloseBtn.addEventListener('click', () => {
    aboutModal.classList.add('hidden');
  });

  modalDoneBtn.addEventListener('click', () => {
    aboutModal.classList.add('hidden');
  });

  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) {
      aboutModal.classList.add('hidden');
    }
  });

  // Initial Load
  loadGuideContent();

})();
