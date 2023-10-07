export type Component_dto = {
  component: string;
  params: string;
  stateId: string;
  version: number;
  vertical: string;
  widgetTrackingInfo: string;
  trackingOn: boolean;
  widgetToken: string;
  timeSpent: number;
  name: string;
  id: number;
  isTrackView?: boolean;
  isTrackingOn?: boolean;
  placeholders?: Array<{
    name: string;
    widgets: Array<Component_dto>;
  }>;
};
