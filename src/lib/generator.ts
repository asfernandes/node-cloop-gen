import * as fs from 'fs';

import { Options } from './common';
import { generateCppNan } from './cpp-nan';
import { generateCpp as generateCppNapi } from './cpp-napi';
import { generateTs } from './ts';


export function generate(options: Options) {
	if (options.outputCppNan) {
		const outCpp = fs.createWriteStream(options.outputCppNan);
		try
		{
			generateCppNan(options, outCpp);
		}
		finally
		{
			outCpp.end();
		}
	}

	if (options.outputCppNapi) {
		const outCpp = fs.createWriteStream(options.outputCppNapi);
		try
		{
			generateCppNapi(options, outCpp);
		}
		finally
		{
			outCpp.end();
		}
	}

	const outTs = fs.createWriteStream(options.outputTs);
	try
	{
		generateTs(options, outTs);
	}
	finally
	{
		outTs.end();
	}
}
