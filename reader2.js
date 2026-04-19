        // --- FALLBACK DATA ---
        const FALLBACK_INDEX = [
            { id: 900, title: "Teste: Formatação", fileId: "test_fmt" },
            { id: 901, title: "Teste: Macros", fileId: "test_macro" },
            { id: 902, title: "Teste: Mídia e Livros", fileId: "test_media" }
        ];

        const FALLBACK_CONTENT = {
            "test_fmt": `***Validação de Títulos***
            Texto normal para leitura.
            *Validação de Subtítulo*
            Texto do subtítulo.`,
            
            "test_macro": `***Macros***
            Clique em ?server_box:Servidor? para abrir o modal.`,
            
            "server_box": `***Servidor***
            Detalhes do servidor aqui.
            Veja o diagrama de rede: [diagrama_v1.png:Ver Rede]`,
            
            "test_media": `***Imagens e Cascata***
            1. Abra este texto ?server_box:Servidor?.
            2. Dentro dele, clique na imagem.
            3. Feche a imagem no X (volta para Servidor).
            4. Feche Servidor no X (volta para cá).
            5. Clique fora de tudo para fechar todos de uma vez.
            
            Mudar livro: !gemini_advanced:Ir para Avançado!.`
        };

        // --- STATE ---
        let bookStructure = [];
        let contentCache = {}; 
        let currentIndex = 0;
        let isTestMode = false;

// --- CONFIG UPDATE --- Lastest
const BASE_CDN = 'https://cdn.jsdelivr.net/gh/esavgaming/blogger-assets/reader';
let currentBookId = 'ealetra'; 

// Helper to get the current book's root directory
const getBookPath = () => `${BASE_CDN}/${currentBookId}`;

async function init() {
    const listElement = document.getElementById('chapter-list');
    listElement.innerHTML = `<li class="status-msg">Carregando: ${currentBookId}...</li>`;

    try {
        const url = `${getBookPath()}/index.json`;
        const response = await fetch(url);

        if (!response.ok) throw new Error(`Não encontrado: ${response.status}`);

        const data = await response.json();

        /**
         * LOGIC CHECK: 
         * 1. If 'data' is the array itself (like your FALLBACK_INDEX), use it.
         * 2. If 'data' is an object containing 'index', use data.index.
         */
        bookStructure = Array.isArray(data) ? data : (data.index || []);

        if (bookStructure.length === 0) {
            throw new Error("O índice está vazio ou em formato incompatível.");
        }

        isTestMode = false;
        if (document.getElementById('test-mode-indicator')) {
            document.getElementById('test-mode-indicator').style.display = 'none';
        }

    } catch (error) {
        console.error("Erro ao carregar do CDN:", error.message);
        
        // Use the hardcoded fallback you provided in the source
        bookStructure = FALLBACK_INDEX;
        isTestMode = true;
        
        if (document.getElementById('test-mode-indicator')) {
            document.getElementById('test-mode-indicator').style.display = 'inline-block';
        }
    }
    
    renderSidebar();
    loadChapterByIndex(0);
}

        async function switchBook(newBookId) {
            currentBookId = newBookId;
            bookStructure = [];
            contentCache = {};
            currentIndex = 0;
            document.getElementById('content-area').innerHTML = '';
            document.getElementById('header-chapter-display').textContent = 'Carregando...';
            // Fecha modais abertos ao trocar de livro
            closeAllModals(); 
            await init();
        }

        function renderSidebar() {
            const listElement = document.getElementById('chapter-list');
            listElement.innerHTML = '';
            bookStructure.forEach((chapter, index) => {
                const li = document.createElement('li');
                li.className = 'chapter-item';
                li.textContent = chapter.title || `Cap ${index + 1}`;
                li.onclick = () => loadChapterByIndex(index);
                li.id = `sidebar-item-${index}`;
                listElement.appendChild(li);
            });
        }

        function formatRawText(rawText) {
            if (!rawText) return "";

            let processedText = rawText.replace(/\*\*\*(.*?)\*\*\*/g, '<h2>$1</h2>');
            processedText = processedText.replace(/\*(.*?)\*/g, '<h3>$1</h3>');

            processedText = processedText.replace(/\?(.*?):(.*?)\?/g, (match, id, text) => {
                const safeId = id.replace(/'/g, "\\'");
                const safeText = text.replace(/'/g, "\\'");
                return `<span class="macro-link" onclick="openMacro('${safeId}', '${safeText}')">${text}</span>`;
            });
            
            processedText = processedText.replace(/!(.*?):(.*?)\!/g, (match, id, text) => {
                const safeId = id.replace(/'/g, "\\'");
                return `<span class="macro-link" style="color:var(--accent-green)" onclick="switchBook('${safeId}')">${text}</span>`;
            });

            // Regex atualizada para capturar [arquivo:titulo]
            processedText = processedText.replace(/\[(.*?):(.*?)]/g, (match, filename, text) => {
                const safeName = filename.replace(/'/g, "\\'");
                const safeText = text.replace(/'/g, "\\'");
                return `<span class="macro-link" onclick="openImage('${safeName}', '${safeText}')">📷 ${text}</span>`;
            });

            return processedText;
        }

async function fetchContent(fileId) {
    // We check if we are in "Test Mode" (fallback) first.
    // This allows you to keep testing locally without being online.
    if (isTestMode) {
        await new Promise(r => setTimeout(r, 200)); // Simulate network lag
        if (FALLBACK_CONTENT[fileId]) return FALLBACK_CONTENT[fileId];
        throw new Error(`[Offline] 404: ${fileId}`);
    }

    // Direct path: BASE_CDN/[book]/content/[fileId].txt
    const url = `${getBookPath()}/content/${fileId}.txt`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            cache: 'default'
        });

        if (!response.ok) {
            throw new Error(`Arquivo não encontrado no CDN: ${fileId} (Status ${response.status})`);
        }

        // Return the raw text directly
        return await response.text();
        
    } catch (error) {
        console.error("Content Fetch Error:", error);
        throw error; // Let loadChapterByIndex handle the UI error display
    }
}

        async function loadChapterByIndex(index) {
            if (index < 0 || index >= bookStructure.length) return;
            currentIndex = index;
            const ch = bookStructure[index];
            const fileId = ch.fileId;
            
            document.getElementById('header-chapter-display').textContent = ch.title || "Carregando...";
            document.querySelectorAll('.chapter-item').forEach(el => el.classList.remove('active'));
            const activeItem = document.getElementById(`sidebar-item-${index}`);
            if (activeItem) activeItem.classList.add('active');
            document.getElementById('reader-container').scrollTop = 0;

            const contentArea = document.getElementById('content-area');
            
            if (contentCache[fileId]) {
                contentArea.innerHTML = formatRawText(contentCache[fileId]);
            } else {
                contentArea.innerHTML = `<div class="content-loader"><p>Carregando...</p></div>`;
                try {
                    const txt = await fetchContent(fileId);
                    contentCache[fileId] = txt;
                    contentArea.innerHTML = formatRawText(txt);
                } catch (error) {
                    contentArea.innerHTML = `<div style="text-align:center; margin-top:3rem; color:var(--accent-red)">Erro: ${error.message}</div>`;
                }
            }
            document.getElementById('btn-prev').disabled = (index === 0);
            document.getElementById('btn-next').disabled = (index === bookStructure.length - 1);
        }

        function changeChapter(d) { loadChapterByIndex(currentIndex + d); }

        // --- DYNAMIC MODAL SYSTEM (Cascata) ---

        // Função Genérica para Criar e Empilhar Modais
        function spawnModal(innerHtml, type = 'text', title = '') {
            const existingModals = document.querySelectorAll('.modal-wrapper');
            const zIndexBase = 1000 + (existingModals.length * 10);
            
            const wrapper = document.createElement('div');
            wrapper.className = 'modal-wrapper';
            wrapper.style.zIndex = zIndexBase;
            
            const content = document.createElement('div');
            content.className = type === 'image' ? 'modal-content image-mode' : 'modal-content';
            
            // Header padrão para ambos os tipos agora
            const headerHtml = `
                <div class="modal-header">
                    <span class="modal-title">${title}</span>
                    <button class="close-btn" onclick="closeTopModal()">&times;</button>
                </div>
            `;

            // Body
            const bodyHtml = `<div class="modal-body ${type === 'text' ? 'prose' : ''}">${innerHtml}</div>`;

            content.innerHTML = headerHtml + bodyHtml;

            wrapper.appendChild(content);
            document.body.appendChild(wrapper);

            setTimeout(() => wrapper.classList.add('visible'), 10);

            // Clicar no fundo fecha todos
            wrapper.addEventListener('click', function(e) {
                if (e.target === this) {
                    closeAllModals();
                }
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

        // --- MACRO HANDLERS ---

        async function openMacro(fileId, linkText) {
            let htmlContent = '';
            
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
    // imageUrl is now expected to be a full link (e.g., https://imgur.com/xyz.png)
    const imgHtml = `
        <img src="${imageUrl}" 
             alt="${title}" 
             onerror="this.parentElement.innerHTML='<p style=\\'color:#fff;text-align:center\\'>Erro ao carregar imagem: link inválido.</p>'">
    `;
    
    const displayTitle = title || "Visualização";
    spawnModal(imgHtml, 'image', displayTitle);
}

        init();
