# 📚 Discipline Counter — Desktop Widget

A sleek, glassmorphic desktop widget for Linux that counts down the remaining days until the end of your semester/course. Built with **Electron** and pure **HTML/CSS/JS**.

![Desktop Widget](https://img.shields.io/badge/Platform-Linux-blue) ![Electron](https://img.shields.io/badge/Electron-35-blueviolet) ![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Features

- 🎯 **Countdown** — Big animated number showing days remaining
- 📊 **Visual Grid** — Each day of the semester as an interactive cell
- ✅ **Manual Marking** — Click any day to mark as completed (persisted in localStorage)
- ✏️ **Edit Modal** — Change discipline name, semester label, and dates anytime
- ➕ **Multiple Disciplines** — Add as many courses as you need
- 🖱️ **Draggable** — Drag the widget anywhere on your desktop; position is saved
- 🪟 **Desktop Widget** — Frameless, transparent window that feels native
- 🔒 **Single Instance** — Prevents duplicate windows

## 🖼️ Design

- **Glassmorphism** with dark semi-transparent background
- **Neon cyan** accent colors for high contrast on colorful wallpapers
- **Animated gradient** countdown number with pulse glow
- **Inter** font from Google Fonts
- Smooth micro-animations and hover effects

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+) — Install via [nvm](https://github.com/nvm-sh/nvm):
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  source ~/.bashrc
  nvm install --lts
  ```

### Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/discipline-counter.git
cd discipline-counter
npm install
```

**Run in foreground:**
```bash
npm start
```

**Run in background (survives terminal close):**
```bash
./start.sh
```

**Stop the widget:**
```bash
./stop.sh
```

## ⚙️ Configuration

Edit the constants at the top of [`script.js`](script.js):

```js
const DEFAULT_DISCIPLINE = {
  name: 'Cálculo II',
  semester: 'Semestre 2026.1',
  startDate: '2026-03-02',
  endDate: '2026-07-18',
};
```

Or use the **✎ edit button** in the widget header to change everything via the UI.

### Window Position

Edit [`main.js`](main.js) to change default position:

```js
const WIDGET_WIDTH  = 420;
const WIDGET_HEIGHT = 700;
const MARGIN_RIGHT  = 40;
const MARGIN_TOP    = 50;
```

Or simply **drag the widget** — position is saved automatically.

## 🏗️ Project Structure

```
discipline-counter/
├── package.json    # Project config & Electron dependency
├── main.js         # Electron main process (window setup, IPC, position save)
├── preload.js      # IPC bridge for modal focus management
├── index.html      # Widget HTML structure
├── style.css       # Glassmorphism design, grid, animations
├── script.js       # Counter logic, multi-discipline, localStorage
├── start.sh        # Launch in background
├── stop.sh         # Kill background process
└── .gitignore
```

## 🐧 Auto-start on Boot (Optional)

```bash
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/discipline-counter.desktop << 'EOF'
[Desktop Entry]
Type=Application
Name=Discipline Counter
Exec=bash -c "cd $HOME/discipline-counter && ./start.sh"
Hidden=false
X-GNOME-Autostart-enabled=true
EOF
```

## 📄 License

MIT
