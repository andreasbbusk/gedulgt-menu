export type GedulgtSectionId =
  | "everchanging-world"
  | "out-of-this-world"
  | "the-beginning-of-the-world";

export type GedulgtSection = {
  id: GedulgtSectionId;
  title: string;
  shortTitle: string;
  description: string;
  accent: string;
};

export type GedulgtDrink = {
  id: string;
  sectionId: GedulgtSectionId;
  name: string;
  description: string;
  flavorTags: string[];
  ingredients: string[];
  price: string;
  creator: string;
  accent: string;
};

export const GEDULGT_SECTIONS: GedulgtSection[] = [
  {
    id: "everchanging-world",
    title: "Everchanging World",
    shortTitle: "Everchanging",
    description:
      "Cocktails inspired by Gedulgt's surroundings and the world outside the hidden door.",
    accent: "#6ec8a4",
  },
  {
    id: "out-of-this-world",
    title: "Out of This World",
    shortTitle: "Out There",
    description:
      "Playful, imaginative cocktails where the bar lets loose and follows the strange idea.",
    accent: "#d89a48",
  },
  {
    id: "the-beginning-of-the-world",
    title: "The Beginning of the World",
    shortTitle: "The Beginning",
    description:
      "Gedulgt's view of cocktail origins: classic silhouettes with a modern twist.",
    accent: "#cf6f82",
  },
];

export const GEDULGT_DRINKS: GedulgtDrink[] = [
  {
    id: "goose-fly-high",
    sectionId: "everchanging-world",
    name: "Goose Fly High",
    description: "Spicy & Fresh",
    flavorTags: ["Spicy", "Fresh"],
    ingredients: [
      "Magnifica Tradicional Ipe Cachaca",
      "Choya",
      "Gooseberry",
      "Rawit chili",
      "Salt",
      "Tonka bean",
      "Lime",
      "Orange",
    ],
    price: "110,-",
    creator: "Mia Hjorth",
    accent: "#6ec8a4",
  },
  {
    id: "how-about-them-olives",
    sectionId: "everchanging-world",
    name: "How About Them Olives?",
    description: "Savoury & Juicy",
    flavorTags: ["Savoury", "Juicy"],
    ingredients: [
      "Aquavit Monastery",
      "Coriander seeds",
      "Blood orange",
      "Grapefruit",
      "Green olives",
      "Club soda",
    ],
    price: "110,-",
    creator: "Mia Hjorth",
    accent: "#7dbf78",
  },
  {
    id: "wake-me-up-before-you-co-co",
    sectionId: "everchanging-world",
    name: "Wake Me Up Before You Co-Co",
    description: "Creamy & Delight",
    flavorTags: ["Creamy", "Delight"],
    ingredients: [
      "CPH Distillery coffee spirit",
      "Adriatico Bianco almond liqueur",
      "Coconut",
      "Spices",
      "Chocolate bitter",
      "Vanilla ice cream",
      "A whole egg",
    ],
    price: "130,-",
    creator: "Julie Kjarsgaard, Lajos Kis & Erika Karko",
    accent: "#c8a36e",
  },
  {
    id: "can-can",
    sectionId: "out-of-this-world",
    name: "Can-Can",
    description: "Fruity & Spiced",
    flavorTags: ["Fruity", "Spiced"],
    ingredients: ["Plymouth sloe gin", "Pimm's", "Lime", "Ginger beer"],
    price: "120,-",
    creator: "Bastian Leander",
    accent: "#d89a48",
  },
  {
    id: "american-beauty",
    sectionId: "out-of-this-world",
    name: "American Beauty",
    description: "Creamy & Fruity",
    flavorTags: ["Creamy", "Fruity"],
    ingredients: [
      "Tea infused Beefeater gin",
      "Orange flower water",
      "Cream",
      "Lime",
      "Lemon",
      "Egg white",
      "Acacia honey",
      "Fever-Tree rose & raspberry lemonade",
    ],
    price: "140,-",
    creator: "Bastian Leander & Hasse Johansen",
    accent: "#d9786f",
  },
  {
    id: "pop-pop-popcorn",
    sectionId: "out-of-this-world",
    name: "Pop Pop Popcorn",
    description: "Sour & Salty",
    flavorTags: ["Sour", "Salty"],
    ingredients: [
      "Popcorn washed Havana 7Y rum",
      "Lime",
      "Black walnut",
      "Popcorn",
    ],
    price: "120,-",
    creator: "Bastian Leander",
    accent: "#e3bd5f",
  },
  {
    id: "orange-chocolate-negroni",
    sectionId: "the-beginning-of-the-world",
    name: "Orange Chocolate Negroni",
    description: "Bitter & Sweet",
    flavorTags: ["Bitter", "Sweet"],
    ingredients: [
      "Copenhagen Distillery orange gin",
      "Campari",
      "Vittore sweet red vermouth",
      "Creme de cacao",
    ],
    price: "135,-",
    creator: "Mads Schack & Bastian Leander",
    accent: "#cf6f82",
  },
  {
    id: "rum-old-fashioned",
    sectionId: "the-beginning-of-the-world",
    name: "Rum Old Fashioned",
    description: "Comforting & Spirituous",
    flavorTags: ["Comforting", "Spirituous"],
    ingredients: [
      "Great Dane aged rum",
      "Vittore sweet red vermouth",
      "Ruby portwine",
      "Maple syrup",
      "House chocolate bitter",
      "Orange zest",
    ],
    price: "135,-",
    creator: "Hasse Johansen",
    accent: "#ba8556",
  },
  {
    id: "cotton-candy-champagne-cocktail",
    sectionId: "the-beginning-of-the-world",
    name: "Cotton Candy Champagne Cocktail",
    description: "Dry & Nostalgic",
    flavorTags: ["Dry", "Nostalgic"],
    ingredients: [
      "Ellenor elderflower liqueur",
      "J. Charpentier Brut Champagne",
      "Cotton candy",
      "Served separately",
    ],
    price: "150,-",
    creator: "Bastian Leander",
    accent: "#d989b4",
  },
];

export function getSectionById(sectionId: GedulgtSectionId) {
  return GEDULGT_SECTIONS.find((section) => section.id === sectionId);
}

export function getDrinksBySection(sectionId: GedulgtSectionId) {
  return GEDULGT_DRINKS.filter((drink) => drink.sectionId === sectionId);
}
