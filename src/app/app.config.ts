import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { PortfolioDataLoader } from './core/data/portfolio-data-loader.service';
import { ClusterStateService } from './core/state/cluster-state.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    ClusterStateService,
    PortfolioDataLoader,
    provideHttpClient(withFetch()),
    provideAppInitializer(() => {
      const loader = inject(PortfolioDataLoader);
      loader.load();
    }),
  ],
};
