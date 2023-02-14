import { getAllMethods, Options } from './common';
import { Type } from './library';


export function generateCpp(options: Options, out: NodeJS.WritableStream) {
	out.write('// Auto-generated file. Do not edit!\n\n');

	for (const intf of options.library.interfaces) {
		/***
		out.write(`class ${intf.name}Impl : public BaseImpl<${intf.name}Impl, ${options.namespace}::I${intf.name}Impl>\n`);
		out.write('{\n');
		out.write('public:\n');
		out.write('\tusing BaseImpl::BaseImpl;\n');
		out.write('\n');
		out.write('public:\n');
		out.write('};\n');
		out.write('\n');
		***/

		out.write(`class ${intf.name} : public BaseClass<${intf.name}, ${options.namespace}::I${intf.name}>\n`);
		out.write('{\n');
		out.write(`friend class BaseClass<${intf.name}, ${options.namespace}::I${intf.name}>;\n`);

		out.write('\n');
		out.write('public:\n');
		out.write('\tusing BaseClass::BaseClass;\n');

		out.write('\n');
		out.write('private:\n');
		out.write(`\tstatic void InitPrototype(std::vector<Napi::ObjectWrap<${intf.name}>::PropertyDescriptor>& properties);\n`);
		out.write('\n');
		out.write('private:\n');

		const methods = getAllMethods(options, intf);

		for (const method of methods) {
			out.write(`\tstatic MethodStart<${asyncReturn(options, method.returnType)}> ` +
				`${method.name}Start(bool async, const Napi::CallbackInfo& info);\n`);

			out.write(`\tstatic Napi::Value ${method.name}Finish(const Napi::Env env, ${asyncReturn(options, method.returnType)} ret);\n`);

			out.write(`\n`);
			out.write(`\tNapi::Value ${method.name}Async(const Napi::CallbackInfo& info)\n`);
			out.write(`\t{\n`);
			out.write(`\t\treturn PromiseWorker<${asyncReturn(options, method.returnType)}>::Run(info.Env(),\n`);
			out.write(`\t\t\t${method.name}Start(true, info),\n`);
			out.write(`\t\t\t&${intf.name}::${method.name}Finish);\n`);
			out.write(`\t}\n`);

			out.write(`\n`);
			out.write(`\tNapi::Value ${method.name}Sync(const Napi::CallbackInfo& info)\n`);
			out.write(`\t{\n`);
			out.write(`\t\ttry\n`);
			out.write(`\t\t{\n`);
			out.write(`\t\t\tauto ret = ${method.name}Start(false, info)();\n`);
			out.write(`\t\t\treturn ${method.name}Finish(info.Env(), ret);\n`);
			out.write(`\t\t}\n`);
			out.write(`\t\tcatch (...)\n`);
			out.write(`\t\t{\n`);
			out.write(`\t\t\trethrowException(info.Env());\n`);
			out.write(`\t\t}\n`);
			out.write(`\t}\n`);
			out.write(`\n`);
		}

		out.write('};\n');
		out.write('\n');
		out.write('\n');
	}

	for (const intf of options.library.interfaces) {
		out.write(`void ${intf.name}::InitPrototype(std::vector<Napi::ObjectWrap<${intf.name}>::PropertyDescriptor>& properties)\n`);
		out.write('{\n');

		const methods = getAllMethods(options, intf);

		for (const method of methods) {
			out.write(`\tproperties.push_back(InstanceMethod("${method.name}Sync", &${intf.name}::${method.name}Sync));\n`);
			out.write(`\tproperties.push_back(InstanceMethod("${method.name}Async", &${intf.name}::${method.name}Async));\n`);
		}

		out.write('}\n');
		out.write('\n');

		for (const method of methods) {
			out.write(`MethodStart<${asyncReturn(options, method.returnType)}> ${intf.name}::${method.name}` +
				`Start(bool async, const Napi::CallbackInfo& info)\n`);

			out.write('{\n');
			out.write(`\tauto* obj = ObjectWrap<${intf.name}>::Unwrap(info.This().ToObject());\n`);

			let paramNumber = 0;

			for (const param of method.parameters) {
				let handled = false;

				if (param.type.isPointer) {
					out.write(`\tstd::shared_ptr<Napi::Reference<Napi::Value>> ${param.name}Persistent;\n`);

					switch (param.type.name) {
						case 'void':
						case 'uchar':
						case 'boolean':
							out.write(`\tauto* ${param.name} = getAddress<unsigned char>(info.Env(), async, info[${paramNumber}], ` +
								`${param.name}Persistent);`);
							handled = true;
							break;

						case 'int':
							out.write(`\tauto* ${param.name} = getAddress<int>(info.Env(), async, info[${paramNumber}], ` +
								`${param.name}Persistent);`);
							handled = true;
							break;

						case 'uint':
							out.write(`\tauto* ${param.name} = getAddress<unsigned>(info.Env(), async, info[${paramNumber}], ` +
								`${param.name}Persistent);`);
							handled = true;
							break;

						case 'int64':
							out.write(`\tauto* ${param.name} = getAddress<int64_t>(info.Env(), async, info[${paramNumber}], ` +
								`${param.name}Persistent);`);
							handled = true;
							break;

						case 'uint64':
							out.write(`\tauto* ${param.name} = getAddress<uint64_t>(info.Env(), async, info[${paramNumber}], ` +
								`${param.name}Persistent);`);
							handled = true;
							break;

						default:
							out.write(`\tauto* ${param.name} = (${syncReturn(options, param.type)}) `+
								`getAddress<unsigned char>(info.Env(), async, info[${paramNumber}], ${param.name}Persistent);`);
							handled = true;
							break;
					}
				}
				else {
					if (options.library.interfacesByName[param.type.name]) {
						out.write(`\tauto* ${param.name} = ${param.type.name}::CheckedUnwrap(info.Env(), info[${paramNumber}], ` +
							`"${param.name} argument", true);`);
						handled = true;
					}
					else {
						switch (param.type.name) {
							case 'int':
								out.write(`\tint ${param.name} = (int) info[${paramNumber}].ToNumber();`);
								handled = true;
								break;

							case 'uint':
								out.write(`\tunsigned ${param.name} = (unsigned) info[${paramNumber}].ToNumber();`);
								handled = true;
								break;

							case 'uchar':
								out.write(`\tunsigned char ${param.name} = (unsigned char) info[${paramNumber}].ToNumber().Uint32Value();`);
								handled = true;
								break;

							case 'int64':
								out.write(`\tint64_t ${param.name} = (int64_t) info[${paramNumber}].ToNumber();`);
								handled = true;
								break;

							case 'uint64':
								out.write(`\tuint64_t ${param.name} = (uint64_t) info[${paramNumber}].ToNumber().Int64Value();`);
								handled = true;
								break;

							case 'boolean':
								out.write(`\tbool ${param.name} = info[${paramNumber}].ToBoolean();`);
								handled = true;
								break;

							case 'string':
								if (param.type.isConst) {
									out.write(`\tstd::string ${param.name} = info[${paramNumber}].ToString().Utf8Value();`);
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
				++paramNumber;
			}

			out.write('\n');
			out.write('\treturn [obj');

			for (const param of method.parameters)
			{
				out.write(`, ${param.name}`);

				if (param.type.isPointer)
					out.write(`, ${param.name}Persistent`);
			}

			out.write(']() {\n');

			if (method.mayThrow)
				out.write(`\t\t${options.namespace}::ThrowStatusWrapper statusWrapper(${method.parameters[0].name}->interface);\n`);

			out.write('\t\t');

			if (!(method.returnType.name == 'void' && !method.returnType.isPointer))
				out.write('return ');

			out.write(`obj->interface->${method.name}(`);

			//// TODO:
			let firstParam = true;

			for (const param of method.parameters) {
				if (!firstParam)
					out.write(', ');

				if (method.mayThrow && firstParam)
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

				firstParam = false;
			}

			out.write(');\n');

			if (method.returnType.name == 'void' && !method.returnType.isPointer)
				out.write('\t\treturn nullptr;\n');

			out.write('\t};\n');
			out.write('}\n');
			out.write('\n');

			out.write(`Napi::Value ${intf.name}::${method.name}Finish(const Napi::Env env, ` +
				`${asyncReturn(options, method.returnType)} ret)\n`);
			out.write('{\n');

			if (method.returnType.name == 'void' && !method.returnType.isPointer)
				out.write('\treturn env.Undefined();\n');

			let handled = false;
			const ret1 = '\treturn ';
			const ret2 = ';\n';

			if (method.returnType.name == 'void' && !method.returnType.isPointer)
				handled = true;
			else if (!method.returnType.isPointer) {
				if (options.library.interfacesByName[method.returnType.name]) {
					out.write(`${ret1}${method.returnType.name}::NewInstance(env, ret)${ret2}`);
					handled = true;
				}
				else {
					switch (method.returnType.name) {
						case 'uchar':
						case 'int':
						case 'uint':
							out.write(`${ret1}Napi::Value::From(env, ret)${ret2}`);
							handled = true;
							break;

						case 'int64':
						case 'uint64':
							out.write(`${ret1}Napi::Value::From(env, (double) ret)${ret2}`);
							handled = true;
							break;

						case 'boolean':
							out.write(`${ret1}Napi::Value::From(env, (bool) ret)${ret2}`);
							handled = true;
							break;

						case 'string':
							out.write(`${ret1}ret.isNull() ? env.Null() : Napi::Value::From(env, ret.string())${ret2}`);
							handled = true;
							break;
					}
				}
			}
			else {	// pointer
				switch (method.returnType.name) {
					case 'uchar':
						out.write(`${ret1}Pointer::NewInstance(env, ret)${ret2}`);
						handled = true;
						break;
				}
			}

			if (!handled) {
				console.error(`Unrecognized type ${JSON.stringify(method.returnType)} in '${intf.name}#${method.name}'`);
				//// FIXME: process.exit(1);
			}

			out.write('}\n');
			out.write('\n');
		}
	}

	out.write('static void initClasses(Napi::Env env, Napi::Object& exports)\n');
	out.write('{\n');

	for (let intf of options.library.interfaces)
		out.write(`\t${intf.name}::Init(env, exports, "${intf.name}");\n`);

	out.write('}\n');
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
