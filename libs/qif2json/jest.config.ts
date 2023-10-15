import type {Config} from 'jest';

const config: Config = {
	clearMocks: true,
	collectCoverage: true,
	coverageDirectory: 'coverage',
	coverageProvider: 'v8',
	transform: {'.*\\.(tsx?)$': '@swc/jest'},
};

export default config;
