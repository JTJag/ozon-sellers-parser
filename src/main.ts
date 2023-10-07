// For more information, see https://crawlee.dev/
import { HttpCrawler, ProxyConfiguration } from "crawlee";

import { router } from "./routes.js";

const startUrls = [
  "https://api.ozon.ru/composer-api.bx/page/json/v2?url=%2Fseller%2F",
];

const crawler = new HttpCrawler({
  // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
//   maxConcurrency: 1,
//   maxRequestsPerCrawl: 100,
  additionalMimeTypes: ["application/json"],
  preNavigationHooks: [
    async (_, gotOptions) => {
      gotOptions.headers = {
        "User-Agent": "ozonapp_android/16.23.1+2381",
        "X-O3-App-Name": "ozonapp_android",
        "X-O3-App-Version": "16.23.1(2381)",
        "X-O3-Device-Type": "mobile",
        "Mobile-Lat": "0",
        "X-O3-Sample-Trace": "false",
        Accept: "application/json; charset=utf-8",
        "Accept-Encoding": "gzip, deflate",
      };
    },
  ],
  requestHandler: router,
});

await crawler.run(startUrls);
