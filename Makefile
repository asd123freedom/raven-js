release:
	yarn lerna publish --exact --skip-git --skip-npm
	yarn clean
	yarn build
	yarn lint
	yarn test
	cd packages/browser; npm publish
	cd packages/core; npm publish
	cd packages/hub; npm publish
	cd packages/minimal; npm publish
	cd packages/node; npm publish
	cd packages/types; npm publish
	cd packages/typescript; npm publish
	cd packages/utils; npm publish
