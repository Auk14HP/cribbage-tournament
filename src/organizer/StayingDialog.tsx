import { useId, type RefObject } from 'react';
import type { Player, StayingAnswer } from '../tournament';
import { button, confirmButton, confirmColours, dialogBox } from './classes';

/*
 * Asks whether a Player losing their first Match is staying for the Losers Bracket, before their result is
 * recorded. Cancel records nothing.
 */
export const StayingDialog = ({
	ref,
	loser,
	onAnswer,
}: {
	ref: RefObject<HTMLDialogElement | null>;
	loser?: Player;
	onAnswer: (answer: StayingAnswer) => void;
}) => {
	const messageId = useId();
	const answer = (stayingAnswer: StayingAnswer) => {
		ref.current?.close();
		onAnswer(stayingAnswer);
	};
	return (
		<dialog ref={ref} aria-labelledby={messageId} className={dialogBox}>
			<p id={messageId} className="text-lg">
				Is {loser?.name} staying for the Losers Bracket?
			</p>
			<div className="mt-6 flex justify-end gap-2">
				<button type="button" className={button} onClick={() => ref.current?.close()}>
					Cancel
				</button>
				<button type="button" className={button} onClick={() => answer('leaving')}>
					Leaving
				</button>
				<button
					type="button"
					className={`${confirmButton} ${confirmColours.safe}`}
					onClick={() => answer('staying')}
				>
					Staying
				</button>
			</div>
		</dialog>
	);
};
