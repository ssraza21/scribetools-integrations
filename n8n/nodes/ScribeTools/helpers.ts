// Pure helpers shared by the ScribeTools nodes. No n8n imports, so they can be
// unit-tested without an n8n runtime.

export const CLIENT_HEADER = 'n8n/0.1.0';

export const TERMINAL_STATES = ['completed', 'partial', 'failed', 'cancelled'];

export interface OutcomeOptionsInput {
	outcome: string;
	language?: string;
	targetLanguage?: string;
	translationInstructions?: string;
	outputSchema?: string | Record<string, unknown>;
	extractionGranularity?: string;
}

export interface JobSummary {
	job_id: string;
	state: string;
	completed_at?: string | null;
	outcome?: string;
	format?: string;
	name?: string | null;
	created_at?: string | null;
}

/** Outcome options the API accepts, from the node's flat parameters, or why they're invalid. */
export function buildOutcomeOptions(
	input: OutcomeOptionsInput,
): { options: Record<string, unknown> } | { error: string } {
	const options: Record<string, unknown> = {};
	if (input.outcome === 'custom_data_extraction') {
		let schema = input.outputSchema;
		if (typeof schema === 'string') {
			const parsed = parseJsonObject(schema, 'Output Schema');
			if ('error' in parsed) return parsed;
			schema = parsed.value;
		}
		if (!schema) return { error: 'Output Schema is required for Extract Custom Data.' };
		options.output_schema = schema;
		if (input.extractionGranularity) options.extraction_granularity = input.extractionGranularity;
		return { options };
	}
	if (input.language && input.language !== 'auto') options.language = input.language;
	if (input.outcome === 'translation') {
		if (input.targetLanguage) options.target_language = input.targetLanguage;
		if (input.translationInstructions) options.translation_instructions = input.translationInstructions;
	}
	return { options };
}

export function parseJsonObject(
	text: string,
	label: string,
): { value: Record<string, unknown> } | { error: string } {
	let value: unknown;
	try {
		value = JSON.parse(text);
	} catch {
		return { error: `${label} is not valid JSON.` };
	}
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return { error: `${label} must be a JSON object.` };
	}
	return { value: value as Record<string, unknown> };
}

export function isTerminal(state: string | undefined): boolean {
	return state !== undefined && TERMINAL_STATES.includes(state);
}

/** Seconds to wait before the next status poll: Retry-After, clamped to 5–60. */
export function pollDelaySeconds(retryAfter: string | undefined): number {
	const parsed = Number(retryAfter);
	if (!Number.isFinite(parsed) || parsed <= 0) return 5;
	return Math.min(Math.max(parsed, 5), 60);
}

/**
 * Finished jobs the trigger hasn't emitted yet, oldest first.
 *
 * `since` is the newest completed_at already emitted; `seen` holds the job ids
 * emitted at exactly that timestamp, so equal timestamps aren't lost or
 * repeated.
 */
export function newFinishedJobs(
	jobs: JobSummary[],
	since: string | undefined,
	seen: string[],
	states: string[] = TERMINAL_STATES,
): JobSummary[] {
	return jobs
		.filter((job) => states.includes(job.state) && job.completed_at)
		.filter((job) => {
			if (!since) return true;
			const done = job.completed_at as string;
			return done > since || (done === since && !seen.includes(job.job_id));
		})
		.sort((a, b) => ((a.completed_at as string) < (b.completed_at as string) ? -1 : 1));
}

/** The trigger's next cursor after emitting `emitted`. */
export function nextCursor(
	emitted: JobSummary[],
	since: string | undefined,
	seen: string[],
): { since: string | undefined; seen: string[] } {
	if (!emitted.length) return { since, seen };
	const newest = emitted[emitted.length - 1].completed_at as string;
	const atNewest = emitted.filter((j) => j.completed_at === newest).map((j) => j.job_id);
	return { since: newest, seen: newest === since ? [...seen, ...atNewest] : atNewest };
}

export function baseUrl(raw: unknown): string {
	const url = typeof raw === 'string' && raw.trim() ? raw.trim() : 'https://api.scribetools.com';
	return url.replace(/\/+$/, '');
}
