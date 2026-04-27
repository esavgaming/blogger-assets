        const editor = document.getElementById('editor');
        const status = document.getElementById('status');
        const aiIndicator = document.getElementById('aiIndicator');
        
        let internalKey = ""; 
        
        window.addEventListener('load', () => {
            const saved = localStorage.getItem('textEditorContent');
            editor.innerHTML = saved || 'Comece a digitar aqui...';
            
            const savedKey = localStorage.getItem('user_gemini_key');
            if (savedKey) {
                document.getElementById('apiKeyInput').value = savedKey;
                aiIndicator.textContent = "IA: Pronta (Chave Local)";
                aiIndicator.style.color = "var(--accent)";
            }
            updateStats();
        });

        // Fix: Clean pasted content to prevent background "breaking"
        editor.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });

        function execCmd(command, value = null) {
            document.execCommand(command, false, value);
            editor.focus();
            saveLocal();
        }

        function clearFormatting() {
            document.execCommand('removeFormat');
            saveLocal();
        }

        function saveLocal() {
            localStorage.setItem('textEditorContent', editor.innerHTML);
            updateStats();
            status.textContent = 'Salvo localmente.';
            setTimeout(() => { 
                if (status.textContent === 'Salvo localmente.') status.textContent = 'Pronto.'; 
            }, 2000);
        }

        function updateStats() {
            const text = editor.innerText || "";
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            document.getElementById('wordCount').textContent = `${words} palavras`;
        }

        editor.addEventListener('input', saveLocal);

        // Modal Logic
        function openAIModal() {
            if (!window.getSelection().toString()) {
                status.textContent = "Selecione um texto primeiro!";
                return;
            }
            document.getElementById('aiModal').style.display = 'flex';
        }

        function openSettings() {
            document.getElementById('settingsModal').style.display = 'flex';
        }

        function openModal(id) {
            document.getElementById(id).style.display = 'flex';
        }

        function closeModal(id) {
            document.getElementById(id).style.display = 'none';
        }

        function saveSettings() {
            const key = document.getElementById('apiKeyInput').value;
            localStorage.setItem('user_gemini_key', key);
            aiIndicator.textContent = key ? "IA: Pronta (Chave Local)" : "IA: Desconectada";
            aiIndicator.style.color = key ? "var(--accent)" : "var(--text-muted)";
            closeModal('settingsModal');
        }

        // AI Feature Execution
        async function runAI() {
            const userKey = localStorage.getItem('user_gemini_key');
            const activeKey = internalKey || userKey;

            if (!activeKey) {
                closeModal('aiModal');
                openSettings();
                return;
            }

            const action = document.getElementById('aiAction').value;
            const selection = window.getSelection().toString();
            const loader = document.getElementById('aiLoading');
            
            loader.style.display = 'block';

            const prompts = {
                improve: "Melhore a escrita deste texto, corrigindo erros e tornando-o mais profissional:",
                summarize: "Resuma este texto de forma curta:",
                expand: "Aumente este texto adicionando mais detalhes e contexto:",
                translate: "Traduza para o inglês:"
            };

            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${activeKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: `${prompts[action]}\n\n"${selection}"` }] }]
                    })
                });

                const data = await response.json();
                const result = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (result) {
                    const range = window.getSelection().getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(result));
                    saveLocal();
                }
            } catch (err) {
                console.error(err);
                status.textContent = "Erro na conexão com a IA.";
            } finally {
                loader.style.display = 'none';
                closeModal('aiModal');
            }
        }
