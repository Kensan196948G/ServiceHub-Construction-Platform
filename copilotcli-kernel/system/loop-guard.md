# Loop Guard

## 役割

擬似ループ運用の暴走を防ぐ。

## 停止条件

- 同じ失敗を 3 回繰り返した
- CI 修復を 5 回以上試した
- security critical issue を検出した
- 8 時間上限に近づいた
- `state.json` が進展なしで複数ループ続いた
