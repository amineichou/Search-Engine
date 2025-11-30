## How to Run the Search Engine

### Prerequisites
- C++ compiler (e.g., g++)
- CMake
- Node.js and npm
- Python 3.x
- pip

### Step 1: Build and Run the Crawler
1. Navigate to the `crawler` directory:
   ```bash
   cd crawler
   ```
2. Create a build directory and navigate into it:
   ```bash
   mkdir build && cd build
   ```
3. Run CMake to configure the project:
   ```bash
   cmake ..
   ```
4. Build the crawler:
   ```bash
   make
   ```
5. Run the crawler to start crawling websites:
   ```bash
   ./crawler
   ```

### Step 2: Set Up the Backend Server
1. Navigate to the `backend` directory:
   ```bash
   cd ../../backend
   ```
2. Install the required Node.js packages:
   ```bash
   npm install
   ```
3. Start the backend server:
   ```bash
   npm run dev
   ```
### Step 3: Set Up the Frontend
1. Navigate to the `frontend` directory:
   ```bash
   cd ../frontend
   ```
2. Install the required Node.js packages:
   ```bash
   npm install
   ```
3. Start the frontend development server:
   ```bash
   npm run dev
   ```
4. Open your web browser and go to `http://localhost:5173` to access the search engine interface.

## Notes
- Ensure that the crawler has completed its task and the indexed data is available before performing searches through the frontend interface.
- You can modify the list of starting websites in `crawler/crawler.cpp` to customize the crawling process.