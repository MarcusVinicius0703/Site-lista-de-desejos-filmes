// INDISPENSÁVEL: Coloque sua chave do TMDB aqui dentro das aspas!
const TMDB_API_KEY = "871413bb87c7f42254e16acdb6e31ec7"; 

let listaDeFilmes = JSON.parse(localStorage.getItem('cineCasal_filmes')) || [];
let filmeSelecionadoNaPrevia = null; // Guarda os dados do filme clicado na prévia

function salvarNoNavegador() {
    localStorage.setItem('cineCasal_filmes', JSON.stringify(listaDeFilmes));
}

// 1. FUNÇÃO DE BUSCA PARA AS PRÉVIAS (DIGITAÇÃO)
const inputTitulo = document.getElementById('titulo');
const containerSugestoes = document.getElementById('autocomplete-results');

inputTitulo.addEventListener('input', async function() {
    const busca = this.value.trim();
    
    if (busca.length < 2) {
        containerSugestoes.innerHTML = '';
        containerSugestoes.style.display = 'none';
        return;
    }

    if (!TMDB_API_KEY || TMDB_API_KEY === "SUA_API_KEY_AQUI") return;

    try {
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(busca)}&language=pt-BR`;
        const res = await fetch(url);
        const dados = await res.json();

        if (dados.results && dados.results.length > 0) {
            containerSugestoes.innerHTML = '';
            containerSugestoes.style.display = 'block';

            // Pega no máximo os 4 primeiros resultados encontrados para a prévia
            dados.results.slice(0, 4).forEach(filme => {
                const ano = filme.release_date ? filme.release_date.split('-')[0] : 'N/A';
                const poster = filme.poster_path ? `https://image.tmdb.org/t/p/w92${filme.poster_path}` : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=92&q=80';

                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.innerHTML = `
                    <img src="${poster}" alt="Poster">
                    <div class="suggestion-info">
                        <span class="suggestion-title">${filme.title}</span>
                        <span class="suggestion-year">${ano}</span>
                    </div>
                `;

                // Quando clicar na prévia, preenche o formulário
                item.onclick = () => {
                    inputTitulo.value = filme.title;
                    filmeSelecionadoNaPrevia = {
                        titulo: filme.title,
                        capa: filme.poster_path ? `https://image.tmdb.org/t/p/w400${filme.poster_path}` : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80'
                    };
                    containerSugestoes.innerHTML = '';
                    containerSugestoes.style.display = 'none';
                };

                containerSugestoes.appendChild(item);
            });
        } else {
            containerSugestoes.style.display = 'none';
        }
    } catch (erro) {
        console.error("Erro na prévia:", erro);
    }
});

// Fecha as prévias se clicar fora do input
document.addEventListener('click', (e) => {
    if (e.target !== inputTitulo) {
        containerSugestoes.style.display = 'none';
    }
});

// 2. RENDERIZAR OS FILMES NA TELA
function renderizarFilmes() {
    const gridAssistidos = document.getElementById('assistidos-grid');
    const gridParaAssistir = document.getElementById('para-assistir-grid');

    gridAssistidos.innerHTML = '';
    gridParaAssistir.innerHTML = '';

    listaDeFilmes.forEach(filme => {
        const cardHtml = `
            <div class="movie-card">
                <img src="${filme.capa}" alt="Poster" class="movie-poster">
                <div class="movie-info">
                    <h3 class="movie-title">${filme.titulo}</h3>
                    
                    ${filme.assistido 
                        ? `<div class="badge-container-notas">
                            <span class="badge-casal badge-ele"><i class="fas fa-user"></i> ${filme.notaEle}</span>
                            <span class="badge-casal badge-ela"><i class="fas fa-heart"></i> ${filme.notaEla}</span>
                           </div>` 
                        : `<span class="text-muted"><i class="far fa-clock"></i> Na fila</span>`
                    }

                    <div class="card-actions">
                        ${!filme.assistido 
                            ? `<button onclick="marcarComoAssistido(${filme.id})" class="btn-action btn-watched" title="Marcar como Assistido"><i class="fas fa-check"></i> Assistido</button>`
                            : `<span></span>`
                        }
                        <button onclick="deletarFilme(${filme.id})" class="btn-action btn-delete" title="Remover"><i class="far fa-trash-alt"></i></button>
                    </div>
                </div>
            </div>
        `;

        if (filme.assistido) {
            gridAssistidos.innerHTML += cardHtml;
        } else {
            gridParaAssistir.innerHTML += cardHtml;
        }
    });
}

// 3. SE TRANSFORMAR DA LISTA DE DESEJOS PARA ASSISTIDO
function marcarComoAssistido(id) {
    const nEle = prompt("Qual a sua nota para este filme? (🤵)");
    if (nEle !== null) {
        const nEla = prompt("Qual a nota dela para este filme? (👰)");
        if (nEla !== null) {
            listaDeFilmes = listaDeFilmes.map(filme => {
                if (filme.id === id) {
                    return { 
                        ...filme, 
                        assistido: true, 
                        notaEle: nEle || "S/N", 
                        notaEla: nEla || "S/N" 
                    };
                }
                return filme;
            });
            salvarNoNavegador();
            renderizarFilmes();
        }
    }
}

function deletarFilme(id) {
    if (confirm("Tem certeza que quer remover este filme?")) {
        listaDeFilmes = listaDeFilmes.filter(filme => filme.id !== id);
        salvarNoNavegador();
        renderizarFilmes();
    }
}

// 4. CONTROLE DO MODAL
const modal = document.getElementById('modal-filme');
const btnAbrir = document.getElementById('btn-abrir-modal');
const btnFechar = document.querySelector('.close-modal');
const selectStatus = document.getElementById('status');
const grupoNotas = document.getElementById('grupo-notas');

btnAbrir.onclick = () => {
    filmeSelecionadoNaPrevia = null; 
    modal.style.display = 'flex';
};
btnFechar.onclick = () => modal.style.display = 'none';

selectStatus.onchange = () => {
    grupoNotas.style.display = selectStatus.value === 'true' ? 'grid' : 'none';
}

// 5. FORMULÁRIO DE ENVIO
document.getElementById('form-filme').onsubmit = async function(e) {
    e.preventDefault();
    const botaoEnviar = this.querySelector('button[type="submit"]');
    const tituloDigitado = inputTitulo.value;

    botaoEnviar.innerText = "Salvando...";
    botaoEnviar.disabled = true;

    let capaFinal = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80';

    // Se o usuário clicou na prévia, usamos o link que já temos guardado
    if (filmeSelecionadoNaPrevia && filmeSelecionadoNaPrevia.titulo === tituloDigitado) {
        capaFinal = filmeSelecionadoNaPrevia.capa;
    } else {
        // Se ele digitou tudo sem clicar na prévia, fazemos uma busca direta de segurança
        try {
            const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(tituloDigitado)}&language=pt-BR`;
            const res = await fetch(url);
            const dados = await res.json();
            if (dados.results && dados.results.length > 0 && dados.results[0].poster_path) {
                capaFinal = `https://image.tmdb.org/t/p/w400${dados.results[0].poster_path}`;
            }
        } catch(err) { console.log(err); }
    }

    const novoFilme = {
        id: Date.now(),
        titulo: tituloDigitado,
        capa: capaFinal,
        assistido: selectStatus.value === 'true',
        notaEle: document.getElementById('nota-ele').value || "S/N",
        notaEla: document.getElementById('nota-ela').value || "S/N"
    };

    listaDeFilmes.push(novoFilme);
    salvarNoNavegador();
    renderizarFilmes();

    this.reset();
    botaoEnviar.innerText = "Salvar Filme";
    botaoEnviar.disabled = false;
    grupoNotas.style.display = 'none';
    modal.style.display = 'none';
};

window.onload = renderizarFilmes;