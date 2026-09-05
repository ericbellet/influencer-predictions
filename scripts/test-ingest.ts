import { runIngest } from "../lib/ingest";

async function main() {
  const { summary } = await runIngest({
    searchParams: new URLSearchParams("test=1&limit=1&channel=artedeinvertir"),
  });
  console.log(JSON.stringify(summary, null, 2));
}

void main();
