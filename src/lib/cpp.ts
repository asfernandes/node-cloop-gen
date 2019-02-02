import { getAllMethods, Options } from './common';
import { Type } from './library';


export function generateCpp(options: Options, out: NodeJS.WritableStream) {
	out.write('// Auto-generated file. Do not edit!\n\n');

	for (const intf of options.library.interfaces) {
		out.write(`class ${intf.name}Impl : public BaseImpl<${intf.name}Impl, ${options.namespace}::I${intf.name}Impl>\n`);
		out.write('{\n');
		out.write('public:\n');
		out.write('\tusing BaseImpl::BaseImpl;\n');
		out.write('\n');
		out.write('public:\n');
		out.write('};\n');
		out.write('\n');

		out.write(`class ${intf.name} : public BaseClass<${intf.name}, ${options.namespace}::I${intf.name}>\n`);
		out.write('{\n');
		out.write(`friend class BaseClass<${intf.name}, ${options.namespace}::I${intf.name}>;\n`);
		out.write('\n');
		out.write('private:\n');
		out.write('\tstatic void InitPrototype(v8::Local<v8::FunctionTemplate>& tpl);\n');
		out.write('\n');
		out.write('private:\n');

		const methods = getAllMethods(options, intf);

		for (const method of methods) {
			if (!method.async)
				out.write(`\tstatic NAN_METHOD(${method.name});\n`);
			else {
				out.write(`\tstatic MethodStart<${asyncReturn(options, method.returnType)}> ` +
					`${method.name}Start(bool async, Nan::NAN_METHOD_ARGS_TYPE info);\n`);

				out.write(`\tstatic v8::Local<v8::Value> ${method.name}Finish(${asyncReturn(options, method.returnType)} ret);\n`);
			}
		}

		out.write('};\n');
		out.write('\n');
		out.write('\n');
	}

	for (const intf of options.library.interfaces) {
		out.write(`void ${intf.name}::InitPrototype(v8::Local<v8::FunctionTemplate>& tpl)\n`);
		out.write('{\n');

		const methods = getAllMethods(options, intf);

		for (const method of methods) {
			if (!method.async)
				out.write(`\tDefineSyncMethod<${method.name}>(tpl, "${method.name}");\n`);
			else {
				out.write(`\tDefineAsyncMethod<${asyncReturn(options, method.returnType)}, ${method.name}Start, ` +
					`${method.name}Finish>(tpl, "${method.name}");\n`);
			}
		}

		out.write('}\n');
		out.write('\n');

		for (const method of methods) {
			if (!method.async)
				out.write(`NAN_METHOD(${intf.name}::${method.name}${method.async ? 'Sync' : ''})\n`);
			else {
				out.write(`MethodStart<${asyncReturn(options, method.returnType)}> ${intf.name}::${method.name}` +
					`Start(bool async, Nan::NAN_METHOD_ARGS_TYPE info)\n`);
			}

			out.write('{\n');
			out.write(`\tauto* obj = ObjectWrap::Unwrap<${intf.name}>(info.This());\n`);

			let paramNumber = 0;
			let hasSharedPtr = false;

			for (const param of method.parameters) {
				let handled = false;

				if (param.type.isPointer) {
					if (method.async) {
						hasSharedPtr = true;
						out.write(`\tstd::shared_ptr<Nan::Persistent<v8::Value>> ${param.name}Persistent;\n`);
					}

					switch (param.type.name) {
						case 'void':
						case 'uchar':
						case 'boolean':
							out.write(`\tauto* ${param.name} = getAddress<unsigned char>(info[${paramNumber}]);`);
							handled = true;
							break;

						case 'int':
							out.write(`\tauto* ${param.name} = getAddress<int>(info[${paramNumber}]);`);
							handled = true;
							break;

						case 'uint':
							out.write(`\tauto* ${param.name} = getAddress<unsigned>(info[${paramNumber}]);`);
							handled = true;
							break;

						case 'int64':
							out.write(`\tauto* ${param.name} = getAddress<int64_t>(info[${paramNumber}]);`);
							handled = true;
							break;

						case 'uint64':
							out.write(`\tauto* ${param.name} = getAddress<uint64_t>(info[${paramNumber}]);`);
							handled = true;
							break;

						default:
							out.write(`\tauto* ${param.name} = (${syncReturn(options, param.type)}) `+
								`getAddress<unsigned char>(info[${paramNumber}]);`);
							handled = true;
							break;
					}
				}
				else {
					if (options.library.interfacesByName[param.type.name]) {
						out.write(`\tauto* ${param.name} = ${param.type.name}::CheckedUnwrap(info[${paramNumber}], ` +
							`"${param.name} argument", true);`);
						handled = true;
					}
					else {
						switch (param.type.name) {
							case 'int':
								out.write(`\tint ${param.name} = (int) info[${paramNumber}]->NumberValue();`);
								handled = true;
								break;

							case 'uint':
								out.write(`\tunsigned ${param.name} = (unsigned) info[${paramNumber}]->NumberValue();`);
								handled = true;
								break;

							case 'uchar':
								out.write(`\tunsigned char ${param.name} = (unsigned char) info[${paramNumber}]->NumberValue();`);
								handled = true;
								break;

							case 'int64':
								out.write(`\tint64_t ${param.name} = (int64_t) info[${paramNumber}]->NumberValue();`);
								handled = true;
								break;

							case 'uint64':
								out.write(`\tuint64_t ${param.name} = (uint64_t) info[${paramNumber}]->NumberValue();`);
								handled = true;
								break;

							case 'boolean':
								out.write(`\tbool ${param.name} = info[${paramNumber}]->BooleanValue();`);
								handled = true;
								break;

							case 'string':
								if (param.type.isConst) {
									out.write(`\tstd::string ${param.name} = *v8::String::Utf8Value(info[${paramNumber}]->ToString());`);
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

			if (hasSharedPtr)
			{
				out.write(`\n`);
				out.write(`\tif (async)\n`);
				out.write(`\t{\n`);

				paramNumber = 0;

				for (const param of method.parameters) {
					if (param.type.isPointer)
					{
						out.write(`\t\t${param.name}Persistent = ` +
							`std::make_shared<Nan::Persistent<v8::Value>>(info[${paramNumber}]);\n`);

						//out.write(`\t\t${param.name}Persistent->Reset(info[${paramNumber}]);\n`);
					}

					++paramNumber;
				}

				out.write(`\t}\n`);
			}

			if (method.async) {
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
			}
			else {
				if (method.mayThrow)
					out.write(`\t${options.namespace}::ThrowStatusWrapper statusWrapper(${method.parameters[0].name}->interface);\n`);

				out.write('\n');
				out.write('\t');

				if (!(method.returnType.name == 'void' && !method.returnType.isPointer))
					out.write('auto ret = ');
			}

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

			if (method.async) {
				if (method.returnType.name == 'void' && !method.returnType.isPointer)
					out.write('\t\treturn nullptr;\n');

				out.write('\t};\n');
				out.write('}\n');
				out.write('\n');

				out.write(`v8::Local<v8::Value> ${intf.name}::${method.name}Finish(` +
					`${asyncReturn(options, method.returnType)} ret)\n`);
				out.write('{\n');

				if (method.returnType.name == 'void' && !method.returnType.isPointer)
					out.write('\treturn v8::Local<v8::Value>(Nan::Undefined());\n');
			}

			let handled = false;
			let ret1 = method.async ? '\treturn ' : '\tinfo.GetReturnValue().Set(';
			let ret2 = method.async ? ';\n' : ');\n';

			if (method.returnType.name == 'void' && !method.returnType.isPointer)
				handled = true;
			else if (!method.returnType.isPointer) {
				if (options.library.interfacesByName[method.returnType.name]) {
					out.write(`${ret1}${method.returnType.name}::NewInstance(ret)${ret2}`);
					handled = true;
				}
				else {
					switch (method.returnType.name) {
						case 'uchar':
						case 'int':
						case 'uint':
							out.write(`${ret1}Nan::New(ret)${ret2}`);
							handled = true;
							break;

						case 'int64':
						case 'uint64':
							out.write(`${ret1}Nan::New((double) ret)${ret2}`);
							handled = true;
							break;

						case 'boolean':
							out.write(`${ret1}Nan::New((bool) ret)${ret2}`);
							handled = true;
							break;

						case 'string':
							out.write(`${ret1}Nan::New(ret).ToLocalChecked()${ret2}`);
							handled = true;
							break;
					}
				}
			}
			else {	// pointer
				switch (method.returnType.name) {
					case 'uchar':
						out.write(`${ret1}Pointer::NewInstance(ret)${ret2}`);
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

	out.write('static void initClasses(v8::Local<v8::Object> exports, v8::Local<v8::Object> module)\n');
	out.write('{\n');
	out.write('\tNan::HandleScope scope;\n');
	out.write('\n');

	for (let intf of options.library.interfaces)
		out.write(`\t${intf.name}::Init(exports, "${intf.name}");\n`);

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
		typeName = 'std::string';
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
