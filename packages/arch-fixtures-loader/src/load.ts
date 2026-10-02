import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { FixtureEvent, FixtureState } from './state';

/** Node side: read one state directory (F-7 layout) into a FixtureState */
export const loadState = (dir: string): FixtureState => {
    const responsesDir = join(dir, 'responses');
    const responses: Record<string, unknown> = {};
    if (existsSync(responsesDir)) {
        for (const f of readdirSync(responsesDir).filter(f => f.endsWith('.json')).sort()) {
            responses[f.slice(0, -'.json'.length)] = JSON.parse(readFileSync(join(responsesDir, f), 'utf8'));
        }
    }
    const eventsFile = join(dir, 'events.jsonl');
    const events: FixtureEvent[] = existsSync(eventsFile)
        ? readFileSync(eventsFile, 'utf8').split('\n').map(l => l.trim()).filter(Boolean).map(l => JSON.parse(l) as FixtureEvent)
        : [];
    return { name: basename(dir), responses, events };
};

/** the states available under a fixtures-for-ui folder */
export const listStates = (root: string): string[] =>
    existsSync(root) ? readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort() : [];
