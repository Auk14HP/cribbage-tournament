import { afterEach, expect } from 'vitest';

/*
 * Fails any test that logs an error or a warning, such as React's warning that two list rows share a key.
 * React only logs these, so without this a test passes while the screen shows stale rows.
 */
const loggedMessages: string[] = [];

// Fills in a message's %s-style placeholders, as the console does, so the failure reads like the log.
const formatMessage = ([first, ...rest]: unknown[]) => {
	if (typeof first !== 'string') {
		return [first, ...rest].map(String).join(' ');
	}
	let used = 0;
	const text = first.replace(/%[sdio]/g, () => String(rest[used++]));
	return [text, ...rest.slice(used).map(String)].join(' ');
};

for (const level of ['error', 'warn'] as const) {
	const writeToConsole = console[level];
	console[level] = (...args: unknown[]) => {
		loggedMessages.push(`console.${level}: ${formatMessage(args)}`);
		writeToConsole(...args);
	};
}

afterEach(() => {
	const messages = loggedMessages.splice(0);
	expect(messages, 'The test logged an error or a warning').toEqual([]);
});
