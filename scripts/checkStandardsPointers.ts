import { existsSync, readFileSync, statSync } from 'node:fs';

/*
 * Checks the pointers in the files that steer agents and reviewers: every path they name in backticks, such as
 * `e2e/screenStill.ts` or `GLOSSARY.md`, exists, and every name they place in a file, such as `windowFilling` in
 * `src/organizer/classes.ts`, is still in that file. A rename, move or deletion that leaves a pointer behind
 * fails `npm run check`, naming the pointer, so the standards never send a reader to code that isn't there.
 */

const steeringFiles = ['CODING_STANDARDS.md', 'CLAUDE.md'];

/*
 * A path in backticks: a folder and what follows, such as `src/routes.ts` or `docs/adr/`, or a file at the
 * repo's root, such as `GLOSSARY.md`.
 */
const pathPattern = /`([\w.-]+\/[\w./-]*|[\w-]+\.(?:md|ts|tsx|js|json|css|sh|yml))`/g;

/*
 * A name placed in a file: `name` in `path`, or `name` (`path`). A type's parameters after the name, as in
 * `Result<T>`, are left off, and the bare name is looked for.
 */
const namedPointerPattern = /`([A-Za-z_]\w*)(?:<[^`]*>)?`,? (?:in |\()`([\w.-]+\/[\w./-]*)`/g;

// A file's text, or none if the path names a folder or nothing at all.
const readTextIfFile = (path: string) =>
	existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : '';

// Whether a file's text holds a name as a whole word.
const hasName = (path: string, name: string) => {
	const namePattern = new RegExp(`\\b${name}\\b`);
	const fileText = readTextIfFile(path);
	return namePattern.test(fileText);
};

// Every broken pointer in one steering file, each described as the reader would see it.
const findBrokenPointers = (steeringFile: string) => {
	const text = readFileSync(steeringFile, 'utf8');
	const missingPaths = [...text.matchAll(pathPattern)]
		.map(([, path]) => path)
		.filter((path) => !existsSync(path))
		.map((path) => `${steeringFile}: \`${path}\` doesn't exist`);
	const missingNames = [...text.matchAll(namedPointerPattern)]
		.filter(([, name, path]) => existsSync(path) && !hasName(path, name))
		.map(([, name, path]) => `${steeringFile}: \`${name}\` isn't in \`${path}\``);
	return [...missingPaths, ...missingNames];
};

const brokenPointers = steeringFiles.flatMap(findBrokenPointers);
if (brokenPointers.length > 0) {
	console.error(['Pointers to code that isn’t there:', ...brokenPointers].join('\n'));
	process.exit(1);
}
