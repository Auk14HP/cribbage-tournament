import {
	getChampions,
	type ChampionOfBracket,
	type BracketName,
	type Tournament,
} from '../tournament';
import { bracketTitles } from '../wording';
import { BracketBadge } from './BracketBadge';

/*
 * Each card's title and colours: the Winners Bracket's champion is the night's champion, so their
 * card is edged in the theme's yellow, as its W badge is filled, on the champion's own ground, with
 * their name in the champion's colour. The Losers Bracket's card keeps a panel's own colours.
 */
const cardLooks: Record<BracketName, { title: string; edgeAndGround: string; nameColour: string }> =
	{
		winners: {
			title: 'Champion',
			edgeAndGround: 'border-fill bg-champion-ground',
			nameColour: 'text-champion',
		},
		losers: {
			title: 'Losers Bracket champion',
			edgeAndGround: 'border-divider bg-panel',
			nameColour: 'text-ink',
		},
	};

/*
 * A large card for each bracket that has a champion, side by side, the Winners Bracket's first: the
 * bracket's badge and title, the champion's name, and whom they beat in the Final, or that their
 * opponent forfeited it. Nothing while no bracket has a champion.
 */
export const ChampionCards = ({ tournament }: { tournament: Tournament }) => {
	const champions = getChampions(tournament);
	if (champions.length === 0) {
		return null;
	}
	return (
		<div className="grid shrink-0 grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] gap-4">
			{champions.map((champion) => (
				<ChampionCard key={champion.bracketName} champion={champion} />
			))}
		</div>
	);
};

// One bracket's champion card, named for its bracket's champion: "Winners Bracket champion".
const ChampionCard = ({ champion }: { champion: ChampionOfBracket }) => {
	const { title, edgeAndGround, nameColour } = cardLooks[champion.bracketName];
	const bracketTitle = bracketTitles[champion.bracketName];
	// A panel's shape, with more room inside it for the large name.
	return (
		<section
			aria-label={`${bracketTitle} champion`}
			className={`flex flex-col gap-2 rounded-xl border p-6 ${edgeAndGround}`}
		>
			<p className="text-muted flex items-center gap-2.5 text-sm font-bold">
				<BracketBadge bracketName={champion.bracketName} size="large" />
				{title}
			</p>
			<p className={`text-5xl leading-tight font-extrabold break-words ${nameColour}`}>
				{champion.player.name}
			</p>
			<p className="text-muted">{describeFinal(champion)}</p>
		</section>
	);
};

// How the champion won the Final: "beat Sue in the Final", or "won the Final when Sue forfeited".
const describeFinal = ({ finalOpponent, isForfeit }: ChampionOfBracket): string =>
	isForfeit
		? `won the Final when ${finalOpponent.name} forfeited`
		: `beat ${finalOpponent.name} in the Final`;
