# Rimuru Comeback RPG Bot

A Telegram/WhatsApp automation bot built with modern scripting technology.

## Features

- RPG gameplay mechanics
- Interactive commands
- Database integration
- Cloud storage capabilities
- Plugin system for extensibility

## Installation

1. Clone this repository
2. Install dependencies with `npm install`
3. Set up your environment variables
4. Run the bot with `node index.js`

## Configuration

Make sure to set up your `.env` file with the required credentials.

## Usage

Run the main script to start the bot:
```
node index.js
```

## Contributing

Feel free to submit pull requests for bug fixes or new features.

## License

This project is licensed under the MIT License.

## Environment (Required)

Set these variables before running:

- `MONGODB_URL` (required)
- `OWNER_NUMBER` (recommended)
- `OWNER_NUMBERS` (comma-separated, recommended)
- `PAIRING_NUMBER` (optional)
- `ALLOW_OWNER_EXEC` (`false` by default, recommended)
- `AUTO_RESTART_MEMORY` (`true` by default)
- `MEMORY_THRESHOLD` (`90` by default)

## Reliability Updates

- Reconnect now uses exponential backoff + jitter to avoid reconnect storm.
- Health endpoint now includes CPU load and event-loop lag indicators.
- Owner shell command plugin is disabled by default unless explicitly enabled.

## Quick Start (supaya langsung bisa jalan)

1. Copy env contoh:

```bash
cp .env.example .env
```

2. Edit `MONGODB_URL` sesuai server MongoDB kamu.

3. Jalankan bot:

```bash
node index.js
```

> Jika `MONGODB_URL` tidak diset, bot akan mencoba default lokal: `mongodb://127.0.0.1:27017/rimurucomeback`.
