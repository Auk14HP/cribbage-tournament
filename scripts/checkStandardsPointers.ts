import { existsSync, readFileSync } from 'node:fs';

/*
 * Checks the pointers in the files that steer agents and reviewers: every path they name in backticks, such as
 * `e2e/screenStill.ts`, exists, and every name they place in a file, such as `windowFilling` in
 * `src/organizer/classes.ts`, is still in that file. A rename, move or deletion that leaves a pointer behind
 * fails `npm run check`, naming the pointer, so the standards never send a reader to code that isn't there.
 */

const steeringFiles = ['CODING_STANDARDS.md', 'CLAUDE.md'];

// A path in backticks: a word, a slash, then more, with no spaces, such as `src/routes.ts` or `docs/adr/`.
const pathPattern = /`([\w.-]+\/[\w./-]*)`/g;

// A name placed in a file: `name` in `path`, or `name` (`path`).
const namedPointerPattern = /`([A-Za-z_]\w*)`,? (?:in |\()`([\w.-]+\/[\w./-]*)`/g;

// The text of a file, or nothing if the path names a folder or nothing at all.
const readTextIfFile = (path: string) => (path.endsWith('/') ? '' : readFileSync(path, 'utf8'));

// Every broken pointer in one steering file, each described as the reader would see it.
const findBrokenPointers = (steeringFile: string) => {
	const text = readFileSync(steeringFile, 'utf8');
	const missingPaths = [...text.matchAll(pathPattern)]
		.map(([, path]) => path)
		.filter((path) => !existsSync(path))
		.map((path) => `${steeringFile}: \`${path}\` doesn't exist`);
	const missingNames = [...text.matchAll(namedPointerPattern)]
		.filter(
			([, name, path]) =>
				existsSync(path) && !new RegExp(`\\b${name}\\b`).test(readTextIfFile(path)),
		)
		.map(([, name, path]) => `${steeringFile}: \`${name}\` isn't in \`${path}\``);
	return [...missingPaths, ...missingNames];
};

const brokenPointers = steeringFiles.flatMap(findBrokenPointers);
if (brokenPointers.length > 0) {
	console.error(['Pointers to code that isn’t there:', ...brokenPointers].join('\n'));
	process.exit(1);
}
