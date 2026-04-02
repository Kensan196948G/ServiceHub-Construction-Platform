# Verify Loop

## 役割

test、lint、build、security 確認、CI 結果確認、STABLE 判定を行う。

## このループと判定する条件

- test 実行が主作業
- lint 実行が主作業
- build 実行が主作業
- CI 結果確認が主作業

## 注意

改善のために test を回していても、この間は Verify と判定する。
