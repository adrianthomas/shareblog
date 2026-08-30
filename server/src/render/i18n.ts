export type MessageKey =
  | "home"
  | "posts"
  | "articles"
  | "links"
  | "books"
  | "music"
  | "photos"
  | "quotes"
  | "about"
  | "archive"
  | "search"
  | "previous"
  | "next"
  | "followRss"
  | "fediverseLabel"
  | "copyFediverseHandle"
  | "fediverseHandleCopied"
  | "aboutShareblog"
  | "releaseHistory"
  | "currentlyRunning"
  | "copyLink"
  | "openLink"
  | "readMore"
  | "urlCopied"
  | "copyQuote"
  | "quoteCopied"
  | "typeThought"
  | "typeArticle"
  | "typeLink"
  | "typeBook"
  | "typeMusic"
  | "typePhoto"
  | "typeQuote"
  | "skipToContent"
  | "nothingHereYet"
  | "ratingLabel"
  | "primaryNavigation"
  | "filterCategories"
  | "listenOn"
  | "closePost"
  | "backTo"
  | "exifCamera"
  | "exifLens"
  | "exifAperture"
  | "exifShutterSpeed"
  | "exifIso"
  | "exifFocalLength";

type Messages = Record<MessageKey, string>;

const MESSAGES: Record<string, Messages> = {
  en: {
    home: "Home",
    posts: "Posts",
    articles: "Articles",
    links: "Links",
    books: "Books",
    music: "Music",
    photos: "Photos",
    quotes: "Quotes",
    about: "About",
    archive: "Archive",
    search: "Search",
    previous: "Previous",
    next: "Next",
    followRss: "Follow RSS",
    fediverseLabel: "Fediverse",
    copyFediverseHandle: "Copy Fediverse handle",
    fediverseHandleCopied: "Handle copied",
    aboutShareblog: "About Shareblog",
    releaseHistory: "Release history",
    currentlyRunning: "Currently running {commit}",
    copyLink: "Copy link",
    openLink: "Open Link",
    readMore: "Read more",
    urlCopied: "URL copied",
    copyQuote: "Copy quote",
    quoteCopied: "Quote copied",
    typeThought: "Post",
    typeArticle: "Article",
    typeLink: "Link",
    typeBook: "Book",
    typeMusic: "Music",
    typePhoto: "Photo",
    typeQuote: "Quote",
    skipToContent: "Skip to content",
    nothingHereYet: "Nothing here yet.",
    ratingLabel: "Rating: {rating} out of 5 stars",
    primaryNavigation: "Primary",
    filterCategories: "Filter categories",
    listenOn: "Listen on {platform}",
    closePost: "Close",
    backTo: "Back to {section}",
    exifCamera: "Camera",
    exifLens: "Lens",
    exifAperture: "Aperture",
    exifShutterSpeed: "Shutter speed",
    exifIso: "ISO",
    exifFocalLength: "Focal length",
  },
  de: {
    home: "Start",
    posts: "Beiträge",
    articles: "Artikel",
    links: "Links",
    books: "Bücher",
    music: "Musik",
    photos: "Fotos",
    quotes: "Zitate",
    about: "Über",
    archive: "Archiv",
    search: "Suche",
    previous: "Zurück",
    next: "Weiter",
    followRss: "RSS abonnieren",
    fediverseLabel: "Fediverse",
    copyFediverseHandle: "Fediverse-Adresse kopieren",
    fediverseHandleCopied: "Adresse kopiert",
    aboutShareblog: "Über Shareblog",
    releaseHistory: "Versionshistorie",
    currentlyRunning: "Aktuell läuft {commit}",
    copyLink: "Link kopieren",
    openLink: "Link öffnen",
    readMore: "Weiterlesen",
    urlCopied: "URL kopiert",
    copyQuote: "Zitat kopieren",
    quoteCopied: "Zitat kopiert",
    typeThought: "Beitrag",
    typeArticle: "Artikel",
    typeLink: "Link",
    typeBook: "Buch",
    typeMusic: "Musik",
    typePhoto: "Foto",
    typeQuote: "Zitat",
    skipToContent: "Zum Inhalt springen",
    nothingHereYet: "Hier gibt es noch nichts.",
    ratingLabel: "Bewertung: {rating} von 5 Sternen",
    primaryNavigation: "Hauptnavigation",
    filterCategories: "Kategorien filtern",
    listenOn: "Hören auf {platform}",
    closePost: "Schließen",
    backTo: "Zurück zu {section}",
    exifCamera: "Kamera",
    exifLens: "Objektiv",
    exifAperture: "Blende",
    exifShutterSpeed: "Belichtungszeit",
    exifIso: "ISO",
    exifFocalLength: "Brennweite",
  },
  fr: {
    home: "Accueil",
    posts: "Billets",
    articles: "Articles",
    links: "Liens",
    books: "Livres",
    music: "Musique",
    photos: "Photos",
    quotes: "Citations",
    about: "À propos",
    archive: "Archives",
    search: "Rechercher",
    previous: "Précédent",
    next: "Suivant",
    followRss: "Suivre en RSS",
    fediverseLabel: "Fédivers",
    copyFediverseHandle: "Copier l'identifiant Fediverse",
    fediverseHandleCopied: "Identifiant copié",
    aboutShareblog: "À propos de Shareblog",
    releaseHistory: "Historique des versions",
    currentlyRunning: "Version actuelle : {commit}",
    copyLink: "Copier le lien",
    openLink: "Ouvrir le lien",
    readMore: "Lire la suite",
    urlCopied: "URL copiée",
    copyQuote: "Copier la citation",
    quoteCopied: "Citation copiée",
    typeThought: "Billet",
    typeArticle: "Article",
    typeLink: "Lien",
    typeBook: "Livre",
    typeMusic: "Musique",
    typePhoto: "Photo",
    typeQuote: "Citation",
    skipToContent: "Aller au contenu",
    nothingHereYet: "Rien ici pour l'instant.",
    ratingLabel: "Note : {rating} étoiles sur 5",
    primaryNavigation: "Navigation principale",
    filterCategories: "Filtrer les catégories",
    listenOn: "Écouter sur {platform}",
    closePost: "Fermer",
    backTo: "Retour à {section}",
    exifCamera: "Appareil photo",
    exifLens: "Objectif",
    exifAperture: "Ouverture",
    exifShutterSpeed: "Vitesse d'obturation",
    exifIso: "ISO",
    exifFocalLength: "Focale",
  },
  es: {
    home: "Inicio",
    posts: "Publicaciones",
    articles: "Artículos",
    links: "Enlaces",
    books: "Libros",
    music: "Música",
    photos: "Fotos",
    quotes: "Citas",
    about: "Acerca de",
    archive: "Archivo",
    search: "Buscar",
    previous: "Anterior",
    next: "Siguiente",
    followRss: "Seguir por RSS",
    fediverseLabel: "Fediverso",
    copyFediverseHandle: "Copiar identificador de Fediverse",
    fediverseHandleCopied: "Identificador copiado",
    aboutShareblog: "Acerca de Shareblog",
    releaseHistory: "Historial de versiones",
    currentlyRunning: "Ejecutando actualmente {commit}",
    copyLink: "Copiar enlace",
    openLink: "Abrir enlace",
    readMore: "Leer más",
    urlCopied: "URL copiada",
    copyQuote: "Copiar cita",
    quoteCopied: "Cita copiada",
    typeThought: "Publicación",
    typeArticle: "Artículo",
    typeLink: "Enlace",
    typeBook: "Libro",
    typeMusic: "Música",
    typePhoto: "Foto",
    typeQuote: "Cita",
    skipToContent: "Saltar al contenido",
    nothingHereYet: "Todavía no hay nada aquí.",
    ratingLabel: "Valoración: {rating} de 5 estrellas",
    primaryNavigation: "Navegación principal",
    filterCategories: "Filtrar categorías",
    listenOn: "Escuchar en {platform}",
    closePost: "Cerrar",
    backTo: "Volver a {section}",
    exifCamera: "Cámara",
    exifLens: "Objetivo",
    exifAperture: "Apertura",
    exifShutterSpeed: "Velocidad de obturación",
    exifIso: "ISO",
    exifFocalLength: "Distancia focal",
  },
  ja: {
    home: "ホーム",
    posts: "投稿",
    articles: "記事",
    links: "リンク",
    books: "本",
    music: "音楽",
    photos: "写真",
    quotes: "引用",
    about: "このサイトについて",
    archive: "アーカイブ",
    search: "検索",
    previous: "前へ",
    next: "次へ",
    followRss: "RSSで購読",
    fediverseLabel: "フェディバース",
    copyFediverseHandle: "Fediverseハンドルをコピー",
    fediverseHandleCopied: "ハンドルをコピーしました",
    aboutShareblog: "Shareblogについて",
    releaseHistory: "更新履歴",
    currentlyRunning: "現在のバージョン: {commit}",
    copyLink: "リンクをコピー",
    openLink: "リンクを開く",
    readMore: "続きを読む",
    urlCopied: "URLをコピーしました",
    copyQuote: "引用をコピー",
    quoteCopied: "引用をコピーしました",
    typeThought: "投稿",
    typeArticle: "記事",
    typeLink: "リンク",
    typeBook: "本",
    typeMusic: "音楽",
    typePhoto: "写真",
    typeQuote: "引用",
    skipToContent: "コンテンツへスキップ",
    nothingHereYet: "まだ何もありません。",
    ratingLabel: "評価: 5つ星中{rating}つ",
    primaryNavigation: "メインナビゲーション",
    filterCategories: "カテゴリーを絞り込む",
    listenOn: "{platform}で聴く",
    closePost: "閉じる",
    backTo: "{section}に戻る",
    exifCamera: "カメラ",
    exifLens: "レンズ",
    exifAperture: "絞り",
    exifShutterSpeed: "シャッタースピード",
    exifIso: "ISO",
    exifFocalLength: "焦点距離",
  },
};

// Extracts the base language subtag ("de" from "de-AT") and falls back to
// English for any locale we don't have UI strings for — the underlying
// content and dates still render in the site's actual locale via Intl.
export function resolveLocale(locale: string | null | undefined): string {
  const lang = (locale ?? "en").toLowerCase().split("-")[0];
  return MESSAGES[lang] ? lang : "en";
}

export function t(locale: string | null | undefined, key: MessageKey, params?: Record<string, string | number>): string {
  const resolved = resolveLocale(locale);
  let message = MESSAGES[resolved][key];
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      message = message.replace(`{${name}}`, String(value));
    }
  }
  return message;
}
