# SneakersForLess

<p align="center">
  <a href="https://www.sneakersforless.org">
    <img src="https://www.sneakersforless.org/logo.png" alt="SneakersForLess" width="340">
  </a>
</p>

Compare sneaker prices across a bunch of stores in one place, save the pairs you're watching, and get an email when one drops to the price you wanted.

**Live:** [https://www.sneakersforless.org](https://www.sneakersforless.org)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-rolldown-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![AWS](https://img.shields.io/badge/AWS-Lambda%20·%20DynamoDB%20·%20S3-FF9900?logo=amazonaws&logoColor=white)
![Firebase](https://img.shields.io/badge/Auth-Firebase-FFCA28?logo=firebase&logoColor=black)

---

## What it is

SneakersForLess shows you what a shoe costs at different stores side by side, so you're not opening ten tabs to find the cheapest one. You search for a pair, see the lowest price and where it's from, save it, and set a target price. When it drops to or below that target, you get an email.

I built it to get real practice with a full cloud setup, not just a frontend. Sign-in, a serverless API, a CDN, a scheduled email job, and a deploy pipeline. It's a portfolio project, so some parts are deliberately small (the catalog is fixed, prices are seeded for now), but the infrastructure behind it is real.

---

## Features

- Compare a shoe's price across several stores, with the cheapest one flagged.
- Search that doesn't dead-end. If a pair isn't in the catalog, it suggests close matches by brand and name, and it handles small typos.
- A wishlist you can peek at from a dropdown anywhere on the site.
- Price-drop email alerts. You can only set a target below the current price, so an alert only fires on a real drop.
- Google sign-in, so there are no passwords to manage.
- An account page for your favorites, alerts, and email settings.

---

## Tech stack

| Layer | What I used |
|---|---|
| Frontend | React 19, Vite (rolldown), Tailwind CSS v4 |
| Auth | Firebase Authentication (Google sign-in) |
| API | AWS Lambda (Python 3.11) behind API Gateway |
| Database | Amazon DynamoDB |
| Hosting / CDN | Amazon S3 + CloudFront |
| Email | Amazon SES |
| Scheduling | Amazon EventBridge |
| Access control | AWS IAM (per-service least-privilege roles) |
| CI/CD | GitHub Actions |
| Local dev | Docker (DynamoDB Local + reproducible Lambda builds) |

---

## System design

```
                            ┌────────────┐
                            │    User     │   opens the site
                            └──────┬──────┘
                                   │
                                   ▼
                         ┌───────────────┐   ID token    ┌──────────────────┐
                         │    Browser     │◀─────────────│   Firebase Auth   │
                         └──┬─────────┬───┘              └──────────────────┘
        static assets       │         │   API calls (+ ID token)
              ┌─────────────┘         └───────────────┐
              ▼                                         ▼
       CloudFront CDN                           API Gateway (HTTP API)
              │                                         │
              ▼                                         ▼
   S3 (React build + product images)           Lambda (Python 3.11)
                                               verifies token · reads/writes
                                                         │
                                                         ▼
                                          ┌──────────────────────────────┐
                                          │            DynamoDB            │
                                          │   products · users ·           │
                                          │   price-history                │
                                          └───────────────┬───────────────┘
                                                          ▲ read / write
   ──────────────────────  background jobs  ──────────────┼──────────────────
                                                          │
     EventBridge ──▶ alert-checker Lambda ────────────────┤
      (hourly)             │                               │
                           ▼               price-refresh Lambda
                      Amazon SES           (pluggable price source)
                           │
                           ▼
                     user's inbox   ──▶   reaches the same user
```

Someone opens the site, and the system takes it from there. It's serverless, with two ways in and one database behind them.

The site itself is just static files. React gets built once and served from S3 through CloudFront, so it loads quickly from anywhere.

Data takes a different path. The browser calls the API directly, which runs a small Python function on Lambda that reads and writes DynamoDB. Login is handled by Firebase. Once you sign in, the browser sends a token with every request, and the function checks that token before it does anything, so you can only ever touch your own data. It never trusts an email or user ID that the browser just hands it. (I had a bug here early on where the API trusted whatever email it got, which meant anyone could read anyone else's saved data. Catching and fixing that was probably the most useful thing I learned on this project.)

The emails run on their own now. An EventBridge schedule fires every hour and wakes up a Lambda. That Lambda walks through everyone's saved alerts, looks up the current lowest price for each shoe, and sends an email through SES for anything that has dropped to or below the target. After it sends, it stamps the alert with the price it just notified at, so the same drop never emails you twice. You only hear about a shoe again if the price falls even further. A second Lambda handles price updates. It's built around a pluggable source, so I can wire in a live price feed later without touching the alert code. For now it runs on seeded data.

### How an alert becomes an email

The alert pipeline is the part that runs without anyone touching it. It's a scheduled job, an idempotency check so you don't get spammed, and an email at the end.

```
   EventBridge schedule          fires every hour, no clicks needed
          │
          ▼
   alert-checker Lambda
          │
          ├──▶ read every user's saved alerts      (DynamoDB: users)
          └──▶ get each shoe's current lowest price (DynamoDB: products)
          │
          ▼
   has the price dropped to or below the target?
          │ yes
          ▼
   already emailed at this price?  ──yes──▶  skip it, no repeat email
          │ no
          ▼
   send the email through SES  ──▶  user's inbox
          │
          ▼
   stamp the alert with the price and time it notified
   (so it only fires again on a further drop)
```

The "already emailed at this price" check is the important bit. Without it, the job would email you every single hour for as long as the price stayed low. Stamping each alert after a send makes the whole thing safe to run on repeat, which is exactly what you want from something firing on a schedule.

### Build and deploy

Docker and GitHub Actions aren't part of the running site. They're how it gets built and shipped.

```
   LOCAL DEV
   Docker Compose ──▶  DynamoDB Local + admin UI     (develop against a real
                                                      DynamoDB, never prod)

   FRONTEND  (automatic)
   git push main ──▶  GitHub Actions ──build──▶  S3 ──invalidate──▶  CloudFront

   BACKEND  (manual, on purpose)
   backend/build.sh ──▶  zip built inside the      ──▶  manual upload ──▶  Lambda
   (Docker)              Lambda runtime image
```

Docker does two things, both off to the side of production. Locally it runs a copy of DynamoDB so I can develop and test against a real database without going near the live one. For deploys, it builds the Lambda's Python packages inside the same image AWS runs, so something that works on my Mac doesn't break once it's on Lambda. That one caught me out a few times before I set it up properly.

GitHub Actions handles the frontend. Push to `main`, it builds the site, syncs it to S3, and clears the CloudFront cache. The backend I upload by hand, since it changes less often and I'd rather not put the API on autopilot.

---

## Scale and capacity (rough numbers)

This is a portfolio project, so it isn't built for a million users. But it's worth knowing where it holds up and where it would fall over.

Say it grew to roughly 10,000 users, about 3 price alerts each, and maybe 1,000 people using it on a busy day.

| | |
|---|---|
| Catalog | ~80 products |
| Users | ~10,000 |
| Alerts | ~30,000 |
| Daily active users (peak) | ~1,000 |
| API calls per day | ~20,000 |

**Traffic.** That works out to under one request per second on average, with short peaks in the low tens. Lambda alone handles far more than that, and the frontend is static files on a CDN, so that side doesn't really care how many people show up.

**Storage.** Tiny. The whole catalog is about 40 KB. Ten thousand users is around 20 MB. Even a full year of price history comes to well under what the free tier covers.

**Cost.** A few dollars a month, and a lot of that sits inside the AWS free tier.

**Where it breaks.** The weak spot is the alert checker. Right now it reads the entire users table every time it runs, whether or not those users even have alerts. At 10,000 users that's a quick couple of seconds. At a million it's a multi-gigabyte read every hour that would hit the Lambda timeout and cost real money for nothing, since most of the users it reads have nothing to check.

The fix is to stop reading everyone. Either index the alerts so the job only looks at active ones, or flip it around and react when a price actually changes (DynamoDB Streams into a queue) instead of polling the whole table on a timer. So the slow part is known and there's a clear way out. I just haven't needed it at this size.

---

## Running locally

You'll need Node, Python 3.11, and Docker.

**Frontend**

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

**Local backend data**

The backend talks to DynamoDB, so for local work there's a Docker stack with DynamoDB Local plus a web admin UI:

```bash
docker compose up -d                       # DynamoDB on :8000, admin UI on :8001
python backend/scripts/init_local_db.py    # copy the prod schema + data locally
```

That gives you a full copy of the catalog to work against without touching production.

**Building the Lambda**

The Lambda's dependencies are built inside the matching Lambda runtime image so the compiled packages always match what AWS runs:

```bash
bash backend/build.sh                      # produces a deploy-ready zip
```

---

## Project structure

```
sneakers-for-less/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # main app: components, state, routing
│   │   ├── firebase.js      # Firebase auth config
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   ├── public/              # logo, favicon, self-hosted product images
│   └── vite.config.js
├── backend/
│   ├── lambda_handler.py    # main API (the deployed handler)
│   ├── alert_checker.py     # price-drop email checker Lambda
│   ├── price_refresh.py     # price refresh job (pluggable source)
│   ├── build.sh             # reproducible Lambda build (Docker)
│   └── scripts/
│       ├── init_local_db.py            # copy prod schema + data to local
│       ├── init_history_table.py       # create the price-history table
│       └── seed_local_user_alerts.py   # seed a test user + alerts locally
├── .github/workflows/
│   └── deploy.yml           # CI: build + deploy the frontend
├── docker-compose.yml       # local DynamoDB stack
└── README.md
```

---

## Security

A few things I made sure to get right:

- Every user endpoint checks your Firebase token on the server and works out who you are from that, not from anything the browser sends. So you can't read or change anyone else's data.
- The API only accepts browser calls from the site's own domain.
- No secret keys in the repo. They live in Lambda environment variables. (The Firebase key in the frontend looks like a secret but isn't. It's a public project ID, and it's locked down with domain restrictions and Firebase rules.)
- IAM is scoped tight. Each Lambda runs under its own execution role with only the permissions it needs and nothing else. The alert checker, for example, can read the two DynamoDB tables it evaluates and send mail through SES, and that's the whole list. The hourly schedule runs under a separate role whose only job is to invoke that one Lambda.

---

## Roadmap

- Live prices from a real source (eBay's API) instead of seeded data
- Price-history charts so you can see trends, not just the current price
- Move product images into their own bucket
- A proper in-app dialog for setting an alert (it's a plain browser prompt right now)

---

## Disclaimer

SneakersForLess is an independent project and isn't affiliated with any of the brands or stores shown. Product names and images belong to their owners and are used only to identify products.
