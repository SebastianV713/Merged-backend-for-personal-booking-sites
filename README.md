# Short-Term Rental Backend

A Node.js/Express backend for a short-term rental property management system.

## Project Structure

- `server.js`: Application entry point.
- `routes/`: API route handlers.
- `services/`: Business logic and integrations (Stripe, iCal, etc.).
- `bookings.db`: SQLite database (ignored from version control).

## Setup

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Environment Variables:**

    Create a `.env` file in the root directory. You can copy the structure below:

    ```env
    PORT=3000
    STRIPE_SECRET_KEY=sk_test_...
    STRIPE_WEBHOOK_SECRET=whsec_...
    ```

    - `PORT`: (Optional) Port to run the server on. Defaults to 3000.
    - `STRIPE_SECRET_KEY`: Your Stripe secret API key.
    - `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook signing secret.

## Running Locally

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Start:**
```bash
npm start
```

## Testing

Currently, no automated tests are defined.
```bash
npm test
```
