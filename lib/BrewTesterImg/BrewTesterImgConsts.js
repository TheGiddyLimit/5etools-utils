export const IMG_SOURCE_DIRS = [
	"font",
	"img",
	"pdf",
];

export const IMG_ALLOWED_EXTENSIONS = {
	"audio": new Set([
		"mp3",
		"wav",
	]),
	"font": new Set([
		"otf",
		"ttf",
		"woff",
		"woff2",
	]),
	"img": new Set([
		"gif",
		"jpeg",
		"jpg",
		"png",
		"svg",
		"webp",
	]),
	"pdf": new Set([
		"pdf",
	]),
};

export const MAX_IMG_FILE_SIZE_BYTES = 25 * 1024 * 1024;
