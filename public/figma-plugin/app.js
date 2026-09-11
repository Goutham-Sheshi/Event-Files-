/**
 * Sheshi Frame to PPTX - Application Controller
 * Handles Figma canvas bridge communication, slide selection & ordering,
 * and client-side PPTX generation via PptxGenJS.
 */

(function () {
  // DOM Elements
  const statusDot = document.getElementById('status-dot');
  const statusLabel = document.getElementById('status-label');
  const pageNameDisplay = document.getElementById('page-name-display');
  const webNotice = document.getElementById('web-notice');
  const btnRefresh = document.getElementById('btn-refresh');
  const btnSelectAll = document.getElementById('btn-select-all');
  const btnDeselectAll = document.getElementById('btn-deselect-all');
  const slideCountBadge = document.getElementById('slide-count-badge');
  const slidesList = document.getElementById('slides-list');
  const emptyState = document.getElementById('empty-state');
  
  const deckTitleInput = document.getElementById('deck-title');
  const ratioSelector = document.getElementById('ratio-selector');
  const qualitySelector = document.getElementById('quality-selector');
  const matchBgCheckbox = document.getElementById('match-bg');
  const includeNotesCheckbox = document.getElementById('include-notes');
  
  const btnConvert = document.getElementById('btn-convert');
  const btnConvertLabel = document.getElementById('btn-convert-label');
  const progressCard = document.getElementById('progress-card');
  const progressFill = document.getElementById('progress-fill');
  const progressPct = document.getElementById('progress-pct');
  const progressTitle = document.getElementById('progress-title');
  const progressStatus = document.getElementById('progress-status');
  
  const successCard = document.getElementById('success-card');
  const successDetails = document.getElementById('success-details');
  const btnDownloadAgain = document.getElementById('btn-download-again');

  // Application State
  let isInsideFigma = false;
  let slides = [];
  let selectedRatio = '16:9';
  let selectedQuality = 2;
  let accumulatedSlides = [];
  let lastGeneratedPptx = null;
  let lastFileName = 'Figma-Presentation.pptx';

  // -------------------------------------------------------------
  // Bridge Communication with Figma (via ui.html wrapper)
  // -------------------------------------------------------------
  function sendToFigma(message) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ toFigma: message }, '*');
    }
  }

  window.addEventListener('message', (event) => {
    if (!event.data || !event.data.figmaMessage) return;
    const msg = event.data.figmaMessage;
    handleFigmaMessage(msg);
  });

  function handleFigmaMessage(msg) {
    isInsideFigma = true;
    statusDot.classList.remove('offline');
    statusLabel.textContent = 'Connected to Figma';
    webNotice.style.display = 'none';

    switch (msg.type) {
      case 'SHELL_READY':
        sendToFigma({ type: 'SCAN_FRAMES' });
        break;

      case 'FRAMES_DETECTED':
        if (msg.pageName) {
          pageNameDisplay.textContent = msg.pageName;
          if (deckTitleInput.value === 'Figma Presentation') {
            deckTitleInput.value = `${msg.pageName} - Deck`;
          }
        }
        updateSlidesList(msg.frames || []);
        break;

      case 'EXPORT_PROGRESS':
        updateProgress(msg.index, msg.total, `Exporting: ${msg.frameName || 'Slide'}`);
        break;

      case 'SLIDE_EXPORTED':
        accumulatedSlides.push(msg);
        break;

      case 'ALL_SLIDES_EXPORTED':
        finalizePptxBuild();
        break;

      case 'EXPORT_ERROR':
        console.error('Export error:', msg.error);
        progressStatus.textContent = `Error: ${msg.error}`;
        break;
    }
  }

  // -------------------------------------------------------------
  // Initialization & Web Mode Fallback
  // -------------------------------------------------------------
  function init() {
    setupEventListeners();

    // Check if we are inside an iframe (Figma plugin)
    if (window.parent && window.parent !== window) {
      statusLabel.textContent = 'Connecting to Figma...';
      sendToFigma({ type: 'INIT' });

      // Fallback if no response within 1.5s -> Web mode
      setTimeout(() => {
        if (!isInsideFigma) {
          activateWebMode();
        }
      }, 1500);
    } else {
      activateWebMode();
    }
  }

  function activateWebMode() {
    isInsideFigma = false;
    statusDot.classList.add('offline');
    statusLabel.textContent = 'Web Preview & Download Mode';
    pageNameDisplay.textContent = 'Browser Preview';
    webNotice.style.display = 'flex';

    // Generate realistic demo slides for demonstration
    loadDemoSlides();
  }

  function loadDemoSlides() {
    const demoSlides = [
      {
        id: 'demo-1',
        name: 'Slide 1 - Title & Vision',
        width: 1920,
        height: 1080,
        aspectRatio: 1.78,
        bgColor: '#181920',
        notes: 'Introduce company mission and high-level agenda.',
        thumbnail: createDemoCanvas('Slide 1: Vision & Strategy', '#4f46e5', '#7c3aed'),
        slideNumber: 1
      },
      {
        id: 'demo-2',
        name: 'Slide 2 - Quarterly Metrics',
        width: 1920,
        height: 1080,
        aspectRatio: 1.78,
        bgColor: '#181920',
        notes: 'Highlight 34% revenue growth and active client retention.',
        thumbnail: createDemoCanvas('Slide 2: Key Growth Metrics', '#059669', '#10b981'),
        slideNumber: 2
      },
      {
        id: 'demo-3',
        name: 'Slide 3 - Product Roadmap',
        width: 1920,
        height: 1080,
        aspectRatio: 1.78,
        bgColor: '#181920',
        notes: 'Walkthrough Phase 1, Phase 2, and Enterprise launch dates.',
        thumbnail: createDemoCanvas('Slide 3: Strategic Roadmap', '#d97706', '#f59e0b'),
        slideNumber: 3
      }
    ];

    updateSlidesList(demoSlides);
  }

  function createDemoCanvas(title, grad1, grad2) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 168;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 300, 168);
    grad.addColorStop(0, grad1);
    grad.addColorStop(1, grad2);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 300, 168);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 150, 90);

    return canvas.toDataURL('image/png');
  }

  // -------------------------------------------------------------
  // Slide Management
  // -------------------------------------------------------------
  function updateSlidesList(newFrames) {
    if (!newFrames || newFrames.length === 0) {
      slides = [];
      emptyState.style.display = 'block';
      slidesList.style.display = 'none';
      slideCountBadge.textContent = '0';
      btnConvert.disabled = true;
      return;
    }

    // Preserve existing selection / notes if re-scanning
    slides = newFrames.map((f, index) => {
      const existing = slides.find(s => s.id === f.id);
      return {
        ...f,
        selected: existing ? existing.selected : true,
        order: index
      };
    });

    renderSlides();
  }

  function renderSlides() {
    slidesList.innerHTML = '';
    const selectedCount = slides.filter(s => s.selected).length;
    slideCountBadge.textContent = `${selectedCount}/${slides.length}`;
    btnConvert.disabled = selectedCount === 0;
    btnConvertLabel.textContent = `Convert & Download PPTX (${selectedCount} Slides)`;

    if (slides.length === 0) {
      emptyState.style.display = 'block';
      slidesList.style.display = 'none';
      return;
    }

    emptyState.style.display = 'none';
    slidesList.style.display = 'flex';

    slides.forEach((slide, index) => {
      const card = document.createElement('div');
      card.className = `slide-card ${slide.selected ? '' : 'disabled'}`;
      card.dataset.id = slide.id;

      card.innerHTML = `
        <input type="checkbox" class="slide-check" ${slide.selected ? 'checked' : ''} title="Include in presentation">
        <div class="slide-thumb-container">
          ${slide.thumbnail 
            ? `<img src="${slide.thumbnail}" class="slide-thumb" alt="${escapeHtml(slide.name)}">`
            : `<div class="slide-thumb-placeholder">${slide.width}×${slide.height}</div>`
          }
        </div>
        <div class="slide-info">
          <div class="slide-title-row">
            <span class="slide-num">#${index + 1}</span>
            <span class="slide-name" title="${escapeHtml(slide.name)}">${escapeHtml(slide.name)}</span>
          </div>
          <div class="slide-meta">
            ${slide.width} × ${slide.height} • ${slide.aspectRatio >= 1.7 ? '16:9' : (slide.aspectRatio >= 1.3 ? '4:3' : 'Custom')}
          </div>
        </div>
        <div class="slide-controls">
          <button class="order-btn btn-up" title="Move Up" ${index === 0 ? 'disabled style="opacity:0.2;"' : ''}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
            </svg>
          </button>
          <button class="order-btn btn-down" title="Move Down" ${index === slides.length - 1 ? 'disabled style="opacity:0.2;"' : ''}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
            </svg>
          </button>
        </div>
      `;

      // Checkbox toggle
      const checkbox = card.querySelector('.slide-check');
      checkbox.addEventListener('change', (e) => {
        slide.selected = e.target.checked;
        card.classList.toggle('disabled', !slide.selected);
        const count = slides.filter(s => s.selected).length;
        slideCountBadge.textContent = `${count}/${slides.length}`;
        btnConvert.disabled = count === 0;
        btnConvertLabel.textContent = `Convert & Download PPTX (${count} Slides)`;
      });

      // Click card to focus frame in Figma canvas
      card.addEventListener('click', (e) => {
        if (e.target.closest('.slide-check') || e.target.closest('.order-btn')) return;
        if (isInsideFigma) {
          sendToFigma({ type: 'FOCUS_FRAME', frameId: slide.id });
        }
      });

      // Move Up
      const btnUp = card.querySelector('.btn-up');
      btnUp.addEventListener('click', (e) => {
        e.stopPropagation();
        if (index > 0) {
          const temp = slides[index];
          slides[index] = slides[index - 1];
          slides[index - 1] = temp;
          renderSlides();
        }
      });

      // Move Down
      const btnDown = card.querySelector('.btn-down');
      btnDown.addEventListener('click', (e) => {
        e.stopPropagation();
        if (index < slides.length - 1) {
          const temp = slides[index];
          slides[index] = slides[index + 1];
          slides[index + 1] = temp;
          renderSlides();
        }
      });

      slidesList.appendChild(card);
    });
  }

  // -------------------------------------------------------------
  // Event Listeners
  // -------------------------------------------------------------
  function setupEventListeners() {
    btnRefresh.addEventListener('click', () => {
      if (isInsideFigma) {
        sendToFigma({ type: 'SCAN_FRAMES' });
      } else {
        loadDemoSlides();
      }
    });

    btnSelectAll.addEventListener('click', () => {
      slides.forEach(s => s.selected = true);
      renderSlides();
    });

    btnDeselectAll.addEventListener('click', () => {
      slides.forEach(s => s.selected = false);
      renderSlides();
    });

    // Ratio Segmented Control
    ratioSelector.querySelectorAll('.segment-option').forEach(opt => {
      opt.addEventListener('click', () => {
        ratioSelector.querySelectorAll('.segment-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedRatio = opt.dataset.ratio;
      });
    });

    // Quality Segmented Control
    qualitySelector.querySelectorAll('.segment-option').forEach(opt => {
      opt.addEventListener('click', () => {
        qualitySelector.querySelectorAll('.segment-option').forEach(o => o.classList.remove('active'));
        opt.classList.add('active');
        selectedQuality = parseInt(opt.dataset.scale, 10) || 2;
      });
    });

    // Start Conversion
    btnConvert.addEventListener('click', startConversion);

    // Download Again Button
    btnDownloadAgain.addEventListener('click', () => {
      if (lastGeneratedPptx) {
        lastGeneratedPptx.writeFile({ fileName: lastFileName });
      }
    });
  }

  // -------------------------------------------------------------
  // Conversion Pipeline
  // -------------------------------------------------------------
  function startConversion() {
    const selectedSlides = slides.filter(s => s.selected);
    if (selectedSlides.length === 0) return;

    btnConvert.disabled = true;
    successCard.style.display = 'none';
    progressCard.style.display = 'flex';
    updateProgress(0, selectedSlides.length, 'Preparing frames for export...');

    accumulatedSlides = [];

    if (isInsideFigma) {
      sendToFigma({
        type: 'EXPORT_SLIDES',
        slideConfigs: selectedSlides,
        quality: selectedQuality
      });
    } else {
      // In Web Mode, simulate frame export
      simulateWebModeExport(selectedSlides);
    }
  }

  function simulateWebModeExport(selectedSlides) {
    let current = 0;
    const interval = setInterval(() => {
      current++;
      const s = selectedSlides[current - 1];
      updateProgress(current, selectedSlides.length, `Exporting: ${s.name}`);
      accumulatedSlides.push({
        ...s,
        imageData: s.thumbnail
      });

      if (current >= selectedSlides.length) {
        clearInterval(interval);
        setTimeout(finalizePptxBuild, 400);
      }
    }, 300);
  }

  function updateProgress(current, total, statusText) {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    progressFill.style.width = `${pct}%`;
    progressPct.textContent = `${pct}%`;
    progressTitle.textContent = `Exporting Slides (${current}/${total})`;
    progressStatus.textContent = statusText;
  }

  // -------------------------------------------------------------
  // PptxGenJS Generator
  // -------------------------------------------------------------
  async function finalizePptxBuild() {
    progressStatus.textContent = 'Generating PowerPoint presentation (.pptx)...';
    progressPct.textContent = '95%';
    progressFill.style.width = '95%';

    try {
      if (typeof PptxGenJS === 'undefined') {
        throw new Error('PptxGenJS library not loaded');
      }

      const pptx = new PptxGenJS();
      const rawTitle = deckTitleInput.value.trim() || 'Figma Presentation';
      const fileName = `${rawTitle.replace(/[/\\?%*:|"<>]/g, '-')}.pptx`;
      lastFileName = fileName;

      pptx.title = rawTitle;
      pptx.author = 'Sheshi Vault Platform';
      pptx.company = 'Sheshi';

      // Set Aspect Ratio Layout
      if (selectedRatio === '16:9') {
        pptx.layout = 'LAYOUT_16x9'; // 10" x 5.625"
      } else if (selectedRatio === '4:3') {
        pptx.layout = 'LAYOUT_4x3'; // 10" x 7.5"
      } else {
        // Custom: derive from first slide's dimensions
        const first = accumulatedSlides[0];
        if (first && first.width && first.height) {
          const ratio = first.width / first.height;
          const slideW = 10.0;
          const slideH = Number((slideW / ratio).toFixed(2));
          pptx.defineLayout({ name: 'CUSTOM', width: slideW, height: slideH });
          pptx.layout = 'CUSTOM';
        } else {
          pptx.layout = 'LAYOUT_16x9';
        }
      }

      const matchBg = matchBgCheckbox.checked;
      const includeNotes = includeNotesCheckbox.checked;

      // Build each slide
      accumulatedSlides.forEach((slideData, idx) => {
        const slide = pptx.addSlide();

        // Background Color
        if (matchBg && slideData.bgColor) {
          slide.background = { color: slideData.bgColor.replace('#', '') };
        }

        // Add Slide Graphic
        if (slideData.imageData) {
          slide.addImage({
            data: slideData.imageData,
            x: 0,
            y: 0,
            w: '100%',
            h: '100%',
            sizing: { type: 'contain', w: '100%', h: '100%' }
          });
        }

        // Add Speaker Notes
        if (includeNotes && slideData.notes) {
          slide.addNotes(slideData.notes);
        }
      });

      lastGeneratedPptx = pptx;

      // Complete progress
      progressFill.style.width = '100%';
      progressPct.textContent = '100%';
      progressStatus.textContent = 'Download starting!';

      // Trigger standard browser download
      await pptx.writeFile({ fileName: fileName });

      // Show Success Card
      setTimeout(() => {
        progressCard.style.display = 'none';
        successCard.style.display = 'flex';
        successDetails.innerHTML = `
          <strong>${escapeHtml(fileName)}</strong> (${accumulatedSlides.length} slides)<br>
          Exported at ${selectedQuality}x quality in ${selectedRatio} ratio.
        `;
        btnConvert.disabled = false;

        if (isInsideFigma) {
          sendToFigma({
            type: 'NOTIFY',
            message: `🎉 Exported ${accumulatedSlides.length} slides to ${fileName}`
          });
        }
      }, 600);

    } catch (err) {
      console.error('Error generating PPTX:', err);
      progressStatus.textContent = `Error: ${err.message}`;
      btnConvert.disabled = false;
      if (isInsideFigma) {
        sendToFigma({
          type: 'NOTIFY',
          message: `Export failed: ${err.message}`,
          isError: true
        });
      }
    }
  }

  // -------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Kick off application
  init();
})();
