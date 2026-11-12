# Demo recorder

Drives a real Chrome window through the live site and the PayPal sandbox and records each scene of
the video as its own file in `demo/out/`. If PayPal shows something unexpected (a captcha, a changed
page), the script pauses: finish that step by hand in the window, then press Enter in the terminal.

## Setup (once)

```
cd demo
npm install
npx playwright install ffmpeg
copy .env.demo.example .env.demo      (macOS/Linux: cp)
```

Open `.env.demo` and fill in the two sandbox passwords. The file never leaves your PC.

## Run

```
node record.mjs populate     # makes the store's real purchases and reviews (not recorded)
node record.mjs all          # records every scene
node record.mjs 03           # re-records one scene, e.g. the agent demo
```

Scenes: `01-megaboom 02-injection 03-agents 05-buy 07-refused 06-review 09-refund 10-console 11-agents-api 12-home`.
`07`, `06` and `09` use the order made in `05`, so record `05` before them.
