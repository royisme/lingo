/** The 11 target languages, by their own names, with Lingo's tags. */
export const LANGS = [
  { tag: 'EN', name: 'English' },
  { tag: 'FR', name: 'Français' },
  { tag: 'ES', name: 'Español' },
  { tag: 'DE', name: 'Deutsch' },
  { tag: 'PT', name: 'Português' },
  { tag: 'JA', name: '日本語' },
  { tag: 'KO', name: '한국어' },
  { tag: 'ZH', name: '简体中文' },
  { tag: 'ZH-TW', name: '繁體中文' },
  { tag: 'RU', name: 'Русский' },
  { tag: 'VI', name: 'Tiếng Việt' },
]

export const PROMPT = 'Look into why the login endpoint is timing out'
export const REPLY =
  "The login handler waits for a database connection, but the pool runs dry under load. I'll raise the pool size and add a timeout so requests fail fast."

/** The prompt and reply above, translated: what the hero cycles through. */
export const HERO: { tag: string; prompt: string; reply: string }[] = [
  {
    tag: 'FR',
    prompt: "Regarde pourquoi l'endpoint de connexion expire.",
    reply:
      "Le gestionnaire de connexion attend une connexion à la base de données, mais le pool s'épuise sous la charge. Je vais augmenter la taille du pool et ajouter un délai d'expiration pour que les requêtes échouent vite.",
  },
  {
    tag: 'ES',
    prompt: 'Revisa por qué el endpoint de inicio de sesión agota el tiempo de espera.',
    reply:
      'El controlador de inicio de sesión espera una conexión a la base de datos, pero el pool se agota bajo carga. Aumentaré el tamaño del pool y añadiré un tiempo de espera para que las peticiones fallen rápido.',
  },
  {
    tag: 'DE',
    prompt: 'Finde heraus, warum der Login-Endpunkt in ein Timeout läuft.',
    reply:
      'Der Login-Handler wartet auf eine Datenbankverbindung, aber unter Last ist der Pool erschöpft. Ich erhöhe die Poolgröße und füge ein Timeout hinzu, damit Anfragen schnell fehlschlagen.',
  },
  {
    tag: 'JA',
    prompt: 'ログインエンドポイントがタイムアウトする原因を調べて。',
    reply:
      'ログインハンドラーはデータベース接続を待っていますが、負荷がかかるとプールが枯渇します。プールサイズを増やし、タイムアウトを追加して、リクエストがすぐに失敗するようにします。',
  },
  {
    tag: 'KO',
    prompt: '로그인 엔드포인트가 타임아웃되는 이유를 살펴봐 줘.',
    reply:
      '로그인 핸들러가 데이터베이스 연결을 기다리지만, 부하가 걸리면 풀이 고갈됩니다. 풀 크기를 늘리고 타임아웃을 추가해 요청이 빠르게 실패하도록 하겠습니다.',
  },
  {
    tag: 'ZH',
    prompt: '查一下登录接口为什么会超时。',
    reply: '登录处理程序在等待数据库连接，但高负载下连接池被耗尽了。我会调大连接池，并加上超时，让请求快速失败。',
  },
  {
    tag: 'PT',
    prompt: 'Veja por que o endpoint de login está dando timeout.',
    reply:
      'O handler de login espera por uma conexão com o banco de dados, mas o pool se esgota sob carga. Vou aumentar o tamanho do pool e adicionar um timeout para que as requisições falhem rápido.',
  },
  {
    tag: 'RU',
    prompt: 'Разберись, почему эндпоинт входа падает по таймауту.',
    reply:
      'Обработчик входа ждёт соединения с базой данных, но под нагрузкой пул исчерпывается. Я увеличу размер пула и добавлю таймаут, чтобы запросы быстро завершались ошибкой.',
  },
  {
    tag: 'VI',
    prompt: 'Xem vì sao endpoint đăng nhập bị timeout.',
    reply:
      'Trình xử lý đăng nhập chờ kết nối cơ sở dữ liệu, nhưng pool bị cạn khi tải cao. Tôi sẽ tăng kích thước pool và thêm timeout để request thất bại nhanh.',
  },
]
