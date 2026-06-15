import cocktail1 from '../../assets/cocktail1.png';
import cocktail2 from '../../assets/cocktail2.png';
import cocktail3 from '../../assets/cocktail3.png';
import cocktail4 from '../../assets/cocktail4.png';
import cocktail5 from '../../assets/cocktail5.png';
import cocktail6 from '../../assets/cocktail6.png';

const DRINK_IMAGE_SRC_BY_ID: Record<string, string> = {
	cocktail1,
	cocktail2,
	cocktail3,
	cocktail4,
	cocktail5,
	cocktail6,
};

export function getDrinkImageSrc(imageId: string) {
	const src = DRINK_IMAGE_SRC_BY_ID[imageId];

	if (!src) {
		throw new Error(`Unknown drink image: ${imageId}`);
	}

	return src;
}
