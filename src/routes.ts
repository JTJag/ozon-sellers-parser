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

  if (!data.layout) throw new Error("Не найден layout каталога продавцов");
  if (!data.widgetStates) throw new Error("Не найдены состояния виджетов");

  // Добавляем в обработку следующую страницу
  if (data.nextPage) {
    req_url.searchParams.set("url", data.nextPage);
    enqueueLinks({
      urls: [req_url.href],
      requestQueue: crawler.requestQueue,
    });
  }

  const seller_list = data.layout.find((e) => e.component == "sellerList");
  if (!seller_list) throw new Error("Не найден компонент списка продавцов");

  // Получаем id необходимого state'а
  const seller_list_state_id = seller_list.stateId;
  if (!seller_list_state_id)
    throw new Error("Не найден id состояния виджета списка продавцов");

  const state_str = data.widgetStates[seller_list_state_id];
  if (!state_str)
    throw new Error("Не найдено состояние виджета списка продавцов");

  // Парсим state
  let state;
  try {
    state = JSON.parse(state_str);
  } catch (e) {}
  if (!state)
    throw new Error("Не удалось спарсить состояние виджета списка продавцов");

  if (!state.items) throw new Error("В виджете списка продавцов нет элементов");
  if (state.items.length === 0)
    throw new Error("В виджете списка продавцов нет элементов");

  const with_deeplink = (state.items = state.items.filter(
    (e: any) => !!e.deeplink
  ));
  const without_deeplink = (state.items = state.items.filter(
    (e: any) => !e.deeplink
  ));

  if (without_deeplink.length !== 0)
    log.warning(
      `Виджет списка продавцов содержит ${without_deeplink.length} элементов без deeplink`,
      without_deeplink
    );

  if (with_deeplink.length == 0)
    throw new Error("Виджет списка продавцов не содержит элементов с deeplink");

  // Добавляем в обработку страницы магазинов
  const urls = with_deeplink.map((e: any) => {
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

  if (!data.layout) throw new Error("Не найден layout профиля продавца");
  if (!data.widgetStates) throw new Error("Не найдены состояния виджетов");

  const seller_transparency_profile = data.layout.find(
    (e) => e.component == "sellerTransparencyProfile"
  );

  if (!seller_transparency_profile)
    throw new Error("Не найдена информация о профиле продавца");
  if (!seller_transparency_profile.placeholders)
    throw new Error("Не найдена информация о плейсхолдерах профиля продавца");

  const on_about_shop_info = seller_transparency_profile.placeholders.find(
    (e) => e.name == "onAboutShopInfo"
  );
  if (!on_about_shop_info)
    throw new Error("Не найден плейсхолдер с блоком о магазине");

  const seller_legal_information = on_about_shop_info.widgets.find(
    (e) => e.name == "marketing.sellerLegalInformation"
  );
  if (!seller_legal_information)
    throw new Error(
      "Не найден плейсхолдер с блоком о юридической информации магазина"
    );

  const seller_legal_state_id = seller_legal_information.stateId;
  if (!seller_legal_state_id)
    throw new Error("Не найден id виджета с юридической информацией магазина");

  const seller_legal_state_str = data.widgetStates[seller_legal_state_id];
  if (!seller_legal_state_str)
    throw new Error(
      "Не найдено состояние блока с юридической информацией магазина"
    );

  let seller_legal_state;
  try {
    seller_legal_state = JSON.parse(seller_legal_state_str);
  } catch (e) {}
  if (!seller_legal_state)
    throw new Error(
      "Не получается спарсить состояние виджета с юридической информацией магазина"
    );

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

  log.info(`Спарсили информацию о ${name}`);

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
