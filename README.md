# Ekin Image API

Simple image upload API using Node.js, Express, and SQLite.

## Docker Setup

To run the application using Docker:

1. Build and start the containers:
   ```
   docker-compose up -d
   ```

2. The API will be available at http://localhost:3001

3. To stop the containers:
   ```
   docker-compose down
   ```

## API Endpoints

- `POST /upload` - Upload a file
- `GET /upload/:id` - Download a file by ID
- `DELETE /upload/:id` - Delete a file by ID
- `DELETE /upload` - Delete all files
