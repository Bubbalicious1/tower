/**
 * Placeholder SNES-style pixel art, drawn from text maps. Each character is
 * one pixel; '.' is transparent. Swap these for real sprite sheets later.
 */
export const PALETTE: Record<string, string> = {
  k: '#181020', // outline
  s: '#f0b890', // skin
  h: '#402818', // hair
  w: '#f8f8f8', // white
  P: '#c8c8d8', // pants
  g: '#9090a0', // gray fur
  p: '#f0a0b0', // pink
  v: '#7050b0', // violet
  r: '#d03030', // red
  d: '#303848', // dark suit
  b: '#8a5a2b', // wood / leather
  o: '#e87820', // orange
  y: '#f0c040', // gold
  // 'c' is filled in per class with the jersey color.
};

export const SPRITES: Record<string, string[]> = {
  hero: [
    '................',
    '.....kkkkkk.....',
    '....kcccccck....',
    '....kcccccckkk..',
    '....kssssssk....',
    '....kskssksk....',
    '....kssssssk....',
    '.....kssssk.....',
    '....kwwccwwk....',
    '...kswwccwwsk...',
    '...kswwccwwsk...',
    '....kwwwwwwk....',
    '....kPPkkPPk....',
    '....kPPkkPPk....',
    '....kcckkcck....',
    '....kkkkkkkk....',
  ],
  rat: [
    '................',
    '................',
    '................',
    '..kk............',
    '.kpgk...........',
    '.kgggkkkkk......',
    'kgggggggggk.....',
    'kgkggggggggk....',
    'kggggggggggggk..',
    'kpgggggggggggk..',
    '.kkggggggggggkk.',
    '...kgk..kgk..kpk',
    '...kk....kk...kp',
  ],
  bat: [
    '................',
    '................',
    'k..............k',
    'kk....k..k....kk',
    'kvk...kkkk...kvk',
    'kvvk.kvvvvk.kvvk',
    'kvvvkvwvvwvkvvvk',
    'kvvvvvvvvvvvvvvk',
    '.kvvvvvrrvvvvvk.',
    '..kvvkvvvvkvvk..',
    '...kk.kvvk.kk...',
    '.......kk.......',
  ],
  scout: [
    '....kkkkkk......',
    '...khhhhhhk.....',
    '...kssssssk.....',
    '...kskssksk.....',
    '...kssssssk.....',
    '....kssssk......',
    '...kddwwddk.....',
    '..kddwrrwddk....',
    '..kddwrrwddk....',
    '..ksddwwddsk....',
    '...kddddddk.kkkk',
    '...kddkkddk.kbbk',
    '...kddk.kddkkbbk',
    '...kkkk.kkkk.kkk',
  ],
  brute: [
    '....kkkkkkkk....',
    '...koooooooook..',
    '..kooowooowoook.',
    '..koookooookook.',
    '..kooooooooooook',
    '..koookkkkkoook.',
    '...kooowwwoook..',
    '....kkoooookk...',
    '..kkoooooooookk.',
    '.koookoooookoook',
    '.koook.ooo.kook.',
    '..kkk.kooook.kk.',
    '......kokkok....',
    '.....kkk..kkk...',
  ],
  chest: [
    '................',
    '................',
    '................',
    '...kkkkkkkkkk...',
    '..kbbbbbbbbbbk..',
    '..kbyyyyyyyybk..',
    '..kbbbbbbbbbbk..',
    '..kkkkkyykkkkk..',
    '..kbbbbyybbbbk..',
    '..kbbbbbbbbbbk..',
    '..kbyyyyyyyybk..',
    '..kbbbbbbbbbbk..',
    '..kkkkkkkkkkkk..',
  ],
  chestOpen: [
    '................',
    '................',
    '...kkkkkkkkkk...',
    '..kbbbbbbbbbbk..',
    '..kddddddddddk..',
    '..kddddddddddk..',
    '..kkkkkkkkkkkk..',
    '..kbbbbbbbbbbk..',
    '..kbbbbbbbbbbk..',
    '..kbbbbbbbbbbk..',
    '..kbyyyyyyyybk..',
    '..kbbbbbbbbbbk..',
    '..kkkkkkkkkkkk..',
  ],
  cursor: [
    'kk......',
    'kwkk....',
    'kwwwkk..',
    'kwwwwwk.',
    'kwwwkk..',
    'kwkk....',
    'kk......',
  ],
};
