import { memo, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import {
	getCanonicalDrinks,
	type TableSide,
	type WheelSlot,
} from '../../store/gedulgtTableStore';
import { Card } from './Card';

gsap.registerPlugin(useGSAP);

const FOCUSED_NEAR_ANGLE = 90;
const MIRRORED_COPY_ANGLE = 180;
const ORBIT_ANGLE_STEP = 30;

type WheelProps = {
	slots: WheelSlot[];
	wheelPosition: number;
	cardFace: 'front' | 'back';
	onDrinkClick: (drinkId: string, side: TableSide) => void;
};

export const Wheel = memo(function Wheel({
	slots,
	wheelPosition,
	cardFace,
	onDrinkClick,
}: WheelProps) {
	const wheelRef = useRef<HTMLDivElement | null>(null);
	const [layoutVersion, setLayoutVersion] = useState(0);
	const drinks = getCanonicalDrinks();

	useEffect(() => {
		const handleResize = () => {
			setLayoutVersion((version) => version + 1);
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	useGSAP(
		() => {
			const wheel = wheelRef.current;

			if (!wheel) {
				return;
			}

			const reduceMotion = window.matchMedia(
				'(prefers-reduced-motion: reduce)',
			).matches;
			const rect = wheel.getBoundingClientRect();
			const diameter = Math.max(320, Math.min(rect.width, rect.height));
			const compact = rect.width < 620;
			const orbitRadius = diameter * (compact ? 0.345 : 0.355);
			const cards = Array.from(
				wheel.querySelectorAll<HTMLButtonElement>('[data-wheel-slot]'),
			);
			const tl = gsap.timeline({
				defaults: {
					duration: reduceMotion ? 0 : 0.98,
					ease: 'expo.inOut',
				},
			});

			cards.forEach((card) => {
				const angle = Number(card.dataset.orbitAngle ?? FOCUSED_NEAR_ANGLE);
				const offset = Number(card.dataset.focusOffset ?? 0);
				const depth = Math.min(3, Math.abs(offset));
				const focused = card.dataset.focusedSlot === 'true';
				const radians = (angle * Math.PI) / 180;
				const radialRotation = angle - 90;
				const scale = focused ? 1 : 0.84;
				const alpha = focused ? 1 : 0.72;
				const blur = focused ? 0 : 12;
				const saturation = focused ? 1 : 0.82;
				const brightness = focused ? 1 : 0.88;

				tl.to(
					card,
					{
						x: Math.cos(radians) * orbitRadius,
						y: Math.sin(radians) * orbitRadius,
						xPercent: -50,
						yPercent: -50,
						scale,
						rotation: radialRotation,
						autoAlpha: alpha,
						filter: `blur(${blur}px) saturate(${saturation}) brightness(${brightness})`,
						zIndex: focused ? 12 : depth === 1 ? 10 : 8 - depth,
						pointerEvents: depth <= 1 ? 'auto' : 'none',
						transformOrigin: '50% 50%',
						overwrite: 'auto',
					},
					0,
				);
			});
		},
		{ dependencies: [wheelPosition, layoutVersion], scope: wheelRef },
	);

	return (
		<div ref={wheelRef} className='mirrored-wheel' aria-label='Mirrored drinks'>
			{slots.map((slot) => {
				const drink = drinks[slot.canonicalIndex];
				const orbitAngle = getOrbitAngle(
					slot.canonicalIndex,
					slot.side === 'far' ? 1 : 0,
					wheelPosition,
				);
				const visualSide = getVisualSide(orbitAngle);
				const visualOffset = getVisualOffset(orbitAngle, visualSide);

				return (
					<span
						key={slot.slotId}
						className='mirrored-wheel__slot'
						data-wheel-slot
						data-focused-slot={slot.focused ? 'true' : undefined}
						data-table-side={visualSide}
						data-orbit-angle={orbitAngle}
						data-focus-offset={visualOffset}>
						<Card
							drink={drink}
							side={visualSide}
							focused={slot.focused}
							face={cardFace}
							offset={Math.round(visualOffset)}
							onClick={onDrinkClick}
						/>
					</span>
				);
			})}
		</div>
	);
});

function getOrbitAngle(
	canonicalIndex: number,
	copyIndex: number,
	focusPosition: number,
) {
	return (
		FOCUSED_NEAR_ANGLE +
		(canonicalIndex - focusPosition) * ORBIT_ANGLE_STEP +
		copyIndex * MIRRORED_COPY_ANGLE
	);
}

function getVisualSide(angle: number): TableSide {
	return Math.sin((angle * Math.PI) / 180) < 0 ? 'far' : 'near';
}

function getVisualOffset(angle: number, side: TableSide) {
	const focusedAngle = side === 'near' ? FOCUSED_NEAR_ANGLE : 270;

	return getSignedAngleDelta(angle, focusedAngle) / ORBIT_ANGLE_STEP;
}

function getSignedAngleDelta(angle: number, origin: number) {
	return ((((angle - origin) % 360) + 540) % 360) - 180;
}
