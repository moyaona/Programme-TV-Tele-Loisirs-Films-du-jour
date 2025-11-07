// ==UserScript==
// @name         Programme TV - Télé-Loisirs - Films du jour
// @namespace    ProgrammeTV-JVC
// @version      1.0
// @description  Liste les films du jour sur le site https://www.programme-tv.net/
// @author       moyaona
// @match        https://www.programme-tv.net/programme/toutes-les-chaines/*
// @grant        GM_addStyle
// @icon          data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAMAAABF0y+mAAAAYFBMVEX/AEv/AEj/ADX/AD7/AED/P2n//////f//ucX/KFz/pbX/AEP/gpn/iJ7/d5H/b4v/rrz/GlX/AEn/ytT/xtH/9ff/z9j/2+L/ADz/ACP/ACj/Omb/fJX/sb7/ADn/6e25I0RmAAAAsUlEQVR4AdWOBQKDQBADC5zf4e7//2U3yNZe0KkQEmQe/0YUv5EcZ4I3qTSjjFX07+7VB/VGmuE/99eYmPdRFvgvq2sURV03Laqmrru4p6BjFhLDMGLsp2EYYkV0w7uvRVUklGYk9gE+R7V4Sgv73AiHao7IbmWfm6FDtVHa4NMiMfHhg2o4fGA2XO+tSlQr++xNTRTi14cxya8PE/zto5XekHqlL5SMLtuYuBKD7a94AjjeC87CQ+aAAAAAAElFTkSuQmCC
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. Interface utilisateur ---
    const searchButton = document.createElement('button');
    searchButton.innerHTML = '🎬 Trouver les films';
    searchButton.id = 'movieSearchButton';
    document.body.appendChild(searchButton);
    searchButton.addEventListener('click', findAndShowMovies);

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'movieModalOverlay';
    const modalBox = document.createElement('div');
    modalBox.id = 'movieModalBox';
    modalBox.innerHTML = `
        <h2 id="movieModalTitle">Films du soir</h2>
        <div id="movieModalContent"></div>
        <div id="movieModalActions">
            <button id="movieModalCopyBtn">Copier</button>
            <button id="movieModalCloseBtn">Fermer</button>
        </div>
    `;
    document.body.appendChild(modalOverlay);
    document.body.appendChild(modalBox);

    const closeModal = () => {
        modalOverlay.style.display = 'none';
        modalBox.style.display = 'none';
    };
    modalOverlay.addEventListener('click', closeModal);
    modalBox.querySelector('#movieModalCloseBtn').addEventListener('click', closeModal);
    modalBox.querySelector('#movieModalCopyBtn').addEventListener('click', () => {
        const copyBtn = modalBox.querySelector('#movieModalCopyBtn');
        const textToCopy = document.getElementById('movieModalContent').innerText;
        navigator.clipboard.writeText(textToCopy).then(() => {
            copyBtn.innerHTML = 'Copié !'; copyBtn.style.backgroundColor = '#17a2b8';
            setTimeout(() => { copyBtn.innerHTML = 'Copier'; copyBtn.style.backgroundColor = '#28a745'; }, 2000);
        });
    });

    // --- 2. Style de l'interface ---
    GM_addStyle(`
        #movieSearchButton {
            position: fixed; top: 20px; right: 20px; z-index: 9990; padding: 10px 15px;
            background-color: #007bff; color: white; border: none; border-radius: 5px;
            cursor: pointer; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }
        #movieSearchButton:disabled { background-color: #555; cursor: not-allowed; }
        #movieModalOverlay {
            display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.6); z-index: 9998;
        }
        #movieModalBox {
            display: none; position: fixed; top: 50%; left: 50%;
            transform: translate(-50%, -50%); background-color: white; border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2); padding: 20px; z-index: 9999;
            width: 90%; max-width: 600px;
        }
        #movieModalTitle { margin-top: 0; color: #333; }
        #movieModalContent {
            width: 100%; height: 350px; margin-top: 10px; padding: 10px;
            font-family: monospace; font-size: 14px; border: 1px solid #ccc;
            border-radius: 4px; overflow-y: auto;
            /* La ligne "white-space: pre-wrap;" a été supprimée pour corriger le problème d'espacement */
            background-color: #f9f9f9;
        }
        #movieModalActions { display: flex; justify-content: center; gap: 15px; margin-top: 15px; }
        #movieModalCloseBtn, #movieModalCopyBtn {
            width: 100px; padding: 8px 12px; color: white; border: none;
            border-radius: 4px; cursor: pointer; transition: background-color 0.2s;
        }
        #movieModalCloseBtn { background-color: #dc3545; }
        #movieModalCopyBtn { background-color: #28a745; }
        .movie-entry {
            display: flex; justify-content: space-between; align-items: center;
            padding-bottom: 4px; margin-bottom: 4px;
        }
        .movie-info { flex-grow: 1; }
        .imdb-link { flex-shrink: 0; margin-left: 15px; }
        .imdb-logo { width: 40px; height: 20px; vertical-align: middle; }
    `);

    // --- 3. Logique de recherche ---
    const delay = ms => new Promise(res => setTimeout(res, ms));

    async function findAndShowMovies() {
        searchButton.disabled = true;

        let moviesData = [];
        document.querySelectorAll('.gridRow-cards').forEach(channelBlock => {
            const channelLink = channelBlock.querySelector('.gridRow-cardsChannelItemLink');
            if (!channelLink) return;
            let channelName = 'Chaîne inconnue';
            for (const node of channelLink.childNodes) {
                if (node.nodeType === 3 && node.textContent.trim() !== '') { channelName = node.textContent.trim(); break; }
            }
            channelBlock.querySelectorAll('.mainBroadcastCard').forEach(card => {
                const format = card.querySelector('.mainBroadcastCard-format');
                if (format && format.textContent.includes('Cinéma')) {
                    const titleElement = card.querySelector('.mainBroadcastCard-title a');
                    const timeElement = card.querySelector('.mainBroadcastCard-startingHour');
                    const timeStr = timeElement ? timeElement.textContent.trim() : '';
                    let hourNum = parseInt(timeStr.split('h')[0], 10);
                    if (isNaN(hourNum)) { hourNum = 0; }

                    moviesData.push({
                        time: timeStr || 'N/A',
                        channel: channelName,
                        title: titleElement ? titleElement.textContent.trim() : 'Titre inconnu',
                        hour: hourNum,
                        url: titleElement ? titleElement.href : null
                    });
                }
            });
        });

        if (moviesData.length === 0) {
            alert("Aucun film trouvé sur cette page.");
            searchButton.disabled = false;
            return;
        }

        let completedRequests = 0;

        for (const movie of moviesData) {
            completedRequests++;
            searchButton.innerHTML = `Recherche... (${completedRequests}/${moviesData.length})`;
            if (!movie.url) continue;

            try {
                await delay(Math.random() * 2000 + 2000);

                const response = await fetch(movie.url);
                if (!response.ok) continue;
                const text = await response.text();
                const doc = new DOMParser().parseFromString(text, 'text/html');

                const directorNode = doc.querySelector('.overview-stickerInfoListItemDirectors');
                const director = directorNode ? directorNode.textContent.replace('Réalisateur :', '').trim() : null;

                let year = null;
                const infoItems = doc.querySelectorAll('.overview-stickerInfoListItem');
                infoItems.forEach(item => {
                    const strongTag = item.querySelector('strong');
                    if (strongTag && strongTag.textContent.includes('Sortie')) {
                        const yearMatch = item.textContent.match(/\d{4}/);
                        year = yearMatch ? yearMatch[0] : null;
                    }
                });

                movie.director = director;
                movie.year = year;

            } catch (error) {
                console.error(`Erreur en scrappant ${movie.title}:`, error);
            }
        }

        displayResults(moviesData);
    }

    function displayResults(moviesData) {
        searchButton.innerHTML = '🎬 Trouver les films';
        searchButton.disabled = false;

        let resultHTML = "";
        const dateElement = document.querySelector('.timeNavigation-titleBottom');
        if (dateElement) {
            let rawDateText = dateElement.textContent.trim().replace(/^du |^de /, '');
            let dateText = rawDateText.charAt(0).toUpperCase() + rawDateText.slice(1);
            resultHTML += `<strong>${dateText}</strong><br><br>`;
        }
        const earlyMovies = moviesData.filter(m => m.hour >= 5 && m.hour < 22);
        const lateMovies = moviesData.filter(m => m.hour >= 22 || m.hour < 5);
        const imdbSvgLogo = `<svg class="imdb-logo" viewBox="0 0 448 512" fill="#f5c518"><path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zM96 400V112h32v288H96zm152-288v288h-32V112h32zm128 0v288h-32V112h32zM32.3 112v288l32-32V144l-32-32z"/></svg>`;

        const buildMovieList = (movies) => {
            let html = "";
            movies.forEach(movie => {
                const imdbSearchUrl = `https://www.imdb.com/find?q=${encodeURIComponent(movie.title)}`;
                const details = [movie.director, movie.year].filter(Boolean).join(' - ');
                html += `<div class="movie-entry">
                           <div class="movie-info">
                               <span>[${movie.time}] [${movie.channel}] : <strong>${movie.title}</strong>${details ? ` - ${details}` : ''}</span>
                           </div>
                           <a class="imdb-link" href="${imdbSearchUrl}" target="_blank" title="Rechercher sur IMDB">${imdbSvgLogo}</a>
                         </div>`;
            });
            return html;
        };

        if (earlyMovies.length > 0) {
            resultHTML += "--- DÉBUT DE SOIRÉE ---<br>";
            resultHTML += buildMovieList(earlyMovies) + "<br>";
        }
        if (lateMovies.length > 0) {
            resultHTML += "--- FIN DE SOIRÉE ---<br>";
            resultHTML += buildMovieList(lateMovies);
        }

        document.getElementById('movieModalContent').innerHTML = resultHTML || "Aucun film trouvé.";
        document.getElementById('movieModalOverlay').style.display = 'block';
        document.getElementById('movieModalBox').style.display = 'block';
    }
})();