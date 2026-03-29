.PHONY: build-M365McpFunction

build-M365McpFunction:
	npm install
	npx esbuild src/lambda.ts \
		--bundle \
		--platform=node \
		--target=es2020 \
		--format=esm \
		--sourcemap \
		--main-fields=module,main \
		--banner:js="import { createRequire } from 'module'; const require = createRequire(import.meta.url);" \
		--external:keytar \
		--external:@azure/identity \
		--external:@azure/keyvault-secrets \
		--outfile=$(ARTIFACTS_DIR)/lambda.mjs
	cp src/endpoints.json $(ARTIFACTS_DIR)/endpoints.json
	cp package.json $(ARTIFACTS_DIR)/package.json
