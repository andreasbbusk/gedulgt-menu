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
				});
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
			</div>
		</section>
	);
}
