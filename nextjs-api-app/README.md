# Next.js API App

This project is a Next.js application that provides an API for managing novels. It uses Prisma to interact with a SQLite database for storing, retrieving, updating, and deleting novel data.

## Project Structure

```
nextjs-api-app
├── .env                  # Environment variables for the application
├── prisma                # Prisma schema and migration files
│   └── schema.prisma     # Database schema definition
├── src                   # Source code for the application
│   ├── app               # Next.js application files
│   │   ├── api           # API route handlers
│   │   │   └── novels     # Novel-related API routes
│   │   │       ├── [id]   # Route for individual novel operations
│   │   │       │   └── route.ts
│   │   │       └── route.ts
│   │   ├── layout.tsx    # Layout component for the application
│   │   └── page.tsx      # Main page component
│   └── lib               # Library files
│       └── db.ts         # Database connection logic
├── package.json          # npm configuration file
├── next.config.mjs       # Next.js configuration file
├── tsconfig.json         # TypeScript configuration file
└── README.md             # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd nextjs-api-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory and add your database connection string:
   ```
   DATABASE_URL="file:./dev.db"
   ```

4. **Set up the database:**
   Run the following command to generate the database based on the Prisma schema:
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

## API Endpoints

- **GET /api/novels**: Retrieve all novels.
- **POST /api/novels**: Create a new novel.
- **GET /api/novels/[id]**: Retrieve a specific novel by ID.
- **PUT /api/novels/[id]**: Update a novel by ID.
- **DELETE /api/novels/[id]**: Delete a novel by ID.

## Usage Guidelines

- Use the provided API endpoints to manage novel data.
- Ensure that the database is properly set up and migrated before making API requests.
- Refer to the Prisma documentation for more information on database interactions.

## License

This project is licensed under the MIT License.