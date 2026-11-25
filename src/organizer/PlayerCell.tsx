// A Player's cell in the Players grid on the registration screen, renamed in place.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { BoardNumber, Player } from '../tournament';
import { confirmColours, textInput } from './classes';

/*
 * One Player's cell in the Players grid: their name, a Home Board tag if they have one, and Rename and Remove.
 * Renaming lays a name box with Save and Cancel over the cell, in the same place. The name and its buttons
 * stay drawn beneath it, hidden, so the cell keeps its size and no other name in the grid moves.
 */
export const PlayerCell = ({
	player,
	homeBoard,
	isRenaming,
	onRename,
	onRemove,
	onSave,
	onCancel,
}: {
	player: Player;
	homeBoard?: BoardNumber;
	isRenaming: boolean;
	onRename: () => void;
	onRemove: () => void;
	onSave: (name: string) => void;
	onCancel: () => void;
}) => {
	const renameButton = useRef<HTMLButtonElement>(null);
	const wasRenaming = useRef(isRenaming);
	// Gives focus back to Rename once renaming ends, so a keyboard user carries on from the same Player.
	useEffect(() => {
		if (wasRenaming.current && !isRenaming) {
			renameButton.current?.focus();
		}
		wasRenaming.current = isRenaming;
	}, [isRenaming]);

	return (
		<li
			className={`${playerCell.shape} ${isRenaming ? playerCell.renaming : playerCell.plain}`}
		>
			<div
				className={`col-start-1 row-start-1 flex items-center gap-1 ${isRenaming ? 'invisible' : ''}`}
			>
				{/* A long name pushes its Home Board tag onto a line below it rather than breaking the name. */}
				<div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
					<span className="min-w-0 text-lg font-semibold wrap-break-word">
						{player.name}
					</span>
					{homeBoard !== undefined && (
						<span className="bg-highlight text-accent rounded-full px-2 py-0.5 text-xs font-bold">
							Home Board {homeBoard}
						</span>
					)}
				</div>
				<IconButton
					ref={renameButton}
					label={`Rename ${player.name}`}
					colours={iconButton.plain}
					onClick={onRename}
				>
					<PencilIcon />
				</IconButton>
				<IconButton
					label={`Remove ${player.name}`}
					colours={iconButton.danger}
					onClick={onRemove}
				>
					<CrossIcon />
				</IconButton>
			</div>
			{isRenaming && <RenameForm player={player} onSave={onSave} onCancel={onCancel} />}
		</li>
	);
};

/*
 * A Player's cell, plain or renaming. Its border is there in both, clear but for the rule beneath a plain cell,
 * and the theme's yellow round a cell being renamed, so the cell keeps its size either way.
 */
const playerCell = {
	// One column the cell's width, so the name box laid over the name never widens the cell.
	shape: 'grid grid-cols-1 rounded-lg border py-0.5 pr-0.5 pl-3',
	plain: 'border-transparent border-b-divider',
	renaming: 'border-fill bg-raised',
};

// A button showing only an icon, named for screen readers by its label. Its colours say what it does.
const iconButton = {
	shape: 'grid size-9 shrink-0 place-items-center rounded-lg',
	plain: 'text-muted hover:bg-divider hover:text-ink',
	danger: 'text-danger hover:bg-divider',
	save: confirmColours.safe,
};

const IconButton = ({
	ref,
	label,
	colours,
	type = 'button',
	onClick,
	children,
}: {
	ref?: RefObject<HTMLButtonElement | null>;
	label: string;
	colours: string;
	type?: 'button' | 'submit';
	onClick?: () => void;
	children: ReactNode;
}) => (
	<button
		ref={ref}
		type={type}
		aria-label={label}
		className={`${iconButton.shape} ${colours}`}
		onClick={onClick}
	>
		{children}
	</button>
);

/*
 * The name box laid over a Player's cell while they are renamed: Enter or Save saves the new name, and Escape
 * or Cancel puts the cell back as it was.
 */
const RenameForm = ({
	player,
	onSave,
	onCancel,
}: {
	player: Player;
	onSave: (name: string) => void;
	onCancel: () => void;
}) => {
	const [name, setName] = useState(player.name);
	const form = useRef<HTMLFormElement>(null);
	// Brings the whole cell into view in the Players grid, its Save and Cancel too, however far down it is.
	useEffect(() => {
		form.current?.scrollIntoView({ block: 'nearest' });
	}, []);
	return (
		<form
			ref={form}
			onSubmit={(event) => {
				event.preventDefault();
				onSave(name);
			}}
			className="col-start-1 row-start-1 flex items-center gap-1"
		>
			<input
				type="text"
				aria-label={`New name for ${player.name}`}
				autoComplete="off"
				autoFocus
				value={name}
				onChange={(event) => setName(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === 'Escape') {
						onCancel();
					}
				}}
				className={`${textInput} h-9 min-w-0 flex-1 text-lg`}
			/>
			<IconButton
				label={`Save new name for ${player.name}`}
				colours={iconButton.save}
				type="submit"
			>
				<TickIcon />
			</IconButton>
			<IconButton
				label={`Cancel renaming ${player.name}`}
				colours={iconButton.plain}
				onClick={onCancel}
			>
				<CrossIcon />
			</IconButton>
		</form>
	);
};

// The icons drawn in the Players' buttons, in the text's colour, hidden from screen readers.
const iconProps = {
	'aria-hidden': true,
	width: 17,
	height: 17,
	viewBox: '0 0 24 24',
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 2,
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
} as const;

const PencilIcon = () => (
	<svg {...iconProps}>
		<path d="M4 20h4L19 9l-4-4L4 16z" />
	</svg>
);

const CrossIcon = () => (
	<svg {...iconProps}>
		<path d="M6 6l12 12M18 6L6 18" />
	</svg>
);

const TickIcon = () => (
	<svg {...iconProps}>
		<path d="M5 12l5 5L19 7" />
	</svg>
);
