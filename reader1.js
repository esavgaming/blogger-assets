        // --- CONFIG ---
        const API_URL_INDEX = '/api/webio/book/index';
        const API_URL_CONTENT = '/api/webio/book/content';
        const API_URL_IMAGE_BASE = '/api/content/distribution/get?image=';
        
        let currentBookId = 'ealetra'; 
        
        const API_HEADERS = {
            'Content-Type': 'application/json',
            'ESAV-Auth': '8b1d636544064f7b8bb66478002c9cb6b08970dab41e3ec7012dd4ea69dfa8d727e06423b7706dfc4751550f5643355f13806fc5ca2b9384d2141b712ea0896f',
            'ESAV-Token': 'e7d06394f4017fb0dd9467dca1e6379490d9ada40d7ec3b82f007f381c9a87aa83611a3034a51dd69cb0bba1ad2d5c35e589189477beeae25b9c391ff2530915'
        };

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

        async function init() {
            const listElement = document.getElementById('chapter-list');
            listElement.innerHTML = `<li class="status-msg">Carregando: ${currentBookId}...</li>`;

            try {
                const response = await fetch(API_URL_INDEX, {
                    method: 'POST',
                    headers: API_HEADERS,
                    body: JSON.stringify({ book: currentBookId })
                });

                if (!response.ok) throw new Error(`Status ${response.status}`);
                const data = await response.json();
                
                if (data.index && Array.isArray(data.index)) {
                    bookStructure = data.index;
                    isTestMode = false;
                    document.getElementById('test-mode-indicator').style.display = 'none';
                } else {
                     throw new Error("Índice inválido.");
                }

            } catch (error) {
                console.warn("API Fail. Test Mode.", error);
                bookStructure = FALLBACK_INDEX;
                isTestMode = true;
                document.getElementById('test-mode-indicator').style.display = 'inline-block';
                listElement.innerHTML = ''; 
            }
            
            if (bookStructure.length === 0) {
                 listElement.innerHTML = '<li class="status-msg">Vazio.</li>';
                 return;
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
            if (isTestMode) {
                await new Promise(r => setTimeout(r, 200));
                if (FALLBACK_CONTENT[fileId]) return FALLBACK_CONTENT[fileId];
                throw new Error(`[Teste] 404: ${fileId}`);
            }

            const response = await fetch(API_URL_CONTENT, {
                method: 'POST',
                headers: API_HEADERS,
                body: JSON.stringify({ 
                    book: currentBookId,
                    fileId: fileId 
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.text();
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

        function openImage(filename, title) {
            const url = `${API_URL_IMAGE_BASE}${currentBookId}:content:${filename}`;
            const imgHtml = `<img src="${url}" onerror="this.parentNode.innerHTML='<p style=\\'color:#fff;text-align:center\\'>Erro imagem.</p>'">`;
            const displayTitle = title || filename;
            spawnModal(imgHtml, 'image', displayTitle);
        }

        init();
