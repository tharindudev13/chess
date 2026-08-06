#!/usr/bin/env bash
# exit on error
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

# Download Stockfish binary for Linux environment on Render if not existing
if [ ! -f ./bin/stockfish ]; then
  echo "Downloading Stockfish Linux binary for Render..."
  mkdir -p ./bin
  curl -L -o stockfish.tar https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64-avx2.tar
  tar -xf stockfish.tar
  mv stockfish/stockfish-ubuntu-x86-64-avx2 ./bin/stockfish
  chmod +x ./bin/stockfish
  rm -rf stockfish stockfish.tar || true
fi
