export interface FontOption {
  id: string;
  name: string;
  designer: string;
  style: "sans" | "serif" | "display" | "script" | "mono";
  url: string;
}

/**
 * Famous fonts loaded as WOFF (opentype.js-compatible) from Fontsource.
 */
export const FONTS: FontOption[] = [
  {
    id: "montserrat",
    name: "Montserrat",
    designer: "Julieta Ulanovsky",
    style: "sans",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/montserrat@5.2.6/files/montserrat-latin-700-normal.woff",
  },
  {
    id: "inter",
    name: "Inter",
    designer: "Rasmus Andersson",
    style: "sans",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/inter@5.2.6/files/inter-latin-700-normal.woff",
  },
  {
    id: "roboto",
    name: "Roboto",
    designer: "Christian Robertson",
    style: "sans",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/roboto@5.2.6/files/roboto-latin-700-normal.woff",
  },
  {
    id: "open-sans",
    name: "Open Sans",
    designer: "Steve Matteson",
    style: "sans",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/open-sans@5.2.6/files/open-sans-latin-700-normal.woff",
  },
  {
    id: "lato",
    name: "Lato",
    designer: "Łukasz Dziedzic",
    style: "sans",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/lato@5.2.6/files/lato-latin-700-normal.woff",
  },
  {
    id: "poppins",
    name: "Poppins",
    designer: "Indian Type Foundry",
    style: "sans",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/poppins@5.2.6/files/poppins-latin-700-normal.woff",
  },
  {
    id: "oswald",
    name: "Oswald",
    designer: "Vernon Adams",
    style: "sans",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/oswald@5.2.6/files/oswald-latin-600-normal.woff",
  },
  {
    id: "raleway",
    name: "Raleway",
    designer: "Matt McInerney",
    style: "sans",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/raleway@5.2.6/files/raleway-latin-700-normal.woff",
  },
  {
    id: "nunito",
    name: "Nunito",
    designer: "Vernon Adams",
    style: "sans",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/nunito@5.2.6/files/nunito-latin-700-normal.woff",
  },
  {
    id: "josefin-sans",
    name: "Josefin Sans",
    designer: "Santiago Orozco",
    style: "sans",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/josefin-sans@5.2.6/files/josefin-sans-latin-700-normal.woff",
  },
  {
    id: "playfair-display",
    name: "Playfair Display",
    designer: "Claus Eggers Sørensen",
    style: "serif",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/playfair-display@5.2.6/files/playfair-display-latin-700-normal.woff",
  },
  {
    id: "merriweather",
    name: "Merriweather",
    designer: "Sorkin Type",
    style: "serif",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/merriweather@5.2.6/files/merriweather-latin-700-normal.woff",
  },
  {
    id: "cinzel",
    name: "Cinzel",
    designer: "Natanael Gama",
    style: "serif",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/cinzel@5.2.6/files/cinzel-latin-700-normal.woff",
  },
  {
    id: "fredoka",
    name: "Fredoka",
    designer: "Milena Brandão",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/fredoka@5.3.0/files/fredoka-latin-700-normal.woff",
  },
  {
    id: "baloo",
    name: "Baloo 2",
    designer: "Ek Type",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/baloo-2@5.2.6/files/baloo-2-latin-800-normal.woff",
  },
  {
    id: "titan-one",
    name: "Titan One",
    designer: "Rodrigo Fuenzalida",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/titan-one@5.2.6/files/titan-one-latin-400-normal.woff",
  },
  {
    id: "lilita-one",
    name: "Lilita One",
    designer: "Juan Montoreano",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/lilita-one@5.2.6/files/lilita-one-latin-400-normal.woff",
  },
  {
    id: "bagel-fat-one",
    name: "Bagel Fat One",
    designer: "Kyungwon Kim",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/bagel-fat-one@5.2.6/files/bagel-fat-one-latin-400-normal.woff",
  },
  {
    id: "abril-fatface",
    name: "Abril Fatface",
    designer: "TypeTogether",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/abril-fatface@5.2.6/files/abril-fatface-latin-400-normal.woff",
  },
  {
    id: "bebas-neue",
    name: "Bebas Neue",
    designer: "Ryoichi Tsunekawa",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/bebas-neue@5.2.6/files/bebas-neue-latin-400-normal.woff",
  },
  {
    id: "anton",
    name: "Anton",
    designer: "Vernon Adams",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/anton@5.2.6/files/anton-latin-400-normal.woff",
  },
  {
    id: "righteous",
    name: "Righteous",
    designer: "Astigmatic",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/righteous@5.2.6/files/righteous-latin-400-normal.woff",
  },
  {
    id: "orbitron",
    name: "Orbitron",
    designer: "Matt McInerney",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/orbitron@5.2.6/files/orbitron-latin-700-normal.woff",
  },
  {
    id: "permanent-marker",
    name: "Permanent Marker",
    designer: "Font Diner",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/permanent-marker@5.2.6/files/permanent-marker-latin-400-normal.woff",
  },
  {
    id: "pacifico",
    name: "Pacifico",
    designer: "Vernon Adams",
    style: "script",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/pacifico@5.2.6/files/pacifico-latin-400-normal.woff",
  },
  {
    id: "dancing-script",
    name: "Dancing Script",
    designer: "Impallari Type",
    style: "script",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/dancing-script@5.2.6/files/dancing-script-latin-700-normal.woff",
  },
  {
    id: "lobster",
    name: "Lobster",
    designer: "Impallari Type",
    style: "script",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/lobster@5.2.6/files/lobster-latin-400-normal.woff",
  },
  {
    id: "great-vibes",
    name: "Great Vibes",
    designer: "TypeSETit",
    style: "script",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/great-vibes@5.2.6/files/great-vibes-latin-400-normal.woff",
  },
  {
    id: "press-start-2p",
    name: "Press Start 2P",
    designer: "Cody Boisclair",
    style: "display",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/press-start-2p@5.2.6/files/press-start-2p-latin-400-normal.woff",
  },
  {
    id: "source-code-pro",
    name: "Source Code Pro",
    designer: "Paul D. Hunt",
    style: "mono",
    url: "https://cdn.jsdelivr.net/npm/@fontsource/source-code-pro@5.2.6/files/source-code-pro-latin-700-normal.woff",
  },
];

export function getFont(id: string): FontOption {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}
