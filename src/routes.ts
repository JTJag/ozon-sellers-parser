import { Dataset, createHttpRouter, enqueueLinks } from "crawlee";
import { Composer_dto } from "./types/composer.dto";

export const router = createHttpRouter();

router.addDefaultHandler(async ({ crawler, request, log, json }) => {
  if (!crawler.requestQueue) return;
  const req_url = new URL(request.url);
  const real_url = new URL(req_url.searchParams.get("url") || "/", req_url);
  const page_num = Number(real_url.searchParams.get("layout_page_index")) || 1;
  log.info(`Парсим список продавцов на странице ${page_num}`);

  const data = json as Composer_dto;

  // Добавляем в обработку следующую страницу
  if (data.nextPage) {
    req_url.searchParams.set("url", data.nextPage);
    enqueueLinks({
      urls: [req_url.href],
      requestQueue: crawler.requestQueue,
    });
  }

  // Получаем id необходимого state'а
  const seller_list_state_id = data.layout.find(
    (e) => e.name == "marketing.sellerList"
  )?.stateId;
  if (!seller_list_state_id) return;

  const state_str = data.widgetStates[seller_list_state_id];
  if (!state_str) return;

  // Парсим state
  const state = JSON.parse(state_str);

  // Добавляем в обработку страницы магазинов
  const urls = state.items.map((e: any) => {
    req_url.searchParams.set(
      "url",
      e.deeplink.replace(/^ozon:\//, "").replace("?miniapp", "profile/?miniapp")
    );
    return req_url.href;
  });

  await enqueueLinks({
    urls,
    label: "seller",
    requestQueue: crawler.requestQueue,
  });
});

router.addHandler("seller", async ({ request, json, log }) => {
  const req_url = new URL(request.url);
  const data = json as Composer_dto;

  const seller_legal_state_id = data.layout
    .find((e) => e.name == "marketing.sellerTransparencyProfile")
    ?.placeholders?.find((e) => e.name == "onAboutShopInfo")
    ?.widgets.find(
      (e) => e.name == "marketing.sellerLegalInformation"
    )?.stateId;
  if (!seller_legal_state_id) return;

  const seller_legal_state_str = data.widgetStates[seller_legal_state_id];
  if (!seller_legal_state_str) return;

  const seller_legal_state = JSON.parse(seller_legal_state_str);

  const legal_info_array = seller_legal_state.body[1].textAtom.text
    .split(/<br>/g)
    .map((e: string) => e.trim());

  const name = legal_info_array[0];
  const ogrn = legal_info_array[1]?.match(/^\d+$/)
    ? legal_info_array[1]
    : legal_info_array[2];

  const address = legal_info_array[1]?.match(/^\d+$/)
    ? null
    : legal_info_array[1];

  const legal_info = {
    name,
    address,
    ogrn,
  };

  const seller_url_part = req_url.searchParams.get("url");
  let seller_url;
  if (seller_url_part) {
    seller_url = new URL(seller_url_part, "https://www.ozon.ru");
  }

  await Dataset.pushData({
    url: seller_url,
    legal_info,
  });
});
