import { randomUUID } from 'crypto';

import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

import { scribeToolsRequest } from './GenericFunctions';
import { buildOutcomeOptions, isTerminal, pollDelaySeconds } from './helpers';

// Programmatic style: processing a document is several dependent calls
// (upload URL → signed PUT → create job → poll → download), which the
// declarative routing format can't express.

const LANGUAGES: INodePropertyOptions[] = [
	['Detect Automatically', 'auto'],
	['Arabic', 'ara'],
	['Bengali', 'ben'],
	['Chinese (Simplified)', 'chi_sim'],
	['Chinese (Traditional)', 'chi_tra'],
	['Czech', 'ces'],
	['Danish', 'dan'],
	['Dutch', 'nld'],
	['English', 'eng'],
	['Finnish', 'fin'],
	['French', 'fra'],
	['German', 'deu'],
	['Greek', 'ell'],
	['Hebrew', 'heb'],
	['Hindi', 'hin'],
	['Indonesian', 'ind'],
	['Italian', 'ita'],
	['Japanese', 'jpn'],
	['Korean', 'kor'],
	['Malay', 'msa'],
	['Norwegian', 'nor'],
	['Persian', 'fas'],
	['Polish', 'pol'],
	['Portuguese', 'por'],
	['Russian', 'rus'],
	['Spanish', 'spa'],
	['Swedish', 'swe'],
	['Thai', 'tha'],
	['Turkish', 'tur'],
	['Ukrainian', 'ukr'],
	['Urdu', 'urd'],
	['Vietnamese', 'vie'],
].map(([name, value]) => ({ name, value }));

const TARGET_LANGUAGES = LANGUAGES.filter((l) => l.value !== 'auto');

const OUTCOMES: INodePropertyOptions[] = [
	{ name: 'Editable Word Document', value: 'editable_document', description: 'DOCX keeping headings, tables and footnotes' },
	{ name: 'Extract Custom Data', value: 'custom_data_extraction', description: 'Fields you define, as JSON with page evidence' },
	{ name: 'Extract Tables', value: 'table_extraction', description: 'Every table as XLSX (or CSV in a ZIP)' },
	{ name: 'Extract Text', value: 'extract_text', description: 'Plain text from OCR' },
	{ name: 'EPUB eBook', value: 'epub', description: 'Reflowable eBook' },
	{ name: 'Searchable PDF', value: 'searchable_pdf', description: 'The PDF with an invisible text layer' },
	{ name: 'Translate Document', value: 'translation', description: 'Translated Word document keeping the structure' },
];

const INLINE_FORMATS = ['txt', 'json'];

export class ScribeTools implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ScribeTools',
		name: 'scribeTools',
		icon: { light: 'file:scribetools.svg', dark: 'file:scribetools.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'OCR, editable Word, tables, translation and custom data extraction for Arabic-script and multilingual documents',
		defaults: { name: 'ScribeTools' },
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'scribeToolsApi', required: true }],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Document', value: 'document' },
					{ name: 'Job', value: 'job' },
					{ name: 'Result', value: 'result' },
				],
				default: 'document',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['document'] } },
				options: [
					{
						name: 'Process',
						value: 'process',
						description: 'Upload a document and start a job, optionally waiting for the result',
						action: 'Process a document',
					},
				],
				default: 'process',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['job'] } },
				options: [
					{ name: 'Cancel', value: 'cancel', description: 'Cancel a running job', action: 'Cancel a job' },
					{ name: 'Get', value: 'get', description: 'Get a job’s state and progress', action: 'Get a job' },
					{ name: 'Get Many', value: 'getAll', description: 'List your jobs, newest first', action: 'Get many jobs' },
					{ name: 'Get Results', value: 'getResults', description: 'List a job’s results', action: 'Get the results of a job' },
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['result'] } },
				options: [
					{ name: 'Download', value: 'download', description: 'Download a result as a file', action: 'Download a result' },
					{
						name: 'Get Content',
						value: 'getContent',
						description: 'Read a TXT or JSON result (up to 1 MiB) as data',
						action: 'Get the content of a result',
					},
				],
				default: 'download',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{ name: 'Get', value: 'get', description: 'Get your plan and available pages', action: 'Get the account' },
				],
				default: 'get',
			},

			// --- document: process ---------------------------------------------
			{
				displayName: 'Input Data Field Name',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: { show: { resource: ['document'], operation: ['process'] } },
				description: 'Name of the binary field holding the PDF or image',
			},
			{
				displayName: 'Outcome',
				name: 'outcome',
				type: 'options',
				options: OUTCOMES,
				default: 'editable_document',
				displayOptions: { show: { resource: ['document'], operation: ['process'] } },
				description: 'What to produce. Your plan decides which outcomes are available.',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'options',
				options: LANGUAGES,
				default: 'auto',
				displayOptions: {
					show: { resource: ['document'], operation: ['process'] },
					hide: { outcome: ['custom_data_extraction'] },
				},
				description: 'Language of the document',
			},
			{
				displayName: 'Translate Into',
				name: 'targetLanguage',
				type: 'options',
				options: TARGET_LANGUAGES,
				default: 'eng',
				displayOptions: { show: { resource: ['document'], operation: ['process'], outcome: ['translation'] } },
			},
			{
				displayName: 'Output Schema',
				name: 'outputSchema',
				type: 'json',
				default:
					'{\n  "type": "object",\n  "properties": {\n    "title": { "type": "string" },\n    "date": { "type": "string", "format": "date" }\n  },\n  "required": ["title"],\n  "additionalProperties": false\n}',
				required: true,
				displayOptions: {
					show: { resource: ['document'], operation: ['process'], outcome: ['custom_data_extraction'] },
				},
				description: 'JSON Schema (object) of the fields to extract. Up to 50 fields.',
			},
			{
				displayName: 'Wait for Result',
				name: 'waitForResult',
				type: 'boolean',
				default: true,
				displayOptions: { show: { resource: ['document'], operation: ['process'] } },
				description:
					'Whether to wait until the job finishes and return the result. Long books can take 20+ minutes; for those, turn this off and use the ScribeTools Trigger or a callback URL.',
			},
			{
				displayName: 'Options',
				name: 'processOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: { show: { resource: ['document'], operation: ['process'] } },
				options: [
					{
						displayName: 'Callback URL',
						name: 'callbackUrl',
						type: 'string',
						default: '',
						placeholder: '={{ $execution.resumeUrl }}',
						description:
							'Public https URL ScribeTools POSTs to once the job finishes, e.g. a Wait node’s resume URL',
					},
					{
						displayName: 'Extraction Granularity',
						name: 'extractionGranularity',
						type: 'options',
						options: [
							{ name: 'One Result per Document', value: 'document' },
							{ name: 'One Result per Page', value: 'page' },
						],
						default: 'document',
						description: 'For Extract Custom Data only',
					},
					{
						displayName: 'Format',
						name: 'format',
						type: 'options',
						options: [
							{ name: 'CSV (in a ZIP)', value: 'csv' },
							{ name: 'DOCX', value: 'docx' },
							{ name: 'Outcome Default', value: '' },
							{ name: 'XLSX', value: 'xlsx' },
						],
						default: '',
						description: 'Result format when the outcome offers more than one',
					},
					{
						displayName: 'Job Name',
						name: 'name',
						type: 'string',
						default: '',
						description: 'Name shown in ScribeTools',
					},
					{
						displayName: 'Max Wait (Minutes)',
						name: 'maxWaitMinutes',
						type: 'number',
						typeOptions: { minValue: 1, maxValue: 240 },
						default: 60,
						description: 'With Wait for Result: stop waiting after this long (the job keeps running)',
					},
					{
						displayName: 'Translation Instructions',
						name: 'translationInstructions',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'For Translate Document: guidance such as register or terminology',
					},
				],
			},

			// --- job / result ids -------------------------------------------------
			{
				displayName: 'Job ID',
				name: 'jobId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['job', 'result'] }, hide: { operation: ['getAll'] } },
			},
			{
				displayName: 'Result ID',
				name: 'resultId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: { show: { resource: ['result'] } },
				description: 'From the job’s results',
			},
			{
				displayName: 'Put Output File in Field',
				name: 'outputBinaryPropertyName',
				type: 'string',
				default: 'data',
				displayOptions: { show: { resource: ['result'], operation: ['download'] } },
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				displayOptions: { show: { resource: ['job'], operation: ['getAll'] } },
				description: 'Whether to return all results or only up to a given limit',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				displayOptions: { show: { resource: ['job'], operation: ['getAll'], returnAll: [false] } },
				description: 'Max number of results to return',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				if (resource === 'account') {
					returnData.push({ json: await scribeToolsRequest.call(this, 'GET', '/api/v1/me'), pairedItem: { item: i } });
				} else if (resource === 'document') {
					returnData.push(...(await processDocument.call(this, i)));
				} else if (resource === 'job') {
					if (operation === 'getAll') {
						for (const job of await listJobs.call(this, i)) returnData.push({ json: job, pairedItem: { item: i } });
						continue;
					}
					const jobId = encodeURIComponent(this.getNodeParameter('jobId', i) as string);
					const path =
						operation === 'cancel'
							? `/api/v1/outcome-jobs/${jobId}/cancel`
							: operation === 'getResults'
								? `/api/v1/outcome-jobs/${jobId}/results`
								: `/api/v1/outcome-jobs/${jobId}`;
					const response = await scribeToolsRequest.call(this, operation === 'cancel' ? 'POST' : 'GET', path);
					returnData.push({ json: response, pairedItem: { item: i } });
				} else if (resource === 'result') {
					const jobId = this.getNodeParameter('jobId', i) as string;
					const resultId = this.getNodeParameter('resultId', i) as string;
					if (operation === 'getContent') {
						const content = await scribeToolsRequest.call(this, 'GET', resultPath(jobId, resultId, 'content'));
						returnData.push({ json: content, pairedItem: { item: i } });
					} else {
						const field = this.getNodeParameter('outputBinaryPropertyName', i) as string;
						const { json, binary } = await downloadResult.call(this, jobId, resultId);
						returnData.push({ json, binary: { [field]: binary }, pairedItem: { item: i } });
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
					continue;
				}
				if (error instanceof NodeApiError) {
					throw new NodeApiError(this.getNode(), error as unknown as JsonObject, { itemIndex: i, message: error.message, description: error.description ?? undefined });
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

function resultPath(jobId: string, resultId: string, leaf: 'content' | 'download'): string {
	return `/api/v1/outcome-jobs/${encodeURIComponent(jobId)}/results/${encodeURIComponent(resultId)}/${leaf}`;
}

async function listJobs(this: IExecuteFunctions, i: number): Promise<IDataObject[]> {
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	const limit = returnAll ? Infinity : (this.getNodeParameter('limit', i) as number);
	const jobs: IDataObject[] = [];
	for (let page = 1; jobs.length < limit; page++) {
		const listing = await scribeToolsRequest.call(this, 'GET', '/api/v1/outcome-jobs', undefined, {
			page,
			page_size: 50,
		});
		jobs.push(...(listing.jobs as IDataObject[]));
		if ((listing.jobs as IDataObject[]).length < 50 || jobs.length >= (listing.total as number)) break;
	}
	return jobs.slice(0, limit === Infinity ? undefined : limit);
}

async function downloadResult(
	this: IExecuteFunctions,
	jobId: string,
	resultId: string,
): Promise<{ json: IDataObject; binary: Awaited<ReturnType<IExecuteFunctions['helpers']['prepareBinaryData']>> }> {
	const link = await scribeToolsRequest.call(this, 'GET', resultPath(jobId, resultId, 'download'));
	// Signed storage URL: never send the API key there.
	const body = (await this.helpers.httpRequest({
		method: 'GET',
		url: link.url as string,
		encoding: 'arraybuffer',
		json: false,
	})) as ArrayBuffer;
	const binary = await this.helpers.prepareBinaryData(
		Buffer.from(body),
		link.filename as string,
		String(link.media_type).split(';')[0],
	);
	const json: IDataObject = { ...(link as IDataObject) };
	delete json.url; // short-lived signed link; don't leak it into workflow data
	return { json, binary };
}

async function processDocument(this: IExecuteFunctions, i: number): Promise<INodeExecutionData[]> {
	const field = this.getNodeParameter('binaryPropertyName', i) as string;
	const outcome = this.getNodeParameter('outcome', i) as string;
	const wait = this.getNodeParameter('waitForResult', i) as boolean;
	const extra = this.getNodeParameter('processOptions', i, {}) as IDataObject;

	const binaryMeta = this.helpers.assertBinaryData(i, field);
	const buffer = await this.helpers.getBinaryDataBuffer(i, field);
	const filename = binaryMeta.fileName || `document.${binaryMeta.fileExtension || 'pdf'}`;

	const built = buildOutcomeOptions({
		outcome,
		language: outcome === 'custom_data_extraction' ? undefined : (this.getNodeParameter('language', i) as string),
		targetLanguage: outcome === 'translation' ? (this.getNodeParameter('targetLanguage', i) as string) : undefined,
		translationInstructions: (extra.translationInstructions as string) || undefined,
		outputSchema:
			outcome === 'custom_data_extraction' ? (this.getNodeParameter('outputSchema', i) as string) : undefined,
		extractionGranularity: (extra.extractionGranularity as string) || undefined,
	});
	if ('error' in built) throw new NodeOperationError(this.getNode(), built.error, { itemIndex: i });
	const options = built.options as IDataObject;

	// One key for the upload and the job, so a retried request replays.
	const key = randomUUID();
	const urls = await scribeToolsRequest.call(this, 'POST', '/api/v1/upload-urls', {
		file_infos: [{ id: 'f0', filename, size_bytes: buffer.length }],
		idempotency_key: key,
	});
	const upload = (urls.urls as IDataObject[])[0];
	await this.helpers.httpRequest({
		method: 'PUT',
		url: upload.signed_url as string,
		body: buffer,
		headers: {
			...((upload.headers as IDataObject) ?? {}),
			'Content-Type': upload.mime_type as string,
		},
		json: false,
	});

	const request: IDataObject = { outcome, gcs_uris: [upload.gcs_uri], idempotency_key: key, options };
	if (extra.format) request.format = extra.format;
	if (extra.name) request.name = extra.name;
	if (extra.callbackUrl) request.callback_url = extra.callbackUrl;
	const created = await scribeToolsRequest.call(this, 'POST', '/api/v1/outcome-jobs', request);
	if (!wait) return [{ json: created, pairedItem: { item: i } }];

	const deadline = Date.now() + ((extra.maxWaitMinutes as number) || 60) * 60_000;
	let status: IDataObject;
	for (;;) {
		const response = await scribeToolsRequest.call(
			this,
			'GET',
			`/api/v1/outcome-jobs/${encodeURIComponent(created.job_id as string)}`,
			undefined,
			undefined,
			true,
		);
		status = response.body as IDataObject;
		if (isTerminal(status.state as string)) break;
		const delay = pollDelaySeconds((response.headers ?? {})['retry-after'] as string | undefined);
		if (Date.now() + delay * 1000 > deadline) {
			throw new NodeOperationError(
				this.getNode(),
				`Job ${created.job_id} is still ${status.state}. It keeps running; fetch it later with Job → Get.`,
				{ itemIndex: i },
			);
		}
		await sleep(delay * 1000);
	}

	const report: IDataObject = { ...status, credits_held: created.credits_reserved, results: [] };
	if (status.state !== 'completed' && status.state !== 'partial') {
		throw new NodeOperationError(this.getNode(), `Job ${created.job_id} ${status.state}.`, {
			itemIndex: i,
			description: JSON.stringify(status.errors ?? []),
		});
	}
	const listing = await scribeToolsRequest.call(
		this,
		'GET',
		`/api/v1/outcome-jobs/${encodeURIComponent(created.job_id as string)}/results`,
	);
	const binary: INodeExecutionData['binary'] = {};
	const results: IDataObject[] = [];
	for (const [index, result] of (listing.results as IDataObject[]).entries()) {
		const entry: IDataObject = { ...result };
		if (INLINE_FORMATS.includes(result.format as string)) {
			try {
				const content = await scribeToolsRequest.call(
					this,
					'GET',
					resultPath(created.job_id as string, result.result_id as string, 'content'),
				);
				entry.text = content.text;
				entry.data = content.data;
			} catch {
				// Over 1 MiB: still attached as a file below.
			}
		}
		const downloaded = await downloadResult.call(this, created.job_id as string, result.result_id as string);
		binary[index === 0 ? 'data' : `data_${index}`] = downloaded.binary;
		results.push(entry);
	}
	report.results = results;
	return [{ json: report, binary, pairedItem: { item: i } }];
}
