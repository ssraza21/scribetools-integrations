import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { baseUrl, CLIENT_HEADER } from './helpers';

type Context = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;

/** A call to the ScribeTools public API with the user's API key. */
export async function scribeToolsRequest(
	this: Context,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs?: IDataObject,
	returnFullResponse = false,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
	const credentials = await this.getCredentials('scribeToolsApi');
	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl(credentials.baseUrl)}${path}`,
		headers: { Accept: 'application/json', 'X-ScribeTools-Client': CLIENT_HEADER },
		json: true,
		returnFullResponse,
	};
	if (body !== undefined) options.body = body;
	if (qs !== undefined) options.qs = qs;
	try {
		return await this.helpers.httpRequestWithAuthentication.call(this, 'scribeToolsApi', options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as JsonObject, apiErrorDetails(error));
	}
}

/** Show the API's {detail: {code, message}} instead of a bare status line. */
function apiErrorDetails(error: unknown): { message?: string; description?: string } {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const detail = (error as any)?.response?.body?.detail ?? (error as any)?.cause?.response?.data?.detail;
	if (detail && typeof detail === 'object' && detail.message) {
		return { message: String(detail.message), description: detail.code ? `ScribeTools error: ${detail.code}` : undefined };
	}
	return {};
}
