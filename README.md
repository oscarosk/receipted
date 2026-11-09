# Receipted

**Reviews proven by PayPal, for people and AI shopping agents.**

AI shopping agents are only as good as the reviews they read, and roughly a third of online reviews are fake. Receipted ties every
review to a real, unrefunded PayPal payment from the same buyer: the reviewer signs in with PayPal, and the review counts only if
that account is the one that paid, the payment was captured, and nothing came back. Refunds and disputes flip the proof live through
verified PayPal webhooks, and proven reviews are served to AI agents with signed proofs.

Built for the PayPal AI Hackathon 2026. Everything runs in the PayPal sandbox; no real money moves. All stores, products and people
in the demo are fictional.

> Status: day 1. The core proof (same-payer check and refund webhook) is built as a gate page at `/gate`. The full product is being
> built through 12 Nov 2026.

## Run the day-1 gate locally

Requirements: Node 20+, a PayPal developer account, and a tunnel such as ngrok or cloudflared (PayPal can't reach `localhost`).

1. In the PayPal developer dashboard (Sandbox), open your app and:
   - turn on **Log in with PayPal**, tick **Account verification status** and **PayPal account ID (payer ID)**, and set the return
     URL to `https://<your-tunnel>/api/auth/paypal/callback`
   - turn on **Transaction search**
   - add a webhook at `https://<your-tunnel>/api/webhooks/paypal` for `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.REVERSED` and
     `CUSTOMER.DISPUTE.CREATED`, then copy its webhook ID
   - settings can take up to 10 minutes to apply
2. Under **Testing tools > Sandbox accounts**, create at least two **personal** accounts (US).
3. Install and configure:

   ```bash
   npm install
   cp .env.example .env.local   # fill in client ID, secret, webhook ID, and APP_URL=https://<your-tunnel>
   npm run dev
   ```

4. Start the tunnel to port 3000 and open `https://<your-tunnel>/gate`:
   1. Buy with sandbox personal account A.
   2. Log in with PayPal as account A: expect **Match**.
   3. Log in with PayPal as account B: expect **No match**.
   4. Refund: expect a **verified** `PAYMENT.CAPTURE.REFUNDED` event and the proof status to change to **Refunded**.

## Tech

Next.js (App Router) and TypeScript. PayPal Orders v2, Payments v2 (captures and refunds), Log in with PayPal (OpenID Connect,
`paypalattributes` scope for payer ID and verification status), and webhooks verified with `verify-webhook-signature`. Every
money-moving call sends a `PayPal-Request-Id` so retries can't double-charge.

## License

MIT
