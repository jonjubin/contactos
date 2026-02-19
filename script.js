// script.js

// Initialize the country list
document.addEventListener('DOMContentLoaded', () => {
    const countrySelect = document.getElementById('country');

    // Sort countries by name alphabetically
    const sortedCountries = countries.sort((a, b) => a.location.localeCompare(b.location));

    sortedCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.gl;
        option.textContent = country.location;
        if (country.relevant) {
            // Optional: Mark relevant countries visually or prioritize them?
            // For now just standard list
        }
        countrySelect.appendChild(option);
    });

    // Initialize Position Groups
    const positionSelect = document.getElementById('positionGroup');
    const definitionDiv = document.getElementById('positionDefinition');

    for (const [key, value] of Object.entries(positionGroups)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = key.replace(/_/g, ' '); // Format name nicely
        positionSelect.appendChild(option);
    }

    positionSelect.addEventListener('change', (e) => {
        const selectedGroup = e.target.value;
        if (selectedGroup && positionGroups[selectedGroup]) {
            definitionDiv.textContent = positionGroups[selectedGroup].definition;
        } else {
            definitionDiv.textContent = '';
        }
    });

    // Company Correction Logic — Webhook n8n
    const correctBtn = document.getElementById('correctBtn');
    const N8N_WEBHOOK_URL = 'https://afgnext.app.n8n.cloud/webhook/1a30a05d-49a9-4a1f-bbb1-25df97a8872d'; // ← Reemplaza con tu URL real de webhook n8n

    correctBtn.addEventListener('click', async () => {
        const companyInput = document.getElementById('company');
        const companyName = companyInput.value.trim();

        if (!companyName) {
            alert('Por favor escribe un nombre de empresa primero.');
            return;
        }

        const originalBtnText = correctBtn.innerText;
        correctBtn.innerHTML = '<span class="loading" style="width: 14px; height: 14px; border-width: 2px;"></span>';
        correctBtn.disabled = true;

        try {
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ company: companyName })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${response.status}`);
            }

            const data = await response.json();
            console.log('n8n raw response:', JSON.stringify(data));

            // Handle multiple possible response shapes from n8n:
            // 1) [{ "correct": [...] }]
            // 2) { "correct": [...] }
            // 3) string that needs extra parsing
            let options = [];
            let parsed = data;

            // If it's a string, try parsing it
            if (typeof parsed === 'string') {
                try { parsed = JSON.parse(parsed); } catch (e) { /* ignore */ }
            }

            if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
                // Direct array of strings: ["Empresa A", "Empresa B"]
                options = parsed;
            } else if (Array.isArray(parsed) && parsed[0] && Array.isArray(parsed[0].correct)) {
                // Wrapped: [{ "correct": [...] }]
                options = parsed[0].correct;
            } else if (parsed && Array.isArray(parsed.correct)) {
                // Direct object: { "correct": [...] }
                options = parsed.correct;
            }

            console.log('Parsed options:', options);

            if (options.length === 0) {
                alert('No se encontraron coincidencias para ese nombre.');
            } else if (options.length === 1) {
                // Single match — apply directly
                companyInput.value = options[0];
            } else {
                // Multiple matches — show selection modal
                showCompanyModal(options);
            }

        } catch (error) {
            console.error('Error correcting company:', error);
            alert('No se pudo corregir el nombre. Revisa la conexión con n8n.');
        } finally {
            correctBtn.innerHTML = originalBtnText;
            correctBtn.disabled = false;
        }
    });
});

// ── Modal Functions ──

function showCompanyModal(options) {
    const modal = document.getElementById('companyModal');
    const container = document.getElementById('modalOptions');
    container.innerHTML = '';

    options.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'modal-option';
        btn.textContent = name;
        btn.addEventListener('click', () => {
            document.getElementById('company').value = name;
            closeModal();
        });
        container.appendChild(btn);
    });

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('companyModal').classList.remove('active');
}

// Close modal when clicking outside
document.getElementById('companyModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeModal();
    }
});

async function performSearch() {
    const company = document.getElementById('company').value.trim();
    const countryCode = document.getElementById('country').value;
    const positionGroupKey = document.getElementById('positionGroup').value;
    const searchBtn = document.getElementById('searchBtn');
    const resultsContainer = document.getElementById('resultsBody');
    const resultsWrapper = document.getElementById('results');

    if (!company) {
        alert('Por favor introduce el nombre de una empresa.');
        return;
    }
    if (!countryCode) {
        alert('Por favor selecciona un país.');
        return;
    }
    if (!positionGroupKey) {
        alert('Por favor selecciona un grupo de posiciones.');
        return;
    }

    // UI Loading State
    const originalBtnText = searchBtn.innerText;
    searchBtn.innerHTML = '<span class="loading"></span> Buscando...';
    searchBtn.disabled = true;
    resultsWrapper.classList.remove('visible');
    resultsContainer.innerHTML = '';

    const apiKey = 'c88bfeaf586a960801c6ed74947af053fd5c5d7ff711692e5f8c13ac87536ec6';

    // Get positions from the selected group
    const positions = positionGroups[positionGroupKey].positions;
    // Join positions with OR and wrap in parentheses
    const positionsQuery = `(${positions.join(' OR ')})`;

    // Using site: operator and dynamic positions
    const query = `site:linkedin.com/in "${company}" ${positionsQuery}`;

    // Determine where we are running
    // If on Vercel (or any non-local server that supports out /api directory), use the internal API route
    // If local file system (file://) or simple python server without /api support, use the proxy

    let isLocalFile = window.location.protocol === 'file:';
    let apiUrl = '';

    if (isLocalFile) {
        // Fallback to proxy for local file testing
        const baseUrl = 'https://serpapi.com/search.json';
        apiUrl = 'https://corsproxy.io/?' + encodeURIComponent(`${baseUrl}?engine=google&q=${encodeURIComponent(query)}&gl=${countryCode}&udm=14&filter=0&api_key=${apiKey}`);
    } else {
        // Assume we are on a server (Vercel, etc). Try the API route first.
        // We construct the URL for our own API
        // Note: verify if we are on localhost with python server, api route won't exist there either.
        // So we might need a check or try/catch.

        // Let's try to fetch from /api/search first
        apiUrl = `/api/search?q=${encodeURIComponent(query)}&gl=${countryCode}`;
    }

    console.log('Fetching:', apiUrl); // Debugging

    try {
        let response = await fetch(apiUrl);

        // If the API route 404s (e.g. running on python simple server), fallback to proxy
        if (response.status === 404 && !isLocalFile) {
            console.log('API route not found, falling back to proxy...');
            const baseUrl = 'https://serpapi.com/search.json';
            const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(`${baseUrl}?engine=google&q=${encodeURIComponent(query)}&gl=${countryCode}&udm=14&filter=0&api_key=${apiKey}`);
            response = await fetch(proxyUrl);
        }

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data); // Debugging

        if (data.error) {
            throw new Error(data.error);
        }

        const items = data.organic_results || [];

        if (items.length === 0) {
            alert('No se encontraron resultados.');
        } else {
            items.forEach(item => {
                // Parse fields - More robust parsing
                const title = item.title || '';
                let name = 'N/A';
                let job = 'N/A';

                // Try to split by ' - ' which is common in LinkedIn titles
                // Pattern: Name - Job Title - Company | LinkedIn
                const titleParts = title.split(' - ');

                if (titleParts.length >= 2) {
                    name = titleParts[0].trim();
                    // Job is usually the second part, but sometimes it's mixed
                    job = titleParts.slice(1).join(' - ').replace(' | LinkedIn', '').trim();
                } else {
                    // Fallback if no separator found
                    name = title;
                }

                // Safe access to extensions
                let jo2 = '';
                if (item.rich_snippet && item.rich_snippet.top && item.rich_snippet.top.extensions && item.rich_snippet.top.extensions[1]) {
                    jo2 = item.rich_snippet.top.extensions[1];
                }

                const linkedinLink = item.link;

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${name}</strong></td>
                    <td>${job}</td>
                    <td>${jo2 ? `<span class="job-tag">${jo2}</span>` : ''}</td>
                    <td><a href="${linkedinLink}" target="_blank">Ver Perfil</a></td>
                    <td class="text-sm text-gray-500">${item.displayed_link || ''}</td>
                `;
                resultsContainer.appendChild(row);
            });
            resultsWrapper.classList.add('visible');
        }

    } catch (error) {
        console.error(error);
        alert('Hubo un error al realizar la búsqueda: ' + error.message);
    } finally {
        searchBtn.innerHTML = originalBtnText;
        searchBtn.disabled = false;
    }
}
