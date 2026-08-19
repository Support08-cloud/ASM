# Vision 360 Advance Salary Manager

Digital upad (advance salary) register for Vision 360. One shared database, any office PC in the browser. Employee **4-digit PIN** replaces the diary signature.

## What it does

- **Admin and reception logins** — sir can add more users so reception can also register employees and give money.
- **Employee register** with name, mobile, department, and monthly salary.
- **4-digit numeric PIN** set by the employee at registration. The same PIN confirms every upad and salary payout.
- **Forgot PIN** — employee enters the registered mobile, receives OTP, then sets a new PIN.
- **Diary page** for each employee: past upad, dates, receipts, remaining balance.
- **Salary payout** — see remaining upad, deduct some or all from this month’s salary, and know cash to hand over.
- **Reports** — this week, this month, last month, last 30 days, or custom From–To. Group by day / week / month. Download **PDF**.
- **PIN lock** after too many wrong tries, plus an activity log for admin.

## Run on the office network

Install Node.js 20+, then on **one** PC (the server):

```bash
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run build
npm start
```

Other PCs open `http://SERVER-IP:3000` in Chrome.

Default logins after seed:

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Vision360@admin` |
| Reception | `reception` | `Reception@123` |

**Change these passwords after first login.** Sample employees (Ravi / Meera / Amit) are included for training; demo PINs are printed in the seed output.

## SMS (forgot PIN)

Until MSG91 is configured, Settings can show a **demo OTP** on screen so the office can practise. For live SMS, add MSG91 auth key + template in **Settings**.

## PostgreSQL later

SQLite on the server PC is enough for a small office (one app process, many browsers). To move to a shared PostgreSQL server, change `DATABASE_URL` and the Prisma datasource provider.

## Brand

UI uses Vision 360 black / copper / stone from the logo and brand marks in `public/brand/`.
