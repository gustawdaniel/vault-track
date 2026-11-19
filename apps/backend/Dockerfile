FROM node:26-alpine AS builder
ENV CI=true
WORKDIR /app
# Node 26 no longer ships corepack; pnpm comes from npm, at the version of packageManager in package.json
RUN npm install -g pnpm@10.30.3
COPY . .
RUN pnpm install --frozen-lockfile --filter backend...
RUN pnpm --filter backend build
# a standalone copy of the backend with only its production dependencies
RUN pnpm --filter backend deploy --prod --legacy /out

FROM node:26-alpine AS runner
# The runtime needs only node: without npm, yarn and apk a shell in the container cannot install anything
RUN rm -rf /usr/local/lib/node_modules /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
        /opt/yarn-* /usr/local/bin/yarn /usr/local/bin/yarnpkg \
    && apk --purge del apk-tools
WORKDIR /app
# owned by root and only readable for the app user, so the running process cannot change its own code
COPY --from=builder /out/package.json ./
COPY --from=builder /out/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist

ENV PORT=4500
EXPOSE 4500
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "dist/server.js"]
