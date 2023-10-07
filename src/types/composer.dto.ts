import { Component_dto } from "./component.dto";

export type Composer_dto = {
  layout: Array<Component_dto>;
  widgetStates: Record<string, string>;
  browser?: {
    ip: string;
    platform: "mobile" | "desktop";
    browser: string;
    isMobileApp?: boolean;
    device: string;
    isWebView?: boolean;
    age: string;
    family: string;
  };
  layoutTrackingInfo?: string;
  shared?: string;
  nextPage?: string;
  prevPage?: string;
  pageInfo?: {
    url: string;
    layoutId: number;
    layoutVersion: number;
    pageType: string;
    ruleId: number;
    pageTypeTracking: string;
    analyticsInfo?: {
      sellerId: number;
    };
  };
  trackingPayloads?: Record<string, string>;
  pageToken: string;
  userToken: string;
  requestID: string;
};
