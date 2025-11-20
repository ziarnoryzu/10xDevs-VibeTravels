# VibeTravels

VibeTravels is an AI-powered application designed to effortlessly transform your scattered travel notes and ideas into structured, ready-to-use itineraries.

## 📖 Table of Contents

- [Project Description](#-project-description)
- [✨ Tech Stack](#-tech-stack)
- [🚀 Getting Started Locally](#-getting-started-locally)
- [Available Scripts](#-available-scripts)
- [Project Scope](#-project-scope)
- [Project Status](#-project-status)
- [License](#-license)

## 📝 Project Description

Many travelers jot down ideas for their trips in various places, but turning those fragments into a coherent plan is often a time-consuming and challenging task. VibeTravels addresses this by leveraging AI to analyze your notes, understand your preferences, and automatically generate a detailed travel plan. The goal of the MVP is to validate the core idea: users desire an intelligent tool to automate itinerary creation from their own notes.

## ✨ Tech Stack

The project uses a modern, scalable, and efficient technology stack chosen for rapid development and high performance.

-   **Framework**: [Astro](https://astro.build/)
-   **UI Library**: [React](https://react.dev/)
-   **Backend & Database**: [Supabase](https://supabase.io/) (PostgreSQL, Auth, Storage)
-   **AI Integration**: [OpenRouter.ai](https://openrouter.ai/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [Shadcn/ui](https://ui.shadcn.com/)
-   **Testing**: 
    -   **Unit & Integration Tests**: [Vitest](https://vitest.dev/), [React Testing Library](https://testing-library.com/react)
    -   **E2E Tests**: [Playwright](https://playwright.dev/)
-   **Deployment**: [Cloudflare](https://pages.cloudflare.com/)

## 🚀 Getting Started Locally

Follow these instructions to set up the project on your local machine.

### Prerequisites

-   **Node.js**: Version `22.14.0`. We recommend using [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager) to manage Node.js versions.
-   **npm**: Comes bundled with Node.js.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/ziarnoryzu/10xDevs-VibeTravels.git VibeTravels
    cd VibeTravels
    ```

2.  **Set the correct Node.js version:**
    If you are using `nvm`, run this command in the project's root directory:
    ```sh
    nvm use
    ```

3.  **Install dependencies:**
    ```sh
    npm install
    ```

4.  **Set up environment variables:**
    Create a file named `.env` in the root of the project and add the following variables. You can get these keys from your Supabase and OpenRouter dashboards.

    ```env
    # Supabase (Required)
    SUPABASE_URL="your-supabase-project-url"
    SUPABASE_ANON_KEY="your-supabase-anon-key"
    SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

    # OpenRouter.ai
    OPENROUTER_API_KEY="your-openrouter-api-key"  # Required (Secret)
    OPENROUTER_MODEL="anthropic/claude-3.5-haiku" # Optional (Public - model name)
    ```

5.  **Run the development server:**
    ```sh
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

## ⚙️ Available Scripts

The following scripts are available in the project:

-   `npm run dev`: Starts the development server with hot-reloading.
-   `npm run build`: Builds the application for production.
-   `npm run preview`: Serves the production build locally for preview.
-   `npm run lint`: Lints the codebase for errors and style issues.
-   `npm run lint:fix`: Automatically fixes linting issues.
-   `npm run format`: Formats all files using Prettier.

## 📦 Project Scope

### Included in MVP

-   **User Account Management**: Secure registration, login, profile management, and account deletion.
-   **Travel Note Management**: Create, view, edit, delete, and copy travel notes.
-   **AI Itinerary Generation**: Generate a structured plan from notes, user preferences, and parameters like budget and travel style.
-   **New User Onboarding**: A pre-made sample note and plan are created for new users to demonstrate the app's functionality.

### Not Included in MVP

-   Sharing itineraries with other users.
-   Rich media support (e.g., photos) within notes.
-   Advanced logistics (e.g., flight/hotel booking integration).
-   Storing multiple versions of a plan for a single note.
-   Manual editing of a generated itinerary.
-   Monetization features.

## 📊 Project Status

**Current Status**: In Development 🚧

This project is currently in the development phase for the Minimum Viable Product (MVP).

## 📄 License

This project is licensed under the MIT License.
