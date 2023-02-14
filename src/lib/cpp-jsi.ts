import { getAllMethods, Options } from './common';
import { Type } from './library';


export function generateCppJsi(options: Options, out: NodeJS.WritableStream) {
	out.write('// Auto-generated file. Do not edit!\n\n');

	for (const intf of options.library.interfaces) {
		const methods = getAllMethods(options, intf);

		out.write(`class ${intf.name} : public facebook::jsi::HostObject\n`);
		out.write('{\n');
		out.write('public:\n');
		out.write(`\t${intf.name}(${options.namespace}::I${intf.name}* interface)\n`);
		out.write(`\t\t: interface(interface)\n`);
		out.write(`\t{\n`);
		out.write(`\t}\n`);
		out.write('\n');

		if (methods.length) {
			out.write('public:\n');

			out.write(`\tstd::vector<facebook::jsi::PropNameID> getPropertyNames(facebook::jsi::Runtime& rt) override\n`);
			out.write('\t{\n');
			out.write('\t\treturn facebook::jsi::PropNameID::names(rt\n');

			for (const method of methods) {
				out.write(`\t\t\t, "${method.name}Async"\n`);
				out.write(`\t\t\t, "${method.name}Sync"\n`);
			}

			out.write('\t\t);\n');
			out.write('\t}\n');
			out.write('\n');

			out.write('\tfacebook::jsi::Value get(facebook::jsi::Runtime& rt, const facebook::jsi::PropNameID& propNameID) override\n');
			out.write('\t{\n');
			out.write('\t\tconst auto propName = propNameID.utf8(rt);\n');

			for (const method of methods) {
				out.write('\n');

				out.write(`\t\tif (propName == "${method.name}Async")\n`);
				out.write(`\t\t\treturn facebook::jsi::Function::createFromHostFunction(rt, ` +
					`facebook::jsi::PropNameID::forAscii(rt, "${method.name}Async"), ${method.parameters.length}, ${method.name}Async);\n`);
				out.write('\n');

				out.write(`\t\tif (propName == "${method.name}Sync")\n`);
				out.write(`\t\t\treturn facebook::jsi::Function::createFromHostFunction(rt, ` +
					`facebook::jsi::PropNameID::forAscii(rt, "${method.name}Sync"), ${method.parameters.length}, ${method.name}Sync);\n`);
			}

			out.write('\n');
			out.write('\t\treturn HostObject::get(rt, propNameID);\n');
			out.write('\t}\n');
			out.write('\n');

			out.write('private:\n');

			for (const method of methods) {
				const asyncReturnType = asyncReturn(options, method.returnType);

				out.write(`\tstatic MethodStart<${asyncReturnType}> ${method.name}Start(bool async, facebook::jsi::Runtime& rt, ` +
					`const facebook::jsi::Value& thisValue, const facebook::jsi::Value* arguments, size_t argumentsCount);\n`);

				out.write(`\tstatic facebook::jsi::Value ${method.name}Finish(facebook::jsi::Runtime& rt, ${asyncReturnType} ret);\n`);

				out.write(`\tstatic facebook::jsi::Value ${method.name}Async(facebook::jsi::Runtime& rt, ` +
					`const facebook::jsi::Value& thisValue, const facebook::jsi::Value* arguments, size_t argumentsCount);\n`);

				out.write(`\tstatic facebook::jsi::Value ${method.name}Sync(facebook::jsi::Runtime& rt, ` +
					`const facebook::jsi::Value& thisValue, const facebook::jsi::Value* arguments, size_t argumentsCount);\n`);
			}
		}

		out.write('\n');
		out.write('public:\n');
		out.write(`\t${options.namespace}::I${intf.name}* const interface;\n`);

		out.write('};\n');
		out.write('\n');
		out.write('\n');
	}

	for (const intf of options.library.interfaces) {
		const methods = getAllMethods(options, intf);

		for (const method of methods) {
			const asyncReturnType = asyncReturn(options, method.returnType);

			out.write(`MethodStart<${asyncReturnType}> ${intf.name}::${method.name}Start(bool async, facebook::jsi::Runtime& rt, ` +
				`const facebook::jsi::Value& thisValue, const facebook::jsi::Value* arguments, size_t argumentsCount)\n`);
			out.write('{\n');
			out.write(`\tconst auto obj = thisValue.asObject(rt).asHostObject<${intf.name}>(rt);\n`);

			for (const [paramNumber, param] of method.parameters.entries()) {
				let handled = false;

				if (param.type.isPointer) {
					switch (param.type.name) {
						case 'void':
						case 'uchar':
						case 'boolean':
							out.write(`\tconst auto ${param.name} = getAddress<unsigned char>(rt, async, arguments[${paramNumber}]);`);
							handled = true;
							break;

						case 'int':
							out.write(`\tconst auto ${param.name} = getAddress<int>(rt, async, arguments[${paramNumber}]);`);
							handled = true;
							break;

						case 'uint':
							out.write(`\tconst auto ${param.name} = getAddress<unsigned>(rt, async, arguments[${paramNumber}]);`);
							handled = true;
							break;

						case 'int64':
							out.write(`\tconst auto ${param.name} = getAddress<int64_t>(rt, async, arguments[${paramNumber}]);`);
							handled = true;
							break;

						case 'uint64':
							out.write(`\tconst auto ${param.name} = getAddress<uint64_t>(rt, async, arguments[${paramNumber}]);`);
							handled = true;
							break;

						default:
							out.write(`\tconst auto ${param.name} = (${syncReturn(options, param.type)}) `+
								`getAddress<unsigned char>(rt, async, arguments[${paramNumber}]);`);
							handled = true;
							break;
					}
				}
				else {
					if (options.library.interfacesByName[param.type.name]) {
						out.write(`\tconst auto ${param.name} = ` +
							`arguments[${paramNumber}].asObject(rt).asHostObject<${param.type.name}>(rt);`);
						handled = true;
					}
					else {
						switch (param.type.name) {
							case 'int':
								out.write(`\tconst auto ${param.name} = (int) arguments[${paramNumber}].asNumber();`);
								handled = true;
								break;

							case 'uint':
								out.write(`\tconst auto ${param.name} = (unsigned) arguments[${paramNumber}].asNumber();`);
								handled = true;
								break;

							case 'uchar':
								out.write(`\tconst auto ${param.name} = (unsigned char) arguments[${paramNumber}].asNumber();`);
								handled = true;
								break;

							case 'int64':
								out.write(`\tconst auto ${param.name} = (int64_t) arguments[${paramNumber}].asNumber();`);
								handled = true;
								break;

							case 'uint64':
								out.write(`\tconst auto ${param.name} = (uint64_t) arguments[${paramNumber}].asNumber();`);
								handled = true;
								break;

							case 'boolean':
								out.write(`\tconst auto ${param.name} = arguments[${paramNumber}].asBool();`);
								handled = true;
								break;

							case 'string':
								if (param.type.isConst) {
									out.write(`\tauto ${param.name} = arguments[${paramNumber}].asString(rt).utf8(rt);`);
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

				out.write('\n');
			}

			out.write('\n');

			let hasPointer = false;

			for (const param of method.parameters) {
				if (param.type.isPointer) {
					hasPointer = true;
					out.write(`\tstd::shared_ptr<facebook::jsi::Value> ${param.name}Persistent;\n`);
				}
			}

			if (hasPointer) {
				out.write('\n');
				out.write('\tif (async)\n');
				out.write('\t{\n');

				for (const [paramNumber, param] of method.parameters.entries())
				{
					if (param.type.isPointer) {
						out.write(`\t\t${param.name}Persistent = ` +
							`std::make_shared<facebook::jsi::Value>(rt, arguments[${paramNumber}]);\n`);
					}
				}

				out.write('\t}\n');
				out.write('\n');
			}

			out.write('\treturn [obj');

			for (const param of method.parameters) {
				out.write(`, ${param.name}`);

				if (param.type.isPointer)
					out.write(`, ${param.name}Persistent = std::move(${param.name}Persistent)`);
			}

			out.write(']() {\n');

			if (method.mayThrow)
				out.write(`\t\t${options.namespace}::ThrowStatusWrapper statusWrapper(${method.parameters[0].name}->interface);\n`);

			out.write('\t\t');

			if (!(method.returnType.name == 'void' && !method.returnType.isPointer))
				out.write('return ');

			out.write(`obj->interface->${method.name}(`);

			for (const [paramIndex, param] of method.parameters.entries()) {
				if (paramIndex)
					out.write(', ');

				if (method.mayThrow && !paramIndex)
					out.write('&statusWrapper');
				else {
					if (options.library.interfacesByName[param.type.name])
						out.write(`(${param.name} ? ${param.name}->interface : nullptr)`);
					else {
						out.write(param.name);

						if (param.type.name == 'string')
							out.write('.c_str()');
					}
				}
			}

			out.write(');\n');

			if (method.returnType.name == 'void' && !method.returnType.isPointer)
				out.write('\t\treturn nullptr;\n');

			out.write('\t};\n');
			out.write('}\n');
			out.write('\n');

			out.write(`facebook::jsi::Value ${intf.name}::${method.name}Finish(facebook::jsi::Runtime& rt, ` +
				`${asyncReturn(options, method.returnType)} ret)\n`);
			out.write('{\n');

			if (method.returnType.name == 'void' && !method.returnType.isPointer)
				out.write('\treturn facebook::jsi::Value::undefined();\n');

			let handled = false;

			if (method.returnType.name == 'void' && !method.returnType.isPointer)
				handled = true;
			else if (!method.returnType.isPointer) {
				if (options.library.interfacesByName[method.returnType.name]) {
					out.write(`\treturn ret ? `+
						`facebook::jsi::Object::createFromHostObject(rt, std::make_shared<${method.returnType.name}>(ret)) : ` +
						`facebook::jsi::Value::undefined();\n`);
					handled = true;
				}
				else {
					if (method.returnType.name == 'string') {
						out.write('\treturn !ret.isNull() ? ' +
							'facebook::jsi::Value(rt, facebook::jsi::String::createFromUtf8(rt, ret.string())) : ' +
							'facebook::jsi::Value::undefined();\n');
					}
					else {
						out.write('\treturn facebook::jsi::Value(');

						switch (method.returnType.name) {
							case 'uchar':
							case 'int':
							case 'uint':
							case 'int64':
							case 'uint64':
								out.write('(double) ');
								break;

							case 'boolean':
								out.write('(bool) ');
								break;
						}

						out.write('ret);\n');
					}

					handled = true;
				}
			}
			else {	// pointer
				//// FIXME:
			}

			if (!handled) {
				console.error(`Unrecognized type ${JSON.stringify(method.returnType)} in '${intf.name}#${method.name}'`);
				//// FIXME: process.exit(1);
			}

			out.write('}\n');
			out.write('\n');

			out.write(`facebook::jsi::Value ${intf.name}::${method.name}Async(facebook::jsi::Runtime& rt, ` +
				`const facebook::jsi::Value& thisValue, const facebook::jsi::Value* arguments, size_t argumentsCount)\n`);
			out.write(`{\n`);
			out.write(`\treturn runAsPromise<${asyncReturn(options, method.returnType)}>(rt,\n`);
			out.write(`\t\t${method.name}Start(true, rt, thisValue, arguments, argumentsCount),\n`);
			out.write(`\t\t&${intf.name}::${method.name}Finish);\n`);
			out.write(`}\n`);
			out.write(`\n`);

			out.write(`facebook::jsi::Value ${intf.name}::${method.name}Sync(facebook::jsi::Runtime& rt, ` +
				`const facebook::jsi::Value& thisValue, const facebook::jsi::Value* arguments, size_t argumentsCount)\n`);
			out.write('{\n');
			out.write(`\ttry\n`);
			out.write(`\t{\n`);
			out.write(`\t\tauto ret = ${method.name}Start(false, rt, thisValue, arguments, argumentsCount)();\n`);
			out.write(`\t\treturn ${method.name}Finish(rt, ret);\n`);
			out.write(`\t}\n`);
			out.write(`\tcatch (...)\n`);
			out.write(`\t{\n`);
			out.write(`\t\trethrowException(rt);\n`);
			out.write(`\t}\n`);
			out.write('}\n');
			out.write('\n');
		}
	}
}

function syncReturn(options: Options, type: Type): string {
	let typeName: string;

	if (options.library.interfacesByName[type.name])
		typeName = `${options.namespace}::I${type.name}*`;
	else if (type.name == 'boolean')
		typeName = 'FB_BOOLEAN';
	else if (type.name == 'uchar')
		typeName = 'unsigned char';
	else if (type.name == 'int')
		typeName = 'int';
	else if (type.name == 'uint')
		typeName = 'unsigned';
	else if (type.name == 'int64')
		typeName = 'int64_t';
	else if (type.name == 'uint64')
		typeName = 'uint64_t';
	else if (type.name == 'string')
		typeName = 'OptString';
	else
		typeName = type.name;

	if (type.isPointer) {
		const modifier = type.isConst ? 'const ' : '';
		typeName = `${modifier}${typeName}*`;
	}

	return typeName;
}

function asyncReturn(options: Options, type: Type): string {
	if (options.library.interfacesByName[type.name])
		return `${options.namespace}::I${type.name}*`;
	else if (type.name == 'void')
		return 'void*';
	else
		return syncReturn(options, type);
}
