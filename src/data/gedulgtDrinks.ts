export type GedulgtDrink = {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  price: string;
  creator: string;
  imageId: string;
};

export const GEDULGT_DRINKS: GedulgtDrink[] = [
  {
    id: "from-dust-till-dawn",
    name: "From 'Dust' Till Dawn",
    description: "Adventurous & Comforting",
    ingredients: [
      "Cuish Espadín Mezcal",
      "Creme De Cacao",
      "Stout",
      "Egg Yolk",
      "Marshmallow",
      "Tonka Bean",
      "Cream",
      "Ruby Portwine",
      "Cinnamon",
    ],
    price: "135,-",
    creator: "Mads Schack & Bastian Leander",
    imageId: "cocktail5",
  },
  {
    id: "can-can",
    name: "Can Can",
    description: "Fruity & Spiced",
    ingredients: ["Plymouth Sloe Gin", "Pimm's", "Lime", "Ginger Beer"],
    price: "120,-",
    creator: "Bastian Leander",
    imageId: "cocktail9",
  },
  {
    id: "honolulu",
    name: "Honolulu",
    description: "Comforting & Rich",
    ingredients: [
      "Bayou Reserve Rum",
      "Coconut",
      "Mr. Jekyll Absinth",
      "Chocolate bitter",
      "Caramelized Fig",
      "Pineapple",
      "Lemon",
      "Vanilla Ice Cream",
    ],
    price: "135,-",
    creator: "Hasse Johansen",
    imageId: "cocktail6",
  },
  {
    id: "sassy-sazerac",
    name: "Sassy Sazerac",
    description: "Boozy & Aromatic",
    ingredients: [
      "Sall Whisky Glød",
      "Empherical Symphony 6",
      "Star Anis",
      "Mia's Bitters",
    ],
    price: "145,-",
    creator: "Mia Hjorth",
    imageId: "cocktail4",
  },
  {
    id: "american-beauty",
    name: "American Beauty",
    description: "Creamy & Fruity",
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
    imageId: "cocktail8",
  },
  {
    id: "pop-pop-popcorn",
    name: "Pop Pop Popcorn",
    description: "Sour & Salty",
    ingredients: [
      "Popcorn washed Havana 7Y rum",
      "Lime",
      "Black walnut",
      "Popcorn",
    ],
    price: "120,-",
    creator: "Bastian Leander",
    imageId: "cocktail7",
  },
];
