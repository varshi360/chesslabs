# ♟️ ChessLabs

> A full-stack chess analysis tool powered by Stockfish — play, analyse, and explore any chess position.

---

## 🚀 Features

- **▶ Play Mode** — Play chess on an interactive board with full move validation
- **✏️ Edit Mode** — Set up any custom position using a drag-and-drop piece palette
- **⚡ Stockfish AI** — Get the best move suggestion powered by the world's strongest chess engine
- **🏹 Arrow Visualization** — Best move shown as an arrow directly on the board
- **⚔️ Captured Pieces** — Tracks all captured pieces for both sides
- **📜 Move History** — Full move list in chess notation, auto-scrolling
- **↩️ Undo / Redo** — Navigate back and forward through move history
- **🏁 Game Over Detection** — Detects checkmate, stalemate, and draw conditions
- **📋 FEN Import / Export** — Load any position via FEN string and copy the current FEN
- **🔄 Auto-apply Move** — Toggle to automatically play Stockfish's suggestion

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, react-chessboard, chess.js, Axios |
| Backend | Python, Flask, flask-cors |
| Chess Engine | Stockfish 17 |

---

## 📁 Project Structure

```
chesslabs/
├── frontend/          # React app
│   ├── src/
│   │   └── App.js     # Main component
│   └── public/
│       └── index.html
└── backend/           # Python Flask API
    └── app.py         # Stockfish integration
```

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- [Stockfish](https://stockfishchess.org/download/) executable

### 1. Clone the repository
```bash
git clone https://github.com/varshi360/chesslabs.git
cd chesslabs
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install flask flask-cors stockfish
```

Update the Stockfish path in `backend/app.py`:
```python
STOCKFISH_PATH = r"path/to/your/stockfish.exe"
```

Start the backend:
```bash
python app.py
```
Backend runs at `http://localhost:5000`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```
Frontend runs at `http://localhost:3000`

---

## 🎮 How to Use

### Play Mode
1. Drag and drop pieces to make moves
2. Click **⚡ Get Best Move** to see Stockfish's suggestion
3. An arrow appears on the board showing the recommended move
4. Use **⬅ Undo** and **Redo ➡** to navigate move history
5. Toggle **Auto-apply move** to let Stockfish play automatically

### Edit Mode
1. Click **✏️ Edit Mode**
2. Select a piece from the left (black) or right (white) palette
3. Click any square to place the piece
4. Drag pieces to reposition them
5. Set whose turn it is (White/Black)
6. Click **✅ Done Editing** to start analysing the position

### FEN Support
- Paste any FEN string in the input box and click **Load FEN**
- Copy the current position's FEN using the **📋 Copy FEN** button

---

## 📸 Screenshots

> Play Mode with Stockfish move suggestion arrow

> Edit Mode with piece palette

---

## 🔮 Future Improvements

- [ ] Deploy frontend on Vercel
- [ ] Deploy backend on Render
- [ ] Add difficulty levels (Stockfish depth control)
- [ ] Add opening name detection
- [ ] Add PGN export
- [ ] Add ML-based move predictor trained on Lichess data

---

## 👨‍💻 Author

**Varshith** — [@varshi360](https://github.com/varshi360)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

> Built as a BTech 3rd year portfolio project demonstrating full-stack development with AI integration.
