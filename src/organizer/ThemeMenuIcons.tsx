/*
 * The palette button's icon, and the check mark beside each section's
 * chosen item in the theme menu.
 */

export const PaletteIcon = () => (
	<svg
		aria-hidden="true"
		className="size-5"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.9-1.8H17a4 4 0 0 0 4-4C21 6.4 17 3 12 3Z" />
		<circle cx="7.5" cy="11" r="1" />
		<circle cx="10" cy="7" r="1" />
		<circle cx="14.5" cy="7" r="1" />
	</svg>
);

export const CheckIcon = ({ isShown }: { isShown: boolean }) => (
	<svg
		aria-hidden="true"
		className={`size-4 ${isShown ? '' : 'invisible'}`}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.5"
		strokeLinecap="round"
		strokeLinejoin="round"
	>
		<path d="M5 12l5 5L20 7" />
	</svg>
);
