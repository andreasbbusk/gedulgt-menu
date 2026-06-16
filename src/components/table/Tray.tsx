import { useRef, type CSSProperties } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
	formatPrice,
	getOrderTotal,
	type TableSide,
	type TrayFeedback,
	type getSelectedDrinkItems,
} from '../../store/gedulgtTableStore';
import { getDrinkImageSrc } from './drinkAssets';
import { cx, getSide } from './utils';

gsap.registerPlugin(useGSAP);

type SelectedItems = ReturnType<typeof getSelectedDrinkItems>;

const TOKEN_POSITIONS = [
	{ dx: 0, dy: -12 },
	{ dx: 76, dy: -78 },
	{ dx: -84, dy: -56 },
	{ dx: 88, dy: 22 },
	{ dx: -82, dy: 28 },
	{ dx: 0, dy: -118 },
];
const TOKEN_CLUSTER_Y_OFFSET = 24;

function getTrayTokenPosition(index: number) {
	const compact =
		typeof window !== 'undefined' &&
		window.matchMedia('(max-width: 760px)').matches;
	const scale = compact ? 0.72 : 1;
	const position = TOKEN_POSITIONS[index % TOKEN_POSITIONS.length];

	return {
		badgeX: 0,
		badgeY: -24,
		x: position.dx * scale,
		y: (position.dy + TOKEN_CLUSTER_Y_OFFSET) * scale,
	};
}

type TrayProps = {
	items: SelectedItems;
	totalCount: number;
	feedback: TrayFeedback;
	phase: string;
	onDecrement: (drinkId: string, side: TableSide) => void;
	onConfirm: (side: TableSide) => void;
};

export function Tray({
	items,
	totalCount,
	feedback,
	phase,
	onDecrement,
}: TrayProps) {
	const trayRef = useRef<HTMLElement | null>(null);
	const previousCountRef = useRef(totalCount);
	const hasItems = totalCount > 0;
	const total = getOrderTotal(items);

	useGSAP(
		() => {
			const tray = trayRef.current;

			if (!tray) {
				return;
			}

			const reduceMotion = window.matchMedia(
				'(prefers-reduced-motion: reduce)',
			).matches;
			const tokens = tray.querySelectorAll('.tray-token');
			const pulse = tray.querySelector('.tray__feedback-pulse');
			const countChanged = previousCountRef.current !== totalCount;
			const entersFromCenter = previousCountRef.current === 0 && totalCount > 0;

			if (pulse && feedback) {
				gsap.fromTo(
					pulse,
					{ autoAlpha: 0.8, scale: 0.34 },
					{
						autoAlpha: 0,
						scale: reduceMotion ? 1 : 1.8,
						duration: reduceMotion ? 0 : 0.76,
						ease: 'expo.out',
						overwrite: 'auto',
					},
				);
			}

			if (tokens.length > 0 && countChanged) {
				if (entersFromCenter) {
					gsap.fromTo(
						tokens,
						{
							autoAlpha: 0,
							scale: 0,
						},
						{
							autoAlpha: 1,
							scale: 1,
							stagger: { amount: 0.2, from: 'center' },
							duration: reduceMotion ? 0 : 0.68,
							ease: 'back.out',
							overwrite: 'auto',
						},
					);
				} else {
					gsap.fromTo(
						tokens,
						{ autoAlpha: 0 },
						{
							autoAlpha: 1,
							stagger: { amount: 0.18, from: 'center' },
							duration: reduceMotion ? 0 : 0.54,
							ease: 'power2.out',
							overwrite: 'auto',
						},
					);
				}
			}

			previousCountRef.current = totalCount;
		},
		{ dependencies: [feedback, totalCount], scope: trayRef },
	);

	return (
		<section
			ref={trayRef}
			className={cx(
				'tray',
				hasItems && 'tray--populated',
				phase === 'orderConfirmation' && 'tray--confirming',
			)}
			aria-label='Tray'>
			<span className='tray__feedback-pulse' aria-hidden='true' />
			<div className='tray__core' aria-hidden='true' />

			<div className='tray__tokens' aria-label='Selected drinks'>
				{items.map((item, index) => {
					const tokenPosition = getTrayTokenPosition(index);
					const imageSrc = getDrinkImageSrc(item.drink.imageId);

					return (
						<button
							key={item.drinkId}
							type='button'
							className='tray-token'
							data-drink-id={item.drink.id}
							style={
								{
									'--badge-x': `${tokenPosition.badgeX}px`,
									'--badge-y': `${tokenPosition.badgeY}px`,
									'--token-x': `${tokenPosition.x}px`,
									'--token-y': `${tokenPosition.y}px`,
								} as CSSProperties
							}
							data-tray-token
							onClick={(event) => {
								onDecrement(
									item.drinkId,
									getSide(event.clientY, trayRef.current),
								);
							}}
							aria-label={`Remove one ${item.drink.name}`}>
							<img
								src={imageSrc}
								alt={item.drink.name}
								className='drink-card__image'
							/>
							<span>x{item.quantity}</span>
						</button>
					);
				})}
			</div>

			<div className='tray__confirm'>
				{hasItems && <strong>{formatPrice(total)}</strong>}
			</div>
		</section>
	);
}
