# Running and hosting

## Requirements

- Node.js **20.19 or newer** (`node -v` to check)
- Any browser. For phones, any iPhone or Android browser works.

## Run locally

```bash
cd apps/vet
npm install        # first time only
```

| Command | Use it for |
|---|---|
| `npm run dev` | Development. Saving a file updates every open screen within a second or two. |
| `npm run build` then `npm run serve` | Demo. Faster loading; rebuild after each change. |

Both serve the app at **http://localhost:8081**.

## Share it with any phone (QR code)

Campus Wi-Fi blocks phones from reaching a laptop directly, so the laptop opens a public **Cloudflare quick tunnel**. It is free and needs no account.

### 1. Download cloudflared (one time)

Homebrew may refuse to install it on older Macs, so download it directly:

```bash
cd ~/Downloads
# Intel Mac:
curl -L -o cloudflared.tgz https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz
# Apple silicon Mac (M1/M2/M3…): use cloudflared-darwin-arm64.tgz instead
tar -xzf cloudflared.tgz && chmod +x cloudflared
```

### 2. Start the app and the tunnel

Terminal window 1:

```bash
cd apps/vet
npm run dev
```

Terminal window 2:

```bash
cd ~/Downloads
./cloudflared tunnel --url http://localhost:8081
```

It prints a link like `https://some-random-words.trycloudflare.com`.

### 3. Make the QR code

Terminal window 3:

```bash
npx qrcode-terminal https://some-random-words.trycloudflare.com
```

Anyone who scans it opens the app in their phone's browser.

### Keep it running

- Keep both windows open. Closing either one takes the app offline.
- Keep the laptop awake: `caffeinate -d` in another window, and keep it plugged in.
- Restarting cloudflared gives a **new link**, so make a new QR code.

## Troubleshooting

| Problem | Fix |
|---|---|
| Phone shows "Blocked request. This host is not allowed" | The tunnel address must end in `.trycloudflare.com`. Other tunnel services need their domain added to `allowedHosts` in `apps/vet/vite.config.ts`. |
| Link shows a Cloudflare error page | The app isn't running. Start `npm run dev` (or `serve`) in window 1. |
| `brew install cloudflared` fails with an Xcode error | Use the direct download above instead of Homebrew. |
| `npm install` fails with an engine/version error | Update Node.js to 20.19 or newer. |
