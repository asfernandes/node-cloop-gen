import * as fs from 'fs';

import { Options } from './common';
import { generateCpp } from './cpp';
import { generateTs } from './ts';


export function generate(options: Options) {
	const outCpp = fs.createWriteStream(options.outputCpp);
	try
	{
		generateCpp(options, outCpp);
	}
	finally
	{
		outCpp.end();
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
