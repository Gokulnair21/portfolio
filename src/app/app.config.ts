import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { EmailJsAdapter } from './delivery/emailjs/emailjs.adapter';
import { MESSAGE_DELIVERY } from './delivery/message-delivery.port';
import { PortfolioDataLoader } from './core/data/portfolio-data-loader.service';
import { ClusterStateService } from './core/state/cluster-state.service';
import { SimulationEngine } from './core/simulation/simulation-engine';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    ClusterStateService,
    PortfolioDataLoader,
    SimulationEngine,
    { provide: MESSAGE_DELIVERY, useClass: EmailJsAdapter },
    provideHttpClient(withFetch()),
    provideAppInitializer(() => {
      const loader = inject(PortfolioDataLoader);
      loader.load();
    }),
  ],
};
