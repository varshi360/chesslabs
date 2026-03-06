import { useState, useRef, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import axios from "axios";

const WHITE_PIECES = [
  { piece: "wK", label: "♔" }, { piece: "wQ", label: "♕" },
  { piece: "wR", label: "♖" }, { piece: "wB", label: "♗" },
  { piece: "wN", label: "♘" }, { piece: "wP", label: "♙" },
];

const BLACK_PIECES = [
  { piece: "bK", label: "♚" }, { piece: "bQ", label: "♛" },
  { piece: "bR", label: "♜" }, { piece: "bB", label: "♝" },
  { piece: "bN", label: "♞" }, { piece: "bP", label: "♟" },
];

const WHITE_SYMBOLS = { p:"♙", r:"♖", n:"♘", b:"♗", q:"♕", k:"♔" };
const BLACK_SYMBOLS = { p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚" };

function fenToBoard(fen) {
  const board = {};
  const rows = fen.split(" ")[0].split("/");
  const rankNames = ["8","7","6","5","4","3","2","1"];
  const fileNames = ["a","b","c","d","e","f","g","h"];
  rows.forEach((row, rankIdx) => {
    let fileIdx = 0;
    for (const ch of row) {
      if (isNaN(ch)) {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        const pieceMap = { p:"P", r:"R", n:"N", b:"B", q:"Q", k:"K" };
        board[fileNames[fileIdx] + rankNames[rankIdx]] = color + pieceMap[ch.toLowerCase()];
        fileIdx++;
      } else { fileIdx += parseInt(ch); }
    }
  });
  return board;
}

function boardToFen(board, turn = "w") {
  const fileNames = ["a","b","c","d","e","f","g","h"];
  const rankNames = ["8","7","6","5","4","3","2","1"];
  const pieceToFen = {
    wP:"P",wR:"R",wN:"N",wB:"B",wQ:"Q",wK:"K",
    bP:"p",bR:"r",bN:"n",bB:"b",bQ:"q",bK:"k"
  };
  let fen = "";
  for (const rank of rankNames) {
    let empty = 0;
    for (const file of fileNames) {
      const sq = file + rank;
      if (board[sq]) {
        if (empty > 0) { fen += empty; empty = 0; }
        fen += pieceToFen[board[sq]];
      } else { empty++; }
    }
    if (empty > 0) fen += empty;
    if (rank !== "1") fen += "/";
  }
  return fen + ` ${turn} KQkq - 0 1`;
}

function squareToCoords(square, boardWidth, flipped) {
  const files = ["a","b","c","d","e","f","g","h"];
  const size = boardWidth / 8;
  const fileIdx = flipped ? 7 - files.indexOf(square[0]) : files.indexOf(square[0]);
  const rankIdx = flipped ? parseInt(square[1]) - 1 : 8 - parseInt(square[1]);
  return {
    x: fileIdx * size + size / 2,
    y: rankIdx * size + size / 2,
  };
}

function ArrowOverlay({ bestMove, boardWidth, flipped }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, boardWidth, boardWidth);
    if (!bestMove || bestMove.length < 4) return;
    const from = squareToCoords(bestMove.slice(0, 2), boardWidth, flipped);
    const to = squareToCoords(bestMove.slice(2, 4), boardWidth, flipped);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const len = Math.sqrt(dx * dx + dy * dy);
    const headLen = 22;
    const sx = from.x + (14 / len) * dx;
    const sy = from.y + (14 / len) * dy;
    const ex = to.x - (26 / len) * dx;
    const ey = to.y - (26 / len) * dy;
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [bestMove, boardWidth, flipped]);
  return (
    <canvas ref={canvasRef} width={boardWidth} height={boardWidth}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 99 }} />
  );
}

function EvalBar({ evaluation, flipped }) {
  const maxCp = 800;
  let whitePercent = 50;

  if (evaluation) {
    if (evaluation.type === "cp") {
      const clamped = Math.max(-maxCp, Math.min(maxCp, evaluation.value));
      whitePercent = ((clamped + maxCp) / (maxCp * 2)) * 100;
    } else if (evaluation.type === "mate") {
      whitePercent = evaluation.value > 0 ? 98 : 2;
    }
  }

  const blackPercent = 100 - whitePercent;
  const label = evaluation
    ? evaluation.type === "cp"
      ? Math.abs(evaluation.value / 100).toFixed(1)
      : `M${Math.abs(evaluation.value)}`
    : "0.0";

  const whiteWinning = evaluation ? evaluation.value >= 0 : true;

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: "28px", height: `${BOARD_WIDTH}px`,
      borderRadius: "6px", overflow: "hidden",
      border: "1px solid #2a2a3e", position: "relative"
    }}>
      {/* Black side (top) */}
      <div style={{
        width: "100%",
        height: flipped ? `${whitePercent}%` : `${blackPercent}%`,
        background: "#1a1a1a",
        transition: "height 0.4s ease",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingBottom: "4px"
      }}>
        {!whiteWinning && (
          <span style={{ fontSize: "9px", color: "#aaa", fontWeight: "bold", writingMode: "vertical-rl" }}>
            {label}
          </span>
        )}
      </div>
      {/* White side (bottom) */}
      <div style={{
        width: "100%",
        height: flipped ? `${blackPercent}%` : `${whitePercent}%`,
        background: "#f0f0f0",
        transition: "height 0.4s ease",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "4px"
      }}>
        {whiteWinning && (
          <span style={{ fontSize: "9px", color: "#333", fontWeight: "bold", writingMode: "vertical-rl" }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

function PiecePalette({ pieces, selectedPiece, onSelect, side }) {
  return (
    <div style={{ background: "#16213e", borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "6px", alignItems: "center" }}>
      <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "4px" }}>
        {side === "white" ? "⬜ White" : "⬛ Black"}
      </p>
      {pieces.map(({ piece, label }) => (
        <div key={piece} onClick={() => onSelect(piece)} style={{
          fontSize: "30px", cursor: "pointer", width: "48px", height: "48px",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "8px",
          background: selectedPiece === piece ? "#00d4aa" : "transparent",
          border: selectedPiece === piece ? "2px solid #00d4aa" : "2px solid transparent",
          transition: "all 0.15s"
        }}>{label}</div>
      ))}
    </div>
  );
}

function CapturedBox({ label, pieces, symbols }) {
  return (
    <div style={{ marginBottom: "8px" }}>
      <p style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{label}</p>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "2px",
        minHeight: "32px", background: "#0d1f1a",
        borderRadius: "6px", padding: "4px", alignItems: "center"
      }}>
        {pieces.length === 0
          ? <span style={{ color: "#444", fontSize: "11px" }}>none</span>
          : pieces.map((p, i) => (
            <span key={i} style={{ fontSize: "22px", lineHeight: 1 }}>{symbols[p]}</span>
          ))
        }
      </div>
    </div>
  );
}

const BOARD_WIDTH = 650;

export default function App() {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([new Chess().fen()]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [mode, setMode] = useState("play"); // "play" | "engine" | "edit"
  const [boardPosition, setBoardPosition] = useState(fenToBoard(new Chess().fen()));
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [bestMove, setBestMove] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoMove, setAutoMove] = useState(false);
  const [turn, setTurn] = useState("w");
  const [fenInput, setFenInput] = useState("");
  const [fenError, setFenError] = useState("");
  const [copied, setCopied] = useState(false);
  const [captured, setCaptured] = useState({ w: [], b: [] });
  const [capturedHistory, setCapturedHistory] = useState([{ w: [], b: [] }]);
  const [moveList, setMoveList] = useState([]);
  const [gameOver, setGameOver] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [engineThinking, setEngineThinking] = useState(false);

  function checkGameOver(newGame) {
    if (newGame.isCheckmate()) {
      const winner = newGame.turn() === "w" ? "Black" : "White";
      setGameOver(`♛ Checkmate! ${winner} wins!`);
    } else if (newGame.isStalemate()) {
      setGameOver("🤝 Stalemate! It's a draw.");
    } else if (newGame.isThreefoldRepetition()) {
      setGameOver("🔁 Draw by threefold repetition.");
    } else if (newGame.isInsufficientMaterial()) {
      setGameOver("🤝 Draw by insufficient material.");
    } else if (newGame.isDraw()) {
      setGameOver("🤝 It's a draw!");
    } else {
      setGameOver(null);
    }
  }

  function applyMove(newGame, move) {
    const newFen = newGame.fen();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newFen);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setGame(new Chess(newFen));
    setBoardPosition(fenToBoard(newFen));
    setBestMove(null);

    if (move && move.captured) {
      const newCaptured = {
        w: [...captured.w, ...(move.color === "w" ? [move.captured] : [])],
        b: [...captured.b, ...(move.color === "b" ? [move.captured] : [])],
      };
      setCaptured(newCaptured);
      const newCapturedHistory = capturedHistory.slice(0, historyIndex + 1);
      newCapturedHistory.push(newCaptured);
      setCapturedHistory(newCapturedHistory);
    } else {
      const same = { ...captured };
      const newCapturedHistory = capturedHistory.slice(0, historyIndex + 1);
      newCapturedHistory.push(same);
      setCapturedHistory(newCapturedHistory);
    }

    if (move) {
      const newMoveList = moveList.slice(0, historyIndex);
      newMoveList.push(move.san);
      setMoveList(newMoveList);
    }

    checkGameOver(newGame);
    return newGame;
  }

  // Engine Mode: auto-play Stockfish response
  async function enginePlay(currentGame) {
    if (currentGame.isGameOver()) return;
    setEngineThinking(true);
    try {
      const response = await axios.post("http://localhost:5000/predict", { fen: currentGame.fen() });
      const move = response.data.best_move;
      const eval_ = response.data.evaluation;
      setEvaluation(eval_);
      if (move) {
        setTimeout(() => {
          const newGame = new Chess(currentGame.fen());
          try {
            const engineMove = newGame.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: "q" });
            applyMove(newGame, engineMove);
          } catch (e) {}
          setEngineThinking(false);
        }, 500);
      } else {
        setEngineThinking(false);
      }
    } catch (e) {
      console.error(e);
      setEngineThinking(false);
    }
  }

  function undoMove() {
    if (historyIndex <= 0) return;
    const prevIndex = historyIndex - 1;
    setHistoryIndex(prevIndex);
    setGame(new Chess(history[prevIndex]));
    setBoardPosition(fenToBoard(history[prevIndex]));
    setCaptured(capturedHistory[prevIndex] || { w: [], b: [] });
    setMoveList(prev => prev.slice(0, prevIndex));
    setBestMove(null);
    setEvaluation(null);
    setGameOver(null);
  }

  function redoMove() {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    setHistoryIndex(nextIndex);
    const nextGame = new Chess(history[nextIndex]);
    setGame(nextGame);
    setBoardPosition(fenToBoard(history[nextIndex]));
    setCaptured(capturedHistory[nextIndex] || { w: [], b: [] });
    setBestMove(null);
    setEvaluation(null);
    checkGameOver(nextGame);
  }

  function onPlayDrop(sourceSquare, targetSquare) {
    if (gameOver) return false;
    const newGame = new Chess(game.fen());
    let move = null;
    try { move = newGame.move({ from: sourceSquare, to: targetSquare, promotion: "q" }); }
    catch (e) { return false; }
    if (!move) return false;
    const updatedGame = applyMove(newGame, move);

    // In engine mode, trigger engine response after player moves
    if (mode === "engine" && !newGame.isGameOver()) {
      enginePlay(newGame);
    }

    return true;
  }

  function onEditDrop(sourceSquare, targetSquare) {
    if (sourceSquare === targetSquare) return false;
    const newBoard = { ...boardPosition };
    if (newBoard[sourceSquare]) {
      newBoard[targetSquare] = newBoard[sourceSquare];
      delete newBoard[sourceSquare];
      setBoardPosition({ ...newBoard });
      return true;
    }
    return false;
  }

  function onSquareClick(square) {
    if (mode !== "edit") return;
    const newBoard = { ...boardPosition };
    if (selectedPiece) {
      if (newBoard[square] === selectedPiece) { delete newBoard[square]; }
      else { newBoard[square] = selectedPiece; }
    } else { delete newBoard[square]; }
    setBoardPosition({ ...newBoard });
  }

  function handleSelectPiece(piece) {
    setSelectedPiece(selectedPiece === piece ? null : piece);
  }

  function applyEditPosition() {
    const fen = boardToFen(boardPosition, turn);
    try {
      const newGame = new Chess(fen);
      setGame(newGame);
      setHistory([fen]);
      setHistoryIndex(0);
      setMode("play");
      setBestMove(null);
      setEvaluation(null);
      setSelectedPiece(null);
      setCaptured({ w: [], b: [] });
      setCapturedHistory([{ w: [], b: [] }]);
      setMoveList([]);
      setGameOver(null);
    } catch (e) {
      alert("Invalid position! Make sure both kings are on the board.");
    }
  }

  function loadFen() {
    setFenError("");
    try {
      const newGame = new Chess(fenInput);
      setGame(newGame);
      setHistory([newGame.fen()]);
      setHistoryIndex(0);
      setBoardPosition(fenToBoard(newGame.fen()));
      setBestMove(null);
      setEvaluation(null);
      setCaptured({ w: [], b: [] });
      setCapturedHistory([{ w: [], b: [] }]);
      setMoveList([]);
      setGameOver(null);
    } catch (e) {
      setFenError("❌ Invalid FEN string.");
    }
  }

  function copyFen() {
    navigator.clipboard.writeText(game.fen());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function getPrediction() {
    setLoading(true);
    setBestMove(null);
    try {
      const response = await axios.post("http://localhost:5000/predict", { fen: game.fen() });
      const move = response.data.best_move;
      const eval_ = response.data.evaluation;
      setBestMove(move);
      setEvaluation(eval_);
      if (autoMove && move) {
        setTimeout(() => {
          const newGame = new Chess(game.fen());
          try {
            const autoMoveResult = newGame.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: "q" });
            applyMove(newGame, autoMoveResult);
            setBestMove(null);
            setEvaluation(null);
          } catch (e) {}
        }, 1200);
      }
    } catch (error) { console.error("Error:", error); }
    setLoading(false);
  }

  function resetGame() {
    const newGame = new Chess();
    setGame(newGame);
    setHistory([newGame.fen()]);
    setHistoryIndex(0);
    setBoardPosition(fenToBoard(newGame.fen()));
    setBestMove(null);
    setEvaluation(null);
    setFenInput("");
    setMode("play");
    setSelectedPiece(null);
    setCaptured({ w: [], b: [] });
    setCapturedHistory([{ w: [], b: [] }]);
    setMoveList([]);
    setGameOver(null);
    setEngineThinking(false);
  }

  const evalScore = evaluation
    ? evaluation.type === "cp"
      ? `${(evaluation.value / 100).toFixed(2)} pawns`
      : `Mate in ${Math.abs(evaluation.value)}`
    : null;

  const btnStyle = (active, disabled) => ({
    padding: "8px 20px",
    background: disabled ? "#2a2a3e" : active ? "#00d4aa" : "#16213e",
    color: disabled ? "#555" : active ? "#1a1a2e" : "white",
    border: `1px solid ${disabled ? "#555" : "#00d4aa"}`,
    borderRadius: "8px", cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: active ? "bold" : "normal", fontSize: "14px"
  });

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const rightPanel = {
    display: "flex", flexDirection: "column",
    gap: "12px", minWidth: "220px", maxWidth: "240px"
  };

  const movePairs = moveList.reduce((rows, mv, i) => {
    if (i % 2 === 0) rows.push([mv]);
    else rows[rows.length - 1].push(mv);
    return rows;
  }, []);

  const moveListRef = useRef(null);
  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }
  }, [moveList]);

  const isEditMode = mode === "edit";
  const isEngineMode = mode === "engine";
  const isPlayMode = mode === "play";

  return (
    <div style={{
      minHeight: "100vh", background: "#1a1a2e",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "Arial", color: "white", padding: "20px"
    }}>
      {/* Header */}
      <h1 style={{ fontSize: "2.2rem", marginBottom: "2px", letterSpacing: "1px" }}>
        ♟️ Chess<span style={{ color: "#00d4aa" }}>Labs</span>
      </h1>
      <p style={{ color: "#aaa", marginBottom: "15px", fontSize: "13px" }}>
        Play, analyse, and explore positions powered by Stockfish
      </p>

      {/* Mode Toggle */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
        <button style={btnStyle(isPlayMode, false)} onClick={() => { setMode("play"); setSelectedPiece(null); setBestMove(null); }}>▶ Play</button>
        <button style={btnStyle(isEngineMode, false)} onClick={() => { setMode("engine"); setSelectedPiece(null); setBestMove(null); }}>🤖 Engine</button>
        <button style={btnStyle(isEditMode, false)} onClick={() => { setMode("edit"); setBoardPosition(fenToBoard(game.fen())); setBestMove(null); }}>✏️ Edit</button>
      </div>

      {/* FEN Input */}
      <div style={{ marginBottom: "10px", display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        <input type="text" placeholder="Paste FEN string to load a position..."
          value={fenInput} onChange={(e) => setFenInput(e.target.value)}
          style={{ padding: "8px", width: "350px", borderRadius: "8px", border: "1px solid #444", background: "#16213e", color: "white", fontSize: "13px" }}
        />
        <button onClick={loadFen} style={{ padding: "8px 15px", background: "#0f3460", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}>
          Load FEN
        </button>
      </div>
      {fenError && <p style={{ color: "#e94560", marginBottom: "10px" }}>{fenError}</p>}

      {/* Main Layout */}
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

        {/* Eval Bar — LEFT of board */}
        {!isEditMode && (
          <EvalBar evaluation={evaluation} flipped={flipped} />
        )}

        {/* Black Palette LEFT — edit only */}
        <div style={{ minWidth: "72px" }}>
          {isEditMode && (
            <PiecePalette pieces={BLACK_PIECES} selectedPiece={selectedPiece} onSelect={handleSelectPiece} side="black" />
          )}
        </div>

        {/* Board */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ position: "relative", width: BOARD_WIDTH, height: BOARD_WIDTH }}>
            <Chessboard
              id="chess-board"
              position={isEditMode ? boardPosition : game.fen()}
              onPieceDrop={isEditMode ? onEditDrop : onPlayDrop}
              onSquareClick={onSquareClick}
              onPieceDragBegin={() => {}}
              boardWidth={BOARD_WIDTH}
              arePiecesDraggable={!engineThinking}
              isDraggablePiece={() => !engineThinking}
              boardOrientation={flipped ? "black" : "white"}
              customBoardStyle={{ borderRadius: "4px" }}
              animationDuration={isEditMode ? 0 : 200}
            />
            {(isPlayMode || isEngineMode) && bestMove && (
              <ArrowOverlay bestMove={bestMove} boardWidth={BOARD_WIDTH} flipped={flipped} />
            )}
            {/* Engine thinking overlay */}
            {engineThinking && (
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: "100%", height: "100%",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(0,0,0,0.15)", borderRadius: "4px", zIndex: 50
              }}>
                <div style={{
                  background: "#16213e", borderRadius: "10px",
                  padding: "12px 24px", border: "1px solid #00d4aa",
                  fontSize: "15px", color: "#00d4aa", fontWeight: "bold"
                }}>
                  🤔 Engine thinking...
                </div>
              </div>
            )}
          </div>

          {/* Undo / Redo + Flip */}
          {!isEditMode && (
            <div style={{ marginTop: "12px", display: "flex", gap: "10px", alignItems: "center" }}>
              <button onClick={undoMove} disabled={!canUndo} style={{
                padding: "8px 20px", fontSize: "15px", borderRadius: "8px",
                background: canUndo ? "#16213e" : "#2a2a3e",
                color: canUndo ? "white" : "#555",
                border: `1px solid ${canUndo ? "#00d4aa" : "#555"}`,
                cursor: canUndo ? "pointer" : "not-allowed"
              }}>⬅ Undo</button>

              <span style={{ color: "#555", fontSize: "13px" }}>{historyIndex} / {history.length - 1}</span>

              <button onClick={redoMove} disabled={!canRedo} style={{
                padding: "8px 20px", fontSize: "15px", borderRadius: "8px",
                background: canRedo ? "#16213e" : "#2a2a3e",
                color: canRedo ? "white" : "#555",
                border: `1px solid ${canRedo ? "#00d4aa" : "#555"}`,
                cursor: canRedo ? "pointer" : "not-allowed"
              }}>Redo ➡</button>

              {/* Flip button */}
              <button onClick={() => setFlipped(f => !f)} style={{
                padding: "8px 16px", fontSize: "15px", borderRadius: "8px",
                background: "#16213e", color: "white",
                border: "1px solid #00d4aa", cursor: "pointer"
              }}>🔄 Flip</button>
            </div>
          )}
        </div>

        {/* White Palette RIGHT — edit only */}
        <div style={{ minWidth: "72px" }}>
          {isEditMode && (
            <PiecePalette pieces={WHITE_PIECES} selectedPiece={selectedPiece} onSelect={handleSelectPiece} side="white" />
          )}
        </div>

        {/* ── RIGHT PANEL: PLAY MODE ── */}
        {isPlayMode && (
          <div style={rightPanel}>

            {gameOver && (
              <div style={{
                background: gameOver.includes("Checkmate") ? "#3a0f1e" : "#0f2a1e",
                border: `1px solid ${gameOver.includes("Checkmate") ? "#e94560" : "#00d4aa"}`,
                borderRadius: "10px", padding: "14px", textAlign: "center"
              }}>
                <p style={{ fontSize: "15px", fontWeight: "bold", color: gameOver.includes("Checkmate") ? "#e94560" : "#00d4aa" }}>{gameOver}</p>
                <button onClick={resetGame} style={{ marginTop: "8px", padding: "6px 14px", background: "#e94560", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>🔄 Play Again</button>
              </div>
            )}

            <div style={{ background: "#16213e", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "8px" }}>Auto-apply move</p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div onClick={() => setAutoMove(!autoMove)} style={{
                  width: "48px", height: "26px", borderRadius: "13px",
                  background: autoMove ? "#00d4aa" : "#444",
                  cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0
                }}>
                  <div style={{ position: "absolute", top: "3px", left: autoMove ? "25px" : "3px", width: "20px", height: "20px", borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
                </div>
                <span style={{ fontSize: "12px", color: autoMove ? "#00d4aa" : "#666" }}>{autoMove ? "ON" : "OFF"}</span>
              </div>
            </div>

            <button onClick={getPrediction} disabled={loading || !!gameOver} style={{
              padding: "14px", fontSize: "16px", cursor: loading || gameOver ? "not-allowed" : "pointer",
              background: loading || gameOver ? "#555" : "#00d4aa",
              color: loading || gameOver ? "#aaa" : "#1a1a2e",
              border: "none", borderRadius: "10px", fontWeight: "bold"
            }}>
              {loading ? "🤔 Thinking..." : "⚡ Get Best Move"}
            </button>

            <div style={{ background: "#16213e", padding: "14px", borderRadius: "10px", textAlign: "center" }}>
              {bestMove && !loading ? (
                <>
                  <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "6px" }}>Best Move</p>
                  <p style={{ color: "#00d4aa", fontSize: "1.4rem", fontWeight: "bold" }}>{bestMove.slice(0, 2)} → {bestMove.slice(2, 4)}</p>
                  {evalScore && <p style={{ marginTop: "8px", fontSize: "13px" }}>📊 {evalScore}</p>}
                  {autoMove && <p style={{ color: "#aaa", fontSize: "11px", marginTop: "6px" }}>⏳ Applying in 1.2s...</p>}
                </>
              ) : (
                <p style={{ color: "#555", fontSize: "13px" }}>Hit "Get Best Move" to see Stockfish's suggestion</p>
              )}
            </div>

            <div style={{ background: "#16213e", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "8px" }}>📜 Move History</p>
              <div ref={moveListRef} style={{ maxHeight: "160px", overflowY: "auto", background: "#0d1f1a", borderRadius: "6px", padding: "6px" }}>
                {moveList.length === 0
                  ? <p style={{ color: "#444", fontSize: "12px" }}>No moves yet</p>
                  : movePairs.map((pair, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "2px", fontSize: "12px" }}>
                      <span style={{ color: "#555", minWidth: "20px" }}>{i + 1}.</span>
                      <span style={{ color: "white", minWidth: "50px" }}>{pair[0]}</span>
                      {pair[1] && <span style={{ color: "#aaa" }}>{pair[1]}</span>}
                    </div>
                  ))
                }
              </div>
            </div>

            <div style={{ background: "#16213e", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "10px" }}>⚔️ Captured Pieces</p>
              <CapturedBox label="⬛ Black captured:" pieces={captured.b} symbols={WHITE_SYMBOLS} />
              <CapturedBox label="⬜ White captured:" pieces={captured.w} symbols={BLACK_SYMBOLS} />
            </div>

            <div style={{ background: "#16213e", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "8px" }}>Current FEN</p>
              <textarea readOnly value={game.fen()} rows={4} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #2a6b5a", background: "#0d1f1a", color: "#00d4aa", fontSize: "11px", resize: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
              <button onClick={copyFen} style={{ marginTop: "8px", width: "100%", padding: "8px", background: copied ? "#00d4aa" : "#0f3460", color: copied ? "#1a1a2e" : "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: copied ? "bold" : "normal", transition: "all 0.2s" }}>
                {copied ? "✅ Copied!" : "📋 Copy FEN"}
              </button>
            </div>

            <button onClick={resetGame} style={{ padding: "12px", fontSize: "15px", cursor: "pointer", background: "#e94560", color: "white", border: "none", borderRadius: "10px" }}>
              🔄 Reset Board
            </button>
          </div>
        )}

        {/* ── RIGHT PANEL: ENGINE MODE ── */}
        {isEngineMode && (
          <div style={rightPanel}>

            {gameOver && (
              <div style={{
                background: gameOver.includes("Checkmate") ? "#3a0f1e" : "#0f2a1e",
                border: `1px solid ${gameOver.includes("Checkmate") ? "#e94560" : "#00d4aa"}`,
                borderRadius: "10px", padding: "14px", textAlign: "center"
              }}>
                <p style={{ fontSize: "15px", fontWeight: "bold", color: gameOver.includes("Checkmate") ? "#e94560" : "#00d4aa" }}>{gameOver}</p>
                <button onClick={resetGame} style={{ marginTop: "8px", padding: "6px 14px", background: "#e94560", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>🔄 Play Again</button>
              </div>
            )}

            <div style={{ background: "#16213e", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "6px" }}>🤖 Engine Mode</p>
              <p style={{ fontSize: "12px", color: "#555" }}>You play as White. Stockfish responds automatically as Black.</p>
              {engineThinking && <p style={{ color: "#00d4aa", fontSize: "12px", marginTop: "8px" }}>⏳ Engine is thinking...</p>}
            </div>

            {evalScore && (
              <div style={{ background: "#16213e", padding: "14px", borderRadius: "10px", textAlign: "center" }}>
                <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "4px" }}>📊 Evaluation</p>
                <p style={{ color: "#00d4aa", fontSize: "1.2rem", fontWeight: "bold" }}>{evalScore}</p>
              </div>
            )}

            <div style={{ background: "#16213e", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "8px" }}>📜 Move History</p>
              <div ref={moveListRef} style={{ maxHeight: "200px", overflowY: "auto", background: "#0d1f1a", borderRadius: "6px", padding: "6px" }}>
                {moveList.length === 0
                  ? <p style={{ color: "#444", fontSize: "12px" }}>No moves yet</p>
                  : movePairs.map((pair, i) => (
                    <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "2px", fontSize: "12px" }}>
                      <span style={{ color: "#555", minWidth: "20px" }}>{i + 1}.</span>
                      <span style={{ color: "white", minWidth: "50px" }}>{pair[0]}</span>
                      {pair[1] && <span style={{ color: "#aaa" }}>{pair[1]}</span>}
                    </div>
                  ))
                }
              </div>
            </div>

            <div style={{ background: "#16213e", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "10px" }}>⚔️ Captured Pieces</p>
              <CapturedBox label="⬛ Black captured:" pieces={captured.b} symbols={WHITE_SYMBOLS} />
              <CapturedBox label="⬜ White captured:" pieces={captured.w} symbols={BLACK_SYMBOLS} />
            </div>

            <div style={{ background: "#16213e", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "8px" }}>Current FEN</p>
              <textarea readOnly value={game.fen()} rows={4} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #2a6b5a", background: "#0d1f1a", color: "#00d4aa", fontSize: "11px", resize: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
              <button onClick={copyFen} style={{ marginTop: "8px", width: "100%", padding: "8px", background: copied ? "#00d4aa" : "#0f3460", color: copied ? "#1a1a2e" : "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: copied ? "bold" : "normal", transition: "all 0.2s" }}>
                {copied ? "✅ Copied!" : "📋 Copy FEN"}
              </button>
            </div>

            <button onClick={resetGame} style={{ padding: "12px", fontSize: "15px", cursor: "pointer", background: "#e94560", color: "white", border: "none", borderRadius: "10px" }}>
              🔄 Reset Board
            </button>
          </div>
        )}

        {/* ── RIGHT PANEL: EDIT MODE ── */}
        {isEditMode && (
          <div style={rightPanel}>

            <div style={{ background: "#16213e", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "8px" }}>Whose turn?</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => setTurn("w")} style={{ ...btnStyle(turn === "w", false), flex: 1, padding: "8px" }}>⬜ White</button>
                <button onClick={() => setTurn("b")} style={{ ...btnStyle(turn === "b", false), flex: 1, padding: "8px" }}>⬛ Black</button>
              </div>
            </div>

            <div style={{ background: "#16213e", borderRadius: "10px", padding: "14px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: selectedPiece ? "#00d4aa" : "#aaa" }}>
                {selectedPiece ? "✅ Click any square to place piece" : "👈 Select a piece from the palette"}
              </p>
              <p style={{ fontSize: "11px", color: "#555", marginTop: "6px" }}>
                Click an empty square to clear it. Drag pieces to reposition.
              </p>
            </div>

            <div style={{ background: "#16213e", borderRadius: "10px", padding: "14px" }}>
              <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "8px" }}>Current FEN</p>
              <textarea readOnly value={boardToFen(boardPosition, turn)} rows={4} style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #2a6b5a", background: "#0d1f1a", color: "#00d4aa", fontSize: "11px", resize: "none", fontFamily: "monospace", boxSizing: "border-box" }} />
              <button onClick={() => { navigator.clipboard.writeText(boardToFen(boardPosition, turn)); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ marginTop: "8px", width: "100%", padding: "8px", background: copied ? "#00d4aa" : "#0f3460", color: copied ? "#1a1a2e" : "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: copied ? "bold" : "normal", transition: "all 0.2s" }}>
                {copied ? "✅ Copied!" : "📋 Copy FEN"}
              </button>
            </div>

            <button onClick={applyEditPosition} style={{ padding: "14px", fontSize: "15px", cursor: "pointer", background: "#00d4aa", color: "#1a1a2e", border: "none", borderRadius: "10px", fontWeight: "bold" }}>
              ✅ Done Editing
            </button>

            <button onClick={resetGame} style={{ padding: "12px", fontSize: "15px", cursor: "pointer", background: "#e94560", color: "white", border: "none", borderRadius: "10px" }}>
              🔄 Reset Board
            </button>
          </div>
        )}

      </div>
    </div>
  );
}