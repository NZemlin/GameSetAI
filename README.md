# GameSetAI

A video analysis and editing platform for tennis matches, featuring video processing, scorekeeping, and clip creation capabilities.

## Features

- **Video Upload & Management**: Upload and organize tennis match videos
- **Scoring System**: Track match scores and points
- **Clip Creation**: Extract and save important moments from matches
- **Match Highlight Export**: Compile key points into highlight videos
- **Video Timeline**: Navigate through match videos with timestamps

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- FFmpeg (required for video processing features)

## Installation

### Clone the repository

```bash
git clone <repository-url>
cd GameSetAI
```

### Install dependencies for the server

```bash
cd server
npm install
```

### Install dependencies for the client

```bash
cd ../client
npm install
```

### FFmpeg Installation

For full video processing capabilities, FFmpeg must be installed on your system and available in your PATH.

#### Windows Installation

1. Download the FFmpeg build from the [official website](https://ffmpeg.org/download.html) or use a package manager like [Chocolatey](https://chocolatey.org/):
   ```
   choco install ffmpeg
   ```

2. Add FFmpeg to your PATH environment variable:
   - Right-click on "This PC" and select "Properties"
   - Click on "Advanced system settings"
   - Click on "Environment Variables"
   - Under "System variables", find the "Path" variable and click "Edit"
   - Click "New" and add the path to the FFmpeg bin directory (e.g., `C:\Program Files\FFmpeg\bin`)
   - Click "OK" to close all dialogs

#### macOS Installation

Using Homebrew:
```
brew install ffmpeg
```

#### Linux Installation

Debian/Ubuntu:
```
sudo apt update
sudo apt install ffmpeg
```

RedHat/CentOS:
```
sudo yum install ffmpeg
```

### Verify FFmpeg Installation

After installation, verify FFmpeg is correctly installed by running:
```
ffmpeg -version
```

## Running the Application

### Start the server

```bash
cd server
npm run dev
```

The server will run on http://localhost:3000 by default.

### Start the client

```bash
cd client
npm run dev
```

The client will run on http://localhost:5173 by default.

## Usage

1. Access the web application at http://localhost:5173
2. Upload tennis match videos
3. Score points and track match progress
4. Create clips of key moments
5. Export highlight compilations

## Development Notes

- The application includes fallback functionality when FFmpeg is not installed, but video processing features will be limited.
- Without FFmpeg, clip "creation" will only store metadata and reference the original video files.
- Full video processing (trimming, compiling, etc.) requires FFmpeg to be properly installed.
