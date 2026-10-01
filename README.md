## Project Name
Spotlight Alexandria

## Project Description
A hyper-local website for my town — weather, swimming conditions, and restaurant menus, all in one place.

The site is built to be genuinely usable by the whole town, including older residents — that means larger text, clear layout, and full English/French support.

The project is a monorepo made up of three services that run independently: a React frontend, a main Express API that serves weather and restaurant data, and a standalone scraper service that checks Island Park's swimming advisories. For architecture details, the full decision log, and the technical roadmap, see [TECHNICAL_DESIGN.md](docs/TECHNICAL_DESIGN.md).

## Technologies
- React
- Vite
- React Router
- i18next / react-i18next
- Node.js
- Express
- SQLite (Node's built-in `node:sqlite`)
- node-cron
- Cheerio
- Luxon
- gray-matter
- dotenv
- cors
- Docker
- WeatherAPI
- HTML
- CSS
- JavaScript

The plan is to eventually move to the full MERN stack.

## How to Run
Each service runs in its own terminal, starting with the scraper and the API.

**Requirements:** [Node.js](https://nodejs.org) 22.13 or newer, and a free API key from [WeatherAPI](https://www.weatherapi.com).

1. Clone or download this repository.
2. **Island Park scraper:** open a terminal in the `island-park-scraper` folder, run `npm install`, then `npm start`. It runs on port 3001 and checks the advisory page right away. All of its settings have defaults, listed in `island-park-scraper/.env.example`. To run it in Docker instead, copy `.env.example` to `.env` in that folder and run `docker compose up -d --build`.
3. **Main API:** open a terminal in the `main-site-api` folder, copy `.env.example` to `.env`, and add your WeatherAPI key to the `WEATHER_API_KEY` line. Then run `npm install` and `npm start`. The API runs on port 4000.
4. **Restaurant data (optional):** restaurant menus are written as Markdown files, using the format described in [docs/restaurant-file-format.md](docs/restaurant-file-format.md), with an example in [docs/joes-pizza.example.md](docs/joes-pizza.example.md). To load them, set `RESTAURANT_CONTENT_DIR` in the API's `.env` to the folder containing the files and run `npm run ingest:restaurants` in the `main-site-api` folder. Without this step, the Restaurants page shows that no restaurants are listed yet.
5. **Frontend:** open a terminal in the `frontend` folder, run `npm install`, then `npm run dev`.
6. Open the address Vite shows in the terminal (http://localhost:5173 by default).

## Features
Right now the site brings together:

- **Local weather** forecasts: current conditions (temperature, feels like, wind, and humidity) plus a 3-day forecast from WeatherAPI, refreshed every 30 minutes
- **Swimming conditions** for Island Park, pulled from the public health authority's (Eastern Ontario Health Unit) safety advisories, checked every 6 hours, with how long ago the status was updated and a link to verify it at the source
- **Restaurant menus** for local businesses (in progress): a grid of restaurants with their own shareable pages, menus grouped into expandable categories, a size/option selector for items with more than one price, and a notice when a restaurant's information hasn't been confirmed in a while

Also included:

- Full English/French support, with `/en` and `/fr` addresses and a language switcher that keeps you on the same page
- Accessibility for older residents: text scaled up across the whole site, stronger contrast for secondary text, and the page language set correctly for screen readers
- Weather and swimming data that keeps showing the last good result, marked as out of date, if a scheduled check fails
- Restaurant content written as Markdown files and validated before being loaded into a SQLite database, so one bad file can't take down the other menus
- A "page not found" page for broken or outdated links

## Author
Patrick Grace — [patrickmgrace.com](https://www.patrickmgrace.com/) — GitHub: [StandardGrace](https://github.com/StandardGrace)

## Where it's headed
What started as a portfolio project has grown into something with real commercial potential. The site is being prepared for a public launch, hosted from a personal homelab through Cloudflare. Looking further out, it may grow to include other local business listings, advertisements, and a local news section.
