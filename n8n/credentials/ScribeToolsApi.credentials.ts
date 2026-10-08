import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

export class ScribeToolsApi implements ICredentialType {
	name = 'scribeToolsApi';

	displayName = 'ScribeTools API';

	icon: Icon = { light: 'file:scribetools.svg', dark: 'file:scribetools.dark.svg' };

	documentationUrl = 'https://github.com/ssraza21/scribetools-integrations/tree/main/n8n#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'st_live_...',
			description: 'Create a key in ScribeTools under Settings → API keys',
		},
		{
			displayName: 'API URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://api.scribetools.com',
			description: 'Leave as is unless ScribeTools support gave you a different address',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
			url: '/api/v1/me',
		},
	};
}
