# Novel API

This project is a simple Express-based API for managing novels. It provides an endpoint to retrieve a list of novels with default data for ratings, stats, and comments.

## Project Structure

```
novel-api
├── src
│   ├── app.ts                # Entry point of the application
│   ├── controllers
│   │   └── novel.controller.ts # Contains the logic for handling novel-related requests
│   ├── routes
│   │   └── novel.routes.ts     # Defines the routes for the novel API
│   └── types
│       └── novel.ts            # Defines the structure of a novel object
├── package.json                # npm configuration file
├── tsconfig.json               # TypeScript configuration file
└── README.md                   # Project documentation
```

## API Endpoints

### GET /api/novels

Returns a list of novels. Each novel object includes the following properties:

- **title**: The title of the novel
- **author**: The author of the novel
- **ratings**: Default data for ratings
- **stats**: Default data for stats
- **comments**: Default data for comments

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd novel-api
   ```
3. Install the dependencies:
   ```
   npm install
   ```

## Usage

To start the server, run:
```
npm start
```

The API will be available at `http://localhost:3000/api/novels`.

## License

This project is licensed under the MIT License.