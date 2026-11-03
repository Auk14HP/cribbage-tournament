/*
 * Fails any test that logs an error or a warning, such as React's warning that two list rows share a key.
 * React only logs these, so without this a test passes while the screen shows stale rows. A log from a timer
 * a test left running is blamed on the next test, or on the file when it lands before the file's last hooks
 * finish; one landing later still goes unchecked.
 */
import { afterAll, afterEach, expect } from 'vitest';

const loggedMessages: string[] = [];

// Returns the message with its %s-style placeholders filled in, as the console shows it.
const formatMessage = ([template, ...values]: unknown[]) => {
	if (typeof template !== 'string') {
		return [template, ...values].map(String).join(' ');
	}
	const unusedValues = [...values];
	const text = template.replace(/%[sdio]/g, () => String(unusedValues.shift()));
	return [text, ...unusedValues.map(String)].join(' ');
};

for (const level of ['error', 'warn'] as const) {
	const writeToConsole = console[level];
	console[level] = (...args: unknown[]) => {
		loggedMessages.push(`console.${level}: ${formatMessage(args)}`);
		writeToConsole(...args);
	};
}

const expectNothingLogged = () => {
	const messages = loggedMessages.splice(0);
	expect(messages, 'The test logged an error or a warning').toEqual([]);
};

afterEach(expectNothingLogged);
afterAll(expectNothingLogged);
