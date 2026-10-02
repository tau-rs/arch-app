import { injectable } from '@theia/core/shared/inversify';
import { ContributionFilterRegistry, FilterContribution } from '@theia/core/lib/common';
import { ProblemContribution } from '@theia/markers/lib/browser/problem/problem-contribution';

/**
 * Removes the stock Theia views that arrive through transitive dependencies and have no slot in the
 * spec §4 shell. `@theia/markers` comes with `@theia/monaco` (the diagnostics model findings will
 * ride on), and its Problems view would open itself into the bottom panel on first start. The spec's
 * panel is Findings · Checks · Terminal · What's new, so the view goes, the model stays.
 * This is Theia's own mechanism for it (FilterContribution), not a hidden tab.
 */
@injectable()
export class ArchStockViewsFilter implements FilterContribution {
    registerContributionFilters(registry: ContributionFilterRegistry): void {
        registry.addFilters('*', [
            contrib => !(contrib instanceof ProblemContribution),
        ]);
    }
}
