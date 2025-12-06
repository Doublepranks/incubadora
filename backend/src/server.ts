import { app } from "./app";
import { env } from "./config/env";
import { startScheduledSyncJob } from "./jobs/syncJob";

app.listen(env.port, () => {
  console.log(`Backend listening on port ${env.port}`);
});

startScheduledSyncJob();
