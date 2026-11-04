export interface ListContext {
  keyPrefix?: string;
  listViewId?: string;
}

export interface RouteToClassicMessage {
  type: 'route-to-classic';
  url: string;
  tabId?: number;
  keyPrefix?: string;
  listViewId?: string;
}

export interface GetListContextMessage {
  type: 'get-list-context';
}

export type ExtensionMessage = RouteToClassicMessage | GetListContextMessage;
