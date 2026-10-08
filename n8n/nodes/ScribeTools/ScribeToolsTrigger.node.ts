import type { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription, IPollFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { scribeToolsRequest } from './GenericFunctions';
import { newFinishedJobs, nextCursor, TERMINAL_STATES, type JobSummary } from './helpers';

export class ScribeToolsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ScribeTools Trigger',
		name: 'scribeToolsTrigger',
		icon: { light: 'file:scribetools.svg', dark: 'file:scribetools.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: 'Job finished',
		description: 'Starts the workflow when a ScribeTools job finishes',
		defaults: { name: 'ScribeTools Trigger' },
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'scribeToolsApi', required: true }],
		properties: [
			{
				displayName: 'Job States',
				name: 'states',
				type: 'multiOptions',
				options: [
					{ name: 'Cancelled', value: 'cancelled' },
					{ name: 'Completed', value: 'completed' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Partially Completed', value: 'partial' },
				],
				default: ['completed', 'partial'],
				description: 'Which finished states start the workflow',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const states = (this.getNodeParameter('states', []) as string[]).filter((s) => TERMINAL_STATES.includes(s));
		const staticData = this.getWorkflowStaticData('node') as { since?: string; seen?: string[] };
		const listing = await scribeToolsRequest.call(this, 'GET', '/api/v1/outcome-jobs', undefined, {
			page: 1,
			page_size: 50,
		});
		const jobs = (listing.jobs ?? []) as JobSummary[];

		if (this.getMode() === 'manual') {
			// Show the newest matching finished job so the user can map fields.
			const [latest] = newFinishedJobs(jobs, undefined, [], states).slice(-1);
			return latest ? [[{ json: latest as unknown as IDataObject }]] : null;
		}
		if (staticData.since === undefined) {
			// First activation: start from now, don't replay history.
			staticData.since = new Date().toISOString();
			staticData.seen = [];
			return null;
		}
		const fresh = newFinishedJobs(jobs, staticData.since, staticData.seen ?? [], TERMINAL_STATES);
		const cursor = nextCursor(fresh, staticData.since, staticData.seen ?? []);
		staticData.since = cursor.since;
		staticData.seen = cursor.seen;
		const matching = fresh.filter((job) => states.includes(job.state));
		return matching.length ? [matching.map((job) => ({ json: job as unknown as IDataObject }))] : null;
	}
}
