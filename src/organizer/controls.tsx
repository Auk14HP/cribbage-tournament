// Shared by the organizer route's screens: the confirm dialog, refusals, and how a change is applied.
import { useId, type RefObject } from 'react';
import type { Result } from '../result';
import type { Tournament } from '../tournament';
import { button, confirmButton, confirmColours, dialogBox } from './classes';

// Saves the change if the core accepted it. Returns the reason it was refused, or '' if accepted.
export type Apply = (outcome: Result<Tournament>) => string;

/*
 * Asks the Organizer to confirm an action before it is taken: open it with `showModal()` on its ref.
 * Cancel or Escape closes it and nothing happens. A destructive action gets a red confirm button. Being the browser's modal <dialog>, it takes focus
 * when it opens (on Cancel, the safe answer) and gives it back to the page when it closes.
 */
export const ConfirmDialog = ({
	ref,
	message,
	confirmLabel,
	isDestructive = false,
	onConfirm,
}: {
	ref: RefObject<HTMLDialogElement | null>;
	message: string;
	confirmLabel: string;
	isDestructive?: boolean;
	onConfirm: () => void;
}) => {
	const messageId = useId();
	return (
		<dialog ref={ref} aria-labelledby={messageId} className={dialogBox}>
			<p id={messageId} className="text-lg">
				{message}
			</p>
			<div className="mt-6 flex justify-end gap-2">
				<button type="button" className={button} onClick={() => ref.current?.close()}>
					Cancel
				</button>
				<button
					type="button"
					className={`${confirmButton} ${isDestructive ? confirmColours.destructive : confirmColours.safe}`}
					onClick={() => {
						ref.current?.close();
						onConfirm();
					}}
				>
					{confirmLabel}
				</button>
			</div>
		</dialog>
	);
};

export const Refusal = ({ reason }: { reason: string }) => (
	<p role="alert" className="mt-2 min-h-6 font-semibold text-red-700">
		{reason}
	</p>
);
