export type MessageKey =
  | "home"
  | "posts"
  | "articles"
  | "books"
  | "music"
  | "photos"
  | "quotes"
  | "about"
  | "followRss"
  | "aboutShareblog"
  | "releaseHistory"
  | "currentlyRunning"
  | "copyLink"
  | "urlCopied"
  | "copyQuote"
  | "quoteCopied"
  | "typeThought"
  | "typeArticle"
  | "typeBook"
  | "typeMusic"
  | "typePhoto"
  | "typeQuote"
  | "skipToContent"
  | "nothingHereYet"
  | "ratingLabel"
  | "primaryNavigation"
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
    books: "Books",
    music: "Music",
    photos: "Photos",
    quotes: "Quotes",
    about: "About",
    followRss: "Follow RSS",
    aboutShareblog: "About Shareblog",
    releaseHistory: "Release history",
    currentlyRunning: "Currently running {commit}",
    copyLink: "Copy link",
    urlCopied: "URL copied",
    copyQuote: "Copy quote",
    quoteCopied: "Quote copied",
    typeThought: "Post",
    typeArticle: "Article",
    typeBook: "Book",
    typeMusic: "Music",
    typePhoto: "Photo",
    typeQuote: "Quote",
    skipToContent: "Skip to content",
    nothingHereYet: "Nothing here yet.",
    ratingLabel: "Rating: {rating} out of 5 stars",
    primaryNavigation: "Primary",
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
    books: "Bücher",
    music: "Musik",
    photos: "Fotos",
    quotes: "Zitate",
    about: "Über",
    followRss: "RSS abonnieren",
    aboutShareblog: "Über Shareblog",
    releaseHistory: "Versionshistorie",
    currentlyRunning: "Aktuell läuft {commit}",
    copyLink: "Link kopieren",
    urlCopied: "URL kopiert",
    copyQuote: "Zitat kopieren",
    quoteCopied: "Zitat kopiert",
    typeThought: "Beitrag",
    typeArticle: "Artikel",
    typeBook: "Buch",
    typeMusic: "Musik",
    typePhoto: "Foto",
    typeQuote: "Zitat",
    skipToContent: "Zum Inhalt springen",
    nothingHereYet: "Hier gibt es noch nichts.",
    ratingLabel: "Bewertung: {rating} von 5 Sternen",
    primaryNavigation: "Hauptnavigation",
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
    books: "Livres",
    music: "Musique",
    photos: "Photos",
    quotes: "Citations",
    about: "À propos",
    followRss: "Suivre en RSS",
    aboutShareblog: "À propos de Shareblog",
    releaseHistory: "Historique des versions",
    currentlyRunning: "Version actuelle : {commit}",
    copyLink: "Copier le lien",
    urlCopied: "URL copiée",
    copyQuote: "Copier la citation",
    quoteCopied: "Citation copiée",
    typeThought: "Billet",
    typeArticle: "Article",
    typeBook: "Livre",
    typeMusic: "Musique",
    typePhoto: "Photo",
    typeQuote: "Citation",
    skipToContent: "Aller au contenu",
    nothingHereYet: "Rien ici pour l'instant.",
    ratingLabel: "Note : {rating} étoiles sur 5",
    primaryNavigation: "Navigation principale",
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
    books: "Libros",
    music: "Música",
    photos: "Fotos",
    quotes: "Citas",
    about: "Acerca de",
    followRss: "Seguir por RSS",
    aboutShareblog: "Acerca de Shareblog",
    releaseHistory: "Historial de versiones",
    currentlyRunning: "Ejecutando actualmente {commit}",
    copyLink: "Copiar enlace",
    urlCopied: "URL copiada",
    copyQuote: "Copiar cita",
    quoteCopied: "Cita copiada",
    typeThought: "Publicación",
    typeArticle: "Artículo",
    typeBook: "Libro",
    typeMusic: "Música",
    typePhoto: "Foto",
    typeQuote: "Cita",
    skipToContent: "Saltar al contenido",
    nothingHereYet: "Todavía no hay nada aquí.",
    ratingLabel: "Valoración: {rating} de 5 estrellas",
    primaryNavigation: "Navegación principal",
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
    books: "本",
    music: "音楽",
    photos: "写真",
    quotes: "引用",
    about: "このサイトについて",
    followRss: "RSSで購読",
    aboutShareblog: "Shareblogについて",
    releaseHistory: "更新履歴",
    currentlyRunning: "現在のバージョン: {commit}",
    copyLink: "リンクをコピー",
    urlCopied: "URLをコピーしました",
    copyQuote: "引用をコピー",
    quoteCopied: "引用をコピーしました",
    typeThought: "投稿",
    typeArticle: "記事",
    typeBook: "本",
    typeMusic: "音楽",
    typePhoto: "写真",
    typeQuote: "引用",
    skipToContent: "コンテンツへスキップ",
    nothingHereYet: "まだ何もありません。",
    ratingLabel: "評価: 5つ星中{rating}つ",
    primaryNavigation: "メインナビゲーション",
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
