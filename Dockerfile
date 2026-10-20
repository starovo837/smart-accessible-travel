# Full-stack ModelScope Studio. Only the application port is public.
FROM node:24-bookworm-slim AS builder
WORKDIR /app
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig*.json vite.config.ts index.html ./
COPY src ./src
COPY server ./server
COPY public ./public
COPY scripts/build-offline.mjs ./scripts/build-offline.mjs
RUN pnpm exec tsc -b
RUN VITE_DEPLOYMENT=studio pnpm exec vite build
RUN VITE_DEPLOYMENT=studio node scripts/build-offline.mjs

FROM ollama/ollama:0.40.4
COPY --from=builder /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
ENV NODE_ENV=production SAI_DEPLOYMENT=studio PORT=7860 \
    SAI_DATA_DIR=/mnt/workspace/smart-accessible/data \
    OLLAMA_MODELS=/mnt/workspace/smart-accessible/models \
    OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 \
    OLLAMA_NUM_PARALLEL=1 OLLAMA_MAX_LOADED_MODELS=1 \
    OLLAMA_CONTEXT_LENGTH=16384
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/server ./server
COPY package.json ./package.json
COPY desktop/server.mjs ./desktop/server.mjs
COPY deployment/modelscope/start.mjs ./deployment/modelscope/start.mjs
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
    CMD ["node", "-e", "fetch('http://127.0.0.1:7860/__smart_accessible_health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
ENTRYPOINT ["node", "deployment/modelscope/start.mjs"]
CMD []
