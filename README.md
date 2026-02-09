# ChromeDriver Log Viewer

A web-based viewer built to make sense of Automation logs such as [ChromeDriver](https://chromedriver.chromium.org/). This tool helps developers visualize, filter, and debug the communication between ChromeDriver and the browser.

## Features

- **High Performance**: Built to handle large log files smoothly.
- **Advanced Parsing**: Parses standard log files, extracting artifacts such as session and target IDs, log levels, and methods and important parameters from CDP messages.
- **Visual Correlation**:
  - Distinct visual cues for **Commands** (Red/Left) and **Responses** (Green/Right).
  - **Lane Visualization** to track concurrent sessions and requests.
- **Filtering**: Filter logs by text.
- **Sticky Contexts**: Keeps the current log context visible as you scroll.
- **Drag & Drop**: Simply drop your `.log`, `.txt`, or protocol `.json` files to view them.

## Use

Head to https://googlechromelabs.github.io/chromedriver-log-viewer/ to use the latest build of this tool.

## Local development

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/GoogleChromeLabs/chromedriver-log-viewer.git
   cd chromedriver-log-viewer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Building for Production

Build the app for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Usage

1. **Obtain a Log File**: Run ChromeDriver with logging enabled.
   ```bash
   chromedriver --verbose --log-path=chromedriver.log
   ```
2. **Open Viewer**: Launch the app (locally or hosted).
3. **Drop File**: Drag and drop your `chromedriver.log` onto the window.
4. **Analyze**:
   - Click on rows to expand/collapse JSON payloads.
   - Use the filter bar to search for specific commands or IDs.
   - Hover over correlation lanes to highlight related command/response pairs.

## License

Apache-2.0

This is not an officially supported Google product. This project is not
eligible for the [Google Open Source Software Vulnerability Rewards
Program](https://bughunters.google.com/open-source-security).
