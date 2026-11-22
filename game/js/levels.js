// levels.js — the three acts of Midnight Vault: Meridian Gallery, Halcyon
// Bank and Gilded Casino. Each level is a 32x20 tile map plus its patrol
// routes (tile coordinates), its briefing and its par time. Cameras sit on
// open tiles: a camera inside a wall tile could never see anything, because
// line-of-sight sampling starts inside solid.

const LEVELS = [
  {
    name: 'ACT I — MERIDIAN GALLERY',
    shortName: 'Meridian Gallery',
    briefing: [
      'Vex slips into the Meridian Gallery after closing.',
      'The Meridian Diamond sits in the vault, top right.',
      'Read the patrols. Walls and crates break every line of sight.',
      'Crack the vault (hold E), then slip out the green exit, bottom right.',
    ],
    tip: 'Guards patrol in loops. A thrown coin pulls the nearest guard away.',
    parSeconds: 90,
    lootValue: 250,
    map: [
      '################################',
      '#P....#........#......L........#',
      '#.....#....C....#..............#',
      '#..L..#.........#....G....K....#',
      '#.....#.........#..............#',
      '#.....####..#####....####......#',
      '#....................#....V....#',
      '#..C......G....#....#..........#',
      '#.............#....#.....C.....#',
      '#..L...........#....#..........#',
      '#.....####.####....####........#',
      '#..............................#',
      '#....C.........G.........L.....#',
      '#..............................#',
      '#.........#..........#.........#',
      '#.........#....C.....#....K....#',
      '#.........#..........#.........#',
      '#....L....#...........#........#',
      '#.........#..........#......E..#',
      '################################',
    ],
    // Patrol waypoints, one route per guard, in tile coordinates.
    patrols: [
      [[24, 3], [24, 8], [17, 8], [17, 3]],
      [[10, 7], [10, 12], [17, 12], [17, 7]],
      [[17, 17], [13, 17], [13, 14], [17, 14]],
    ],
    // Camera sweep: base angle (radians), sweep half-range, period seconds.
    cameras: [
      { dir: Math.PI, sweep: 0.9, period: 5 },
      { dir: -Math.PI / 2, sweep: 0.8, period: 6 },
    ],
  },
  {
    name: 'ACT II — HALCYON BANK',
    shortName: 'Halcyon Bank',
    briefing: [
      'The Halcyon Bank keeps its gold behind two camera arcs.',
      'The vault is dead centre, watched from both sides.',
      'EMP (Q, $500) blinds every camera for 6 seconds.',
      'Crack it, take the gold, and leave through the bottom exit.',
    ],
    tip: 'Cameras sweep on a timer. Cross a cone only when it swings away.',
    parSeconds: 120,
    lootValue: 400,
    map: [
      '################################',
      '#P....#......L......#..........#',
      '#.....#.............#....K.....#',
      '#..C..#..G......C...#..........#',
      '#.....#.............#....###...#',
      '#.....####...####...#....#.....#',
      '#...................#....#..L..#',
      '#..L....G......#....#....#.....#',
      '#.............#....#....#......#',
      '#..####...#####....#....#..V...#',
      '#..#.............#.....#..K....#',
      '#..#..C..........#.....#.......#',
      '#..#.............#.....#....C..#',
      '#..####...####...#.....#.......#',
      '#.................#....#.......#',
      '#..G......L........#..K........#',
      '#.............C...#............#',
      '#..L.....................G.....#',
      '#............................E.#',
      '################################',
    ],
    patrols: [
      [[8, 3], [14, 3], [14, 7], [8, 7]],
      [[14, 11], [8, 11], [8, 15], [14, 15]],
      [[25, 17], [25, 11], [19, 11], [19, 17]],
      [[8, 7], [8, 3], [14, 3], [14, 7]],
    ],
    cameras: [
      { dir: Math.PI / 2, sweep: 1.0, period: 4.5 },
      { dir: -Math.PI / 2, sweep: 1.0, period: 5.5 },
      { dir: Math.PI / 2, sweep: 0.7, period: 6 },
    ],
  },
  {
    name: 'ACT III — GILDED CASINO',
    shortName: 'Gilded Casino',
    briefing: [
      'The Gilded Casino. The house vault glows behind the high rollers.',
      'Five guards, three cameras, one very nervous pit boss.',
      'Every stash counts now. Ghost it, and the haul is legendary.',
      'Crack the vault, then run for the exit at the far right.',
    ],
    tip: 'Spend the coin, not your cover: a $100 toss beats a $500 EMP.',
    parSeconds: 150,
    lootValue: 600,
    map: [
      '################################',
      '#P...#......L.....#.......K....#',
      '#....#............#............#',
      '#.L..#..G....C....#..G.........#',
      '#....#............#............#',
      '#....####...###...####....#....#',
      '#......................L..#....#',
      '#..C......G......#........#..V.#',
      '#...............#...C....#.....#',
      '#..L............#........#.....#',
      '#......####..####...####K#.....#',
      '#.........................#....#',
      '#...G.......C.............#....#',
      '#.........................#....#',
      '#..####...####....####...##....#',
      '#.......................#......#',
      '#..L.....G.......L......#..K...#',
      '#.......................#......#',
      '#....C.......................E.#',
      '################################',
    ],
    patrols: [
      [[8, 3], [14, 3], [14, 7], [8, 7]],
      [[24, 3], [24, 8], [18, 8], [17, 3]],
      [[10, 12], [16, 12], [16, 16], [10, 16]],
      [[20, 12], [25, 12], [26, 17], [20, 17]],
      [[12, 17], [18, 17], [18, 12], [11, 12]],
    ],
    cameras: [
      { dir: Math.PI, sweep: 0.9, period: 4 },
      { dir: -Math.PI / 2, sweep: 1.1, period: 5 },
      { dir: Math.PI / 2, sweep: 0.8, period: 6.5 },
    ],
  },
];

// Structural check used by the self-test: every row exactly 32 tiles, 20
// rows, and exactly one player start, vault and exit per level.
function validateLevel(level) {
  const problems = [];
  if (level.map.length !== ROWS) problems.push('rows=' + level.map.length);
  level.map.forEach((row, i) => {
    if (row.length !== COLS) problems.push('row ' + i + ' len=' + row.length);
  });
  const flat = level.map.join('');
  const count = (ch) => flat.split(ch).length - 1;
  if (count('P') !== 1) problems.push('P=' + count('P'));
  if (count('V') !== 1) problems.push('V=' + count('V'));
  if (count('E') !== 1) problems.push('E=' + count('E'));
  if (count('G') < 2) problems.push('G=' + count('G'));
  if (count('K') < 1) problems.push('K=' + count('K'));
  if (count('L') < 2) problems.push('L=' + count('L'));
  if (level.patrols.length !== count('G')) problems.push('patrols=' + level.patrols.length + ' guards=' + count('G'));
  if (level.cameras.length !== count('K')) problems.push('cameras=' + level.cameras.length + ' K=' + count('K'));
  return problems;
}
