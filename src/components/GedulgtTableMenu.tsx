import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	type CSSProperties,
	type RefObject,
} from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { FEEDBACK_SETTLE_MS, cx } from './table/utils';
import { Dormant } from './table/Dormant';
import { Guide } from './table/Guide';
import { Order } from './table/Order';
import { Tray } from './table/Tray';
import { Wheel } from './table/Wheel';
import { useGestureInput } from './table/useGestureInput';
import { usePointerInput } from './table/usePointerInput';
import {
	INACTIVITY_TIMEOUT_MS,
	getFocusedDrink,
	getOrderTotal,
	getSelectedDrinkItems,
	getTotalSelectedCount,
	getWheelSlots,
	useGedulgtTableStore,
	type ExperiencePhase,
	type GedulgtTableStore,
	type TableSide,
} from '../store/gedulgtTableStore';
import type { HandTrackingSnapshot } from '../hooks/useHandTracking';

gsap.registerPlugin(useGSAP);

type GedulgtTableMenuProps = {
	gesturesEnabled: boolean;
	trackingRef: {
		current: HandTrackingSnapshot;
	};
};

export function GedulgtTableMenu({
	gesturesEnabled,
	trackingRef,
}: GedulgtTableMenuProps) {
	const tableRef = useRef<HTMLElement | null>(null);
	const phase = useGedulgtTableStore((state) => state.phase);
	const activeSide = useGedulgtTableStore((state) => state.activeSide);
	const focusedDrinkId = useGedulgtTableStore((state) => state.focusedDrinkId);
	const wheelPosition = useGedulgtTableStore((state) => state.wheelPosition);
	const cardFace = useGedulgtTableStore((state) => state.cardFace);
	const selectedItems = useGedulgtTableStore((state) => state.selectedItems);
	const onboardingStep = useGedulgtTableStore((state) => state.onboardingStep);
	const feedback = useGedulgtTableStore((state) => state.trayFeedback);
	const lastInteractionAt = useGedulgtTableStore(
		(state) => state.lastInteractionAt,
	);
	const activate = useGedulgtTableStore((state) => state.activate);
	const deactivate = useGedulgtTableStore((state) => state.deactivate);
	const rotateWheel = useGedulgtTableStore((state) => state.rotateWheel);
	const focusDrink = useGedulgtTableStore((state) => state.focusDrink);
	const toggleCardFace = useGedulgtTableStore((state) => state.toggleCardFace);
	const addFocusedToTray = useGedulgtTableStore(
		(state) => state.addFocusedToTray,
	);
	const decrementTrayItem = useGedulgtTableStore(
		(state) => state.decrementTrayItem,
	);
	const confirmOrder = useGedulgtTableStore((state) => state.confirmOrder);
	const resetExperience = useGedulgtTableStore(
		(state) => state.resetExperience,
	);
	const inactivityTimeout = useGedulgtTableStore(
		(state) => state.inactivityTimeout,
	);
	const clearTrayFeedback = useGedulgtTableStore(
		(state) => state.clearTrayFeedback,
	);

	const focusedDrink = getFocusedDrink({ focusedDrinkId });
	const wheelSlots = useMemo(
		() => getWheelSlots({ focusedDrinkId }),
		[focusedDrinkId],
	);
	const selectedDrinks = useMemo(
		() => getSelectedDrinkItems(selectedItems),
		[selectedItems],
	);
	const selectedCount = useMemo(
		() => getTotalSelectedCount(selectedItems),
		[selectedItems],
	);
	const orderTotal = useMemo(
		() => getOrderTotal(selectedItems),
		[selectedItems],
	);

	const pointer = usePointerInput({
		tableRef,
		onAdd: addFocusedToTray,
		onRotate: rotateWheel,
	});

	useGestureInput({
		enabled: gesturesEnabled,
		tableRef,
		trackingRef,
		activeSide,
		phase,
		focusedDrinkId,
		activate,
		addFocusedToTray,
		rotateWheel,
		toggleCardFace,
	});

	useAmbientMotion(tableRef);
	usePhaseGlow(tableRef, phase);

	useEffect(() => {
		if (!feedback) {
			return;
		}

		const timer = window.setTimeout(() => {
			clearTrayFeedback(Date.now());
		}, FEEDBACK_SETTLE_MS);

		return () => {
			window.clearTimeout(timer);
		};
	}, [clearTrayFeedback, feedback]);

	useEffect(() => {
		if (phase === 'dormant') {
			return;
		}

		const interval = window.setInterval(() => {
			const now = Date.now();

			if (now - lastInteractionAt >= INACTIVITY_TIMEOUT_MS) {
				inactivityTimeout(now);
			}
		}, 1_000);

		return () => {
			window.clearInterval(interval);
		};
	}, [inactivityTimeout, lastInteractionAt, phase]);

	useKeyboardInput({
		phase,
		activate,
		deactivate,
		rotateWheel,
		toggleCardFace,
		addFocusedToTray,
		resetExperience,
	});

	const handleDrinkClick = useCallback(
		(drinkId: string, side: TableSide) => {
			if (drinkId === focusedDrinkId) {
				toggleCardFace(side, 'mouse');
				return;
			}

			focusDrink(drinkId, side, 'mouse');
			toggleCardFace(side, 'mouse');
		},
		[focusDrink, focusedDrinkId, toggleCardFace],
	);

	return (
		<section
			ref={tableRef}
			className={cx('projection-table', `projection-table--${phase}`)}
			style={{ '--drink-accent': focusedDrink.accent } as CSSProperties}
			aria-label='Gedulgt Table Menu'
			data-gestures={gesturesEnabled ? 'enabled' : 'disabled'}
			{...pointer}>
			<Ambient />

			{phase === 'dormant' ? (
				<Dormant />
			) : (
				<>
					<Wheel
						slots={wheelSlots}
						wheelPosition={wheelPosition}
						cardFace={cardFace}
						onDrinkClick={handleDrinkClick}
					/>
					<Tray
						items={selectedDrinks}
						totalCount={selectedCount}
						feedback={feedback}
						phase={phase}
						onDecrement={(drinkId, side) =>
							decrementTrayItem(drinkId, side, 'mouse')
						}
						onConfirm={(side) => confirmOrder(side, 'mouse')}
					/>
					{phase === 'onboarding' && <Guide step={onboardingStep} />}
					{phase === 'orderConfirmation' && (
						<Order
							items={selectedDrinks}
							total={orderTotal}
							onReset={() => resetExperience('mouse')}
						/>
					)}
				</>
			)}
		</section>
	);
}

function Ambient() {
	return (
		<div className='projection-table__ambient' aria-hidden='true'>
			<span className='projection-table__grain' />
			<span className='projection-table__light-pool' />
			<span className='projection-table__smoke projection-table__smoke--a' />
			<span className='projection-table__smoke projection-table__smoke--b' />
			<span className='projection-table__prism projection-table__prism--a' />
			<span className='projection-table__prism projection-table__prism--b' />
			<span className='projection-table__rim' />
		</div>
	);
}

function useAmbientMotion(tableRef: RefObject<HTMLElement | null>) {
	useGSAP(
		() => {
			const table = tableRef.current;

			if (!table) {
				return;
			}

			const reduceMotion = window.matchMedia(
				'(prefers-reduced-motion: reduce)',
			).matches;
			const q = gsap.utils.selector(table);

			if (reduceMotion) {
				gsap.set(q('.projection-table__ambient *'), { clearProps: 'all' });
				return;
			}

			const tl = gsap.timeline({ repeat: -1 });

			tl.to(
				q('.projection-table__smoke--a'),
				{
					xPercent: 4,
					yPercent: -3,
					scale: 1.08,
					rotation: 3,
					duration: 13,
					yoyo: true,
					repeat: 1,
					ease: 'sine.inOut',
				},
				0,
			)
				.to(
					q('.projection-table__smoke--b'),
					{
						xPercent: -5,
						yPercent: 4,
						scale: 1.12,
						rotation: -4,
						duration: 17,
						yoyo: true,
						repeat: 1,
						ease: 'sine.inOut',
					},
					0,
				)
				.to(
					q('.projection-table__prism'),
					{ rotation: 360, duration: 28, ease: 'none' },
					0,
				)
				.to(
					q('.projection-table__light-pool'),
					{
						scale: 1.04,
						autoAlpha: 0.86,
						duration: 5.5,
						yoyo: true,
						repeat: 1,
						ease: 'sine.inOut',
					},
					0,
				)
				.to(
					q('.projection-table__grain'),
					{
						x: 18,
						y: -14,
						duration: 9,
						yoyo: true,
						repeat: 1,
						ease: 'steps(5)',
					},
					0,
				);

			return () => {
				tl.kill();
			};
		},
		{ scope: tableRef },
	);
}

function usePhaseGlow(tableRef: RefObject<HTMLElement | null>, phase: string) {
	useGSAP(
		() => {
			const table = tableRef.current;

			if (!table) {
				return;
			}

			const reduceMotion = window.matchMedia(
				'(prefers-reduced-motion: reduce)',
			).matches;

			gsap.to(table, {
				'--phase-glow':
					phase === 'orderConfirmation'
						? 0.54
						: phase === 'dormant'
							? 0.18
							: 0.38,
				'--phase-scale': phase === 'dormant' ? 0.985 : 1,
				duration: reduceMotion ? 0 : 0.72,
				ease: 'power3.out',
				overwrite: 'auto',
			});
		},
		{ dependencies: [phase], scope: tableRef },
	);
}

type KeyboardInput = {
	phase: ExperiencePhase;
	activate: GedulgtTableStore['activate'];
	deactivate: GedulgtTableStore['deactivate'];
	rotateWheel: GedulgtTableStore['rotateWheel'];
	toggleCardFace: GedulgtTableStore['toggleCardFace'];
	addFocusedToTray: GedulgtTableStore['addFocusedToTray'];
	resetExperience: GedulgtTableStore['resetExperience'];
};

function useKeyboardInput({
	phase,
	activate,
	deactivate,
	rotateWheel,
	toggleCardFace,
	addFocusedToTray,
	resetExperience,
}: KeyboardInput) {
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.altKey || event.ctrlKey || event.metaKey) {
				return;
			}

			if (event.key === 'Escape') {
				event.preventDefault();
				if (phase === 'orderConfirmation') {
					resetExperience('keyboard');
				} else if (phase !== 'dormant') {
					deactivate('near', 'keyboard');
				}
				return;
			}

			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				if (phase === 'dormant') {
					activate('near', 'keyboard');
				} else {
					rotateWheel('previous', 'near', 'keyboard');
				}
				return;
			}

			if (event.key === 'ArrowRight') {
				event.preventDefault();
				if (phase === 'dormant') {
					activate('near', 'keyboard');
				} else {
					rotateWheel('next', 'near', 'keyboard');
				}
				return;
			}

			if (event.key === 'Enter') {
				event.preventDefault();
				if (phase === 'dormant') {
					activate('near', 'keyboard');
				} else if (phase === 'orderConfirmation') {
					resetExperience('keyboard');
				} else {
					toggleCardFace('near', 'keyboard');
				}
				return;
			}

			if (event.key === ' ') {
				event.preventDefault();
				if (phase === 'dormant') {
					activate('near', 'keyboard');
				} else {
					addFocusedToTray('near', 'keyboard');
				}
			}
		};

		window.addEventListener('keydown', onKeyDown);

		return () => {
			window.removeEventListener('keydown', onKeyDown);
		};
	}, [
		activate,
		addFocusedToTray,
		deactivate,
		phase,
		resetExperience,
		rotateWheel,
		toggleCardFace,
	]);
}
