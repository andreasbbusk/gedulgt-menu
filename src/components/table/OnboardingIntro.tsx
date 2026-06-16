import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

type OnboardingIntroProps = {
	confirmed?: boolean;
};

export function OnboardingIntro({ confirmed = false }: OnboardingIntroProps) {
	const rootRef = useRef<HTMLElement | null>(null);

	useGSAP(
		() => {
			const root = rootRef.current;

			if (!root) {
				return;
			}

			const reduceMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			const q = gsap.utils.selector(root);

			gsap
				.timeline({
					defaults: {
						ease: "power3.out",
						duration: reduceMotion ? 0 : 0.75,
					},
				})
				.fromTo(
					q(".onboarding-intro__title"),
					{ autoAlpha: 0, y: 18, scale: 0.95 },
					{ autoAlpha: 1, y: 0, scale: 1 },
				)
				.fromTo(
					q(".onboarding-intro__prompt"),
					{ autoAlpha: 0, y: 12 },
					{ autoAlpha: 1, y: 0 },
					0.12,
				);
		},
		{ scope: rootRef },
	);

	useGSAP(
		() => {
			const root = rootRef.current;

			if (!root || !confirmed) {
				return;
			}

			const reduceMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			const q = gsap.utils.selector(root);

			gsap
				.timeline({
					defaults: {
						ease: "power3.out",
						duration: reduceMotion ? 0 : 0.42,
					},
				})
				.to(q(".onboarding-intro__prompt"), {
					autoAlpha: 0,
					y: -8,
				})
				.fromTo(
					q(".onboarding-intro__check"),
					{ autoAlpha: 0, yPercent: -50, scale: 0.52, rotate: -12 },
					{ autoAlpha: 1, yPercent: -50, scale: 1, rotate: 0 },
					0.08,
				)
				.fromTo(
					q(".onboarding-intro__check path"),
					{ strokeDashoffset: 72 },
					{ strokeDashoffset: 0, duration: reduceMotion ? 0 : 0.56 },
					0.18,
				);
		},
		{ dependencies: [confirmed], scope: rootRef },
	);

	return (
		<section
			ref={rootRef}
			className="onboarding-intro"
			aria-label={confirmed ? "Ready" : "Choose your master"}
			data-confirmed={confirmed ? "true" : "false"}
		>
			<div className="onboarding-intro__visual">
				<div className="onboarding-intro__copy">
					<h1 className="onboarding-intro__title">Choose your master</h1>
					<p className="onboarding-intro__prompt">
						Place 2 hands to continue
					</p>
				</div>
				<svg
					className="onboarding-intro__check"
					viewBox="0 0 64 64"
					role="img"
					aria-label="Confirmed"
				>
					<circle cx="32" cy="32" r="28" />
					<path d="M18 33.5 27.2 42 46.5 22" pathLength="72" />
				</svg>
			</div>
		</section>
	);
}
