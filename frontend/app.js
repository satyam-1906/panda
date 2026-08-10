// Tab Switcher Initialization
const tabFound = document.getElementById("tab-found");
const tabUnfound = document.getElementById("tab-unfound");
const ulFound = document.getElementById("list");
const ulUnfound = document.getElementById("unfound-list");

tabFound.addEventListener('click', () => {
    tabFound.classList.add('active');
    tabUnfound.classList.remove('active');
    ulFound.classList.remove('hidden');
    ulUnfound.classList.add('hidden');
});

tabUnfound.addEventListener('click', () => {
    tabUnfound.classList.add('active');
    tabFound.classList.remove('active');
    ulUnfound.classList.remove('hidden');
    ulFound.classList.add('hidden');
});

document.getElementById("read").addEventListener('click', async () => {
    const btn = document.getElementById("read");
    const btnText = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.loader');
    const tick = btn.querySelector('.tick');

    // Disable button and show loader
    btn.disabled = true;
    loader.classList.remove('hidden');
    tick.classList.add('hidden');

    chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
        let currentUrl = tabs[0].url; 
        console.log("The user is currently visiting: " + currentUrl);

        try {
            const response = await fetch('https://confident-refinish-amid.ngrok-free.dev/read', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Schema': 'Read' 
                },
                body: JSON.stringify({ url: currentUrl, email: localStorage.getItem('email') })
            });
            const data = await response.json();
            if (response.ok && data.status === 'successful') {
                // Success: hide loader, show tick
                loader.classList.add('hidden');
                tick.classList.remove('hidden');
                
                setTimeout(() => {
                    tick.classList.add('hidden');
                    btn.disabled = false;
                }, 3000);
            } else {
                throw new Error("Failed response or status not successful");
            }
        } catch (err) {
            console.error('Failed to connect to Python backend:', err);
            // Reset button on error
            loader.classList.add('hidden');
            btn.disabled = false;
        }
    }); 
});

document.getElementById("search").addEventListener('click', async () => {
    const btn = document.getElementById("search");
    const loader = btn.querySelector('.loader');
    const tick = btn.querySelector('.tick');
    const tabsContainer = document.getElementById("tabs");

    // Disable button and show loader
    btn.disabled = true;
    loader.classList.remove('hidden');
    tick.classList.add('hidden');

    // Reset tabs selection and lists state
    tabFound.classList.add('active');
    tabUnfound.classList.remove('active');
    tabsContainer.classList.add('hidden');
    ulUnfound.classList.add('hidden');

    // Show loading state in found list
    ulFound.innerHTML = '<li class="no-results">Searching... <span class="loader"></span></li>';
    ulFound.classList.remove('hidden');

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        let currentUrl = tabs[0].url; 
        console.log("The user is currently visiting: " + currentUrl);

        fetch('https://confident-refinish-amid.ngrok-free.dev/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Schema': 'Search' 
            },
            body: JSON.stringify({ url: currentUrl, email: localStorage.getItem('email') })
        }).then(async (response) => {
            const data = await response.json();
            console.log(data);

            const resultsFound = data.data_found;
            const resultsUnfound = data.data_unfound;

            // Success: hide loader, show tick
            loader.classList.add('hidden');
            tick.classList.remove('hidden');
            
            setTimeout(() => {
                tick.classList.add('hidden');
                btn.disabled = false;
            }, 3000);

            // Format seconds → m:ss
            const fmt = s => {
                const sec = Math.floor(Number(s));
                return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
            };

            // Render Found list
            if (!resultsFound || !resultsFound.keyword || resultsFound.keyword.length === 0) {
                ulFound.innerHTML = '<li class="no-results">No matching results found.</li>';
            } else {
                ulFound.innerHTML = resultsFound.keyword.map((kw, i) => `
                    <li data-start="${resultsFound.time_start[i]}" data-url="${currentUrl}">
                      <div class="item-header">
                        <span class="item-kw">${kw}</span>
                        <span class="item-ts">${fmt(resultsFound.time_start[i])} – ${fmt(resultsFound.time_end[i])}</span>
                        <a class="item-link" title="Jump to timestamp" data-t="${Math.floor(Number(resultsFound.time_start[i]))}">⬡</a>
                        <span class="item-arrow">▼</span>
                      </div>
                      <div class="item-body">${resultsFound.description[i]}</div>
                    </li>
                `).join('');
            }

            // Render Unfound list
            if (!resultsUnfound || !resultsUnfound.keywords || resultsUnfound.keywords.length === 0) {
                ulUnfound.innerHTML = '<li class="no-results">No unfound topics.</li>';
            } else {
                ulUnfound.innerHTML = resultsUnfound.keywords.map((kw, i) => `
                    <li data-start="${resultsUnfound.time_start[i]}" data-url="${currentUrl}">
                      <div class="item-header">
                        <span class="item-kw">${kw}</span>
                        <span class="item-ts">${fmt(resultsUnfound.time_start[i])} – ${fmt(resultsUnfound.time_end[i])}</span>
                        <a class="item-link" title="Jump to timestamp" data-t="${Math.floor(Number(resultsUnfound.time_start[i]))}">⬡</a>
                        <span class="item-arrow">▼</span>
                      </div>
                      <div class="item-body">${resultsUnfound.descriptions[i]}</div>
                    </li>
                `).join('');
            }

            // Event handler setup for list items
            const setupListHandlers = (ul) => {
                // Accordion toggle — only on header, not link
                ul.querySelectorAll('.item-header').forEach(header => {
                    header.addEventListener('click', e => {
                        if (e.target.closest('.item-link')) return;
                        header.closest('li').classList.toggle('open');
                    });
                });

                // Link button — seek the YouTube tab to the timestamp
                ul.querySelectorAll('.item-link').forEach(btnLink => {
                    btnLink.addEventListener('click', e => {
                        e.stopPropagation();
                        const t = btnLink.dataset.t;
                        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                            const tabId = tabs[0].id;
                            chrome.scripting.executeScript({
                                target: { tabId },
                                func: (seconds) => {
                                    const video = document.querySelector('video');
                                    if (video) video.currentTime = seconds;
                                },
                                args: [Number(t)]
                            });
                        });
                    });
                });
            };

            setupListHandlers(ulFound);
            setupListHandlers(ulUnfound);

            // Show tabs container
            tabsContainer.classList.remove('hidden');
        })
        .catch(err => {
            console.error('Failed to connect to Python backend:', err);
            // Reset button and list on error
            loader.classList.add('hidden');
            btn.disabled = false;
            ulFound.innerHTML = '<li class="no-results">Error connecting to backend.</li>';
        });
    }); 
});

// Library page navigation logic
const libraryBtn = document.getElementById("library-btn");
if (libraryBtn) {
    libraryBtn.addEventListener('click', () => {
        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
            chrome.tabs.create({ url: chrome.runtime.getURL('library.html') });
        } else {
            window.location.href = 'library.html';
        }
    });
}

// Logout logic
document.getElementById("logout-btn").addEventListener('click', () => {
    localStorage.removeItem('email');
    chrome.storage.local.remove(['auth_token', 'email'], () => {
        window.location.href = 'index.html';
    });
});

