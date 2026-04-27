FROM node:20-slim AS base
WORKDIR /app

FROM base AS build
COPY backend/package.json backend/tsconfig.json ./backend/
COPY shared/types ./shared/types
RUN cd backend && npm install
COPY backend/src ./backend/src
RUN cd backend && npm run build

FROM base
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
