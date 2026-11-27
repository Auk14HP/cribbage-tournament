/*
 * The step bar under the Organizer screen's header: the night's five steps in order, one per
 * phase. Steps already done are ticked, the current step is ringed and named in bold, and later
 * steps are empty circles. A line runs through the steps, filled up to the current one. It only
 * shows progress: nothing in it can be clicked, so the Organizer can't skip a step the
 * Tournament's rules require.
 */
import type { Phase } from '../tournament';

// Where a step stands: already done, the phase the Tournament is in, or still to come.
type StepStatus = 'done' | 'current' | 'later';

const steps: readonly { phase: Phase; name: string }[] = [
	{ phase: 'registration', name: 'Register' },
	{ phase: 'houseRules', name: 'House Rules' },
	{ phase: 'drawShown', name: 'Draw' },
	{ phase: 'inProgress', name: 'Now playing' },
	{ phase: 'finished', name: 'Finished' },
];

/*
 * Each step's mark, centred in a box of the same size whichever it is, so the line through
 * them meets every mark at its middle. The ring round the current step is drawn outside its
 * box, the canvas showing between.
 */
const markBox = 'grid size-5 place-items-center';
const markClasses: Record<StepStatus, string> = {
	done: 'size-5 rounded-full bg-fill text-on-fill',
	current: 'size-5 rounded-full bg-fill ring-2 ring-fill ring-offset-4 ring-offset-canvas',
	later: 'size-4 rounded-full border-2 border-line bg-canvas',
};

const TickIcon = () => (
	<svg
		aria-hidden="true"
		className="size-5 p-1"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="4"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M5 12l5 5L20 7" />
	</svg>
);

// Whether the step at the index is done, current or still to come, given the current step's index.
const findStepStatus = (index: number, currentIndex: number): StepStatus => {
	if (index < currentIndex) {
		return 'done';
	}
	return index === currentIndex ? 'current' : 'later';
};

// One step: its mark, then its name. Only the current step is marked as such for a screen reader.
const Step = ({ name, status }: { name: string; status: StepStatus }) => {
	const isCurrent = status === 'current';
	return (
		<li
			aria-current={isCurrent ? 'step' : undefined}
			className="flex flex-col items-center gap-2"
		>
			<span aria-hidden="true" className={markBox}>
				<span className={markClasses[status]}>{status === 'done' && <TickIcon />}</span>
			</span>
			<span className={isCurrent ? 'font-bold' : 'text-muted'}>{name}</span>
		</li>
	);
};

export const StepBar = ({ phase }: { phase: Phase }) => {
	const currentIndex = steps.findIndex((step) => step.phase === phase);
	/*
	 * The steps share the bar's width equally, so the first mark sits a tenth of the way in
	 * and the last a tenth from the end: the line runs between them, filled a fifth of the
	 * width for each step done.
	 */
	const filledPercent = currentIndex * 20;
	return (
		<div className="relative mt-5">
			<div
				aria-hidden="true"
				className="bg-divider absolute top-2 right-[10%] left-[10%] h-1 rounded-full"
			/>
			<div
				aria-hidden="true"
				className="bg-fill absolute top-2 left-[10%] h-1 rounded-full"
				style={{ width: `${filledPercent}%` }}
			/>
			<ol aria-label="Tournament steps" className="relative grid grid-cols-5 text-sm">
				{steps.map((step, index) => (
					<Step
						key={step.phase}
						name={step.name}
						status={findStepStatus(index, currentIndex)}
					/>
				))}
			</ol>
		</div>
	);
};
