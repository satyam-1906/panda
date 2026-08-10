/**
 * library.js — Lazy Panda Library Dashboard
 *
 * Fetches the user's watched-video data from GET /dashboard and renders:
 *   - A searchable list of video cards (YouTube thumbnail + topic chips)
 *   - Expandable card body: embedded YouTube player on the left + topics accordion on the right
 *   - A full-screen modal video player triggered by clicking the embed or thumbnail
 *
 * Backend response shape (GET /dashboard, body: { email }):
 * {
 *   "status": "successful",
 *   "data": {
 *     "<video_id>": {
 *       "topic": ["keyword1", "keyword2", ...],
 *       "description": ["desc1", "desc2", ...]
 *     }
 *   }
 * }
 */

'use strict';

const BACKEND = 'https://confident-refinish-amid.ngrok-free.dev';

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Resolve user email from chrome.storage.local → localStorage fallback */
function getEmail() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['email'], ({ email }) => resolve(email || localStorage.getItem('email') || ''));
    } else {
      resolve(localStorage.getItem('email') || '');
    }
  });
}

/** Resolve auth token from chrome.storage.local → localStorage fallback */
function getToken() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['auth_token'], ({ auth_token }) => resolve(auth_token || localStorage.getItem('auth_token') || ''));
    } else {
      resolve(localStorage.getItem('auth_token') || '');
    }
  });
}

/** YouTube thumbnail URL (hqdefault is always available) */
function thumbUrl(videoId) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** Build the standard YouTube watch URL for the requested video ID. */
function watchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/* ── DOM references ───────────────────────────────────────────────────────── */
const stateLoading = document.getElementById('state-loading');
const stateError   = document.getElementById('state-error');
const stateEmpty   = document.getElementById('state-empty');
const errorMsg     = document.getElementById('error-msg');
const videoList    = document.getElementById('video-list');
const countLabel   = document.getElementById('count-label');
const searchInput  = document.getElementById('search-input');
const btnBack      = document.getElementById('btn-back');



/* ── State ────────────────────────────────────────────────────────────────── */
let allCards = []; // Array of { videoId, topics, descriptions, cardEl }

/* ── Show / hide states ───────────────────────────────────────────────────── */
function showState(name) {
  stateLoading.classList.add('hidden');
  stateError.classList.add('hidden');
  stateEmpty.classList.add('hidden');
  videoList.classList.add('hidden');

  if (name === 'loading') stateLoading.classList.remove('hidden');
  else if (name === 'error') stateError.classList.remove('hidden');
  else if (name === 'empty') stateEmpty.classList.remove('hidden');
  else if (name === 'list') videoList.classList.remove('hidden');
}

/* ── Render a single video card ───────────────────────────────────────────── */
function buildCard(videoId, topics, descriptions) {
  const CHIP_LIMIT = 4;

  // Topic chips preview
  const previewChips = topics.slice(0, CHIP_LIMIT).map(t =>
    `<span class="chip">${escHtml(t)}</span>`
  ).join('');
  const extraCount = topics.length - CHIP_LIMIT;
  const moreChip = extraCount > 0 ? `<span class="chip chip-more">+${extraCount} more</span>` : '';

  // Topic rows (accordion inside expanded card)
  const topicRows = topics.map((topic, i) => `
    <div class="topic-row" role="listitem">
      <div class="topic-row-header" role="button" tabindex="0" aria-expanded="false">
        <span class="topic-num">${i + 1}</span>
        <span class="topic-name">${escHtml(topic)}</span>
        <svg class="topic-chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </div>
      <div class="topic-desc">
        <div class="topic-desc-inner">${escHtml(descriptions[i] || '')}</div>
      </div>
    </div>
  `).join('');

  // Card element
  const card = document.createElement('div');
  card.className = 'video-card';
  card.dataset.videoId = videoId;
  card.setAttribute('role', 'listitem');

  card.innerHTML = `
    <div class="card-summary" role="button" tabindex="0" aria-expanded="false">
      <div class="thumb-wrap">
        <img src="${thumbUrl(videoId)}"
             alt="Thumbnail"
             loading="lazy"
             onerror="this.src='https://i.ytimg.com/vi/${videoId}/mqdefault.jpg'" />
        <div class="thumb-play" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>

      <div class="card-meta">
        <div class="video-title" id="title-${videoId}">
          youtube.com/watch?v=${videoId}
        </div>
        <div class="topic-chips">
          ${previewChips}${moreChip}
        </div>
      </div>

      <div class="card-chevron" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </div>
    </div>

    <div class="card-body" aria-hidden="true">
      <div class="body-inner">

        <!-- Expanded thumbnail surface with direct YouTube navigation -->
        <div class="yt-embed-wrap" data-video-id="${videoId}">
          <a class="yt-external-link" href="${watchUrl(videoId)}" target="_blank" rel="noopener noreferrer">
            <img src="${thumbUrl(videoId)}"
                 alt="Open video on YouTube"
                 loading="lazy"
                 onerror="this.src='https://i.ytimg.com/vi/${videoId}/mqdefault.jpg'" />
            <span class="yt-watch-label">Open on YouTube</span>
          </a>
        </div>

        <!-- Topics accordion on the right -->
        <div class="topics-panel" role="list">
          ${topicRows}
        </div>

      </div>
    </div>
  `;

  return card;
}



/* ── Attach events to a card ──────────────────────────────────────────────── */
function attachCardEvents(card) {
  const summary   = card.querySelector('.card-summary');
  const body      = card.querySelector('.card-body');
  const chevron   = card.querySelector('.card-chevron');
  const embedWrap = card.querySelector('.yt-embed-wrap');
  const videoId   = card.dataset.videoId;

  // Expand / collapse on summary click
  function toggleCard() {
    const isOpen = card.classList.toggle('open');
    summary.setAttribute('aria-expanded', isOpen);
    body.setAttribute('aria-hidden', !isOpen);
  }
  summary.addEventListener('click', toggleCard);
  summary.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(); }
  });

  // The expanded thumbnail is a direct open-on-YouTube affordance.
  const thumbWrap = card.querySelector('.thumb-wrap');
  thumbWrap.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCard();
  });

  const watchLink = card.querySelector('.yt-external-link');
  if (watchLink) {
    watchLink.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.create({ url: watchUrl(videoId) });
      } else {
        window.open(watchUrl(videoId), '_blank', 'noopener,noreferrer');
      }
    });
  }

  // Topic accordion rows
  card.querySelectorAll('.topic-row-header').forEach(header => {
    const row = header.parentElement;
    function toggleRow() {
      row.classList.toggle('open');
      header.setAttribute('aria-expanded', row.classList.contains('open'));
    }
    header.addEventListener('click', toggleRow);
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleRow(); }
    });
  });
}

/* ── HTML escape ──────────────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ── Fetch video title from noembed (best-effort, no-cors fallback) ────────── */
async function fetchTitle(videoId) {
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    const data = await res.json();
    return data.title || null;
  } catch {
    return null;
  }
}

/* ── Hydrate titles asynchronously ───────────────────────────────────────── */
async function hydrateTitles(cards) {
  for (const { videoId } of cards) {
    const title = await fetchTitle(videoId);
    if (title) {
      const el = document.getElementById(`title-${videoId}`);
      if (el) el.textContent = title;
    }
  }
}

/* ── Search filtering ─────────────────────────────────────────────────────── */
function filterCards(query) {
  const q = query.toLowerCase().trim();
  let visible = 0;

  allCards.forEach(({ videoId, topics, descriptions, cardEl }) => {
    if (!q) {
      cardEl.classList.remove('hidden');
      visible++;
      return;
    }
    const titleText = (document.getElementById(`title-${videoId}`)?.textContent || '').toLowerCase();
    const topicText = topics.join(' ').toLowerCase();
    const descText  = descriptions.join(' ').toLowerCase();
    const match = titleText.includes(q) || topicText.includes(q) || descText.includes(q) || videoId.includes(q);
    cardEl.classList.toggle('hidden', !match);
    if (match) visible++;
  });

  return visible;
}

/* ── Main ─────────────────────────────────────────────────────────────────── */
async function init() {
  showState('loading');

  const email = await getEmail();
  const token = await getToken();

  if (!email) {
    showState('error');
    errorMsg.textContent = 'Not logged in. Please log in via the extension first.';
    return;
  }

  try {
    const res = await fetch(`${BACKEND}/dashboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ email })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const payload = await res.json();

    if (payload.status !== 'successful' || !payload.data) {
      throw new Error('Unexpected response from server.');
    }

    const data = payload.data; // { videoId: { topic: [], description: [] } }
    const videoIds = Object.keys(data);

    if (videoIds.length === 0) {
      showState('empty');
      countLabel.textContent = '0 videos';
      return;
    }

    // Build cards
    videoList.innerHTML = '';
    allCards = [];

    videoIds.forEach(videoId => {
      const { topic: topics = [], description: descriptions = [] } = data[videoId];
      const card = buildCard(videoId, topics, descriptions);
      attachCardEvents(card);
      videoList.appendChild(card);
      allCards.push({ videoId, topics, descriptions, cardEl: card });
    });

    countLabel.textContent = `${videoIds.length} video${videoIds.length === 1 ? '' : 's'}`;
    showState('list');

    // Async title hydration (non-blocking)
    hydrateTitles(allCards);

  } catch (err) {
    console.error('[Library] fetch error:', err);
    showState('error');
    errorMsg.textContent = err.message || 'Something went wrong. Try again later.';
  }
}

/* ── Event listeners ──────────────────────────────────────────────────────── */



// Search
let searchDebounce;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    const visible = filterCards(searchInput.value);
    // Show empty if nothing matches
    if (visible === 0 && allCards.length > 0) {
      stateEmpty.querySelector('.state-title').textContent = 'No results found';
      stateEmpty.querySelector('.state-sub').textContent = `No videos or topics match "${searchInput.value}"`;
      stateEmpty.classList.remove('hidden');
      videoList.classList.add('hidden');
    } else {
      stateEmpty.classList.add('hidden');
      if (allCards.length > 0) videoList.classList.remove('hidden');
    }
  }, 220);
});

// Back button
btnBack.addEventListener('click', () => {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    window.close();
  } else {
    history.back();
  }
});

/* ── Bootstrap ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);
