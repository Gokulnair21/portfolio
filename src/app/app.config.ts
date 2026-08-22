import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { ClusterStateService } from './core/state/cluster-state.service';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), ClusterStateService],
};
