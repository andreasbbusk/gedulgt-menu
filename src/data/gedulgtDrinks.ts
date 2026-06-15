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
    id: "goose-fly-high",
    name: "Goose Fly High",
    description: "Spicy & Fresh",
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
    imageId: "cocktail1",
  },
  {
    id: "how-about-them-olives",
    name: "How About Them Olives?",
    description: "Savoury & Juicy",
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
    imageId: "cocktail2",
  },
  {
    id: "wake-me-up-before-you-co-co",
    name: "Wake Me Up Before You Co-Co",
    description: "Creamy & Delight",
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
    imageId: "cocktail3",
  },
  {
    id: "can-can",
    name: "Can-Can",
    description: "Fruity & Spiced",
    ingredients: ["Plymouth sloe gin", "Pimm's", "Lime", "Ginger beer"],
    price: "120,-",
    creator: "Bastian Leander",
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
    imageId: "cocktail5",
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
    imageId: "cocktail6",
  },
];
