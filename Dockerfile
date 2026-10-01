# ============================================================
# NONJ backend — image production
# Multi-stage: build TypeScript ở stage "builder", chỉ copy dist
# sang stage runtime để image gọn và không chứa devDependencies.
# ============================================================

# ---------------- Builder ----------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifest trước để tận dụng cache layer của Docker:
# chỉ chạy lại `npm ci` khi package.json / lock đổi.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------------- Runtime ----------------
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
# Chỉ để LOG đồng nhất giữa các môi trường.
# Tính đúng đắn của mốc thời gian KHÔNG phụ thuộc biến này: mọi cột thời gian
# trong DB là `timestamptz` nên đúng ở bất kỳ múi giờ nào.
ENV TZ=UTC

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Chỉ cần output đã biên dịch
COPY --from=builder /app/dist ./dist

# Railway inject PORT; main.ts đọc process.env.PORT
EXPOSE 3000

# Healthcheck không cần curl/wget (alpine không có sẵn)
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
