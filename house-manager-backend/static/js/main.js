document.addEventListener('DOMContentLoaded', function() {
    checkStatoUtente();

    const btnCerca = document.getElementById('btn-cerca');
    if (btnCerca) {
        const newBtn = btnCerca.cloneNode(true);
        btnCerca.parentNode.replaceChild(newBtn, btnCerca);
        newBtn.addEventListener('click', function (e){
            e.preventDefault();
            console.log("click cerca rilevato");
            cercaAnnunci();
        })
    }

    if (document.getElementById('annunci-container')) {
        caricaAnnunci();
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.removeEventListener('submit', gestisciLogin);
        loginForm.addEventListener('submit', gestisciLogin);
    }

    const formReg = document.getElementById('form-registrazione');
    if(formReg) {
        formReg.addEventListener('submit', gestisciRegistrazione);
    }

    if(window.location.pathname.includes('dashboard')) {
        caricaDashboardCompleta();
    }

    if(document.getElementById('dett-titolo')) {
        caricaDettaglio();
    }
});


async function gestisciLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    if(errorDiv) errorDiv.classList.add('d-none');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));

            const modalEl = document.getElementById('loginModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();

            checkStatoUtente();

            if(window.location.pathname.includes('dashboard')) location.reload();
            else {
                alert("Bentornato, " + data.user.nome + "!")
                window.location.href="/dashboard";
            };

        } else {
            if(errorDiv) {
                errorDiv.textContent = data.messaggio || "Errore login";
                errorDiv.classList.remove('d-none');
            }
        }
    } catch (error) {
        console.error("Errore login:", error);
        if(errorDiv) {
            errorDiv.textContent = "Errore di connessione al server";
            errorDiv.classList.remove('d-none');
        }
    }
}

function checkStatoUtente() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const authSection = document.getElementById('auth-section');

    if (!authSection) return;

    if (token && userStr) {
        const user = JSON.parse(userStr);
        authSection.innerHTML = `
            <div class="dropdown">
                <a class="nav-link dropdown-toggle text-white fw-bold" href="#" role="button" data-bs-toggle="dropdown">
                    Ciao, ${user.nome || 'Utente'} <i class="fas fa-user-circle ms-1"></i>
                </a>
                <ul class="dropdown-menu dropdown-menu-end">
                    <li><a class="dropdown-item" href="/dashboard">Il mio profilo</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><a class="dropdown-item text-danger" href="#" onclick="logout()">Esci</a></li>
                </ul>
            </div>
        `;
    } else {
        authSection.innerHTML = `
            <a class="nav-link text-white" href="#" data-bs-toggle="modal" data-bs-target="#loginModal">
                Accedi <i class="fas fa-user-circle fa-lg ms-1"></i>
            </a>
        `;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = "/";
}

async function gestisciRegistrazione(event) {
    event.preventDefault();

    const nome = document.getElementById('reg-nome').value;
    const cognome = document.getElementById('reg-cognome').value;
    const email = document.getElementById('reg-email').value;
    const telefono = document.getElementById('reg-telefono')?.value || "";
    const passField = document.getElementById('reg-password');
    const password = passField && passField.value ? passField.value : "";
    const ruoloField = document.getElementById('reg-ruolo');
    const professioneField = document.getElementById('reg-tipo-pro');
    const ruolo = ruoloField ? ruoloField.value : "Acquirente";
    const cittaOperativa = document.getElementById('reg-citta-operativa')?.value  || "";
    const tipoProfessione = professioneField ? professioneField.value : "";
    const datiUtente = {
        nome: nome,
        cognome: cognome,
        email: email,
        numero_di_telefono: telefono,
        password: password,
        ruolo: ruolo,
        dati_professionali: {
            tipo: tipoProfessione,
            citta_operativa: cittaOperativa
        },
        data_di_nascita: document.getElementById('reg-data')?.value || null,
        codice_fiscale: document.getElementById('reg-cf')?.value || "",
        via: document.getElementById('reg-via')?.value || "",
        civico: document.getElementById('reg-civico')?.value || "",
        citta: document.getElementById('reg-citta')?.value || ""
    };

    try {
        const res = await fetch('/api/registrazione', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datiUtente)
        });

        const result = await res.json();


        if (res.ok) {
            alert(result.messaggio);
            window.location.reload();
        } else {
            alert("Errore: " + (result.messaggio || result.errore || "Errore sconosciuto"));
        }
    } catch (error) {
        console.error("Errore chiamata:", error);
        alert("Errore di connessione al server.");
    }
}



async function caricaAnnunci() {
    console.log(" Caricamento annunci iniziali...");
    try {
        const titolo = document.getElementById('titolo-lista');
        if(titolo) titolo.textContent = "Annunci più recenti"

        const response = await fetch('/api/annunci');
        if (!response.ok) throw new Error(`Errore HTTP: ${response.status}`);
        const annunci = await response.json();
        renderizzaAnnunci(annunci);
    } catch (error) {
        console.error("ERRORE caricaAnnunci:", error);
        mostraErrore("Errore caricamento annunci.");
    }
}

async function cercaAnnunci() {
    console.log(" Avvio ricerca...");

    const titoloHTML = document.getElementById('titolo-lista');
    if(titoloHTML) titoloHTML.textContent = "Risultati Ricerca:";

    const textSearch = document.getElementById('search-text')?.value || '';
    const tipoImmobile = document.getElementById('filtro-tipo')?.value || '';
    const prezzoMax = document.getElementById('filtro-prezzo')?.value || '';

    const stanzeMin = document.getElementById('filtro-stanze')?.value || '';
    const mqMin = document.getElementById('filtro-mq')?.value || '';

    const garage = document.getElementById('check-garage')?.checked ? 'true' : '';
    const balcone = document.getElementById('check-balcone')?.checked ? 'true' : '';
    const ascensore = document.getElementById('check-ascensore')?.checked ? 'true' : '';
    const bagniMin = document.getElementById('filtro-bagni')?.value || '';
    const giardino = document.getElementById('check-giardino')?.checked ? 'true' : '';
    const arredato = document.getElementById('check-arredato')?.checked ? 'true' : '';

    const params = new URLSearchParams({
        q: textSearch,
        tipo: tipoImmobile,
        prezzo_max: prezzoMax,
        stanze: stanzeMin,
        mq: mqMin,
        bagni: bagniMin,
        garage: garage,
        balcone: balcone,
        ascensore: ascensore,
        giardino: giardino,
        arredato: arredato
    });

    try {
        const url = `/api/annunci?${params.toString()}`;
        console.log("Chiamata URL:", url);

        const response = await fetch(url);
        if (!response.ok) throw new Error("Errore server " + response.status);

        const annunci = await response.json();

        renderizzaAnnunci(annunci);

    } catch (error) {
        console.error(error);
        const container = document.getElementById('annunci-container');
        if(container) container.innerHTML = `<p class="text-danger text-center">Errore durante la ricerca.</p>`;
    }
}

function renderizzaAnnunci(listaAnnunci) {
    const container = document.getElementById('annunci-container');
    if(!container) return;
    container.innerHTML = '';

    if (!Array.isArray(listaAnnunci) || listaAnnunci.length === 0) {
        container.innerHTML = `<div class="col-12 text-center py-5"><h4>Nessun risultato trovato</h4></div>`;
        return;
    }

    const PLACEHOLDER = "https://placehold.co/600x400?text=Foto+Non+Disponibile";

    listaAnnunci.forEach(annuncio => {
        let imgUrl = PLACEHOLDER;
        if (annuncio.foto && annuncio.foto.length > 0) imgUrl = annuncio.foto[0].url;

        let badgeHtml = '';
        if (annuncio.stato === 'TRATTATIVA') {
            badgeHtml = `<span class="badge bg-warning text-dark position-absolute top-0 end-0 m-3 shadow">IN TRATTATIVA</span>`;
        } else if (annuncio.stato === 'VENDUTO') {
            badgeHtml = `<span class="badge bg-danger text-white position-absolute top-0 end-0 m-3 shadow">VENDUTO</span>`;
        } else {
            badgeHtml = `<span class="badge bg-primary position-absolute top-0 end-0 m-3 shadow">NUOVO</span>`;
        }

        const html = `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 shadow-sm border-0 card-hover">
                    <div style="height: 220px; overflow: hidden;" class="position-relative bg-light">
                        <img src="${imgUrl}" class="w-100 h-100" style="object-fit: cover;">
                        ${badgeHtml} </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="fw-bold text-dark text-truncate">${annuncio.titolo}</h5>
                        <p class="text-muted small"><i class="fas fa-map-marker-alt text-danger me-1"></i> ${annuncio.casa?.citta || 'Città ND'}</p>
                        <div class="mt-auto">
                            <h4 class="fw-bold text-primary">€ ${annuncio.prezzo_base ? annuncio.prezzo_base.toLocaleString() : 'ND'}</h4>
                            <a href="/annuncio/${annuncio.id}" class="btn btn-outline-primary fw-bold rounded-pill w-100 mt-2">Dettagli</a>
                        </div>
                    </div>
                </div>
            </div>`;
        container.innerHTML += html;
    });
}

function mostraErrore(messaggio) {
    const container = document.getElementById('annunci-container');
    if(container) container.innerHTML = `<p class="text-danger text-center w-100 fw-bold">${messaggio}</p>`;
}


async function caricaDashboardCompleta() {
    const token = localStorage.getItem('token');
    if(!token) {
        if(window.location.pathname.includes('dashboard')) window.location.href = "/";
        return;
    }

    const ruoloScaricato = await caricaDatiUtente();
    const ruoloCheck = (ruoloScaricato || '').toLowerCase();

    const isAgente = ruoloCheck.includes('agente');
    const isConsulente = !isAgente && (ruoloCheck.includes('notaio') || ruoloCheck.includes('architetto') || ruoloCheck.includes('arredatore') || ruoloCheck === 'professionista');

    let tipoUtente = 'cliente';
    if (isAgente) tipoUtente = 'agente';
    else if (isConsulente) tipoUtente = 'consulente';

    const dashPrivato = document.getElementById('dashboard-privato');
    const sezAppAgente = document.getElementById('sezione-appuntamenti-agente');
    const sezConsProf = document.getElementById('sezione-consulenze-professionista');
    const btnConsulenza = document.getElementById('btn-richiedi-consulenza');

    if (!dashPrivato && !sezAppAgente && !sezConsProf) return;

    if (tipoUtente === 'agente' || tipoUtente === 'consulente') {
        if (dashPrivato) dashPrivato.style.display = 'none'; 
        if (btnConsulenza) btnConsulenza.classList.add('d-none');

        if (tipoUtente === 'agente') {
            if (sezAppAgente) sezAppAgente.classList.remove('d-none');
            if (sezConsProf) sezConsProf.classList.add('d-none');
        } else {
            if (sezAppAgente) sezAppAgente.classList.add('d-none');
            if (sezConsProf) sezConsProf.classList.remove('d-none');
        }
    } else {
        if (dashPrivato) dashPrivato.style.display = 'block'; 
        if (sezAppAgente) sezAppAgente.classList.add('d-none');
        if (sezConsProf) sezConsProf.classList.add('d-none');

        if (dashPrivato) {
            await caricaOfferteInviate();
            await caricaOfferteRicevute();
            await caricaMieiAnnunci();
        }
    }

    await caricaCalendario(tipoUtente);
}

async function caricaDatiUtente() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
        const res = await fetch('/api/profile', {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (res.ok) {
            const data = await res.json();
            console.log("👉 DATI RICEVUTI DAL SERVER:", data);

            
            document.getElementById('profile-nome-completo').textContent = `${data.nome || ''} ${data.cognome || ''}`.trim();
            document.getElementById('profile-email').textContent = data.email || 'Non specificata';

            let dataNascita = "Non specificata";
            if (data.data_di_nascita && data.data_di_nascita.trim() !== "") {
                const d = new Date(data.data_di_nascita);
                if(!isNaN(d.getTime())) dataNascita = d.toLocaleDateString('it-IT');
            }
            const elNascita = document.getElementById('profile-nascita');
            if(elNascita) elNascita.textContent = dataNascita;

            let indirizzoCompleto = "Non specificato";
            if (data.via && data.via.trim() !== "") {
                indirizzoCompleto = data.via + (data.civico ? `, ${data.civico}` : '');
            }
            const elIndirizzo = document.getElementById('profile-indirizzo');
            if(elIndirizzo) elIndirizzo.textContent = indirizzoCompleto;

            const labelCitta = document.getElementById('label-citta');
            const spanCitta = document.getElementById('profile-citta');
            const iconaCitta = document.getElementById('icona-citta');
            const badge = document.getElementById('profile-ruolo-badge');
            
            const boxNascita = document.getElementById('box-nascita');
            const boxIndirizzo = document.getElementById('box-indirizzo');

            let ruoloEsatto = data.ruolo || 'Utente';

            if (data.ruolo === 'Professionista') {
                ruoloEsatto = data.tipo_professionista || 'Professionista';
                
                if (badge) {
                    badge.textContent = ruoloEsatto.toUpperCase();
                    badge.className = 'badge bg-primary text-uppercase fs-6';
                }
                if (labelCitta) labelCitta.textContent = 'Zona Operativa';
                if (iconaCitta) iconaCitta.className = 'fas fa-briefcase text-success me-1';
                if (spanCitta) spanCitta.textContent = data.citta_operativa ? data.citta_operativa : 'Non specificata';
                
                if (ruoloEsatto === 'Agente Immobiliare') {
                    if(boxNascita) boxNascita.style.display = 'none';
                    if(boxIndirizzo) boxIndirizzo.style.display = 'none';
                }

            } else {
                if (badge) {
                    badge.textContent = (data.ruolo || 'UTENTE').toUpperCase();
                    badge.className = 'badge bg-secondary text-uppercase fs-6';
                }
                if (labelCitta) labelCitta.textContent = 'Città di Residenza';
                if (iconaCitta) iconaCitta.className = 'fas fa-map-marker-alt text-danger me-1';
                
                if (spanCitta) spanCitta.textContent = data.citta && data.citta.trim() !== "" ? data.citta : 'Non specificata';
                
                if(boxNascita) boxNascita.style.display = 'block';
                if(boxIndirizzo) boxIndirizzo.style.display = 'block';
            }
    
            return ruoloEsatto; 

        }
    } catch(e) {
        console.error("Errore caricamento profilo JS:", e);
    }
    return null;
}


async function caricaMieiAnnunci(){
    const container = document.getElementById('container-miei-annunci');
    if(!container) return;
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/annunci?venditore_id=me', {
            headers: {'Authorization': 'Bearer ' + token}
        })

        const annunci = await res.json();
        container.innerHTML = '';
        if (annunci.leght === 0) {
            container.innerHTML = '<p class="text-muted p-3">Non hai pubblicato ancora nessun annuncio </p>'
            return
        }
        annunci.forEach(ann => {
            let imgUrl = "https://placehold.co/150x150?text=Foto";
            if (ann.foto && ann.foto.length > 0) imgUrl = ann.foto[0].url;

            const btnHtml = `
                <a href="/annuncio/${ann.id}" class=" btn btn-sm btn-outline-primary w-100 fw-bold">
                    Vedi dettagli
                </a>
            `;
            
            let badgeText = "Pubblicato";
            let badgeColor = "bg-primary";

            if (ann.stato === 'TRATTATIVA') {
                badgeText = "In Trattativa";
                badgeColor = "bg-warning text-dark";
            } else if (ann.stato === 'VENDUTO') {
                badgeText = "Venduto";
                badgeColor = "bg-danger";
            }

            container.innerHTML += getCardHTML(
                ann.titolo,
                `Prezzo: <b>${ann.prezzo_base.toLocaleString()} €</b><br>${ann.casa?.citta || ''}`,
                imgUrl,
                btnHtml,
                badgeText,
                badgeColor
            );
        })
    } catch(e){
        console.error("Errore mmiei annunci:", e);
        container.innerHTML = '<p class="text-danger p-3">Errroe caricamento annunci</p>'
    }
}

function getCardHTML(titolo, sottotitolo, imgUrl, htmlBottone, badgeText, badgeColor) {
    const img = imgUrl || "https://placehold.co/150x150?text=Casa";
    return `
    <div class="col-auto">
        <div class="dashboard-card d-flex border rounded shadow-sm bg-white" style="min-width: 350px; max-width: 350px; overflow: hidden;">
            <img src="${img}" style="width: 120px; height: 100%; min-height:130px; object-fit: cover;">
            <div class="p-3 d-flex flex-column justify-content-between w-100 position-relative">
                ${badgeText ? `<span class="badge ${badgeColor} position-absolute top-0 end-0 m-2">${badgeText}</span>` : ''}
                <div>
                    <h6 class="fw-bold mb-1 text-truncate" style="max-width: 180px;">${titolo}</h6>
                    <small class="text-muted d-block mb-2" style="font-size: 0.8rem;">${sottotitolo}</small>
                </div>
                <div class="mt-auto pt-2 w-100">
                    ${htmlBottone}
                </div>
            </div>
        </div>
    </div>`;
}

async function caricaOfferteInviate() {
    const container = document.getElementById('container-offerte-inviate');
    if (!container) return;

    const token = localStorage.getItem('token');

    const url = `/api/offerte?tipo=inviate&_t=${Date.now()}`;

    try {
        const res = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const dati = await res.json();

        container.innerHTML = '';

        if (dati.length === 0) {
            container.innerHTML = '<p class="text-muted">Nessuna offerta inviata.</p>';
            return;
        }

        dati.forEach(off => {
            let btnHtml = '';

            if (off.stato === "ACCETTATA") {
                btnHtml = `<div class="btn btn-success w-100 fw-bold disabled" style="opacity:1;">ACCETTATA</div>`;
            } else if (off.stato === "RIFIUTATA") {
                btnHtml = `<div class="btn btn-danger w-100 fw-bold disabled" style="opacity:1;">RIFIUTATA</div>`;
            } else {
                btnHtml = `<div class="btn btn-warning w-100 fw-bold disabled" style="opacity:1;">IN ATTESA</div>`;
            }

            
            let imgUrl = null;
            if (off.foto && off.foto.length > 0) { 
                imgUrl = off.foto[0].url || off.foto[0]; 
            } else if (off.foto_copertina) { 
                imgUrl = off.foto_copertina; 
            } else if (off.immagine) {
                imgUrl = off.immagine;
            }

            const bloccoImmagine = imgUrl 
                ? `<img src="${imgUrl}" class="img-fluid rounded-start h-100 w-100" style="object-fit: cover; min-height: 140px;" alt="Immobile">`
                : `<div class="h-100 w-100 bg-light d-flex align-items-center justify-content-center" style="min-height: 140px;"><i class="fas fa-home fa-2x text-muted"></i></div>`;

            const html = `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card shadow-sm border-0 h-100 overflow-hidden">
                    <div class="row g-0 h-100 align-items-center">
                        <div class="col-4 h-100 p-0">
                            ${bloccoImmagine}
                        </div>
                        <div class="col-8">
                            <div class="card-body py-2 px-3">
                                <h6 class="card-title fw-bold text-truncate mb-1">${off.titolo_annuncio || "Annuncio"}</h6>
                                <p class="card-text small mb-2 text-secondary" style="line-height: 1.2;">
                                    Offerta: <b class="text-dark">${off.importo.toLocaleString()} €</b><br>
                                    Data: ${new Date(off.data).toLocaleDateString('it-IT')}
                                </p>
                                <div class="mt-2">
                                    ${btnHtml}
                                </div>
                                <small class="text-muted d-block mt-2" style="font-size: 0.65rem;">ID: ${off.id}</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

            container.innerHTML += html;
        });
    } catch(e) {
        console.error("Errore caricamento offerte inviate:", e);
    }
}



async function caricaOfferteRicevute() {
    const container = document.getElementById('container-offerte-ricevute');
    if (!container) return;

    const token = localStorage.getItem('token');
    const url = `/api/offerte?tipo=ricevute&_t=${Date.now()}`;

    try {
        const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
        const offerte = await res.json();

        container.innerHTML = ''; 

        if (offerte.length === 0) {
            container.innerHTML = '<p class="text-muted">Nessuna offerta ricevuta.</p>';
            return;
        }

        offerte.forEach(off => {
            let contenutoAzioni = '';

            if (off.stato === 'IN ATTESA') {
                contenutoAzioni = `
                    <button class="btn btn-success btn-sm flex-grow-1 fw-bold" 
                            onclick="gestisciOfferta('${off.id}', 'ACCETTATA')">
                        Accetta
                    </button>
                    <button class="btn btn-outline-danger btn-sm flex-grow-1 fw-bold" 
                            onclick="gestisciOfferta('${off.id}', 'RIFIUTATA')">
                        Rifiuta
                    </button>
                `;
            } else {
                const colore = off.stato === 'ACCETTATA' ? 'bg-success' : 'bg-danger';
                contenutoAzioni = `
                    <div class="text-center p-2 rounded ${colore} text-white fw-bold w-100">
                        OFFERTA ${off.stato}
                    </div>
                `;
            }

            const htmlCard = `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card shadow-sm border-0 h-100">
                    <div class="card-body">
                        <h6 class="fw-bold text-primary mb-1">${off.titolo_annuncio}</h6>
                        <small class="text-muted">Offerta da ${off.nome_acquirente || 'Utente'}</small>
                        <h3 class="fw-bold my-2 text-dark">${off.importo.toLocaleString()} €</h3>
                        <p class="small text-muted bg-light p-2 rounded">"${off.messaggio || '...'}"</p>
                        
                        <div id="box-azioni-${off.id}" class="mt-3 d-flex gap-2 w-100">
                            ${contenutoAzioni}
                        </div>

                    </div>
                </div>
            </div>`;

            container.innerHTML += htmlCard;
        });

    } catch (error) {
        console.error("Errore offerte:", error);
    }
}

async function gestisciOfferta(idOfferta, nuovoStato) {
    if (!confirm(`Vuoi davvero confermare lo stato: ${nuovoStato}?`)) return;

    const token = localStorage.getItem('token');

    const boxAzioni = document.getElementById(`box-azioni-${idOfferta}`);
    const vecchioHtml = boxAzioni ? boxAzioni.innerHTML : '';

    if (boxAzioni) {
        const colore = nuovoStato === 'ACCETTATA' ? 'bg-success' : 'bg-danger';
        boxAzioni.innerHTML = `
            <div class="text-center p-2 rounded ${colore} text-white fw-bold w-100 shadow-sm">
                OFFERTA ${nuovoStato}
            </div>
        `;
    }

    try {
        const res = await fetch(`/api/offerte/${idOfferta}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ stato: nuovoStato })
        });

        if (!res.ok) {
            if(boxAzioni) boxAzioni.innerHTML = vecchioHtml;

            const data = await res.json();
            alert("Errore: " + (data.errore || "Operazione fallita"));
        } else {
            console.log("Salvataggio completato con successo.");
        }

    } catch (e) {
        console.error("Errore:", e);
        if(boxAzioni) boxAzioni.innerHTML = vecchioHtml;
        alert("Errore di connessione.");
    }
}

let annuncioCorrenteId = null;
let agenteSelezionatoId = null;

async function caricaDettaglio() {
    const id = window.location.pathname.split('/').pop();

    try {
        const response = await fetch(`/api/annunci/${id}`);
        if(!response.ok) throw new Error("Annuncio non trovato");
        const annuncio = await response.json();

        const tipo = annuncio.casa?.tipo_immobile || "Immobile";
        const indirizzo = `${annuncio.casa?.citta || ''}, ${annuncio.casa?.indirizzo || ''} ${annuncio.casa?.civico || ''}`;
        document.getElementById('dett-titolo').textContent = `${tipo} - ${indirizzo}`;
        document.getElementById('dett-data').textContent = annuncio.data_pubblicazione ? new Date(annuncio.data_pubblicazione).toLocaleDateString() : "ND";
        document.getElementById('dett-venditore').textContent = annuncio.venditore_nome || "Utente";

        const mainImg = document.getElementById('dett-main-img');
        if (annuncio.foto && annuncio.foto.length > 0) mainImg.src = annuncio.foto[0].url;
        else mainImg.src = "https://placehold.co/800x500?text=No+Foto";

        const ribbon = document.getElementById('dett-stato');
        if(ribbon) {
            ribbon.textContent = annuncio.stato || "ATTIVO";
            ribbon.className = `ribbon ${annuncio.stato === 'VENDUTO' ? 'venduto' : 'attivo'}`;
        }

        document.getElementById('dett-prezzo').textContent = annuncio.prezzo_base ? annuncio.prezzo_base.toLocaleString() + ' €' : "ND";
        document.getElementById('dett-descrizione').textContent = annuncio.descrizione || "Nessuna descrizione.";

        const galleryContainer = document.getElementById('dett-gallery');
        galleryContainer.innerHTML = '';
        if (annuncio.foto) {
            annuncio.foto.forEach((foto, idx) => {
                galleryContainer.innerHTML += `
                    <div class="col-3 col-md-2">
                        <div class="ratio ratio-4x3">
                            <img src="${foto.url}" class="thumb-img w-100 h-100 rounded object-fit-cover border ${idx===0?'active':''}" 
                                 onclick="cambiaFotoPrincipale('${foto.url}', this)">
                        </div>
                    </div>`;
            });
        }

        
        const carList = document.getElementById('lista-caratteristiche');
        carList.innerHTML = '';
        const addCar = (icon, label, val) => {
            if(!val) return;
            const display = val === true ? 'Sì' : val;
            carList.innerHTML += `
                <div class="col-6 mb-2">
                    <div class="d-flex align-items-center text-muted">
                        <i class="fas ${icon} fa-lg me-3 text-secondary" style="width:25px;"></i>
                        <div><small class="d-block text-uppercase">${label}</small><span class="fw-bold text-dark">${display}</span></div>
                    </div>
                </div>`;
        };

        const c = annuncio.caratteristiche || {};
        const h = annuncio.casa || {};
        addCar('fa-ruler-combined', 'Mq', c.metri_quadri);
        addCar('fa-door-open', 'Stanze', c.numero_stanze);
        addCar('fa-bed', 'Piano', h.piano);
        addCar('fa-elevator', 'Ascensore', h.ascensore);
        addCar('fa-warehouse', 'Garage', c.garage);
        addCar('fa-wind', 'Clima', c.climatizzazione);
        addCar('fa-tree', 'Giardino', c.giardino);

        const btnAppuntamento = document.getElementById('btn-richiedi-appuntamento');
        if(btnAppuntamento){
            btnAppuntamento.onclick = () => apriModaleAppuntamento(annuncio.id);
        }

    } catch (error) { console.error(error); }
}

function cambiaFotoPrincipale(url, element) {
    document.getElementById('dett-main-img').src = url;
    document.querySelectorAll('.thumb-img').forEach(img => img.classList.remove('active'));
    element.classList.add('active');
}


async function gestisciPubblicazione(event) {
    event.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) { alert("Login richiesto"); return; }

    const formData = new FormData();
    ['pub-titolo', 'pub-prezzo', 'pub-descrizione', 'pub-citta', 'pub-civico', 'pub-indirizzo', 'pub-mq', 'pub-stanze', 'pub-giardino'].forEach(id => {
        const el = document.getElementById(id);
        if(el) formData.append(id.replace('pub-', ''), el.value);
    });


    formData.append('tipologia', document.getElementById('pub-tipologia')?.value || 'Vendita');
    formData.append('tipologia_immobile', document.getElementById('pub-tipo-immobile')?.value || 'Appartamento');


    ['pub-garage', 'pub-balcone', 'pub-ascensore', 'pub-clima', 'pub-giardino'].forEach(id => {
        const el = document.getElementById(id);
        if(el) formData.append(id.replace('pub-', ''), el.checked);
    });

 
    const files = document.getElementById('pub-foto')?.files;
    if(files) {
        for(let i=0; i<files.length; i++) formData.append('foto', files[i]);
    }

    try {
        const res = await fetch('/api/annunci', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: formData
        });
        const data = await res.json();
        if(res.ok) { alert("Pubblicato!"); window.location.href="/"; }
        else alert("Errore: " + data.errore);
    } catch(e) { console.error(e); alert("Errore server"); }
}


function apriModaleOfferta() {
    const p = document.getElementById('dett-prezzo').textContent;
    document.getElementById('modal-prezzo-display').textContent = p;
    document.getElementById('off-importo').value = '';
    new bootstrap.Modal(document.getElementById('modalOfferta')).show();
}

async function inviaOfferta() {
    const id = window.location.pathname.split('/').pop();
    const importo = document.getElementById('off-importo').value;
    const msg = document.getElementById('off-msg').value;
    const token = localStorage.getItem('token');

    if(!token) { alert("Login richiesto"); return; }
    if(!importo) { alert("Inserisci importo"); return; }

    try {
        const res = await fetch('/api/offerte', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
            body: JSON.stringify({ annuncio_id: id, importo: importo, messaggio: msg })
        });
        if(res.ok) { alert("Offerta Inviata!"); location.reload(); }
        else { const d = await res.json(); alert("Errore: " + d.errore); }
    } catch(e) { console.error(e); }
}

async function apriModaleAppuntamento(idAnnuncio){
    annuncioCorrenteId = idAnnuncio;
    agenteSelezionatoId = null;

    document.getElementById('dataAppuntamento').value="";
    document.getElementById('appuntamento-error').classList.add('d-none');
    document.getElementById('appuntamento-success').classList.add('d-none');

    const contenitoreAgenti = document.getElementById('lista-agenti');
    contenitoreAgenti.innerHTML = '<p class="text-muted">Ricerca agenti in zona in corso...</p>';

    const modalEl = document.getElementById('modaleAppuntamenti');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    try{
        const response = await fetch(`/api/agenti_vicini/${idAnnuncio}`);
        const agenti = await response.json();

        if(response.ok && agenti.length > 0){
            contenitoreAgenti.innerHTML = '';
            agenti.forEach(agente =>{
                const cardHTML = `
                    <div class="card card-agente p-3 text-center shadow-sm" id="card-${agente.id}" onclick="selezionaAgente('${agente.id}')">
                        <div class="fw-bold">${agente.nome} ${agente.cognome}</div>
                        <small class="text-muted mt-1">Agente Immobiliare</small>
                    </div>
                `;
                contenitoreAgenti.innerHTML += cardHTML;
            });
        } else {
            contenitoreAgenti.innerHTML = '<p class="text-warning m-0">Nessun agente disponibile in quest\'area.</p>';
        }
    } catch(error){
        console.error("Errore recupero agenti:", error);
        contenitoreAgenti.innerHTML = '<p class="text-danger m-0">Errore di connessione al server</p>';
    }
}



function selezionaAgente(idAgente){
    window.agenteSelezionatoId = idAgente;
    
    document.querySelectorAll('.card-agente').forEach(card => {
        card.classList.remove('border', 'border-primary', 'bg-light', 'selezionato');
    });
    
    const cardCliccata = document.getElementById(`card-${idAgente}`);
    if(cardCliccata) {
        cardCliccata.classList.add('border', 'border-primary', 'bg-light', 'selezionato');
    }
}

async function inviaRichiestaAppuntamento() {
    const errorDiv = document.getElementById('appuntamento-error');
    const successDiv = document.getElementById('appuntamento-success');
    errorDiv.classList.add('d-none');
    successDiv.classList.add('d-none');

    const dataSelezionata = document.getElementById('dataAppuntamento').value;

    if(!window.agenteSelezionatoId){
        errorDiv.textContent="Seleziona un agente cliccando sulla sua scheda.";
        errorDiv.classList.remove('d-none');
        return;
    }

    if(!dataSelezionata){
        errorDiv.textContent = "Scegli una data e un orario validi.";
        errorDiv.classList.remove('d-none');
        return;
    }

    const userData = JSON.parse(localStorage.getItem('user'));
    if(!userData){
        errorDiv.textContent = "Devi effettuare l'accesso per prenotare.";
        errorDiv.classList.remove('d-none');
        return;
    }

    try{
        const response = await fetch('/api/appuntamenti', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                cliente_id: userData.id,
                agente_id: window.agenteSelezionatoId,
                annuncio_id: annuncioCorrenteId,
                data_inizio: dataSelezionata 
            })
        });

        const result = await response.json(); 

        if(response.ok){
            successDiv.textContent="Richiesta inviata con successo!";
            successDiv.classList.remove('d-none');
            setTimeout(() => {
                const modalEl = document.getElementById('modaleAppuntamenti');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if(modal) modal.hide();
            }, 2000);
        } else {
            errorDiv.textContent = result.errore || "Errore durante l'invio della richiesta.";
            errorDiv.classList.remove('d-none');
        }
    } catch (error){
        errorDiv.textContent = "Errore di connessione al server";
        errorDiv.classList.remove('d-none'); 
    }
}


let appuntamentiGlobali = [];
let dataCalendario = new Date(); 



async function caricaCalendario(tipoUtente) { 
    const userData = JSON.parse(localStorage.getItem('user'));
    if(!userData) return;

    let url = `/api/appuntamenti/cliente/${userData.id}`; 

    if (tipoUtente === 'agente') {
        url = `/api/appuntamenti/agente/${userData.id}`;
    } else if (tipoUtente === 'consulente') {
        url = `/api/consulenze/professionista/${userData.id}`;
    }

    try {
        const res = await fetch(url);
        if(res.ok) {
            appuntamentiGlobali = await res.json();
            
            if (tipoUtente === 'agente') {
                renderListeAppuntamentiOriginali(); 
            } else if (tipoUtente === 'consulente') {
                renderListeConsulenzeNuove();
            }
            
            renderCalendario(dataCalendario.getFullYear(), dataCalendario.getMonth());
        }
    } catch(e) {
        console.error("Errore caricamento calendario:", e);
    }
}
function renderListeAppuntamentiOriginali() {
    const containerRicevuti = document.getElementById('lista-richieste-ricevute');
    const containerConfermati = document.getElementById('lista-appuntamenti-confermati');
    if(!containerRicevuti || !containerConfermati) return;

    containerRicevuti.innerHTML = '';
    containerConfermati.innerHTML = '';

    const inAttesa = appuntamentiGlobali.filter(a => a.stato === 'IN ATTESA');
    const confermati = appuntamentiGlobali.filter(a => a.stato === 'CONFERMATO');

    if(inAttesa.length === 0) containerRicevuti.innerHTML = '<p class="text-muted m-0">Nessuna richiesta in attesa.</p>';
    inAttesa.forEach(app => {
        const d = new Date(app.data_inizio);
        containerRicevuti.innerHTML += `
            <div class="card d-inline-block me-3 shadow-sm border-0 border-start border-warning border-4" style="min-width: 280px; white-space: normal; vertical-align: top;">
                <div class="card-body bg-light p-3">
                    <h6 class="fw-bold text-dark text-truncate">${app.annuncio_titolo}</h6>
                    <p class="mb-1 small"><i class="far fa-clock"></i> ${d.toLocaleDateString('it-IT')} alle ${d.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</p>
                    <p class="mb-2 small text-secondary"><i class="far fa-user"></i> ${app.cliente_nome}</p>
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-sm btn-success w-50 fw-bold shadow-sm" onclick="aggiornaStato('${app.id}', 'CONFERMATO', 'appuntamento')">Accetta</button>
                        <button class="btn btn-sm btn-danger w-50 fw-bold shadow-sm" onclick="aggiornaStato('${app.id}', 'RIFIUTATO', 'appuntamento')">Rifiuta</button>
                    </div>
                </div>
            </div>`;
    });

    if(confermati.length === 0) containerConfermati.innerHTML = '<p class="text-muted m-0">Nessun appuntamento in agenda.</p>';
    confermati.forEach(app => {
        const d = new Date(app.data_inizio);
        containerConfermati.innerHTML += `
            <div class="card d-inline-block me-3 shadow-sm border-0 border-start border-success border-4" style="min-width: 280px; white-space: normal; vertical-align: top;">
                <div class="card-body bg-light p-3">
                    <h6 class="fw-bold text-dark text-truncate">${app.annuncio_titolo}</h6>
                    <span class="badge bg-success mb-2"><i class="fas fa-check"></i> Confermato</span>
                    <p class="mb-1 small"><i class="far fa-clock"></i> ${d.toLocaleDateString('it-IT')} alle ${d.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</p>
                    <p class="mb-0 small text-secondary"><i class="far fa-user"></i> ${app.cliente_nome}</p>
                </div>
            </div>`;
    });
}

function renderListeConsulenzeNuove() {
    const containerRicevuti = document.getElementById('lista-richieste-consulenze');
    const containerConfermati = document.getElementById('lista-consulenze-confermate');
    if(!containerRicevuti || !containerConfermati) return;

    containerRicevuti.innerHTML = '';
    containerConfermati.innerHTML = '';

    const inAttesa = appuntamentiGlobali.filter(a => a.stato === 'IN ATTESA');
    const confermati = appuntamentiGlobali.filter(a => a.stato === 'CONFERMATO');

    if(inAttesa.length === 0) containerRicevuti.innerHTML = '<p class="text-muted m-0">Nessuna consulenza in attesa.</p>';
    inAttesa.forEach(app => {
        const d = new Date(app.data_inizio);
        containerRicevuti.innerHTML += `
            <div class="card d-inline-block me-3 shadow-sm border-0 border-start border-warning border-4" style="min-width: 280px; white-space: normal; vertical-align: top;">
                <div class="card-body bg-light p-3">
                    <h6 class="fw-bold text-dark text-truncate">Consulenza Online</h6>
                    <p class="mb-1 small text-secondary"><i class="fas fa-map-marker-alt"></i> ${app.luogo}</p>
                    <p class="mb-1 small"><i class="far fa-clock"></i> ${d.toLocaleDateString('it-IT')} alle ${d.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</p>
                    <p class="mb-2 small text-secondary"><i class="far fa-user"></i> ${app.cliente_nome}</p>
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-sm btn-success w-50 fw-bold shadow-sm" onclick="aggiornaStato('${app.id}', 'CONFERMATO', 'consulenza')">Accetta</button>
                        <button class="btn btn-sm btn-danger w-50 fw-bold shadow-sm" onclick="aggiornaStato('${app.id}', 'RIFIUTATO', 'consulenza')">Rifiuta</button>
                    </div>
                </div>
            </div>`;
    });

    if(confermati.length === 0) containerConfermati.innerHTML = '<p class="text-muted m-0">Nessuna consulenza in agenda.</p>';
    confermati.forEach(app => {
        const d = new Date(app.data_inizio);
        containerConfermati.innerHTML += `
            <div class="card d-inline-block me-3 shadow-sm border-0 border-start border-success border-4" style="min-width: 280px; white-space: normal; vertical-align: top;">
                <div class="card-body bg-light p-3">
                    <h6 class="fw-bold text-dark text-truncate">Consulenza Online</h6>
                    <span class="badge bg-success mb-2"><i class="fas fa-check"></i> Confermata</span>
                    <p class="mb-1 small"><i class="far fa-clock"></i> ${d.toLocaleDateString('it-IT')} alle ${d.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})}</p>
                    <p class="mb-0 small text-secondary"><i class="far fa-user"></i> ${app.cliente_nome}</p>
                </div>
            </div>`;
    });
}


async function aggiornaStato(id, nuovoStato, tipoRecord) {
    try {
        const endpoint = tipoRecord === 'consulenza' 
            ? `/api/consulenze/${id}/stato` 
            : `/api/appuntamenti/${id}/stato`;

        const response = await fetch(endpoint, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ stato: nuovoStato })
        });

        if(response.ok) {
            await caricaDashboardCompleta(); 
        } else {
            alert("Errore durante l'aggiornamento dello stato.");
        }
    } catch(error) {
        console.error("Errore di connessione:", error);
    }
}

function cambiaMese(offset) {
    dataCalendario.setMonth(dataCalendario.getMonth() + offset);
    renderCalendario(dataCalendario.getFullYear(), dataCalendario.getMonth());
}

function renderCalendario(anno, mese) {
    const nomiMesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    document.getElementById('mese-corrente-label').textContent = `${nomiMesi[mese]} ${anno}`;

    const grid = document.getElementById('calendario-grid');
    grid.innerHTML = '';

    let primoGiornoMese = new Date(anno, mese, 1).getDay();
    primoGiornoMese = primoGiornoMese === 0 ? 6 : primoGiornoMese - 1; 
    const totaleGiorni = new Date(anno, mese + 1, 0).getDate();

    const mappaAppuntamenti = {};
    const appuntamentiConfermati = appuntamentiGlobali.filter(app => app.stato === 'CONFERMATO');
    
    appuntamentiConfermati.forEach(app => {
        const dateObj = new Date(app.data_inizio);
        const dataKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        
        if(!mappaAppuntamenti[dataKey]) mappaAppuntamenti[dataKey] = [];
        mappaAppuntamenti[dataKey].push(app);
    });

    for(let i = 0; i < primoGiornoMese; i++) {
        grid.innerHTML += `<div class="cal-day bg-light"></div>`;
    }

    for(let giorno = 1; giorno <= totaleGiorni; giorno++) {
        const dataKey = `${anno}-${String(mese + 1).padStart(2, '0')}-${String(giorno).padStart(2, '0')}`;
        
        let badgeHTML = '';
        if(mappaAppuntamenti[dataKey]) {
            const count = mappaAppuntamenti[dataKey].length;
            badgeHTML = `<div class="mt-2"><span class="badge bg-primary rounded-circle cal-badge fs-6 p-2" onclick="apriDettaglioGiorno('${dataKey}')">${count}</span></div>`;
        }

        grid.innerHTML += `
            <div class="cal-day text-center">
                <div class="fw-bold text-secondary fs-5">${giorno}</div>
                ${badgeHTML}
            </div>
        `;
    }
}

function apriDettaglioGiorno(dataKey) {
    const [anno, mese, giorno] = dataKey.split('-');
    document.getElementById('giorno-selezionato-label').textContent = `${giorno}/${mese}/${anno}`;
    
    const contenitore = document.getElementById('lista-appuntamenti-giorno');
    contenitore.innerHTML = '';

    const appuntamentiDelGiorno = appuntamentiGlobali.filter(app => {
        const dateObj = new Date(app.data_inizio);
        const key = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        return key === dataKey;
    });

    appuntamentiDelGiorno.sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio));

    appuntamentiDelGiorno.forEach(app => {
        const dateObj = new Date(app.data_inizio);
        const ora = dateObj.toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
        if(app.stato === 'CONFERMATO'){
            contenitore.innerHTML += `
                <div class="card mb-3 shadow-sm border-0 border-start border-primary border-4">
                    <div class="card-body bg-light">
                        <h5 class="fw-bold text-primary mb-2"><i class="far fa-clock me-1"></i> ${ora}</h5>
                        <h6 class="fw-bold mb-2 text-dark">${app.annuncio_titolo}</h6>
                        <p class="mb-1 text-secondary"><i class="fas fa-map-marker-alt me-1"></i> ${app.luogo}</p>
                        <p class="mb-0 text-secondary"><i class="far fa-user me-1"></i> Contatto: <span class="fw-bold text-dark">${app.cliente_nome}</span></p>
                    </div>
                </div>
            `;
            }
        });
    const modal = new bootstrap.Modal(document.getElementById('modalDettaglioGiorno'));
    modal.show();
}

async function inviaRichiestaConsulenza() {
    const errorDiv = document.getElementById('consulenza-error');
    const successDiv = document.getElementById('consulenza-success');
    errorDiv.classList.add('d-none');
    successDiv.classList.add('d-none');

    const professionistaId = document.getElementById('profSelezionatoConsulenza').value;
    const dataSelezionata = document.getElementById('dataConsulenza').value;
    const userData = JSON.parse(localStorage.getItem('user'));

    const oggettoCasa = {
        indirizzo: document.getElementById('cons_indirizzo').value,
        citta: document.getElementById('cons_citta').value,
        tipo_immobile: document.getElementById('cons_tipo_immobile').value
    };

    const oggettoCaratteristiche = {
        mq: parseInt(document.getElementById('cons_mq').value) || 0,
        stanze: parseInt(document.getElementById('cons_stanze').value) || 0
    };

    if(!professionistaId || !dataSelezionata || !oggettoCasa.indirizzo || !oggettoCasa.citta) {
        errorDiv.textContent = "Compila tutti i campi obbligatori dell'indirizzo e la data.";
        errorDiv.classList.remove('d-none');
        return;
    }

    try {
        const response = await fetch('/api/consulenze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                cliente_id: userData.id,
                professionista_id: professionistaId,
                casa: oggettoCasa,
                caratteristiche: oggettoCaratteristiche,
                data_inizio: dataSelezionata
            })
        });

        const result = await response.json();

        if(response.ok) {
            successDiv.textContent = "Consulenza richiesta con successo!";
            successDiv.classList.remove('d-none');
            setTimeout(() => {
                const modal = bootstrap.Modal.getInstance(document.getElementById('modaleConsulenza'));
                if(modal) modal.hide();
                caricaCalendario();
            }, 2000);
        } else {
            errorDiv.textContent = result.errore || "Errore durante l'invio.";
            errorDiv.classList.remove('d-none');
        }
    } catch (error) {
        errorDiv.textContent = "Errore di connessione al server.";
        errorDiv.classList.remove('d-none');
    }
}


window.caricaProfessionistiOnline = async function() {
    const tipo = document.getElementById('tipoProfConsulenza').value;
    const selectProf = document.getElementById('profSelezionatoConsulenza');
    
    if(!tipo) {
        selectProf.innerHTML = '<option value="">Prima scegli il tipo di figura</option>';
        selectProf.disabled = true;
        return;
    }

    try {
        selectProf.disabled = false;
        selectProf.innerHTML = '<option value="">Caricamento in corso...</option>';
        
        const response = await fetch(`/api/professionisti_online/${tipo}`);
        const professionisti = await response.json();
        
        if (professionisti.length > 0) {
            selectProf.innerHTML = '<option value="">-- Scegli un professionista --</option>';
            professionisti.forEach(p => {
                selectProf.innerHTML += `<option value="${p.id}">${p.nome} ${p.cognome}</option>`;
            });
        } else {
            selectProf.innerHTML = '<option value="">Nessun professionista disponibile</option>';
            selectProf.disabled = true;
        }
    } catch(e) {
        selectProf.innerHTML = '<option value="">Errore di connessione</option>';
    }
};
