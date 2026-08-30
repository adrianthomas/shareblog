import "dotenv/config";
import { buildApp } from "./app.js";

// Hard requirement, not just a docs recommendation: without this, anyone who
// finds the API can request a code, verify it, and create their own account
// and site on this box — see server/src/auth/magic-code.ts. Every instance
// is meant to be run by the person who owns it, so there's no legitimate
// production deployment where
// open signup is intended; refuse to boot rather than silently allow it.
if (process.env.NODE_ENV === "production" && !process.env.ALLOWED_SIGNUP_EMAILS) {
  console.error(
    "ALLOWED_SIGNUP_EMAILS must be set in production — without it, anyone who finds this server's API can " +
      "sign up and create their own account and site. Set it to a comma-separated list of the email(s) that " +
      "should be able to sign in. See SELF_HOSTING.md.",
  );
  process.exit(1);
}

const app = buildApp();
const port = Number(process.env.PORT ?? 3000);

app
  .listen({ port, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`Shareblog server listening on :${port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
