#!/usr/bin/env bash
set -e  # stop immediately on any failure — no deploying past a broken check

echo "── Ponders pre-deploy checks ──────────────────────────"

echo ""
echo "[1/5] Type-checking the whole project..."
npx tsc --noEmit
echo "✓ tsc clean"

echo ""
echo "[2/5] Running a real production build (this is what Vercel will run)..."
npm run build
echo "✓ build succeeded"

echo ""
echo "[3/5] Confirming .env won't be committed..."
if git check-ignore -q .env; then
  echo "✓ .env is gitignored"
else
  echo "✗ .env is NOT gitignored — secrets would be pushed. Fix .gitignore before continuing."
  exit 1
fi

echo ""
echo "[4/5] Checking vercel.json's cron schedule against Hobby-plan limits..."
if [ -f vercel.json ]; then
  if grep -q '"schedule": "\*/' vercel.json || grep -qE '"schedule": "[^"]*\*/[0-9]+ \* \* \* \*"' vercel.json; then
    echo "⚠ vercel.json has a more-than-daily cron schedule."
    echo "  This will FAIL to deploy on Vercel's Hobby plan (once-per-day cap)."
    echo "  Either upgrade to Pro, change the schedule to daily, or remove the"
    echo "  crons entry and trigger /api/cron/reminders from an external scheduler instead."
    read -p "  Continue anyway? [y/N] " confirm
    [[ "$confirm" == "y" || "$confirm" == "Y" ]] || exit 1
  else
    echo "✓ cron schedule looks Hobby-plan safe (or no sub-daily cron found)"
  fi
fi

echo ""
echo "[5/5] Applying any pending migrations to the database this .env points at..."
echo "  (Uses DIRECT_URL from prisma.config.ts — double check that's the right target.)"
read -p "  Run 'npx prisma migrate deploy' now? [y/N] " confirm
if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
  npx prisma migrate deploy
  echo "✓ migrations applied"
else
  echo "  Skipped — make sure migrations are applied before traffic hits the new build."
fi

echo ""
echo "── Manual steps (can't be safely scripted) ────────────"
echo "  • Confirm these env vars are set in the Vercel dashboard (Project → Settings → Environment Variables):"
echo "      DATABASE_URL, DIRECT_URL, AUTH_SECRET, TICKETMASTER_API_KEY, CRON_SECRET"
echo "  • If any of those were ever pasted into a chat or shared insecurely, rotate them now, before this deploy."
echo ""

if command -v vercel &> /dev/null; then
  read -p "Vercel CLI found — deploy to production now? [y/N] " confirm
  if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
    vercel --prod
  else
    echo "Skipped deploy. Run 'vercel --prod' manually when ready."
  fi
else
  echo "Vercel CLI not found. Either:"
  echo "  • install it: npm i -g vercel, then run this script again, or"
  echo "  • push to the branch connected to your Vercel project (git-based deploy)."
fi

echo ""
echo "── Done ────────────────────────────────────────────────"
