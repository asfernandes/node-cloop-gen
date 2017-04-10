import { getAllMethods, Options } from './common';
import { Expr, Interface } from './library';


export function generateTs(options: Options, out: NodeJS.WritableStream) {
	out.write('// Auto-generated file. Do not edit!\n\n');

	out.write('export interface Pointer {\n');
	//// FIXME: put some method (symbol) to make the interface unique.
	out.write('}\n\n');

	let first = true;

	for (const intf of options.library.interfaces) {
		if (first)
			first = false;
		else
			out.write('\n');

		generateInterface(options, out, intf);
		generateNamespace(options, out, intf);
	}
}

function generateInterface(options: Options, out: NodeJS.WritableStream, intf: Interface) {
	out.write(`export interface ${intf.name}${intf.extends ? ` extends ${intf.extends}` : ''} {\n`);

	const methods = getAllMethods(options, intf);

	for (const method of methods) {
		const genMethod = (async: boolean) => {
			out.write(`\t${method.name}${method.async && !async ? 'Sync' : 'Async'}(`);

			let paramNumber = 0;

			for (const param of method.parameters) {
				if (paramNumber != 0)
					out.write(', ');

				out.write(`${param.name}: `);

				let handled = false;

				if (param.type.isPointer) {
					switch (param.type.name) {
						case 'void':
						case 'uchar':
						case 'boolean':
						default:
							out.write('Uint8Array | Pointer');
							handled = true;
							break;

						case 'int':
							out.write('Int32Array');
							handled = true;
							break;

						case 'uint':
							out.write('Uint32Array');
							handled = true;
							break;
					}
				}
				else
				{
					if (options.library.interfacesByName[param.type.name]) {
						out.write(param.type.name);
						handled = true;
					}
					else {
						switch (param.type.name) {
							case 'uchar':
							case 'int':
							case 'uint':
							case 'int64':
							case 'uint64':
								out.write('number');
								handled = true;
								break;

							case 'boolean':
								out.write('boolean');
								handled = true;
								break;

							case 'string':
								if (param.type.isConst) {
									out.write('string');
									handled = true;
								}
								break;

							/***
							case 'intptr':
							case 'void':
							case 'ISC_QUAD':
							case 'ISC_DATE':
							case 'ISC_TIME':
								//// FIXME:
								handled = true;
								break;
							***/
						}
					}
				}

				if (!handled) {
					console.error(`Unrecognized type ${JSON.stringify(param.type)} in '${intf.name}#${method.name}'`);
					//// FIXME: process.exit(1);
				}

				++paramNumber;
			}

			out.write(`): `);

			if (async)
				out.write('Promise<');

			let handled = false;

			if (method.returnType.name == 'void' && !method.returnType.isPointer) {
				out.write('void');
				handled = true;
			}
			else if (!method.returnType.isPointer) {
				if (options.library.interfacesByName[method.returnType.name]) {
					out.write(method.returnType.name);
					handled = true;
				}
				else
				{
					switch (method.returnType.name) {
						case 'uchar':
						case 'int':
						case 'uint':
						case 'int64':
						case 'uint64':
							out.write('number');
							handled = true;
							break;

						case 'boolean':
							out.write('boolean');
							handled = true;
							break;

						case 'string':
							if (method.returnType.isConst) {
								out.write('string');
								handled = true;
							}
							break;
					}
				}
			}
			else {	// pointer
				switch (method.returnType.name) {
					case 'uchar':
						out.write('Pointer');
						handled = true;
						break;
				}
			}

			if (!handled) {
				console.error(`Unrecognized type ${JSON.stringify(method.returnType)} in '${intf.name}#${method.name}'`);
				//// FIXME: process.exit(1);
			}

			if (async)
				out.write('>');

			out.write(`;\n`);
		};

		genMethod(false);

		if (method.async)
			genMethod(true);
	}

	out.write('}\n');
}

function generateNamespace(options: Options, out: NodeJS.WritableStream, intf: Interface) {
	if (!intf.constants.length)
		return;

	out.write('\n');
	out.write(`export namespace ${intf.name} {\n`);

	for (const constant of intf.constants) {
		out.write(`\texport const ${constant.name}: `);

		let handled = false;

		if (!constant.type.isPointer) {
			switch (constant.type.name) {
				case 'uchar':
				case 'int':
				case 'uint':
				case 'int64':
				case 'uint64':
					out.write('number');
					handled = true;
					break;

				case 'boolean':
					out.write('boolean');
					handled = true;
					break;
			}
		}

		if (!handled) {
			console.error(`Unrecognized type ${JSON.stringify(constant.type)} in '${intf.name}#${constant.name}'`);
			//// FIXME: process.exit(1);
		}

		out.write(` = ${generateExpr(constant.expr)};\n`);
	}

	out.write('}\n');
}

function generateExpr(expr: Expr): string | number | boolean {
	switch (expr.type) {
		case 'int-literal':
		case 'boolean-literal':
			return expr.value;

		case '-':
			return `(-${generateExpr(expr.args[0])})`;

		case '|':
			return `(${generateExpr(expr.args[0])}) | (${generateExpr(expr.args[1])})`;

		case 'constant':
			return `${expr.interface}.${expr.name}`;

		default:
			console.error(`Unrecognized expression type ${(expr as Expr).type}`);
			return '';
	}
}
