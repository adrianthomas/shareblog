export type MessageKey =
  | "home"
  | "posts"
  | "articles"
  | "books"
  | "music"
  | "photos"
  | "skipToContent"
  | "nothingHereYet"
  | "ratingLabel"
  | "primaryNavigation"
  | "listenOn"
  | "closePost"
  | "backTo";

type Messages = Record<MessageKey, string>;

const MESSAGES: Record<string, Messages> = {
  en: {
    home: "Home",
    posts: "Posts",
    articles: "Articles",
    books: "Books",
    music: "Music",
    photos: "Photos",
    skipToContent: "Skip to content",
    nothingHereYet: "Nothing here yet.",
    ratingLabel: "Rating: {rating} out of 5 stars",
    primaryNavigation: "Primary",
    listenOn: "Listen on {platform}",
    closePost: "Close",
    backTo: "Back to {section}",
  },
  de: {
    home: "Start",
    posts: "Beiträge",
    articles: "Artikel",
    books: "Bücher",
    music: "Musik",
    photos: "Fotos",
    skipToContent: "Zum Inhalt springen",
    nothingHereYet: "Hier gibt es noch nichts.",
    ratingLabel: "Bewertung: {rating} von 5 Sternen",
    primaryNavigation: "Hauptnavigation",
    listenOn: "Hören auf {platform}",
    closePost: "Schließen",
    backTo: "Zurück zu {section}",
  },
  fr: {
    home: "Accueil",
    posts: "Billets",
    articles: "Articles",
    books: "Livres",
    music: "Musique",
    photos: "Photos",
    skipToContent: "Aller au contenu",
    nothingHereYet: "Rien ici pour l'instant.",
    ratingLabel: "Note : {rating} étoiles sur 5",
    primaryNavigation: "Navigation principale",
    listenOn: "Écouter sur {platform}",
    closePost: "Fermer",
    backTo: "Retour à {section}",
  },
  es: {
    home: "Inicio",
    posts: "Publicaciones",
    articles: "Artículos",
    books: "Libros",
    music: "Música",
    photos: "Fotos",
    skipToContent: "Saltar al contenido",
    nothingHereYet: "Todavía no hay nada aquí.",
    ratingLabel: "Valoración: {rating} de 5 estrellas",
    primaryNavigation: "Navegación principal",
    listenOn: "Escuchar en {platform}",
    closePost: "Cerrar",
    backTo: "Volver a {section}",
  },
  ja: {
    home: "ホーム",
    posts: "投稿",
    articles: "記事",
    books: "本",
    music: "音楽",
    photos: "写真",
    skipToContent: "コンテンツへスキップ",
    nothingHereYet: "まだ何もありません。",
    ratingLabel: "評価: 5つ星中{rating}つ",
    primaryNavigation: "メインナビゲーション",
    listenOn: "{platform}で聴く",
    closePost: "閉じる",
    backTo: "{section}に戻る",
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
