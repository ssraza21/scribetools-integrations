import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	buildOutcomeOptions,
	isTerminal,
	newFinishedJobs,
	nextCursor,
	pollDelaySeconds,
	baseUrl,
} from '../n8n/nodes/ScribeTools/helpers.ts';

test('language options skip auto', () => {
	assert.deepEqual(buildOutcomeOptions({ outcome: 'extract_text', language: 'auto' }), { options: {} });
	assert.deepEqual(buildOutcomeOptions({ outcome: 'extract_text', language: 'ara' }), { options: { language: 'ara' } });
});

test('translation options carry target and instructions', () => {
	assert.deepEqual(
		buildOutcomeOptions({
			outcome: 'translation',
			language: 'urd',
			targetLanguage: 'eng',
			translationInstructions: 'Keep honorifics',
		}),
		{ options: { language: 'urd', target_language: 'eng', translation_instructions: 'Keep honorifics' } },
	);
	assert.deepEqual(buildOutcomeOptions({ outcome: 'editable_document', targetLanguage: 'eng' }), { options: {} });
});

test('custom data needs a JSON object schema', () => {
	const schema = { type: 'object', properties: { total: { type: 'number' } } };
	assert.deepEqual(
		buildOutcomeOptions({ outcome: 'custom_data_extraction', outputSchema: JSON.stringify(schema), language: 'ara' }),
		{ options: { output_schema: schema } },
	);
	assert.deepEqual(buildOutcomeOptions({ outcome: 'custom_data_extraction', outputSchema: '[1]' }), {
		error: 'Output Schema must be a JSON object.',
	});
	assert.deepEqual(buildOutcomeOptions({ outcome: 'custom_data_extraction', outputSchema: '{' }), {
		error: 'Output Schema is not valid JSON.',
	});
});

test('terminal states', () => {
	assert.equal(isTerminal('completed'), true);
	assert.equal(isTerminal('cancelled'), true);
	assert.equal(isTerminal('processing'), false);
	assert.equal(isTerminal(undefined), false);
});

test('poll delay follows Retry-After within bounds', () => {
	assert.equal(pollDelaySeconds(undefined), 5);
	assert.equal(pollDelaySeconds('2'), 5);
	assert.equal(pollDelaySeconds('15'), 15);
	assert.equal(pollDelaySeconds('600'), 60);
	assert.equal(pollDelaySeconds('soon'), 5);
});

const jobs = [
	{ job_id: 'a', state: 'completed', completed_at: '2026-10-07T10:00:00Z' },
	{ job_id: 'b', state: 'processing', completed_at: null },
	{ job_id: 'c', state: 'failed', completed_at: '2026-10-07T11:00:00Z' },
	{ job_id: 'd', state: 'completed', completed_at: '2026-10-07T11:00:00Z' },
];

test('trigger emits finished jobs oldest first and never twice', () => {
	const first = newFinishedJobs(jobs, undefined, []);
	assert.deepEqual(first.map((j) => j.job_id), ['a', 'c', 'd']);
	const cursor = nextCursor(first, undefined, []);
	assert.deepEqual(cursor, { since: '2026-10-07T11:00:00Z', seen: ['c', 'd'] });
	assert.deepEqual(newFinishedJobs(jobs, cursor.since, cursor.seen), []);

	const later = [...jobs, { job_id: 'e', state: 'partial', completed_at: '2026-10-07T11:00:00Z' }];
	const again = newFinishedJobs(later, cursor.since, cursor.seen);
	assert.deepEqual(again.map((j) => j.job_id), ['e']);
	assert.deepEqual(nextCursor(again, cursor.since, cursor.seen).seen, ['c', 'd', 'e']);
});

test('trigger can filter by state', () => {
	assert.deepEqual(
		newFinishedJobs(jobs, undefined, [], ['completed']).map((j) => j.job_id),
		['a', 'd'],
	);
});

test('base URL defaults and trims', () => {
	assert.equal(baseUrl(undefined), 'https://api.scribetools.com');
	assert.equal(baseUrl('https://x.example/'), 'https://x.example');
});
