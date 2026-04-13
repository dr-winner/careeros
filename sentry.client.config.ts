// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a page is loaded.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://dc3cab50d21cb2053660eb821e38f78a@o4511212779077632.ingest.us.sentry.io/4511212798935040",

  tracesSampleRate: 1,

  enableLogs: true,

  sendDefaultPii: true,

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
});
