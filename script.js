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

    // Using a CORS proxy to bypass browser restrictions
    // This is necessary because SerpAPI does not always return CORS headers for client-side requests
    const baseUrl = 'https://serpapi.com/search.json';
    const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(`${baseUrl}?engine=google&q=${encodeURIComponent(query)}&gl=${countryCode}&udm=14&filter=0&api_key=${apiKey}`);

    console.log('Fetching:', proxyUrl); // Debugging

    try {
        const response = await fetch(proxyUrl);

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
