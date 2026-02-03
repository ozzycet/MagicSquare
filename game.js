// -------------------- Helpers --------------------
function magicConstant(n) {
  return (n * (n*n + 1)) / 2;
}

function emptyBoard(n) {
  return Array.from({ length: n }, () => Array(n).fill(null));
}
function emptyFixed(n) {
  return Array.from({ length: n }, () => Array(n).fill(false));
}
function allNumbers(n) {
  return Array.from({ length: n*n }, (_, i) => i+1);
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i=a.length-1; i>0; i--) {
    const j = Math.floor(Math.random() * (i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function isBoardComplete(board) {
  for (const row of board) for (const v of row) if (v == null) return false;
  return true;
}

function computeSums(board) {
  const n = board.length;
  const rows = Array(n).fill(null);
  const cols = Array(n).fill(null);
  let d1 = null, d2 = null;

  for (let r=0; r<n; r++) {
    let s = 0;
    for (let c=0; c<n; c++) {
      if (board[r][c] == null) { s = null; break; }
      s += board[r][c];
    }
    rows[r] = s;
  }

  for (let c=0; c<n; c++) {
    let s = 0;
    for (let r=0; r<n; r++) {
      if (board[r][c] == null) { s = null; break; }
      s += board[r][c];
    }
    cols[c] = s;
  }

  let s1 = 0;
  for (let i=0; i<n; i++) {
    if (board[i][i] == null) { s1 = null; break; }
    s1 += board[i][i];
  }
  d1 = s1;

  let s2 = 0;
  for (let i=0; i<n; i++) {
    if (board[i][n-1-i] == null) { s2 = null; break; }
    s2 += board[i][n-1-i];
  }
  d2 = s2;

  return { rows, cols, d1, d2 };
}

function isMagic(board) {
  const n = board.length;
  if (!isBoardComplete(board)) return false;
  const target = magicConstant(n);
  const { rows, cols, d1, d2 } = computeSums(board);
  return rows.every(x => x === target) &&
         cols.every(x => x === target) &&
         d1 === target && d2 === target;
}

// -------------------- Magic square generators --------------------
// Odd order (Siamese method): works for 3x3, 5x5, ...
function generateOddMagicSquare(n) {
  const m = Array.from({ length: n }, () => Array(n).fill(0));
  let r = 0;
  let c = Math.floor(n / 2);

  for (let val = 1; val <= n*n; val++) {
    m[r][c] = val;
    const r2 = (r - 1 + n) % n;
    const c2 = (c + 1) % n;
    if (m[r2][c2] !== 0) {
      r = (r + 1) % n;
    } else {
      r = r2;
      c = c2;
    }
  }
  return m;
}

// Doubly-even order (n % 4 == 0): works for 4x4, 8x8, ...
function generateDoublyEvenMagicSquare(n) {
  const m = Array.from({ length: n }, () => Array(n).fill(0));

  // Fill 1..n^2
  let val = 1;
  for (let r=0; r<n; r++) {
    for (let c=0; c<n; c++) {
      m[r][c] = val++;
    }
  }

  // Invert values on specific pattern cells
  const N = n*n + 1;
  for (let r=0; r<n; r++) {
    for (let c=0; c<n; c++) {
      const a = r % 4;
      const b = c % 4;
      const onDiag = (a === b);
      const onAnti = (a + b === 3);
      if (onDiag || onAnti) {
        m[r][c] = N - m[r][c];
      }
    }
  }
  return m;
}

function generateMagicSquare(n) {
  if (n % 2 === 1) return generateOddMagicSquare(n);
  if (n % 4 === 0) return generateDoublyEvenMagicSquare(n);
  // Not needed for now (6x6, 10x10...) => singly-even
  throw new Error("Only 3x3, 4x4, 5x5 are supported right now.");
}

// Randomize the solution a bit via rotations/reflection (works for any n)
function rotate90(m) {
  const n = m.length;
  const out = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r=0; r<n; r++) for (let c=0; c<n; c++) out[c][n-1-r] = m[r][c];
  return out;
}
function reflectH(m) { // mirror left-right
  return m.map(row => row.slice().reverse());
}
function randomVariant(m) {
  let out = m;
  const rot = Math.floor(Math.random() * 4);
  for (let i=0; i<rot; i++) out = rotate90(out);
  if (Math.random() < 0.5) out = reflectH(out);
  return out;
}

// -------------------- Difficulty / puzzle creation --------------------
// clue fractions scale with n^2
const DIFFICULTY_FRACTION = {
  easy: 0.40,
  medium: 0.25,
  hard: 0.12,
};

function makePuzzle(n, difficulty) {
  const baseSol = generateMagicSquare(n);
  const sol = randomVariant(baseSol);

  const frac = DIFFICULTY_FRACTION[difficulty] ?? 0.25;
  const clues = Math.max(1, Math.floor(n*n * frac));

  const positions = shuffle(Array.from({ length: n*n }, (_, i) => i));
  const cluePos = new Set(positions.slice(0, clues));

  const board = emptyBoard(n);
  const fixed = emptyFixed(n);

  for (let idx=0; idx<n*n; idx++) {
    if (!cluePos.has(idx)) continue;
    const r = Math.floor(idx / n);
    const c = idx % n;
    board[r][c] = sol[r][c];
    fixed[r][c] = true;
  }

  const used = new Set();
  for (const row of board) for (const v of row) if (v != null) used.add(v);
  const available = allNumbers(n).filter(v => !used.has(v));

  return { sol, board, fixed, available };
}

// -------------------- UI state --------------------
const state = {
  n: 3,
  solution: null,
  board: null,
  fixed: null,
  available: null,
  selected: null,
  difficulty: "medium",
};

// -------------------- DOM --------------------
const boardEl = document.getElementById("board");
const paletteEl = document.getElementById("palette");
const msgEl = document.getElementById("message");
const sumsEl = document.getElementById("sums");
const targetEl = document.getElementById("targetInfo");

const gridSizeEl = document.getElementById("gridSize");
const difficultyEl = document.getElementById("difficulty");
const newGameBtn = document.getElementById("newGame");
const resetBtn = document.getElementById("reset");

// Modal elements
const helpBtn = document.getElementById("help");
const overlay = document.getElementById("modalOverlay");
const closeModalBtn = document.getElementById("closeModal");
const dontShowAgainEl = document.getElementById("dontShowAgain");

const LS_KEY = "magicSquareHelpSeen";

// -------------------- Rendering --------------------
function render() {
  targetEl.textContent = `Target sum (magic constant): ${magicConstant(state.n)}`;

  msgEl.innerHTML = "";
  if (isMagic(state.board)) {
    msgEl.innerHTML = `<strong>Solved!</strong> 🎉`;
  } else if (isBoardComplete(state.board)) {
    msgEl.textContent = "Complete, but not magic yet.";
  } else {
    msgEl.textContent = "Fill the grid so every row, column, and diagonal matches the target sum.";
  }

  // Palette
  paletteEl.innerHTML = "";
  state.available.forEach(v => {
    const d = document.createElement("div");
    d.className = "tile clickable" + (state.selected === v ? " selected" : "");
    d.textContent = String(v);
    d.addEventListener("click", () => {
      state.selected = (state.selected === v) ? null : v;
      render();
    });
    paletteEl.appendChild(d);
  });

  // Board
  boardEl.style.gridTemplateColumns = `repeat(${state.n}, var(--tile))`;
  boardEl.style.gridTemplateRows = `repeat(${state.n}, var(--tile))`;
  boardEl.innerHTML = "";

  for (let r=0; r<state.n; r++) {
    for (let c=0; c<state.n; c++) {
      const v = state.board[r][c];
      const cell = document.createElement("div");
      cell.className = "tile cell clickable";
      if (state.fixed[r][c]) cell.classList.add("fixed");
      cell.textContent = v == null ? "" : String(v);
      cell.addEventListener("click", () => onCellClick(r, c));
      boardEl.appendChild(cell);
    }
  }

  const { rows, cols, d1, d2 } = computeSums(state.board);
  const fmt = (x) => x == null ? "—" : String(x);
  sumsEl.innerHTML =
    `Row sums: ${rows.map(fmt).join(", ")}<br>` +
    `Col sums: ${cols.map(fmt).join(", ")}<br>` +
    `Diag sums: ${fmt(d1)}, ${fmt(d2)}`;
}

// -------------------- Interaction --------------------
function onCellClick(r, c) {
  if (state.fixed[r][c]) return;

  const cur = state.board[r][c];

  // remove
  if (cur != null) {
    state.board[r][c] = null;
    state.available.push(cur);
    state.available.sort((a,b) => a-b);
    render();
    return;
  }

  // place
  if (cur == null && state.selected != null) {
    state.board[r][c] = state.selected;
    state.available = state.available.filter(x => x !== state.selected);
    state.selected = null;
    render();
  }
}

// -------------------- Controls --------------------
function startNewGame() {
  state.n = parseInt(gridSizeEl.value, 10);
  state.difficulty = difficultyEl.value;

  const p = makePuzzle(state.n, state.difficulty);
  state.solution = p.sol;
  state.board = p.board;
  state.fixed = p.fixed;
  state.available = p.available;
  state.selected = null;

  render();
}

function resetToInitial() {
  const n = state.n;
  const used = new Set();
  for (let r=0; r<n; r++) {
    for (let c=0; c<n; c++) {
      if (!state.fixed[r][c]) {
        state.board[r][c] = null;
      } else {
        used.add(state.board[r][c]);
      }
    }
  }
  state.available = allNumbers(n).filter(v => !used.has(v));
  state.selected = null;
  render();
}

gridSizeEl.addEventListener("change", startNewGame);
difficultyEl.addEventListener("change", startNewGame);
newGameBtn.addEventListener("click", startNewGame);
resetBtn.addEventListener("click", resetToInitial);

// -------------------- Help modal --------------------
function openHelp(auto=false) {
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");

  // if auto-opened, default checkbox to "don't show again" = false
  if (auto) dontShowAgainEl.checked = false;
}
function closeHelp() {
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");

  // If they checked "don't show again", mark as seen in localStorage
  if (dontShowAgainEl.checked) {
    localStorage.setItem(LS_KEY, "1");
  }
}

helpBtn.addEventListener("click", () => openHelp(false));
closeModalBtn.addEventListener("click", closeHelp);

// clicking outside modal closes it
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeHelp();
});

// Esc key closes modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay.classList.contains("open")) closeHelp();
});

// -------------------- Boot --------------------
startNewGame();

// auto-show help first time
const seen = localStorage.getItem(LS_KEY);
if (!seen) {
  openHelp(true);
}