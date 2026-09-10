/* ============================================================
   Early Learning Tracker
   All data lives in the browser's localStorage. Nothing is sent
   anywhere. Export/Import lets a teacher move data between
   computers or keep a backup.
   ============================================================ */

const STORAGE_KEY = 'elt_data_v1';

/* ---------- Category definitions ---------- */

const CATEGORIES = {
  uppercase: {
    key: 'uppercase',
    label: 'Uppercase Letters',
    short: 'Uppercase',
    color: '#B5451B',
    prompt: 'Point to the screen and ask: "What letter is this?"',
    items: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    display: 'text',
    home: [
      'Point out this letter on cereal boxes, signs, and books around the house.',
      'Trace the letter in sand, shaving cream, or with a finger in the air.',
      'Make the letter out of playdough, pipe cleaners, or sticks.'
    ]
  },
  lowercase: {
    key: 'lowercase',
    label: 'Lowercase Letters',
    short: 'Lowercase',
    color: '#1D5C8A',
    prompt: 'Point to the screen and ask: "What letter is this?"',
    items: 'abcdefghijklmnopqrstuvwxyz'.split(''),
    display: 'text',
    home: [
      'Look for this letter together while reading a favorite book.',
      'Match lowercase letters to their uppercase partners with cards.',
      'Practice writing the letter on paper or a whiteboard.'
    ]
  },
  sounds: {
    key: 'sounds',
    label: 'Letter Sounds',
    short: 'Sounds',
    color: '#6B3FA0',
    prompt: 'Point to the screen and ask: "What sound does this letter make?"',
    items: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    display: 'text',
    home: [
      'Play "I Spy" for things that start with this letter\'s sound.',
      'Sing an alphabet-sounds song together a few times a week.',
      'Say a word slowly and ask which sound comes first.'
    ]
  },
  numbers: {
    key: 'numbers',
    label: 'Number Recognition (1\u201310)',
    short: 'Numbers',
    color: '#A9820A',
    prompt: 'Point to the screen and ask: "What number is this?"',
    items: Array.from({ length: 10 }, (_, i) => String(i + 1)),
    display: 'text',
    home: [
      'Count everyday objects (snacks, stairs, toys) up to 10.',
      'Point to numerals on a calendar, clock, or number line.',
      'Play a number-matching or number-hunt game around the house.'
    ]
  },
  shapes: {
    key: 'shapes',
    label: '2D Shapes',
    short: 'Shapes',
    color: '#2E7D4F',
    prompt: 'Point to the screen and ask: "What shape is this?"',
    items: ['circle', 'square', 'triangle', 'rectangle', 'oval', 'diamond', 'star', 'hexagon'],
    display: 'shape',
    home: [
      'Go on a shape hunt around the house or on a walk.',
      'Draw and trace the shape together, naming it out loud.',
      'Build the shape with blocks, straws, or string.'
    ]
  }
};

const CATEGORY_ORDER = ['uppercase', 'lowercase', 'sounds', 'numbers', 'shapes'];

/* ---------- Data layer ---------- */

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { students: [], assessments: [] };
    const parsed = JSON.parse(raw);
    if (!parsed.students) parsed.students = [];
    if (!parsed.assessments) parsed.assessments = [];
    return parsed;
  } catch (e) {
    console.error('Could not read saved data', e);
    return { students: [], assessments: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let DATA = loadData();

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getStudent(id) {
  return DATA.students.find(s => s.id === id);
}

function studentAssessments(id, category) {
  return DATA.assessments
    .filter(a => a.studentId === id && (!category || a.category === category))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function latestAssessment(id, category) {
  const list = studentAssessments(id, category);
  return list.length ? list[0] : null;
}

/* ---------- Recommendation logic ---------- */

function tierForPercent(pct) {
  if (pct >= 100) return { label: 'Mastered', tone: 'mastered' };
  if (pct >= 80) return { label: 'Almost there', tone: 'good' };
  if (pct >= 50) return { label: 'Making progress', tone: 'progress' };
  return { label: 'Just starting out', tone: 'starting' };
}

function tierMessage(pct, catShort) {
  if (pct >= 100) return `${catShort} is mastered! A quick review now and then will help keep it fresh.`;
  if (pct >= 80) return `Almost there on ${catShort.toLowerCase()} \u2014 just a few more items to master.`;
  if (pct >= 50) return `Good progress on ${catShort.toLowerCase()}. A little extra practice will help it stick.`;
  return `${catShort} is an emerging skill \u2014 a great one to prioritize at home right now.`;
}

function buildRecommendation(assessment) {
  const cat = CATEGORIES[assessment.category];
  const missed = assessment.items.filter(i => !i.correct).map(i => i.label);
  const pct = assessment.percent;
  const lines = [];
  lines.push(tierMessage(pct, cat.short));
  if (missed.length) {
    lines.push(`Items to practice: ${missed.join(', ')}`);
  } else {
    lines.push('No items missed on this assessment \u2014 great work!');
  }
  return {
    category: cat,
    missed,
    percent: pct,
    summary: lines[0],
    missedLine: lines[1],
    activities: cat.home
  };
}

/* ---------- Shape drawing (inline SVG, no external assets) ---------- */

function polygonPoints(sides, cx, cy, r, rotationDeg = -90) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides + (rotationDeg * Math.PI) / 180;
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)].map(n => n.toFixed(1)).join(','));
  }
  return pts.join(' ');
}

function starPoints(cx, cy, rOuter, rInner, points = 5, rotationDeg = -90) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const angle = (Math.PI * i) / points + (rotationDeg * Math.PI) / 180;
    pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)].map(n => n.toFixed(1)).join(','));
  }
  return pts.join(' ');
}

function shapeSVG(name, fill) {
  const c = fill || 'currentColor';
  const common = `viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"`;
  switch (name) {
    case 'circle':
      return `<svg ${common}><circle cx="50" cy="50" r="42" fill="${c}"/></svg>`;
    case 'square':
      return `<svg ${common}><rect x="10" y="10" width="80" height="80" fill="${c}"/></svg>`;
    case 'triangle':
      return `<svg ${common}><polygon points="50,8 92,88 8,88" fill="${c}"/></svg>`;
    case 'rectangle':
      return `<svg ${common}><rect x="5" y="25" width="90" height="50" fill="${c}"/></svg>`;
    case 'oval':
      return `<svg ${common}><ellipse cx="50" cy="50" rx="46" ry="30" fill="${c}"/></svg>`;
    case 'diamond':
      return `<svg ${common}><polygon points="50,5 92,50 50,95 8,50" fill="${c}"/></svg>`;
    case 'star':
      return `<svg ${common}><polygon points="${starPoints(50, 52, 44, 18, 5)}" fill="${c}"/></svg>`;
    case 'hexagon':
      return `<svg ${common}><polygon points="${polygonPoints(6, 50, 50, 42, 0)}" fill="${c}"/></svg>`;
    case 'pentagon':
      return `<svg ${common}><polygon points="${polygonPoints(5, 50, 52, 42)}" fill="${c}"/></svg>`;
    default:
      return `<svg ${common}><circle cx="50" cy="50" r="42" fill="${c}"/></svg>`;
  }
}

/* ---------- Small date helpers ---------- */

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function todayISO() {
  return new Date().toISOString();
}
