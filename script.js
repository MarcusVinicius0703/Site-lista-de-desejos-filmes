// 1. Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBXliLnz1CKgayX9NFLuWoQCl840LD_O2c",
  authDomain: "nossos-filmes-93f11.firebaseapp.com",
  databaseURL: "https://nossos-filmes-93f11-default-rtdb.firebaseio.com",
  projectId: "nossos-filmes-93f11",
  storageBucket: "nossos-filmes-93f11.firebasestorage.app",
  messagingSenderId: "578233872545",
  appId: "1:578233872545:web:ac5f39bac03442952f00e0"
};

// Inicializa o Firebase no seu código
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Credenciais de login do Firebase
const EMAIL_PADRAO = "nossofilme@gmail.com";
const SENHA_PADRAO = "030901";

let usuarioAtual = null;
let listaDeFilmes = []; // Agora a lista vem do Firebase, não mais do localStorage
let filmeSelecionadoNaPrevia = null; // Guarda os dados do filme clicado na prévia

// Chave da API do TMDB
const TMDB_API_KEY = "871413bb87c7f42254e16acdb6e31ec7"; 

// 2. AUTOLOGIN EM SEGUNDO PLANO
auth.onAuthStateChanged((user) => {
  if (user) {
    usuarioAtual = user;
    ouvirFilmesDaNuvem(user.uid);
  } else {
    auth.signInWithEmailAndPassword(EMAIL_PADRAO, SENHA_PADRAO)
      .then((cred) => {
        usuarioAtual = cred.user;
        ouvirFilmesDaNuvem(cred.user.uid);
      })
      .catch((error) => console.error("Erro no autologin:", error.message));
  }
});

// 3. SINCRONIZAÇÃO COM O FIREBASE (TEMPO REAL)
function ouvirFilmesDaNuvem(userId) {
  database.ref('usuarios/' + userId + '/filmes').on('value', (snapshot) => {
    listaDeFilmes = snapshot.val() || [];
    renderizarFilmes(); // Atualiza a tela com os filmes vindos do banco de dados
  });
}

function salvarNaNuvem(novaLista) {
  if (!usuarioAtual) return;
  database.ref('usuarios/' + usuarioAtual.uid + '/filmes').set(novaLista);
}

// 4. FUNÇÃO DE BUSCA E AUTOCOMPLETE (TMDB)
const inputTitulo = document.getElementById('titulo');
const containerSugestoes = document.getElementById('autocomplete-results');

if (inputTitulo) {
  inputTitulo.addEventListener('input', async function() {
    const busca = this.value.trim();
    
    if (busca.length < 2) {
      containerSugestoes.innerHTML = '';
      containerSugestoes.style.display = 'none';
      return;
    }

    if (!TMDB_API_KEY) return;

    try {
      const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(busca)}&language=pt-BR`;
      const res = await fetch(url);
      const dados = await res.json();

      if (dados.results && dados.results.length > 0) {
        containerSugestoes.innerHTML = '';
        containerSugestoes.style.display = 'block';

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
}

document.addEventListener('click', (e) => {
  if (e.target !== inputTitulo && containerSugestoes) {
    containerSugestoes.style.display = 'none';
  }
});

// 5. RENDERIZAR OS FILMES NA TELA
function renderizarFilmes() {
  const gridAssistidos = document.getElementById('assistidos-grid');
  const gridParaAssistir = document.getElementById('para-assistir-grid');

  if (!gridAssistidos || !gridParaAssistir) return;

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

// 6. MARCAR COMO ASSISTIDO
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
      salvarNaNuvem(listaDeFilmes);
    }
  }
}

// 7. REMOVER FILME
function deletarFilme(id) {
  if (confirm("Tem certeza que quer remover este filme?")) {
    listaDeFilmes = listaDeFilmes.filter(filme => filme.id !== id);
    salvarNaNuvem(listaDeFilmes);
  }
}

// 8. CONTROLE DO MODAL
const modal = document.getElementById('modal-filme');
const btnAbrir = document.getElementById('btn-abrir-modal');
const btnFechar = document.querySelector('.close-modal');
const selectStatus = document.getElementById('status');
const grupoNotas = document.getElementById('grupo-notas');

if (btnAbrir) {
  btnAbrir.onclick = () => {
    filmeSelecionadoNaPrevia = null; 
    modal.style.display = 'flex';
  };
}

if (btnFechar) {
  btnFechar.onclick = () => modal.style.display = 'none';
}

if (selectStatus) {
  selectStatus.onchange = () => {
    grupoNotas.style.display = selectStatus.value === 'true' ? 'grid' : 'none';
  };
}

// 9. FORMULÁRIO DE ENVIO (ADICIONAR FILME)
const formFilme = document.getElementById('form-filme');
if (formFilme) {
  formFilme.onsubmit = async function(e) {
    e.preventDefault();
    const botaoEnviar = this.querySelector('button[type="submit"]');
    const tituloDigitado = inputTitulo.value;

    botaoEnviar.innerText = "Salvando...";
    botaoEnviar.disabled = true;

    let capaFinal = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80';

    if (filmeSelecionadoNaPrevia && filmeSelecionadoNaPrevia.titulo === tituloDigitado) {
      capaFinal = filmeSelecionadoNaPrevia.capa;
    } else {
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
    salvarNaNuvem(listaDeFilmes);

    this.reset();
    botaoEnviar.innerText = "Salvar Filme";
    botaoEnviar.disabled = false;
    grupoNotas.style.display = 'none';
    modal.style.display = 'none';
  };
}