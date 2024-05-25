import fs from "fs";
import path from "path";
import simpleGit from "simple-git";

// Use git as our source of truth, as Windows file perms aren't real
async function isExecutable (fpath) {
	const git = simpleGit();

	const info = await git.raw(["ls-files", "--stage", fpath]);
	if (!info) throw new Error(`File in "${fpath}" was not tracked by git!`);

	const [modeRaw] = info.split(" ");
	const [permBitOwner, permBitGroup, permBitOther] = modeRaw.slice(-3);
	return !!(Number(permBitOwner) & fs.constants.X_OK);
}

test(
	// Windows is bad at tracking these
	// `git update-index --chmod=+x <path>` to ensure updates are tracked in git
	`Test files in "bin/" have "x" permissions`,
	async () => {
		const dir = "bin";
		const noExe = (
			await Promise.all(
				fs.readdirSync(dir)
					.map(async fname => !(await isExecutable(path.join(dir, fname)))),
			)
		)
			.filter(Boolean);

		expect(noExe).toEqual([]);
	},
);
