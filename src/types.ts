export type ExtensionInfo = {
  id: string;
  name: string;
  iconDataUrl: string;
  version: string;
  enabled: boolean;
  fromWebStore: boolean;
};

export type ChromeProfile = {
  directory: string;
  name: string;
  account: string;
  managed: boolean;
  extensions: ExtensionInfo[];
};

export type ScanResult = {
  userDataDir: string;
  lastUsed: string;
  profiles: ChromeProfile[];
  error?: string;
};

export type SharedSet = {
  id: string;
  name: string;
  extensionIds: string[];
  createdAt: string;
  updatedAt: string;
};

declare global {
  interface Window {
    chexhub: {
      scan(): Promise<ScanResult>;
      openStore(directory: string, extensionId: string): Promise<void>;
      openExtensionManager(directory: string, extensionId: string): Promise<void>;
      listSets(): Promise<SharedSet[]>;
      saveSet(set: Partial<SharedSet> & Pick<SharedSet, 'name' | 'extensionIds'>): Promise<SharedSet>;
      deleteSet(id: string): Promise<boolean>;
    };
  }
}
