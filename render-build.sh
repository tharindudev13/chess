#!/usr/bin/env bash
# exit on error
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# Try apt-get install stockfish if running on Ubuntu/Debian container
if command -v apt-get &> /dev/null; then
  echo "Installing Stockfish via apt-get..."
  apt-get update && apt-get install -y stockfish || true
fi

# Download static Stockfish Linux binary into ./bin/stockfish if not installed
if [ ! -f ./bin/stockfish ] && ! command -v stockfish &> /dev/null; then
  echo "Downloading static Stockfish Linux binary for Render..."
  mkdir -p ./bin
  curl -L -o stockfish.tar https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64-avx2.tar
  tar -xf stockfish.tar
  find . -type f -name "stockfish-ubuntu-x86-64*" -exec cp {} ./bin/stockfish \;
  chmod +x ./bin/stockfish
  rm -rf stockfish stockfish.tar || true
fi
