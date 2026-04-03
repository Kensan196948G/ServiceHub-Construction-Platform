# ServiceHub Construction Platform - Frontend Dockerfile
FROM node:20-alpine

WORKDIR /app

# パッケージインストール
COPY package*.json ./
RUN npm install --legacy-peer-deps

# ソースコピー
COPY . .

# 非rootユーザー
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

# 開発環境（ホットリロード）
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
