// The Home Board picker on the registration screen.
import { useState } from 'react';
import type { Result } from '../result';
import { clearHomeBoard, setHomeBoard, type BoardNumber, type Tournament } from '../tournament';
import { textInput } from './classes';

/*
 * Gives one Player a Home Board: a Player, or Nobody, and a Board from those set out. Picking another
 * Player moves the Home Board to them. A Board picked while Nobody has it is kept here for when a Player is
 * picked. Always shown, so Make the Draw below never moves as the Boards are set out.
 */
export const HomeBoardPicker = ({
	tournament,
	onChange,
}: {
	tournament: Tournament;
	onChange: (outcome: Result<Tournament>) => void;
}) => {
	const [pickedBoard, setPickedBoard] = useState<BoardNumber>(1);
	const { boards } = tournament;
	const [homeBoard] = tournament.homeBoards;
	const isPickedSetOut = boards.includes(pickedBoard);
	const board = homeBoard?.board ?? (isPickedSetOut ? pickedBoard : boards[0]);

	const pickPlayer = (value: string) => {
		const unchanged: Result<Tournament> = { ok: true, value: tournament };
		const cleared = homeBoard ? clearHomeBoard(tournament, homeBoard.player) : unchanged;
		if (!cleared.ok || value === '') {
			onChange(cleared);
			return;
		}
		const playerId = Number(value);
		// With no Boards set out there is no Board to pick, and the Tournament says why.
		onChange(setHomeBoard(cleared.value, playerId, board ?? 1));
	};

	const pickBoard = (value: string) => {
		const picked = Number(value);
		setPickedBoard(picked);
		if (homeBoard) {
			onChange(setHomeBoard(tournament, homeBoard.player, picked));
		}
	};

	return (
		<>
			<label className="mt-2 flex items-center gap-2">
				Home Board for
				<select
					value={homeBoard?.player ?? ''}
					onChange={(event) => pickPlayer(event.target.value)}
					className={`${textInput} flex-1`}
				>
					<option value="">Nobody</option>
					{tournament.players.map((player) => (
						<option key={player.id} value={player.id}>
							{player.name}
						</option>
					))}
				</select>
			</label>
			<label className="mt-2 flex items-center gap-2">
				Board
				<select
					value={board ?? ''}
					disabled={boards.length === 0}
					onChange={(event) => pickBoard(event.target.value)}
					className={textInput}
				>
					{boards.map((number) => (
						<option key={number} value={number}>
							{number}
						</option>
					))}
				</select>
			</label>
		</>
	);
};
