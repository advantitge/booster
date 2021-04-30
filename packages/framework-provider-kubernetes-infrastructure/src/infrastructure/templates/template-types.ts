export interface Template {
  name: string
  template: string
}

export interface TemplateValues {
  timestamp?: string
  namespace: string
  clusterVolume: string
  environment: string
  serviceType: string
  dbHost?: string
  dbUser?: string
  dbPass?: string
}

export interface DaprTemplateValues {
  namespace: string
  eventStoreHost: string
  eventStoreUsername: string
  eventStorePassword: string
}

export interface DaprTemplateRoles {
  namespace: string
}
