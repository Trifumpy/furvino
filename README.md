This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database Management

We're using Prisma to run our database. To connect to a database, you may either use the one provided by Prisma (you can create one by passing the `--db` flag with the `npx prisma init` command) or use the Docker postgres instance.

If you are going to use any external database (including Prisma's), configure the `DATABASE_URL` field in the `.env.local` file (create it if you don't have it). If you want to use the docker postgres database for local development, run the specific image manually or run the whole compose with `docker-compose up`.

When you first set up a database, run `npx prisma migrate deploy` to get the latest migrations. You may need to run `npx prisma generate` once to generate the source files necessary to run prisma in your local system. After clearing it; run `npm run seed` to seed the database with initial values extracted from our json files.

To visualize and alter the data, run `npx prisma studio`. The web interface will allow you to see entries in each table, as well as delete, update, and create entries. You may need to migrate the database once it is created or whenever we update our data schemas.

## Email / SMTP configuration

Set the following in `.env.local` to enable SMTP email notifications:

```
# SMTP server settings
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=

# From header, e.g. "Furvino <notifications@your-domain.com>"
EMAIL_FROM=
```

With these configured, admins can send a test email from the Admin panel using the "Send Test Email" button. The email is sent to the current user's Prisma `email`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
