const CACHE_NAME = "govdocs-cache-v2";

// Lista exata com os caminhos novos. 
// ATENÇÃO: Só coloca aqui ficheiros que realmente existem na pasta public.
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/login.html",
  "/contratos.html",
  "/projetos.html",
  "/tarefas.html",
  "/css/style.css",
  "/js/script.js",
  "/js/firebase-config.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => {
        console.error("Erro ao fazer cache dos ficheiros. Verifica se todos os caminhos no ASSETS_TO_CACHE existem:", error);
      })
  );
});

self.addEventListener("activate", (event) => {
  // Limpa caches antigos quando atualizas a versão (CACHE_NAME)
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});