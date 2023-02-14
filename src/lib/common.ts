import { Interface, Library, Method } from './library';


export interface Options {
	library: Library;
	outputCppNan?: string;
	outputCppNapi?: string;
	outputCppJsi?: string;
	outputTs: string;
	namespace: string;
}

export function getAllMethods(options: Options, intf: Interface): Method[] {
	let methods: Method[] = [];

	do {
		methods.splice(0, 0, ...intf.methods);

		if (intf.extends)
			intf = options.library.interfacesByName[intf.extends];
		else
			break;
	} while (true);

	return methods;
}
