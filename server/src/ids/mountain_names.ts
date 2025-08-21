// © 2025 Joe Pruskowski
// Human-friendly room/game ID generation using globally recognizable mountain names

export const MOUNTAIN_NAMES: string[] = [
	"Everest",
	"K2",
	"Kangchenjunga",
	"Lhotse",
	"Makalu",
	"Cho Oyu",
	"Dhaulagiri",
	"Manaslu",
	"Nanga Parbat",
	"Annapurna",
	"Gasherbrum I",
	"Broad Peak",
	"Gasherbrum II",
	"Shishapangma",
	"Denali",
	"Aconcagua",
	"Kilimanjaro",
	"Elbrus",
	"Vinson",
	"Kosciuszko",
	"Mont Blanc",
	"Matterhorn",
	"Eiger",
	"Jungfrau",
	"Monte Rosa",
	"Mont Rose",
	"Mont Everest",
	"Mont Blanc de Courmayeur",
	"Mount Olympus",
	"Mount Whitney",
	"Mount Rainier",
	"Mount Hood",
	"Mount Shasta",
	"Mount McKinley",
	"Table Mountain",
	"Ben Nevis",
	"Scafell Pike",
	"Snowdon",
	"Sierra Nevada",
	"Mount Fuji",
	"Mount Etna",
	"Mount Vesuvius",
	"Mauna Kea",
	"Mauna Loa",
	"Olympus Mons",
	"Popocatepetl",
	"Iztaccihuatl",
	"Aoraki",
	"Mount Cook",
	"Zugspitze",
	"Mont Pelée",
	"Pico de Orizaba",
	"Cerro Aconcagua",
	"Cerro Torre",
	"Fitz Roy",
	"Nanda Devi",
	"Trisul",
	"Kailash",
	"Ararat",
	"Damavand",
	"El Capitan",
	"Half Dome",
	"Suilven",
	"Stromboli",
	"Drakensberg",
	"Roraima",
	"Everest Base",
];

export function normalizeMountainName(name: string): string {
	return name
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-/, '')
		.replace(/-$/, '');
}

function randomIndex(maxExclusive: number): number {
	return Math.floor(Math.random() * maxExclusive);
}

// Generate a mountain-based gameId. If the chosen id is taken, retry with other names.
// As a last resort, append a short alphabetic suffix to ensure uniqueness.
export function generateMountainGameId(isTaken: (id: string) => boolean): string {
	const normalized = MOUNTAIN_NAMES.map((n) => normalizeMountainName(n)).filter((n) => n.length > 0);
	const maxAttempts = Math.max(50, normalized.length * 2);
	for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
		const base = normalized[randomIndex(normalized.length)];
		if (!isTaken(base)) return base;
	}
	// Fallback: deterministic-ish suffix to avoid numbers
	const letters = 'abcdefghijklmnopqrstuvwxyz';
	for (let i = 0; i < normalized.length; i += 1) {
		const base = normalized[i % normalized.length];
		for (let a = 0; a < letters.length; a += 1) {
			for (let b = 0; b < letters.length; b += 1) {
				const candidate = `${base}-${letters[a]}${letters[b]}`;
				if (!isTaken(candidate)) return candidate;
			}
		}
	}
	// If truly exhausted, fall back to a timestamped variant (still readable)
	const base = normalized[randomIndex(normalized.length)];
	return `${base}-${Date.now().toString(36)}`;
}


