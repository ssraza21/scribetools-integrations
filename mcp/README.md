# MCP Registry entry

`server.json` lists the remote server `https://mcp.scribetools.com/mcp` as `com.scribetools/scribetools`
in the official MCP Registry. Validate it with `mcp-publisher validate` (passes).

Domain proof is HTTP-based. `https://scribetools.com/.well-known/mcp-registry-auth` serves the public half
of an ed25519 key (frontend route `src/app/.well-known/mcp-registry-auth/route.ts`). The private key is
`~/.scribetools-mcp-registry-key.pem` on the owner's machine (mode 600) and never goes into git.

Publish (needs the owner's go-ahead; it lists ScribeTools publicly):

```bash
curl -s https://scribetools.com/.well-known/mcp-registry-auth   # must print v=MCPv1; k=ed25519; p=...
PRIVATE_KEY="$(openssl pkey -in ~/.scribetools-mcp-registry-key.pem -noout -text | grep -A3 'priv:' | tail -n +2 | tr -d ' :\n')"
mcp-publisher login http --domain scribetools.com --private-key "$PRIVATE_KEY"
mcp-publisher publish
```

Bump `version` for every later publish. Smithery, Glama and PulseMCP index the official registry or accept
the same URL through their own forms.
