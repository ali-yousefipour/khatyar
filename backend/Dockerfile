FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
# پنل وب از پوشهٔ public سرو می‌شود
EXPOSE 4000
CMD ["node", "src/server.js"]
