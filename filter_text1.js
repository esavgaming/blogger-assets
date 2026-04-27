/**
 * REFINED CORE SCRIPT
 * Focus: Text Formatting & Modal Cascading
 */

// --- STATE ---
let contentCache = {}; 

/**
 * 1. RAW TEXT PROCESSING
 * Handles headers, macros, book switching, and image links.
 */
function formatRawText(rawText) {
    if (!rawText) return "";

    // A. Headers: ***Title*** -> h2, *Subtitle* -> h3
    let processedText = rawText.replace(/\*\*\*(.*?)\*\*\*/g, '<h2>$1</h2>');
    processedText = processedText.replace(/\*(.*?)\*/g, '<h3>$1</h3>');

    // B. Open Macro: {fileId:Display Text}
    processedText = processedText.replace(/\{(.*?):(.*?)\}/g, (match, id, text) => {
        const safeId = id.replace(/'/g, "\\'");
        const safeText = text.replace(/'/g, "\\'");
        return `<span class="macro-link" onclick="openMacro('${safeId}', '${safeText}')">${text}</span>`;
    });

    // C. Switch Book: |bookId:Display Text|
    processedText = processedText.replace(/\|(.*?):(.*?)\|/g, (match, id, text) => {
        const safeId = id.replace(/'/g, "\\'");
        return `<span class="macro-link" style="color:var(--accent-green)" onclick="switchBook('${safeId}')">${text}</span>`;
    });

    // D. Images: [url:Display Text]
    processedText = processedText.replace(/\[(.*?):(.*?)]/g, (match, url, text) => {
        const safeUrl = url.replace(/'/g, "\\'");
        const safeText = text.replace(/'/g, "\\'");
        return `<span class="macro-link" onclick="openImage('${safeUrl}', '${safeText}')">📷 ${text}</span>`;
    });

    return processedText;
}

/**
 * 2. DYNAMIC MODAL SYSTEM (Cascading)
 * Creates overlapping layers for nested content.
 */
function spawnModal(innerHtml, type = 'text', title = '') {
    const existingModals = document.querySelectorAll('.modal-wrapper');
    const zIndexBase = 1000 + (existingModals.length * 10);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-wrapper';
    wrapper.style.zIndex = zIndexBase;
    
    const content = document.createElement('div');
    content.className = type === 'image' ? 'modal-content image-mode' : 'modal-content';
    
    const headerHtml = `
        <div class="modal-header">
            <span class="modal-title">${title}</span>
            <button class="close-btn" onclick="closeTopModal()">&times;</button>
        </div>
    `;

    const bodyHtml = `<div class="modal-body ${type === 'text' ? 'prose' : ''}">${innerHtml}</div>`;

    content.innerHTML = headerHtml + bodyHtml;
    wrapper.appendChild(content);
    document.body.appendChild(wrapper);

    // Fade-in effect
    setTimeout(() => wrapper.classList.add('visible'), 10);

    // Overlay click: Close everything for speed
    wrapper.addEventListener('click', function(e) {
        if (e.target === this) closeAllModals();
    });
}

function closeTopModal() {
    const modals = document.querySelectorAll('.modal-wrapper');
    if (modals.length > 0) {
        const topModal = modals[modals.length - 1];
        topModal.classList.remove('visible');
        setTimeout(() => topModal.remove(), 300);
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal-wrapper');
    modals.forEach(m => {
        m.classList.remove('visible');
        setTimeout(() => m.remove(), 300);
    });
}

/**
 * 3. HANDLERS
 * Bridges the data and the UI.
 */
async function openMacro(fileId, linkText) {
    let htmlContent = '';
    
    // Uses fetchContent (logic assumed to be external now)
    if (contentCache[fileId]) {
        htmlContent = formatRawText(contentCache[fileId]);
    } else {
        try {
            const txt = await fetchContent(fileId);
            contentCache[fileId] = txt;
            htmlContent = formatRawText(txt);
        } catch (err) {
            htmlContent = `<p style="color:var(--accent-red); text-align:center">Erro: ${err.message}</p>`;
        }
    }
    
    spawnModal(htmlContent, 'text', linkText);
}

function openImage(imageUrl, title) {
    const imgHtml = `
        <img src="${imageUrl}" 
             alt="${title}" 
             onerror="this.parentElement.innerHTML='<p style=\\'color:#fff;text-align:center\\'>Erro ao carregar imagem: link inválido.</p>'">
    `;
    
    spawnModal(imgHtml, 'image', title || "Visualização");
}

window.addEventListener('load', () => {
    const targetDiv = document.getElementById('postedit');

    if (targetDiv) {
      // Access the current text content
      const originalText = targetDiv.innerHTML;

      // Use a regular expression with the 'g' flag for global replacement 
      // and 'i' if you want it to be case-insensitive
      const updatedText = formatRawText(originalText);

      // Update the DOM
      targetDiv.innerHTML = updatedText;
      
      // Optional: Visual confirmation for the tester
      targetDiv.classList.add('highlight-change');
      console.log('Text replacement complete.');
    } else {
      console.error("Element with id 'postedit' not found.");
    }
  });
