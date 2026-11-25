// Original pixel-art sprites, drawn as text grids.
// Each character is one pixel; "." is transparent; other characters map to a palette color.

export type SpriteArt = { rows: string[]; palette: Record<string, string> };

export const FISH_A: SpriteArt = {
  rows: [
    ".....XXX....",
    "T..XXXXXXX..",
    "TTXXXXXXXXX.",
    "TTXXXXXXXEXX",
    "TTXXXXXXXXX.",
    "T..XXXXXXX..",
    ".....XXX....",
  ],
  palette: { X: "#ffb347", T: "#ff8a3d", E: "#0b1a33" },
};

export const FISH_B: SpriteArt = {
  rows: [
    "....SXS.....",
    "T..XSXSXX...",
    "TTXXSXSXXXX.",
    "TTXXSXSXXEXX",
    "TTXXSXSXXXX.",
    "T..XSXSXX...",
    "....SXS.....",
  ],
  palette: { X: "#4fd8ff", S: "#e9f7ff", T: "#2a9fd6", E: "#0b1a33" },
};

export const FISH_C: SpriteArt = {
  rows: [
    "......XX......",
    "T...XXXXXX....",
    "TT.XXXXXXXXX..",
    "TTTXXXXXXXXEXX",
    "TT.XXXXXXXXXX.",
    "T...XXXXXX....",
    "......XX......",
  ],
  palette: { X: "#ff7aa2", T: "#d94f7c", E: "#0b1a33" },
};

export const SMALL_FISH: SpriteArt = {
  rows: ["..XX..", "TXXXEX", "..XX.."],
  palette: { X: "#bfe9ff", T: "#7cc8ee", E: "#0b1a33" },
};

export const SEAWEED_A: SpriteArt = {
  rows: [
    "..G.", ".GG.", ".G..", "GG..", ".G..", ".GG.", "..G.", "..GG", "..G.", ".GG.",
    ".G..", "GG..", ".G..", ".GG.", "..G.", "..GG", "..G.", ".GG.", ".G..", ".G..",
  ],
  palette: { G: "#2f9e6b" },
};

export const SEAWEED_B: SpriteArt = {
  rows: [
    ".D..", ".DD.", "..D.", "..DD", "..D.", ".DD.", ".D..", "DD..", ".D..", ".DD.",
    "..D.", "..DD", "..D.", ".DD.", ".D..", ".D..",
  ],
  palette: { D: "#1f7a52" },
};

export const KELP: SpriteArt = {
  rows: [
    ".LL...", "LLLL..", ".LL...", "..L...", "..LL..", "..LLLL", "..LL..", "..L...",
    ".LL...", "LLLL..", ".LL...", "..L...", "..LL..", "..LLLL", "..LL..", "..L...",
    "..L...", "..L...",
  ],
  palette: { L: "#3fb37a" },
};

// --- Trash (drifts by now and then — the "junk" of the internet) ---
export const CAN: SpriteArt = {
  rows: ["SSSS", "RRRR", "RWWR", "RRRR", "RWWR", "RRRR", "SSSS"],
  palette: { S: "#c9d3dd", R: "#e04848", W: "#f4f4f4" },
};

export const BOTTLE: SpriteArt = {
  rows: [".KK.", ".GG.", ".GG.", "GGGG", "GHGG", "GHGG", "GGGG", "GGGG"],
  palette: { K: "#5a3b22", G: "#3d9e74", H: "#9fe0c0" },
};

export const BAG: SpriteArt = {
  rows: ["W..W", "W..W", "WWWW", "WWWW", "WBWW", "WWWW", ".WW."],
  palette: { W: "#dfe8ef", B: "#9fb4c4" },
};

export const CLOUD: SpriteArt = {
  rows: [
    "....WWWW......",
    "..WWWWWWWW.WW.",
    ".WWWWWWWWWWWWW",
    "WWWWWWWWWWWWWW",
    ".SSSSSSSSSSSS.",
  ],
  palette: { W: "#ffffff", S: "#d6eefc" },
};

export const SUN: SpriteArt = {
  rows: [
    "...YYYY...",
    ".YYYYYYYY.",
    ".YYYYYYYY.",
    "YYYYYYYYYY",
    "YYYYYYYYYY",
    "YYYYYYYYYY",
    "YYYYYYYYYY",
    ".YYYYYYYY.",
    ".YYYYYYYY.",
    "...YYYY...",
  ],
  palette: { Y: "#ffd86b" },
};

/** CVEStat mascot & logo: a deep-sea anglerfish with a glowing lure ("shining light on vulnerabilities"). */
export const ANGLER: SpriteArt = {
  rows: [
    "..............sss.........",
    ".............s...s........",
    ".............s....s.......",
    ".............s...gLg......",
    ".............s..gLCLg.....",
    ".........DDDDsDD.gLg......",
    "......DDDHHHHHHHDD........",
    "T...DDHHBBBBBBBBBHD.......",
    "TT.DHBBBSBBBBBBBBBBD......",
    "TTTDBBBBBBBBSBBYYYBBD.....",
    ".TTDBBBBSBBBBBBYKYBBBD....",
    "..TDBBBBBBBBBBBYYYBBBBD...",
    ".TTDBBBBBBSBBBBBBDDDDDDDD.",
    "TTTDBBBBBBBBBBBBDWMWMWMWD.",
    "TT.DDBBBBBBBBBBBDMWMWMWMWD",
    "T....DDBBBBBBBBBBBBBBBBBBD",
    ".......DDDDDDDDDDDDDDDDDD.",
  ],
  // D outline, B/H/S body, Y eye, W teeth, M mouth, s lure stalk, L/C/g lure light, T tail
  palette: { D: "#0b1430", H: "#6d8fd8", B: "#4566b0", S: "#7ea3e8", Y: "#ffe066", K: "#0b1a33", W: "#f4fbff", M: "#3b0f2f", s: "#9fc3e6", L: "#4fd8ff", C: "#ffffff", g: "#2b8fb3", T: "#3a5596" },
};
/** Centre of the lure light, in sprite pixels. */
export const ANGLER_LURE = { x: 18.5, y: 4.5 };
