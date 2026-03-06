from flask import Flask, request, jsonify
from flask_cors import CORS
from stockfish import Stockfish

app = Flask(__name__)
CORS(app, origins="*")

STOCKFISH_PATH = r"C:\stockfish\stockfish\stockfish-windows-x86-64-avx2.exe"

try:
    stockfish = Stockfish(path=STOCKFISH_PATH, depth=15)
    print("✅ Stockfish loaded successfully!")
except Exception as e:
    print(f"❌ Stockfish error: {e}")
    stockfish = None

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        fen = data.get("fen")

        if not fen:
            return jsonify({"error": "No FEN provided"}), 400

        if stockfish is None:
            return jsonify({"error": "Stockfish not loaded"}), 500

        if not stockfish.is_fen_valid(fen):
            return jsonify({"error": "Invalid FEN"}), 400

        stockfish.set_fen_position(fen)
        best_move = stockfish.get_best_move()
        evaluation = stockfish.get_evaluation()

        return jsonify({
            "best_move": best_move,
            "evaluation": evaluation
        })
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "Chess API is running!"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)