# Backend Setup Instructions

Open the `hotel-api` folder in VS Code and run the following commands:

1. **Install dependencies**
   ```bash
   npm i
   ```

2. **Migrate the database**
   ```bash
   npm run migrate
   ```

3. **Create super user** (run only once)
   ```bash
   node scripts/create-super-admin.js
   ```

4. **Create data in reference tables**
   ```bash
   node scripts/seed-master-data.js
   ```

5. **Start the server**
   ```bash
   node index.js
   ```

## Frontend Setup Instructions

Open the `hotel-ui` folder in VS Code and run the following commands:

1. **Install dependencies**
   ```bash
   npm i
   ```

2. **Run frontend**
   ```bash
   npm run dev
   ```
