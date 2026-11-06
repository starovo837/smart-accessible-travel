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
COPY scripts/assert-travel-copy.mjs ./scripts/assert-travel-copy.mjs
RUN node scripts/assert-travel-copy.mjs
RUN pnpm exec tsc -b
RUN VITE_DEPLOYMENT=studio pnpm exec vite build
RUN VITE_DEPLOYMENT=studio node scripts/build-offline.mjs

# Download and verify public weights during the build, before accepting online traffic.
FROM node:24-bookworm-slim AS model
COPY deployment/modelscope/download-model.mjs /download-model.mjs
RUN node /download-model.mjs /models

# CPU/base executables and libraries live at the payload root in this pinned release.
# GPU backends live in subdirectories and are unnecessary on the verified free CPU tier.
FROM ollama/ollama:0.40.4@sha256:926d40fd6eeeebd346b5c358a63de2a10ec995371cd93dd22f1843200694b1a6 AS engine
RUN mkdir -p /cpu-libs && find /usr/lib/ollama -maxdepth 1 \( -type f -o -type l \) -exec cp -a {} /cpu-libs/ \; \
    && test -x /cpu-libs/llama-server

FROM ubuntu:24.04
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libstdc++6 libgomp1 libopenblas0 \
    && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/bin/node /usr/local/bin/node
COPY --from=engine /usr/bin/ollama /usr/bin/ollama
COPY --from=engine /cpu-libs/ /usr/lib/ollama/
RUN node --version && ! ldd /usr/bin/ollama | grep 'not found' \
    && ! ldd /usr/lib/ollama/llama-server | grep 'not found'
WORKDIR /app
ENV NODE_ENV=production SAI_DEPLOYMENT=studio PORT=7860 \
    SAI_DATA_DIR=/mnt/workspace/smart-accessible/data \
    OLLAMA_MODELS=/opt/smart-models \
    OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 \
    OLLAMA_NUM_PARALLEL=1 OLLAMA_MAX_LOADED_MODELS=1 OLLAMA_VULKAN=0 \
    OLLAMA_CONTEXT_LENGTH=16384
# Separate large artifacts into independent image layers.
COPY --from=model /models/blobs/sha256-3a859c4dca6883593e389a08987f04762f2a374d475cabc1538360473a72b1da /opt/smart-models/blobs/
COPY --from=model /models/blobs/sha256-70ac570fd36b65a64fbb99883c34d5196368c1cf8f63d8402802a34a0ed2b363 /opt/smart-models/blobs/
COPY --from=model /models/blobs/sha256-a67151e7009487ea73bb4377d878c1e3d89f19c8ae05422d76e86935e3273fa6 /models/blobs/sha256-7339fa418c9ad3e8e12e74ad0fd26a9cc4be8703f9c110728a992b193be85cb2 /models/blobs/sha256-f6417cb1e26962991f8e875a93f3cb0f92bc9b4955e004881251ccbf934a19d2 /opt/smart-models/blobs/
COPY --from=model /models/manifests/ /opt/smart-models/manifests/
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
